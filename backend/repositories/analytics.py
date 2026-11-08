from __future__ import annotations

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from models import (
    AnalyticsResponse,
    ClassificationStat,
    KeywordStat,
    UsageStats,
    ViewedSourceStat,
)


class AnalyticsRepository:
    """Aggregation queries for the admin dashboard."""

    def __init__(self, session: AsyncSession):
        self._session = session

    async def get_analytics(self) -> AnalyticsResponse:
        top_keywords = (
            await self._session.execute(
                text(
                    """
                    SELECT keyword, COUNT(*) AS count
                    FROM sources, unnest(keywords) AS keyword
                    GROUP BY keyword
                    ORDER BY count DESC, keyword ASC
                    LIMIT 10
                    """
                )
            )
        ).all()

        top_viewed = (
            await self._session.execute(
                text(
                    """
                    SELECT id, name, image_url, center, view_count
                    FROM sources
                    WHERE view_count > 0
                    ORDER BY view_count DESC, id ASC
                    LIMIT 10
                    """
                )
            )
        ).all()

        usage_row = (
            await self._session.execute(
                text(
                    """
                    SELECT
                      (SELECT COUNT(*) FROM sources) AS total_images,
                      (SELECT COUNT(*) FROM search_history) AS total_searches,
                      (SELECT COALESCE(SUM(result_count), 0) FROM search_history) AS history_result_rows,
                      (SELECT COALESCE(SUM(view_count), 0) FROM sources) AS total_views,
                      (SELECT COUNT(*) FROM sources WHERE cardinality(keywords) > 0) AS images_with_keywords,
                      (SELECT COUNT(*) FROM sources WHERE cardinality(object_tags) > 0) AS images_with_object_tags,
                      (SELECT COUNT(DISTINCT keyword) FROM sources, unnest(keywords) AS keyword) AS distinct_keywords,
                      (SELECT COUNT(DISTINCT tag) FROM sources, unnest(object_tags) AS tag) AS distinct_object_tags
                    """
                )
            )
        ).one()

        new_classifications = (
            await self._session.execute(
                text(
                    """
                    SELECT
                      i.tag,
                      i.source_id,
                      s.name AS source_name,
                      s.center,
                      i.capture_date
                    FROM object_tag_introductions i
                    JOIN sources s ON s.id = i.source_id
                    WHERE i.capture_date >= TIMESTAMPTZ '2020-01-01 00:00:00+00'
                    ORDER BY i.capture_date DESC NULLS LAST, i.tag ASC
                    LIMIT 20
                    """
                )
            )
        ).all()

        ingest_classifications = (
            await self._session.execute(
                text(
                    """
                    WITH latest AS (
                      SELECT MAX(indexed_at) AS max_indexed_at FROM object_tag_introductions
                    )
                    SELECT
                      i.tag,
                      i.source_id,
                      s.name AS source_name,
                      s.center,
                      i.capture_date
                    FROM object_tag_introductions i
                    JOIN sources s ON s.id = i.source_id
                    JOIN latest ON i.indexed_at = latest.max_indexed_at
                    ORDER BY i.tag ASC
                    """
                )
            )
        ).all()

        return AnalyticsResponse(
            top_keywords=[KeywordStat(keyword=r[0], count=r[1]) for r in top_keywords],
            top_viewed=[
                ViewedSourceStat(
                    id=r[0],
                    name=r[1],
                    image_url=r[2],
                    center=r[3],
                    view_count=r[4],
                )
                for r in top_viewed
            ],
            usage=UsageStats(
                total_images=int(usage_row[0] or 0),
                total_searches=int(usage_row[1] or 0),
                history_result_rows=int(usage_row[2] or 0),
                total_views=int(usage_row[3] or 0),
                images_with_keywords=int(usage_row[4] or 0),
                images_with_object_tags=int(usage_row[5] or 0),
                distinct_keywords=int(usage_row[6] or 0),
                distinct_object_tags=int(usage_row[7] or 0),
            ),
            new_classifications=[
                ClassificationStat(
                    tag=r[0],
                    source_id=r[1],
                    source_name=r[2],
                    center=r[3],
                    capture_date=r[4],
                )
                for r in new_classifications
            ],
            ingest_classifications=[
                ClassificationStat(
                    tag=r[0],
                    source_id=r[1],
                    source_name=r[2],
                    center=r[3],
                    capture_date=r[4],
                )
                for r in ingest_classifications
            ],
        )
