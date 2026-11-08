#!/usr/bin/env python
"""
Database seeding script.
Reads mock_data.json and upserts into PostgreSQL without dropping history/views.
"""

from __future__ import annotations

import asyncio
import json
import os
import sys
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import text
from sqlalchemy.dialects.postgresql import insert

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from db.models import Base, SourceModel  # noqa: E402
from db.session import AsyncSessionLocal, engine  # noqa: E402
from services.tag_extractor import classify_source, normalize_keywords  # noqa: E402

ADDITIVE_COLUMNS = [
    ("nasa_id", "VARCHAR(120)"),
    ("center", "VARCHAR(20)"),
    ("location", "TEXT"),
    ("photographer", "TEXT"),
    ("secondary_creator", "TEXT"),
    ("description_508", "TEXT"),
    ("album", "TEXT[] DEFAULT '{}'"),
    ("creation_date", "TIMESTAMPTZ"),
    ("indexed_at", "TIMESTAMPTZ"),
    ("view_count", "INTEGER NOT NULL DEFAULT 0"),
    ("keywords", "TEXT[] DEFAULT '{}'"),
    ("keywords_raw", "TEXT[] DEFAULT '{}'"),
    ("object_tags", "TEXT[] DEFAULT '{}'"),
    ("image_full_url", "TEXT"),
]

INDEX_STATEMENTS = [
    "CREATE INDEX IF NOT EXISTS ix_sources_keywords_gin ON sources USING GIN (keywords)",
    "CREATE INDEX IF NOT EXISTS ix_sources_object_tags_gin ON sources USING GIN (object_tags)",
    "CREATE INDEX IF NOT EXISTS ix_sources_album_gin ON sources USING GIN (album)",
    "CREATE INDEX IF NOT EXISTS ix_sources_center ON sources (center)",
    "CREATE INDEX IF NOT EXISTS ix_sources_creation_date ON sources (creation_date)",
    "CREATE INDEX IF NOT EXISTS ix_sources_view_count ON sources (view_count)",
    "CREATE UNIQUE INDEX IF NOT EXISTS ix_sources_nasa_id ON sources (nasa_id)",
    "CREATE INDEX IF NOT EXISTS ix_history_created_id ON search_history (created_at DESC, id DESC)",
    "CREATE INDEX IF NOT EXISTS ix_tag_intro_capture ON object_tag_introductions (capture_date)",
]


def parse_creation_date(value: str | None) -> datetime | None:
    if not value:
        return None
    raw = value.strip()
    if raw.endswith("Z"):
        raw = raw[:-1] + "+00:00"
    try:
        dt = datetime.fromisoformat(raw)
    except ValueError:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


def pick_image_urls(links: list[dict[str, Any]]) -> tuple[str | None, str | None]:
    medium = None
    full = None
    largest = None
    largest_area = -1

    for link in links:
        if link.get("render") != "image":
            continue
        href = link.get("href")
        if not href:
            continue
        rel = link.get("rel")
        width = int(link.get("width") or 0)
        height = int(link.get("height") or 0)
        area = width * height
        if "~medium" in href or (rel == "alternate" and medium is None and width >= 600):
            if medium is None:
                medium = href
        if rel == "canonical":
            full = href
        if area > largest_area:
            largest_area = area
            largest = href

    if medium is None:
        for link in links:
            if link.get("render") == "image" and link.get("href"):
                medium = link["href"]
                break
    return medium, full or largest


def build_source_row(idx: int, item: dict[str, Any], now: datetime) -> dict[str, Any]:
    data = item.get("data", [{}])[0]
    links = item.get("links", [])
    image_url, image_full_url = pick_image_urls(links)
    raw_keywords = [str(k) for k in (data.get("keywords") or [])]
    keywords = normalize_keywords(raw_keywords)
    album = [str(a) for a in (data.get("album") or [])]
    title = data.get("title") or f"NASA Item {idx}"
    description = data.get("description") or ""
    description_508 = data.get("description_508") or ""
    object_tags = classify_source(
        title=title,
        description=description,
        description_508=description_508,
        keywords=raw_keywords,
        nasa_id=data.get("nasa_id"),
    )
    creation_date = parse_creation_date(data.get("date_created"))
    return {
        "id": idx,
        "name": title,
        "type": data.get("media_type", "unknown"),
        "launch_date": data.get("date_created", ""),
        "description": description,
        "image_url": image_url,
        "status": "Active",
        "nasa_id": data.get("nasa_id"),
        "center": data.get("center"),
        "location": data.get("location"),
        "photographer": data.get("photographer"),
        "secondary_creator": data.get("secondary_creator"),
        "description_508": description_508 or None,
        "album": album,
        "creation_date": creation_date,
        "indexed_at": now,
        "view_count": 0,
        "keywords": keywords,
        "keywords_raw": raw_keywords,
        "object_tags": object_tags,
        "image_full_url": image_full_url,
    }


async def ensure_schema() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        for column, definition in ADDITIVE_COLUMNS:
            await conn.execute(
                text(f"ALTER TABLE sources ADD COLUMN IF NOT EXISTS {column} {definition}")
            )
        for statement in INDEX_STATEMENTS:
            await conn.execute(text(statement))


async def upsert_sources(rows: list[dict[str, Any]]) -> None:
    async with AsyncSessionLocal() as session:
        for row in rows:
            stmt = insert(SourceModel).values(**row)
            update_cols = {
                key: getattr(stmt.excluded, key)
                for key in row
                if key not in {"id", "view_count", "indexed_at"}
            }
            # Preserve indexed_at when present; backfill when the additive column is still null.
            update_cols["indexed_at"] = text(
                "COALESCE(sources.indexed_at, EXCLUDED.indexed_at)"
            )
            stmt = stmt.on_conflict_do_update(index_elements=["id"], set_=update_cols)
            await session.execute(stmt)
        await session.commit()


async def refresh_tag_introductions() -> None:
    async with AsyncSessionLocal() as session:
        await session.execute(text("DELETE FROM object_tag_introductions"))
        await session.execute(
            text(
                """
                INSERT INTO object_tag_introductions (tag, source_id, capture_date, indexed_at)
                SELECT DISTINCT ON (tag)
                    tag,
                    s.id AS source_id,
                    s.creation_date AS capture_date,
                    s.indexed_at AS indexed_at
                FROM sources s
                CROSS JOIN LATERAL unnest(s.object_tags) AS tag
                ORDER BY tag, s.creation_date ASC NULLS LAST, s.id ASC
                """
            )
        )
        await session.commit()


async def seed_database() -> None:
    await ensure_schema()

    data_path = os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        "data",
        "mock_data.json",
    )
    with open(data_path, "r", encoding="utf-8") as handle:
        json_data = json.load(handle)

    now = datetime.now(timezone.utc)
    items = json_data.get("collection", {}).get("items", [])
    rows = [build_source_row(idx, item, now) for idx, item in enumerate(items, start=1)]

    await upsert_sources(rows)
    await refresh_tag_introductions()
    print(f"Successfully seeded {len(rows)} sources into the database.")


if __name__ == "__main__":
    asyncio.run(seed_database())
