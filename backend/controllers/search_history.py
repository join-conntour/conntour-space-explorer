from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from db import get_db
from models import SearchHistoryPage
from repositories import SearchHistoryRepository

router = APIRouter(prefix="/api/history", tags=["history"])


def get_repo(session: AsyncSession = Depends(get_db)) -> SearchHistoryRepository:
    return SearchHistoryRepository(session)


@router.get("", response_model=SearchHistoryPage)
async def get_history(
    page: int = 1,
    page_size: int = 10,
    repo: SearchHistoryRepository = Depends(get_repo),
) -> SearchHistoryPage:
    """Get paginated search history, newest first."""
    items, total = await repo.get_page(page, page_size)
    return SearchHistoryPage(items=items, total=total, page=page, page_size=page_size)


@router.delete("/{id}", status_code=204)
async def delete_history_entry(
    id: int,
    repo: SearchHistoryRepository = Depends(get_repo),
) -> None:
    """Delete a single search history entry."""
    deleted = await repo.delete(id)
    if not deleted:
        raise HTTPException(status_code=404, detail="History entry not found")
