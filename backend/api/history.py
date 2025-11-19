import logging
from typing import Optional

from fastapi import APIRouter, HTTPException, Query, status

from managers.history_manager import (
    delete_search,
    get_search_by_id,
    get_search_history,
)
from models import SearchHistoryDetailResponse, SearchHistoryResponse

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["history"])


@router.get("/search-history", response_model=SearchHistoryResponse)
def get_search_history_endpoint(
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(10, ge=1, le=100, description="Items per page"),
    start_date: Optional[str] = Query(None, description="Optional start date filter (ISO format: YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS)"),
    end_date: Optional[str] = Query(None, description="Optional end date filter (ISO format: YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS)"),
) -> SearchHistoryResponse:
    """Get paginated search history with optional date filtering."""
    try:
        return get_search_history(page, limit, start_date, end_date)
    except Exception as e:
        logger.error(f"Error fetching search history: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve search history"
        ) from e


@router.get("/search-history/{search_id}", response_model=SearchHistoryDetailResponse)
def get_search_by_id_endpoint(
    search_id: str,
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(10, ge=1, le=100, description="Items per page"),
) -> SearchHistoryDetailResponse:
    """Get a specific search result by ID with pagination."""
    try:
        result = get_search_by_id(search_id, page, limit)
        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Search with ID '{search_id}' not found"
            )
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching search by ID {search_id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve search details"
        ) from e


@router.delete("/search-history/{search_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_search_endpoint(search_id: str) -> None:
    """Delete a search from history."""
    try:
        deleted = delete_search(search_id)
        if not deleted:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Search with ID '{search_id}' not found"
            )
        return None
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting search {search_id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete search"
        ) from e

