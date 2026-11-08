from __future__ import annotations

from datetime import date, datetime, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Query, Response
from sqlalchemy.ext.asyncio import AsyncSession

from db import get_db
from models import (
    ClassifyPreviewRequest,
    ClassifyPreviewResponse,
    FacetResponse,
    SortKey,
    Source,
    SourceCreate,
    SourceIngestResponse,
    SourcePage,
    ViewResponse,
)
from repositories.idempotency import IdempotencyRepository
from repositories.source import SourceRepository
from services.ingest import IngestService
from services.ingest_bus import get_ingest_bus
from services.tag_extractor import (
    APPEARANCE_TAG_CHOICES,
    classify_source,
    extract_object_tags,
    normalize_keywords,
    novel_tag_candidates,
    visual_tags_for,
)

router = APIRouter(prefix="/api/sources", tags=["sources"])

# Dev convenience: suppress duplicate view posts for the same key briefly.
_VIEW_KEY_CACHE: dict[str, datetime] = {}
_VIEW_KEY_TTL = timedelta(seconds=5)


def get_source_repository(session: AsyncSession = Depends(get_db)) -> SourceRepository:
    return SourceRepository(session)


def get_ingest_service(session: AsyncSession = Depends(get_db)) -> IngestService:
    return IngestService(
        sources=SourceRepository(session),
        idempotency=IdempotencyRepository(session),
    )


@router.get("", response_model=SourcePage)
async def get_sources(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=60),
    sort: SortKey = Query("most_recent"),
    center: Optional[List[str]] = Query(None),
    keyword: Optional[List[str]] = Query(None),
    object_tag: Optional[List[str]] = Query(None),
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    repository: SourceRepository = Depends(get_source_repository),
) -> SourcePage:
    """Browse NASA image sources with filters, sorting, and pagination."""
    return await repository.list_page(
        page=page,
        page_size=page_size,
        sort=sort,
        centers=center,
        keywords=keyword,
        object_tags=object_tag,
        date_from=date_from,
        date_to=date_to,
    )


@router.post("", response_model=SourceIngestResponse)
async def create_source(
    payload: SourceCreate,
    response: Response,
    idempotency_key: Optional[str] = Header(default=None, alias="Idempotency-Key"),
    service: IngestService = Depends(get_ingest_service),
) -> SourceIngestResponse:
    """Idempotent ingest: classification + ledger + nasa_id upsert via IngestService/bus."""
    if not payload.name.strip():
        raise HTTPException(status_code=400, detail="Name is required")
    if not (payload.image_url or payload.image_full_url):
        raise HTTPException(status_code=400, detail="image_url is required")

    bus = get_ingest_bus()
    result = await bus.submit(payload, idempotency_key=idempotency_key, service=service)
    if result.status == "accepted":
        response.status_code = 202
    elif result.replayed:
        response.status_code = 200
    else:
        response.status_code = 201
    return result


@router.get("/{source_id}", response_model=Source)
async def get_source(
    source_id: int,
    repository: SourceRepository = Depends(get_source_repository),
) -> Source:
    source = await repository.get_by_id(source_id)
    if source is None:
        raise HTTPException(status_code=404, detail="Source not found")
    return source


@router.delete("/{source_id}", status_code=204)
async def delete_source(
    source_id: int,
    repository: SourceRepository = Depends(get_source_repository),
) -> Response:
    deleted = await repository.delete(source_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Source not found")
    return Response(status_code=204)


@router.post("/{source_id}/view", response_model=ViewResponse)
async def record_view(
    source_id: int,
    x_view_key: Optional[str] = Header(default=None, alias="X-View-Key"),
    repository: SourceRepository = Depends(get_source_repository),
) -> ViewResponse:
    source = await repository.get_by_id(source_id)
    if source is None:
        raise HTTPException(status_code=404, detail="Source not found")

    now = datetime.utcnow()
    expired = [key for key, ts in _VIEW_KEY_CACHE.items() if now - ts > _VIEW_KEY_TTL]
    for key in expired:
        _VIEW_KEY_CACHE.pop(key, None)

    cache_key = f"{source_id}:{x_view_key or 'anonymous'}"
    if cache_key in _VIEW_KEY_CACHE:
        return ViewResponse(id=source_id, view_count=source.view_count)

    view_count = await repository.increment_view(source_id)
    if view_count is None:
        raise HTTPException(status_code=404, detail="Source not found")
    _VIEW_KEY_CACHE[cache_key] = now
    return ViewResponse(id=source_id, view_count=view_count)


facets_router = APIRouter(prefix="/api", tags=["facets"])


@facets_router.get("/facets", response_model=FacetResponse)
async def get_facets(
    repository: SourceRepository = Depends(get_source_repository),
) -> FacetResponse:
    return await repository.get_facets()


@facets_router.post("/classify/preview", response_model=ClassifyPreviewResponse)
async def preview_classification(payload: ClassifyPreviewRequest) -> ClassifyPreviewResponse:
    raw_keywords = [str(k) for k in payload.keywords if str(k).strip()]
    keywords = normalize_keywords(raw_keywords)
    text_tags = extract_object_tags(
        title=payload.name,
        description=payload.description,
        description_508=payload.description_508,
        keywords=raw_keywords,
    )
    visual_tags = visual_tags_for(payload.nasa_id)
    object_tags = classify_source(
        title=payload.name,
        description=payload.description,
        description_508=payload.description_508,
        keywords=raw_keywords,
        nasa_id=payload.nasa_id,
        extra_object_tags=payload.object_tags,
    )
    return ClassifyPreviewResponse(
        keywords=keywords,
        object_tags=object_tags,
        visual_tags=visual_tags,
        text_tags=text_tags,
        appearance_tags=list(APPEARANCE_TAG_CHOICES),
        novel_candidates=novel_tag_candidates(
            keywords=keywords,
            extra_object_tags=payload.object_tags,
            known_object_tags=object_tags,
        ),
    )
