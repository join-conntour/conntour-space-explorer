from typing import Optional

from fastapi import APIRouter, Query

from managers.sources_manager import get_all_sources_paginated
from models import SourcesResponse

router = APIRouter(prefix="/api", tags=["sources"])


@router.get("/sources", response_model=SourcesResponse)
def get_sources_endpoint(
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(20, ge=1, le=100, description="Items per page"),
    start_date: Optional[str] = Query(None, description="Optional start date filter for launch_date (ISO format: YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS)"),
    end_date: Optional[str] = Query(None, description="Optional end date filter for launch_date (ISO format: YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS)"),
) -> SourcesResponse:
    """Get paginated space image sources with optional date filtering."""
    return get_all_sources_paginated(page, limit, start_date, end_date)
