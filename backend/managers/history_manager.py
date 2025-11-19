from typing import Optional

from db_instance import db
from models import (
    SearchHistoryDetailResponse,
    SearchHistoryItem,
    SearchHistoryResponse,
    Source,
)


def get_search_history(page: int, limit: int, start_date: Optional[str] = None, end_date: Optional[str] = None) -> SearchHistoryResponse:
    """Get paginated search history with optional date filtering."""
    items, total = db.get_search_history(page, limit, start_date, end_date)

    total_pages: int = (total + limit - 1) // limit if total > 0 else 0

    history_items: list[SearchHistoryItem] = [
        SearchHistoryItem(
            id=item["id"],
            query=item["query"],
            timestamp=item["timestamp"],
            result_count=item["result_count"],
        )
        for item in items
    ]

    return SearchHistoryResponse(
        items=history_items,
        total=total,
        page=page,
        limit=limit,
        total_pages=total_pages,
    )


def get_search_by_id(search_id: str, page: int = 1, limit: int = 10) -> Optional[SearchHistoryDetailResponse]:
    """Get a specific search result by ID with pagination."""
    search_data: Optional[dict] = db.get_search_by_id(search_id)

    if not search_data:
        return None

    # Paginate results
    all_results = search_data["results"]
    total = len(all_results)
    start = (page - 1) * limit
    end = start + limit
    paginated_results = all_results[start:end]

    # Convert paginated results to Source objects
    results: list[Source] = [
        Source(
            id=r["id"],
            name=r["name"],
            type=r["type"],
            launch_date=r["launch_date"],
            description=r["description"],
            image_url=r.get("image_url"),
            thumb_url=r.get("thumb_url"),
            medium_url=r.get("medium_url"),
            original_url=r.get("original_url"),
            medium_width=r.get("medium_width"),
            medium_height=r.get("medium_height"),
            status=r["status"],
            confidence=r.get("confidence"),
            keywords=r.get("keywords"),
        )
        for r in paginated_results
    ]

    total_pages: int = (total + limit - 1) // limit if total > 0 else 0

    return SearchHistoryDetailResponse(
        id=search_data["id"],
        query=search_data["query"],
        timestamp=search_data["timestamp"],
        results=results,
        total=total,
        page=page,
        limit=limit,
        total_pages=total_pages,
    )


def delete_search(search_id: str) -> bool:
    """Delete a search from history."""
    deleted = db.delete_search(search_id)
    return deleted

