from typing import Optional

from fastapi import APIRouter, HTTPException, Query, status

from managers.search_manager import search_sources
from models import SearchResponse

router = APIRouter(prefix="/api", tags=["search"])

# Input validation constants
MAX_QUERY_LENGTH = 500
MIN_QUERY_LENGTH = 1


@router.get("/search", response_model=SearchResponse)
def search_sources_endpoint(
    q: str = Query(..., description="Search query string", min_length=MIN_QUERY_LENGTH, max_length=MAX_QUERY_LENGTH),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(20, ge=1, le=100, description="Items per page"),
    start_date: Optional[str] = Query(None, description="Optional start date filter for launch_date (ISO format: YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS)"),
    end_date: Optional[str] = Query(None, description="Optional end date filter for launch_date (ISO format: YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS)"),
) -> SearchResponse:
    """
    Search space images using natural language query.

    Query is validated for length and sanitized before processing.
    """
    # Additional validation: strip whitespace and check if empty after stripping
    query = q.strip()
    if not query:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Search query cannot be empty or only whitespace"
        )

    # Basic sanitization: remove any null bytes or control characters
    query = query.replace('\x00', '').replace('\r', ' ')

    if len(query) > MAX_QUERY_LENGTH:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Search query exceeds maximum length of {MAX_QUERY_LENGTH} characters"
        )

    return search_sources(query, page, limit, start_date, end_date)

