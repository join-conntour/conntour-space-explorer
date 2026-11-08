from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from db import get_db
from models import SearchHit, SearchRequest, SearchResponse, SortKey
from repositories.history import HistoryRepository
from repositories.source import SourceRepository
from services.search_score import score_source

router = APIRouter(prefix="/api", tags=["search"])


def get_source_repository(session: AsyncSession = Depends(get_db)) -> SourceRepository:
    return SourceRepository(session)


def get_history_repository(session: AsyncSession = Depends(get_db)) -> HistoryRepository:
    return HistoryRepository(session)


@router.post("/search", response_model=SearchResponse)
async def search_images(
    body: SearchRequest,
    source_repo: SourceRepository = Depends(get_source_repository),
    history_repo: HistoryRepository = Depends(get_history_repository),
) -> SearchResponse:
    query = (body.query or "").strip()
    if not query:
        raise HTTPException(status_code=400, detail="Query must not be blank")

    filters = body.filters
    candidates = await source_repo.list_filtered(
        centers=filters.centers or None,
        keywords=filters.keywords or None,
        object_tags=filters.object_tags or None,
        date_from=filters.date_from,
        date_to=filters.date_to,
    )

    query_meta = score_source(
        query=query,
        title="",
        description="",
        keywords=[],
        object_tags=[],
    )
    activated = query_meta.activated_object_tags

    hits: list[SearchHit] = []
    for source in candidates:
        scored = score_source(
            query=query,
            title=source.name,
            description=source.description or "",
            keywords=source.keywords,
            object_tags=source.object_tags,
        )
        if scored.confidence <= 0:
            continue
        hits.append(
            SearchHit(
                source=source,
                confidence=scored.confidence,
                matched_object_tags=scored.matched_object_tags,
                matched_keywords=scored.matched_keywords,
                matched_terms=scored.matched_terms,
            )
        )

    sort: SortKey = body.sort
    if sort == "most_viewed":
        hits.sort(key=lambda h: (-h.source.view_count, h.source.id))
    elif sort == "most_recent":
        hits.sort(
            key=lambda h: (
                -(h.source.creation_date.timestamp() if h.source.creation_date else 0),
                h.source.id,
            )
        )
    else:
        hits.sort(key=lambda h: (-h.confidence, h.source.id))
        sort = "highest_confidence"

    total = len(hits)
    start = (body.page - 1) * body.page_size
    end = start + body.page_size
    page_hits = hits[start:end]

    history_id = None
    if body.record_history:
        snapshot = [
            {
                "source_id": hit.source.id,
                "name": hit.source.name,
                "image_url": hit.source.image_url,
                "center": hit.source.center,
                "creation_date": hit.source.creation_date.isoformat()
                if hit.source.creation_date
                else None,
                "confidence": hit.confidence,
                "matched_object_tags": hit.matched_object_tags,
                "matched_keywords": hit.matched_keywords,
                "matched_terms": hit.matched_terms,
            }
            for hit in hits[:100]
        ]
        filters_payload = filters.model_copy(update={"sort": sort})
        history = await history_repo.create(
            query=query,
            filters=filters_payload,
            activated_object_tags=activated,
            results=snapshot,
            result_count=total,
        )
        history_id = history.id

    return SearchResponse(
        query=query,
        activated_object_tags=activated,
        page=body.page,
        page_size=body.page_size,
        total=total,
        sort=sort,
        results=page_hits,
        history_id=history_id,
    )
