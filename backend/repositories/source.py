from __future__ import annotations

from datetime import date, datetime, timedelta, timezone
from typing import List, Optional, Sequence

from sqlalchemy import and_, delete, func, select, text, update
from sqlalchemy.ext.asyncio import AsyncSession

from db.models import IngestIdempotencyModel, ObjectTagIntroductionModel, SourceModel
from models import (
    FacetResponse,
    FacetValue,
    SortKey,
    Source,
    SourceCreate,
    SourcePage,
)
from repositories.base import Repository
from services.tag_extractor import classify_source, normalize_keywords


class SourceRepository(Repository[Source]):
    """PostgreSQL repository for Source entities."""

    def __init__(self, session: AsyncSession):
        self._session = session

    async def get_all(self) -> List[Source]:
        result = await self._session.execute(select(SourceModel).order_by(SourceModel.id.asc()))
        return [Source.model_validate(row) for row in result.scalars().all()]

    async def get_by_id(self, source_id: int) -> Optional[Source]:
        result = await self._session.execute(
            select(SourceModel).where(SourceModel.id == source_id)
        )
        row = result.scalar_one_or_none()
        return Source.model_validate(row) if row else None

    def _filter_clause(
        self,
        *,
        centers: Sequence[str] | None = None,
        keywords: Sequence[str] | None = None,
        object_tags: Sequence[str] | None = None,
        date_from: date | None = None,
        date_to: date | None = None,
    ):
        clauses = []
        if centers:
            clauses.append(SourceModel.center.in_(list(centers)))
        if keywords:
            clauses.append(SourceModel.keywords.contains(list(keywords)))
        if object_tags:
            clauses.append(SourceModel.object_tags.contains(list(object_tags)))
        if date_from is not None:
            start = datetime.combine(date_from, datetime.min.time(), tzinfo=timezone.utc)
            clauses.append(SourceModel.creation_date >= start)
        if date_to is not None:
            end = datetime.combine(date_to + timedelta(days=1), datetime.min.time(), tzinfo=timezone.utc)
            clauses.append(SourceModel.creation_date < end)
        if not clauses:
            return None
        return and_(*clauses)

    def _order_by(self, sort: SortKey):
        if sort == "most_viewed":
            return SourceModel.view_count.desc(), SourceModel.id.asc()
        # highest_confidence on browse falls back to most_recent
        return SourceModel.creation_date.desc().nullslast(), SourceModel.id.asc()

    async def list_page(
        self,
        *,
        page: int = 1,
        page_size: int = 20,
        sort: SortKey = "most_recent",
        centers: Sequence[str] | None = None,
        keywords: Sequence[str] | None = None,
        object_tags: Sequence[str] | None = None,
        date_from: date | None = None,
        date_to: date | None = None,
    ) -> SourcePage:
        effective_sort: SortKey = "most_recent" if sort == "highest_confidence" else sort
        where = self._filter_clause(
            centers=centers,
            keywords=keywords,
            object_tags=object_tags,
            date_from=date_from,
            date_to=date_to,
        )
        count_stmt = select(func.count()).select_from(SourceModel)
        list_stmt = select(SourceModel)
        if where is not None:
            count_stmt = count_stmt.where(where)
            list_stmt = list_stmt.where(where)

        total = int((await self._session.execute(count_stmt)).scalar_one())
        list_stmt = (
            list_stmt.order_by(*self._order_by(effective_sort))
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
        rows = (await self._session.execute(list_stmt)).scalars().all()
        return SourcePage(
            items=[Source.model_validate(row) for row in rows],
            page=page,
            page_size=page_size,
            total=total,
            sort=effective_sort,
        )

    async def list_filtered(
        self,
        *,
        centers: Sequence[str] | None = None,
        keywords: Sequence[str] | None = None,
        object_tags: Sequence[str] | None = None,
        date_from: date | None = None,
        date_to: date | None = None,
    ) -> List[Source]:
        where = self._filter_clause(
            centers=centers,
            keywords=keywords,
            object_tags=object_tags,
            date_from=date_from,
            date_to=date_to,
        )
        stmt = select(SourceModel)
        if where is not None:
            stmt = stmt.where(where)
        stmt = stmt.order_by(SourceModel.id.asc())
        rows = (await self._session.execute(stmt)).scalars().all()
        return [Source.model_validate(row) for row in rows]

    async def get_facets(self) -> FacetResponse:
        centers_rows = (
            await self._session.execute(
                select(SourceModel.center, func.count())
                .where(SourceModel.center.is_not(None))
                .group_by(SourceModel.center)
                .order_by(func.count().desc(), SourceModel.center.asc())
            )
        ).all()

        keyword_rows = (
            await self._session.execute(
                text(
                    """
                    SELECT keyword AS value, COUNT(*) AS count
                    FROM sources, unnest(keywords) AS keyword
                    GROUP BY keyword
                    ORDER BY count DESC, keyword ASC
                    """
                )
            )
        ).all()

        object_rows = (
            await self._session.execute(
                text(
                    """
                    SELECT tag AS value, COUNT(*) AS count
                    FROM sources, unnest(object_tags) AS tag
                    GROUP BY tag
                    ORDER BY count DESC, tag ASC
                    """
                )
            )
        ).all()

        date_bounds = (
            await self._session.execute(
                select(func.min(SourceModel.creation_date), func.max(SourceModel.creation_date))
            )
        ).one()

        date_min = date_bounds[0].date() if date_bounds[0] else None
        date_max = date_bounds[1].date() if date_bounds[1] else None

        return FacetResponse(
            centers=[FacetValue(value=row[0], count=row[1]) for row in centers_rows if row[0]],
            keywords=[FacetValue(value=row[0], count=row[1]) for row in keyword_rows],
            object_tags=[FacetValue(value=row[0], count=row[1]) for row in object_rows],
            date_min=date_min,
            date_max=date_max,
        )

    async def increment_view(self, source_id: int) -> Optional[int]:
        result = await self._session.execute(
            update(SourceModel)
            .where(SourceModel.id == source_id)
            .values(view_count=SourceModel.view_count + 1)
            .returning(SourceModel.view_count)
        )
        await self._session.commit()
        value = result.scalar_one_or_none()
        return int(value) if value is not None else None

    async def delete(self, source_id: int) -> bool:
        existing = await self.get_by_id(source_id)
        if existing is None:
            return False
        await self._session.execute(
            delete(IngestIdempotencyModel).where(IngestIdempotencyModel.source_id == source_id)
        )
        await self._session.execute(
            delete(ObjectTagIntroductionModel).where(
                ObjectTagIntroductionModel.source_id == source_id
            )
        )
        result = await self._session.execute(
            delete(SourceModel).where(SourceModel.id == source_id)
        )
        await self._session.commit()
        if result.rowcount:
            await self._refresh_tag_introductions()
        return bool(result.rowcount)

    async def create(self, payload: SourceCreate) -> Source:
        now = datetime.now(timezone.utc)
        raw_keywords = [str(k) for k in payload.keywords if str(k).strip()]
        keywords = normalize_keywords(raw_keywords)
        object_tags = classify_source(
            title=payload.name,
            description=payload.description,
            description_508=payload.description_508,
            keywords=raw_keywords,
            nasa_id=payload.nasa_id,
            extra_object_tags=payload.object_tags,
            persist_novel_tags=True,
        )
        creation_date = payload.creation_date
        if creation_date is None and payload.launch_date:
            raw = payload.launch_date.strip()
            if raw.endswith("Z"):
                raw = raw[:-1] + "+00:00"
            try:
                creation_date = datetime.fromisoformat(raw)
                if creation_date.tzinfo is None:
                    creation_date = creation_date.replace(tzinfo=timezone.utc)
            except ValueError:
                creation_date = now

        nasa_id = (payload.nasa_id or "").strip() or None
        existing = None
        if nasa_id:
            existing = (
                await self._session.execute(
                    select(SourceModel).where(SourceModel.nasa_id == nasa_id)
                )
            ).scalar_one_or_none()

        if existing is not None:
            existing.name = payload.name.strip()
            existing.type = payload.type or existing.type or "image"
            existing.launch_date = payload.launch_date or (
                creation_date.isoformat() if creation_date else existing.launch_date
            )
            existing.description = payload.description or ""
            existing.image_url = payload.image_url or existing.image_url
            existing.status = payload.status or existing.status or "Active"
            existing.center = payload.center
            existing.location = payload.location
            existing.photographer = payload.photographer
            existing.secondary_creator = payload.secondary_creator
            existing.description_508 = payload.description_508 or None
            existing.album = list(payload.album or [])
            existing.creation_date = creation_date or existing.creation_date or now
            existing.keywords = keywords
            existing.keywords_raw = raw_keywords
            existing.object_tags = object_tags
            existing.image_full_url = payload.image_full_url or payload.image_url or existing.image_full_url
            await self._session.commit()
            await self._session.refresh(existing)
            await self._refresh_tag_introductions()
            return Source.model_validate(existing)

        next_id = int(
            (
                await self._session.execute(select(func.coalesce(func.max(SourceModel.id), 0) + 1))
            ).scalar_one()
        )
        row = SourceModel(
            id=next_id,
            name=payload.name.strip(),
            type=payload.type or "image",
            launch_date=payload.launch_date or (creation_date.isoformat() if creation_date else ""),
            description=payload.description or "",
            image_url=payload.image_url,
            status=payload.status or "Active",
            nasa_id=nasa_id,
            center=payload.center,
            location=payload.location,
            photographer=payload.photographer,
            secondary_creator=payload.secondary_creator,
            description_508=payload.description_508 or None,
            album=list(payload.album or []),
            creation_date=creation_date or now,
            indexed_at=now,
            view_count=0,
            keywords=keywords,
            keywords_raw=raw_keywords,
            object_tags=object_tags,
            image_full_url=payload.image_full_url or payload.image_url,
        )
        self._session.add(row)
        await self._session.commit()
        await self._session.refresh(row)
        await self._refresh_tag_introductions()
        return Source.model_validate(row)

    async def _refresh_tag_introductions(self) -> None:
        await self._session.execute(text("DELETE FROM object_tag_introductions"))
        await self._session.execute(
            text(
                """
                INSERT INTO object_tag_introductions (tag, source_id, capture_date, indexed_at)
                SELECT DISTINCT ON (tag)
                    tag,
                    s.id AS source_id,
                    s.creation_date AS capture_date,
                    s.indexed_at AS indexed_at
                FROM sources s
                CROSS JOIN LATERAL unnest(s.object_tags) AS tag
                ORDER BY tag, s.creation_date ASC NULLS LAST, s.id ASC
                """
            )
        )
        await self._session.commit()
