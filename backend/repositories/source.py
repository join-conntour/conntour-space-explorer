from typing import List, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from db.models import SourceModel
from models import Source
from repositories.base import Repository


class SourceRepository(Repository[Source]):
    """
    PostgreSQL repository implementation for Source entities.

    Implements the generic Repository interface with PostgreSQL
    as the backing data store using SQLAlchemy async.
    """

    def __init__(self, session: AsyncSession):
        self._session = session

    async def get_all(self) -> List[Source]:
        """Retrieve all sources from the database."""
        result = await self._session.execute(select(SourceModel))
        return [Source.model_validate(row) for row in result.scalars().all()]

    async def get_by_id(self, id: int) -> Optional[Source]:
        """Retrieve a single source by ID."""
        result = await self._session.execute(
            select(SourceModel).where(SourceModel.id == id)
        )
        row = result.scalar_one_or_none()
        return Source.model_validate(row) if row else None

    async def get_all_as_dicts(self) -> List[dict]:
        """Fetch only the columns needed for scoring (avoids transferring unused fields)."""
        result = await self._session.execute(
            select(SourceModel.id, SourceModel.name, SourceModel.keywords, SourceModel.description)
        )
        return [
            {
                "id": r.id,
                "name": r.name,
                "keywords": r.keywords or "",
                "description": r.description or "",
            }
            for r in result.all()
        ]

    async def get_by_ids(self, ids: List[int]) -> List[Source]:
        """Fetch full Source objects for a list of IDs, preserving the given order."""
        if not ids:
            return []
        result = await self._session.execute(
            select(SourceModel).where(SourceModel.id.in_(ids))
        )
        rows = {row.id: row for row in result.scalars().all()}
        return [Source.model_validate(rows[i]) for i in ids if i in rows]
