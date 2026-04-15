from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict


class Source(BaseModel):
    """Domain model for NASA image sources."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    type: str
    launch_date: str
    description: str = ""
    image_url: Optional[str] = None
    status: str
    keywords: str = ""


class SearchRequest(BaseModel):
    query: str


class SearchResult(BaseModel):
    source: Source
    score: float


class SearchResponse(BaseModel):
    query: str
    results: List[SearchResult]
    total: int


class RelatedResult(BaseModel):
    source: Source
    similarity: float


class SearchHistoryEntry(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    query: str
    result_count: int
    created_at: datetime
    results_json: Optional[str] = None


class SearchHistoryPage(BaseModel):
    items: List[SearchHistoryEntry]
    total: int
    page: int
    page_size: int
