from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy.ext.asyncio import AsyncSession

from db import get_db
from models import HistoryPage
from repositories.history import HistoryRepository

router = APIRouter(prefix="/api/history", tags=["history"])


def get_history_repository(session: AsyncSession = Depends(get_db)) -> HistoryRepository:
    return HistoryRepository(session)


@router.get("", response_model=HistoryPage)
async def list_history(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=50),
    repository: HistoryRepository = Depends(get_history_repository),
) -> HistoryPage:
    return await repository.list_page(page=page, page_size=page_size)


@router.delete("", status_code=204)
async def clear_history(
    repository: HistoryRepository = Depends(get_history_repository),
) -> Response:
    await repository.clear_all()
    return Response(status_code=204)


@router.delete("/{history_id}", status_code=204)
async def delete_history(
    history_id: int,
    repository: HistoryRepository = Depends(get_history_repository),
) -> Response:
    deleted = await repository.delete(history_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="History item not found")
    return Response(status_code=204)
