from typing import List, Tuple

from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from db.models import SearchHistoryModel
from models import SearchHistoryEntry


class SearchHistoryRepository:
    """Repository for search history CRUD operations."""

    def __init__(self, session: AsyncSession):
        self._session = session

    async def create(self, query: str, result_count: int, results_json: str) -> SearchHistoryEntry:
        entry = SearchHistoryModel(
            query=query,
            result_count=result_count,
            results_json=results_json,
        )
        self._session.add(entry)
        await self._session.commit()
        await self._session.refresh(entry)
        return SearchHistoryEntry.model_validate(entry)

    async def get_page(self, page: int, page_size: int) -> Tuple[List[SearchHistoryEntry], int]:
        count_result = await self._session.execute(select(func.count(SearchHistoryModel.id)))
        total = count_result.scalar_one()

        result = await self._session.execute(
            select(SearchHistoryModel)
            .order_by(SearchHistoryModel.created_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
        items = [SearchHistoryEntry.model_validate(row) for row in result.scalars().all()]
        return items, total

    async def delete(self, id: int) -> bool:
        result = await self._session.execute(
            delete(SearchHistoryModel).where(SearchHistoryModel.id == id)
        )
        await self._session.commit()
        return result.rowcount > 0
