import json
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from db import get_db
from models import RelatedResult, SearchRequest, SearchResponse, SearchResult, Source
from repositories import SearchHistoryRepository, SourceRepository
from services.scoring import score_sources

router = APIRouter(prefix="/api/sources", tags=["sources"])


def get_repository(session: AsyncSession = Depends(get_db)) -> SourceRepository:
    return SourceRepository(session)


def get_history_repository(session: AsyncSession = Depends(get_db)) -> SearchHistoryRepository:
    return SearchHistoryRepository(session)


@router.get("", response_model=List[Source])
async def get_sources(
    repository: SourceRepository = Depends(get_repository),
) -> List[Source]:
    """Get all NASA image sources."""
    return await repository.get_all()


@router.post("/search", response_model=SearchResponse)
async def search_sources(
    request: SearchRequest,
    repository: SourceRepository = Depends(get_repository),
    history_repo: SearchHistoryRepository = Depends(get_history_repository),
) -> SearchResponse:
    """Natural language search with weighted keyword overlap scoring."""
    all_dicts = await repository.get_all_as_dicts()
    scored_ids = score_sources(request.query, all_dicts)

    ids_in_order = [id_ for id_, _ in scored_ids]
    sources = await repository.get_by_ids(ids_in_order)
    score_map = {id_: sc for id_, sc in scored_ids}

    results = [SearchResult(source=src, score=score_map[src.id]) for src in sources]

    # Persist snapshot (top 10) to history
    snapshot = json.dumps(
        [{"id": r.source.id, "name": r.source.name, "score": r.score} for r in results[:10]]
    )
    await history_repo.create(
        query=request.query,
        result_count=len(results),
        results_json=snapshot,
    )

    return SearchResponse(query=request.query, results=results, total=len(results))


@router.get("/{id}/related", response_model=List[RelatedResult])
async def get_related(
    id: int,
    limit: int = 5,
    repository: SourceRepository = Depends(get_repository),
) -> List[RelatedResult]:
    """Find sources most similar to the given source using weighted keyword overlap."""
    source = await repository.get_by_id(id)
    if source is None:
        raise HTTPException(status_code=404, detail="Source not found")

    # Build pseudo-query from the source's own fields
    pseudo_query = f"{source.name} {source.keywords} {source.description[:200]}"

    all_dicts = await repository.get_all_as_dicts()
    other_dicts = [d for d in all_dicts if d["id"] != id]
    scored_ids = score_sources(pseudo_query, other_dicts)[:limit]

    ids_in_order = [i for i, _ in scored_ids]
    related_sources = await repository.get_by_ids(ids_in_order)
    score_map = {i: sc for i, sc in scored_ids}

    return [RelatedResult(source=src, similarity=score_map[src.id]) for src in related_sources]
