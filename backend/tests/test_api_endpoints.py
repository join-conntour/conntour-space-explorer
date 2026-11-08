"""API-level regression tests against the live backend service."""

from __future__ import annotations

import os

import pytest
from httpx import AsyncClient

BASE_URL = os.getenv("API_BASE_URL", "http://127.0.0.1:5001")


@pytest.fixture
async def client():
    async with AsyncClient(base_url=BASE_URL, timeout=30.0) as ac:
        yield ac


@pytest.mark.asyncio
async def test_sources_page_returns_paginated_catalog(client: AsyncClient):
    response = await client.get("/api/sources", params={"page": 1, "page_size": 5, "sort": "most_recent"})
    assert response.status_code == 200
    payload = response.json()
    assert payload["page"] == 1
    assert payload["page_size"] == 5
    assert payload["total"] >= 5
    assert len(payload["items"]) == 5
    assert "object_tags" in payload["items"][0]
    assert "keywords" in payload["items"][0]


@pytest.mark.asyncio
async def test_search_mars_returns_hits_with_confidence_and_activated_tag(client: AsyncClient):
    response = await client.post(
        "/api/search",
        json={
            "query": "mars",
            "page": 1,
            "page_size": 12,
            "sort": "highest_confidence",
            "record_history": True,
            "filters": {},
        },
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["total"] > 0
    assert "mars" in payload["activated_object_tags"]
    assert payload["history_id"] is not None
    assert payload["results"][0]["confidence"] > 0


@pytest.mark.asyncio
async def test_search_then_browse_without_object_filter_returns_full_page(client: AsyncClient):
    """Clearing search must be able to browse again without leftover object-tag filters."""
    search = await client.post(
        "/api/search",
        json={
            "query": "mars",
            "page": 1,
            "page_size": 12,
            "record_history": False,
            "filters": {"object_tags": ["mars"]},
        },
    )
    assert search.status_code == 200
    filtered_total = search.json()["total"]
    assert filtered_total > 0

    browse = await client.get(
        "/api/sources",
        params={"page": 1, "page_size": 12, "sort": "most_recent"},
    )
    assert browse.status_code == 200
    browse_total = browse.json()["total"]
    assert browse_total > filtered_total
    assert browse_total >= 100


@pytest.mark.asyncio
async def test_search_men_with_blue_shirt_returns_curated_photos(client: AsyncClient):
    response = await client.post(
        "/api/search",
        json={
            "query": "men with blue shirt",
            "page": 1,
            "page_size": 24,
            "sort": "highest_confidence",
            "record_history": False,
            "filters": {},
        },
    )
    assert response.status_code == 200
    titles = {hit["source"]["name"] for hit in response.json()["results"]}
    assert "NASA Astronaut Victor Glover Views Artemis II Rocket Stage at NASA Michoud" in titles
    assert "Artemis I Baton Handoff from EGS Ops to Launch Director" in titles
    assert "Expedition 6 Press Conference" in titles
    assert "KSC-07pd1929" in titles
    assert "KSC-2010-1278" in titles


@pytest.mark.asyncio
async def test_women_filter_excludes_rescue_silhouette(client: AsyncClient):
    response = await client.get(
        "/api/sources",
        params={"page": 1, "page_size": 60, "object_tag": "women"},
    )
    assert response.status_code == 200
    titles = {item["name"] for item in response.json()["items"]}
    assert "KSC-07pd3126" not in titles
    assert titles  # curated women photos should still match


@pytest.mark.asyncio
async def test_smile_search_returns_smiling_people(client: AsyncClient):
    response = await client.post(
        "/api/search",
        json={
            "query": "smile",
            "page": 1,
            "page_size": 24,
            "record_history": False,
            "filters": {},
        },
    )
    assert response.status_code == 200
    titles = {hit["source"]["name"] for hit in response.json()["results"]}
    assert "Expedition 6 Press Conference" in titles
    assert "KSC-2010-1278" in titles


@pytest.mark.asyncio
async def test_blank_search_rejected(client: AsyncClient):
    response = await client.post("/api/search", json={"query": "   ", "record_history": False})
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_history_list_and_delete(client: AsyncClient):
    created = await client.post(
        "/api/search",
        json={"query": "rover", "record_history": True, "page_size": 5},
    )
    assert created.status_code == 200
    history_id = created.json()["history_id"]
    assert history_id is not None

    listed = await client.get("/api/history", params={"page": 1, "page_size": 10})
    assert listed.status_code == 200
    ids = [item["id"] for item in listed.json()["items"]]
    assert history_id in ids

    deleted = await client.delete(f"/api/history/{history_id}")
    assert deleted.status_code == 204

    missing = await client.delete(f"/api/history/{history_id}")
    assert missing.status_code == 404


@pytest.mark.asyncio
async def test_history_clear_all(client: AsyncClient):
    for query in ("rover", "orion"):
        created = await client.post(
            "/api/search",
            json={"query": query, "record_history": True, "page_size": 5},
        )
        assert created.status_code == 200
        assert created.json()["history_id"] is not None

    listed = await client.get("/api/history", params={"page": 1, "page_size": 10})
    assert listed.status_code == 200
    assert listed.json()["total"] >= 2

    cleared = await client.delete("/api/history")
    assert cleared.status_code == 204

    empty = await client.get("/api/history", params={"page": 1, "page_size": 10})
    assert empty.status_code == 200
    assert empty.json()["total"] == 0
    assert empty.json()["items"] == []


@pytest.mark.asyncio
async def test_admin_analytics_requires_token(client: AsyncClient):
    unauthorized = await client.get("/api/admin/analytics")
    assert unauthorized.status_code == 401

    authorized = await client.get(
        "/api/admin/analytics",
        headers={"X-Admin-Token": "dev-admin-token"},
    )
    assert authorized.status_code == 200
    payload = authorized.json()
    assert payload["usage"]["total_images"] >= 100
    assert "top_keywords" in payload
    assert "new_classifications" in payload


@pytest.mark.asyncio
async def test_ingest_is_idempotent_for_same_key(client: AsyncClient):
    import time

    suffix = str(int(time.time() * 1000))
    nasa_id = f"e2e-idempotent-probe-{suffix}"
    payload = {
        "name": f"Idempotent Probe Image {suffix}",
        "description": "A rover on Mars for ingest ledger coverage.",
        "image_url": "https://images-assets.nasa.gov/image/PIA22505/PIA22505~medium.jpg",
        "nasa_id": nasa_id,
        "keywords": ["Mars"],
        "object_tags": ["rover"],
    }
    headers = {"Idempotency-Key": f"test-idempotency-key-{suffix}"}

    first = await client.post("/api/sources", json=payload, headers=headers)
    assert first.status_code == 201
    first_body = first.json()
    assert first_body["replayed"] is False
    assert first_body["source"]["id"] is not None
    source_id = first_body["source"]["id"]

    second = await client.post("/api/sources", json=payload, headers=headers)
    assert second.status_code == 200
    second_body = second.json()
    assert second_body["replayed"] is True
    assert second_body["source"]["id"] == source_id

    conflict = await client.post(
        "/api/sources",
        json={**payload, "description": "Different payload for same key"},
        headers=headers,
    )
    assert conflict.status_code == 409

    listed = await client.get("/api/sources", params={"page": 1, "page_size": 60, "sort": "most_recent"})
    matches = [item for item in listed.json()["items"] if item.get("nasa_id") == nasa_id]
    assert len(matches) == 1

    deleted = await client.delete(f"/api/sources/{source_id}")
    assert deleted.status_code == 204
    missing = await client.delete(f"/api/sources/{source_id}")
    assert missing.status_code == 404
    gone = await client.get(f"/api/sources/{source_id}")
    assert gone.status_code == 404


@pytest.mark.asyncio
async def test_view_increment_is_idempotent_for_same_key(client: AsyncClient):
    first = await client.post("/api/sources/1/view", headers={"X-View-Key": "test-key-api-unique"})
    assert first.status_code == 200
    count_after_first = first.json()["view_count"]

    second = await client.post("/api/sources/1/view", headers={"X-View-Key": "test-key-api-unique"})
    assert second.status_code == 200
    assert second.json()["view_count"] == count_after_first


@pytest.mark.asyncio
async def test_sources_second_page_supports_scroll_pagination(client: AsyncClient):
    page1 = await client.get("/api/sources", params={"page": 1, "page_size": 12, "sort": "most_recent"})
    page2 = await client.get("/api/sources", params={"page": 2, "page_size": 12, "sort": "most_recent"})
    assert page1.status_code == 200
    assert page2.status_code == 200
    ids1 = {item["id"] for item in page1.json()["items"]}
    ids2 = {item["id"] for item in page2.json()["items"]}
    assert ids1.isdisjoint(ids2)
    assert page2.json()["page"] == 2
