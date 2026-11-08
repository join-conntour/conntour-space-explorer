from datetime import date, datetime
from typing import List, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field

SortKey = Literal["most_viewed", "most_recent", "highest_confidence"]


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
    nasa_id: Optional[str] = None
    center: Optional[str] = None
    location: Optional[str] = None
    photographer: Optional[str] = None
    secondary_creator: Optional[str] = None
    description_508: Optional[str] = None
    album: List[str] = Field(default_factory=list)
    creation_date: Optional[datetime] = None
    indexed_at: Optional[datetime] = None
    view_count: int = 0
    keywords: List[str] = Field(default_factory=list)
    keywords_raw: List[str] = Field(default_factory=list)
    object_tags: List[str] = Field(default_factory=list)
    image_full_url: Optional[str] = None


class SourcePage(BaseModel):
    items: List[Source]
    page: int
    page_size: int
    total: int
    sort: SortKey


class SourceCreate(BaseModel):
    name: str = Field(min_length=1)
    description: str = ""
    description_508: str = ""
    image_url: Optional[str] = None
    image_full_url: Optional[str] = None
    type: str = "image"
    status: str = "Active"
    nasa_id: Optional[str] = None
    center: Optional[str] = None
    location: Optional[str] = None
    photographer: Optional[str] = None
    secondary_creator: Optional[str] = None
    launch_date: str = ""
    creation_date: Optional[datetime] = None
    album: List[str] = Field(default_factory=list)
    keywords: List[str] = Field(default_factory=list)
    object_tags: List[str] = Field(default_factory=list)


class SourceIngestResponse(BaseModel):
    source: Optional[Source] = None
    replayed: bool = False
    idempotency_key: str
    bus: Literal["http", "kafka"] = "http"
    status: Literal["applied", "accepted"] = "applied"


class ClassifyPreviewRequest(BaseModel):
    name: str = ""
    description: str = ""
    description_508: str = ""
    nasa_id: Optional[str] = None
    keywords: List[str] = Field(default_factory=list)
    object_tags: List[str] = Field(default_factory=list)


class ClassifyPreviewResponse(BaseModel):
    keywords: List[str]
    object_tags: List[str]
    visual_tags: List[str]
    text_tags: List[str]
    appearance_tags: List[str] = Field(default_factory=list)
    novel_candidates: List[str] = Field(default_factory=list)


class FacetValue(BaseModel):
    value: str
    count: int


class FacetResponse(BaseModel):
    centers: List[FacetValue]
    keywords: List[FacetValue]
    object_tags: List[FacetValue]
    date_min: Optional[date] = None
    date_max: Optional[date] = None


class SearchFilters(BaseModel):
    centers: List[str] = Field(default_factory=list)
    keywords: List[str] = Field(default_factory=list)
    object_tags: List[str] = Field(default_factory=list)
    date_from: Optional[date] = None
    date_to: Optional[date] = None
    sort: Optional[SortKey] = None


class SearchRequest(BaseModel):
    query: str
    filters: SearchFilters = Field(default_factory=SearchFilters)
    sort: SortKey = "highest_confidence"
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=20, ge=1, le=60)
    record_history: bool = True


class SearchHit(BaseModel):
    source: Source
    confidence: float
    matched_object_tags: List[str] = Field(default_factory=list)
    matched_keywords: List[str] = Field(default_factory=list)
    matched_terms: List[str] = Field(default_factory=list)


class SearchResponse(BaseModel):
    query: str
    activated_object_tags: List[str] = Field(default_factory=list)
    page: int
    page_size: int
    total: int
    sort: SortKey
    results: List[SearchHit]
    history_id: Optional[int] = None


class HistoryResultSnapshot(BaseModel):
    source_id: int
    name: str
    image_url: Optional[str] = None
    center: Optional[str] = None
    creation_date: Optional[datetime] = None
    confidence: float
    matched_object_tags: List[str] = Field(default_factory=list)
    matched_keywords: List[str] = Field(default_factory=list)
    matched_terms: List[str] = Field(default_factory=list)


class HistoryItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    query: str
    filters: SearchFilters
    activated_object_tags: List[str] = Field(default_factory=list)
    results: List[HistoryResultSnapshot] = Field(default_factory=list)
    result_count: int
    created_at: datetime


class HistoryPage(BaseModel):
    items: List[HistoryItem]
    page: int
    page_size: int
    total: int


class ViewResponse(BaseModel):
    id: int
    view_count: int


class KeywordStat(BaseModel):
    keyword: str
    count: int


class ViewedSourceStat(BaseModel):
    id: int
    name: str
    image_url: Optional[str] = None
    center: Optional[str] = None
    view_count: int


class UsageStats(BaseModel):
    total_images: int
    total_searches: int
    history_result_rows: int
    total_views: int
    images_with_keywords: int
    images_with_object_tags: int
    distinct_keywords: int
    distinct_object_tags: int


class ClassificationStat(BaseModel):
    tag: str
    source_id: int
    source_name: str
    center: Optional[str] = None
    capture_date: Optional[datetime] = None


class AnalyticsResponse(BaseModel):
    top_keywords: List[KeywordStat]
    top_viewed: List[ViewedSourceStat]
    usage: UsageStats
    new_classifications: List[ClassificationStat]
    ingest_classifications: List[ClassificationStat]
