"""Shared idempotent ingest apply path used by HTTP and Kafka workers."""

from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass

from fastapi import HTTPException

from models import Source, SourceCreate, SourceIngestResponse
from repositories.idempotency import IdempotencyRepository
from repositories.source import SourceRepository


def canonical_request_hash(payload: SourceCreate) -> str:
    body = {
        "name": (payload.name or "").strip(),
        "description": payload.description or "",
        "description_508": payload.description_508 or "",
        "image_url": payload.image_url or "",
        "image_full_url": payload.image_full_url or "",
        "nasa_id": (payload.nasa_id or "").strip().lower(),
        "center": payload.center or "",
        "location": payload.location or "",
        "photographer": payload.photographer or "",
        "secondary_creator": payload.secondary_creator or "",
        "launch_date": payload.launch_date or "",
        "album": sorted(payload.album or []),
        "keywords": sorted(str(k).strip().lower() for k in payload.keywords if str(k).strip()),
        "object_tags": sorted(
            str(t).strip().lower() for t in payload.object_tags if str(t).strip()
        ),
    }
    encoded = json.dumps(body, sort_keys=True, separators=(",", ":")).encode("utf-8")
    return hashlib.sha256(encoded).hexdigest()


def resolve_idempotency_key(payload: SourceCreate, provided: str | None) -> str:
    if provided and provided.strip():
        return provided.strip()[:200]
    nasa_id = (payload.nasa_id or "").strip()
    if nasa_id:
        return f"nasa:{nasa_id}"
    fingerprint = hashlib.sha256(
        f"{(payload.name or '').strip().lower()}|{(payload.image_url or '').strip()}".encode(
            "utf-8"
        )
    ).hexdigest()
    return f"fp:{fingerprint}"


@dataclass
class IngestService:
    sources: SourceRepository
    idempotency: IdempotencyRepository

    async def apply(
        self,
        payload: SourceCreate,
        *,
        idempotency_key: str | None = None,
        bus: str = "http",
    ) -> SourceIngestResponse:
        key = resolve_idempotency_key(payload, idempotency_key)
        request_hash = canonical_request_hash(payload)

        existing = await self.idempotency.get(key)
        if existing is not None:
            if existing.request_hash != request_hash:
                raise HTTPException(
                    status_code=409,
                    detail="Idempotency-Key was reused with a different ingest payload",
                )
            source = await self.sources.get_by_id(existing.source_id)
            if source is None:
                raise HTTPException(status_code=409, detail="Idempotency record is orphaned")
            return SourceIngestResponse(
                source=source,
                replayed=True,
                idempotency_key=key,
                bus=existing.bus if existing.bus in {"http", "kafka"} else "http",
                status="applied",
            )

        source: Source = await self.sources.create(payload)
        row, inserted = await self.idempotency.put(
            key=key,
            request_hash=request_hash,
            source_id=source.id,
            bus=bus,
        )
        if not inserted:
            if row.request_hash != request_hash:
                raise HTTPException(
                    status_code=409,
                    detail="Idempotency-Key was reused with a different ingest payload",
                )
            winner = await self.sources.get_by_id(row.source_id)
            if winner is None:
                raise HTTPException(status_code=409, detail="Idempotency record is orphaned")
            return SourceIngestResponse(
                source=winner,
                replayed=True,
                idempotency_key=key,
                bus=row.bus if row.bus in {"http", "kafka"} else "http",
                status="applied",
            )
        return SourceIngestResponse(
            source=source,
            replayed=False,
            idempotency_key=key,
            bus="kafka" if bus == "kafka" else "http",
            status="applied",
        )
