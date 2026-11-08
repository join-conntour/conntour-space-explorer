from __future__ import annotations

from typing import Any, Optional

from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from db.models import SearchHistoryModel
from models import HistoryItem, HistoryPage, SearchFilters


class HistoryRepository:
    """PostgreSQL repository for search history."""

    def __init__(self, session: AsyncSession):
        self._session = session

    async def create(
        self,
        *,
        query: str,
        filters: SearchFilters,
        activated_object_tags: list[str],
        results: list[dict[str, Any]],
        result_count: int,
    ) -> HistoryItem:
        row = SearchHistoryModel(
            query=query,
            filters=filters.model_dump(mode="json"),
            activated_object_tags=activated_object_tags,
            results=results,
            result_count=result_count,
        )
        self._session.add(row)
        await self._session.commit()
        await self._session.refresh(row)
        return HistoryItem.model_validate(row)

    async def list_page(self, *, page: int = 1, page_size: int = 10) -> HistoryPage:
        total = int(
            (
                await self._session.execute(select(func.count()).select_from(SearchHistoryModel))
            ).scalar_one()
        )
        rows = (
            await self._session.execute(
                select(SearchHistoryModel)
                .order_by(SearchHistoryModel.created_at.desc(), SearchHistoryModel.id.desc())
                .offset((page - 1) * page_size)
                .limit(page_size)
            )
        ).scalars().all()
        return HistoryPage(
            items=[HistoryItem.model_validate(row) for row in rows],
            page=page,
            page_size=page_size,
            total=total,
        )

    async def delete(self, history_id: int) -> bool:
        result = await self._session.execute(
            delete(SearchHistoryModel).where(SearchHistoryModel.id == history_id)
        )
        await self._session.commit()
        return result.rowcount > 0

    async def clear_all(self) -> int:
        result = await self._session.execute(delete(SearchHistoryModel))
        await self._session.commit()
        return int(result.rowcount or 0)

    async def get(self, history_id: int) -> Optional[HistoryItem]:
        row = (
            await self._session.execute(
                select(SearchHistoryModel).where(SearchHistoryModel.id == history_id)
            )
        ).scalar_one_or_none()
        return HistoryItem.model_validate(row) if row else None
