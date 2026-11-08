from __future__ import annotations

from typing import Optional

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from db.models import IngestIdempotencyModel


class IdempotencyRepository:
    """Postgres ledger for ingest idempotency keys."""

    def __init__(self, session: AsyncSession):
        self._session = session

    async def get(self, key: str) -> Optional[IngestIdempotencyModel]:
        result = await self._session.execute(
            select(IngestIdempotencyModel).where(IngestIdempotencyModel.idempotency_key == key)
        )
        return result.scalar_one_or_none()

    async def put(
        self,
        *,
        key: str,
        request_hash: str,
        source_id: int,
        bus: str,
    ) -> tuple[IngestIdempotencyModel, bool]:
        """
        Insert ledger row. Returns (row, inserted).
        inserted=False when the key already existed (concurrent writer won).
        """
        stmt = (
            insert(IngestIdempotencyModel)
            .values(
                idempotency_key=key,
                request_hash=request_hash,
                source_id=source_id,
                bus=bus,
            )
            .on_conflict_do_nothing(index_elements=["idempotency_key"])
            .returning(IngestIdempotencyModel)
        )
        result = await self._session.execute(stmt)
        row = result.scalar_one_or_none()
        await self._session.commit()
        if row is not None:
            return row, True
        existing = await self.get(key)
        if existing is None:
            raise RuntimeError(f"idempotency key {key!r} missing after conflict")
        return existing, False
