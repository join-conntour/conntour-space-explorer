from typing import Optional

from pydantic import BaseModel, Field


class Source(BaseModel):
    id: int
    name: str
    type: str
    launch_date: str
    description: str
    image_url: Optional[str] = None
    thumb_url: Optional[str] = None
    medium_url: Optional[str] = None
    original_url: Optional[str] = None
    medium_width: Optional[int] = None
    medium_height: Optional[int] = None
    status: str
    confidence: Optional[float] = None
    keywords: Optional[list[str]] = None


# Request Models
class SearchHistoryQueryParams(BaseModel):
    page: int = Field(1, ge=1, description="Page number")
    limit: int = Field(10, ge=1, le=100, description="Items per page")


# Response Models
class SourcesResponse(BaseModel):
    results: list[Source]
    total: int
    page: int
    limit: int
    total_pages: int


class SearchResponse(BaseModel):
    results: list[Source]
    search_id: str
    total: int
    page: int
    limit: int
    total_pages: int


class SearchHistoryItem(BaseModel):
    id: str
    query: str
    timestamp: str
    result_count: int


class SearchHistoryResponse(BaseModel):
    items: list[SearchHistoryItem]
    total: int
    page: int
    limit: int
    total_pages: int


class SearchHistoryDetailResponse(BaseModel):
    id: str
    query: str
    timestamp: str
    results: list[Source]
    total: int
    page: int
    limit: int
    total_pages: int
