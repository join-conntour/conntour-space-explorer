export type SortKey = "most_viewed" | "most_recent" | "highest_confidence";
export type ExplorerMode = "browse" | "search" | "history";

export interface Source {
  id: number;
  name: string;
  type: string;
  launch_date: string;
  description: string;
  image_url?: string | null;
  status: string;
  nasa_id?: string | null;
  center?: string | null;
  location?: string | null;
  photographer?: string | null;
  secondary_creator?: string | null;
  description_508?: string | null;
  album: string[];
  creation_date?: string | null;
  indexed_at?: string | null;
  view_count: number;
  keywords: string[];
  keywords_raw: string[];
  object_tags: string[];
  image_full_url?: string | null;
}

export interface SourcePage {
  items: Source[];
  page: number;
  page_size: number;
  total: number;
  sort: SortKey;
}

export interface SourceCreatePayload {
  name: string;
  description?: string;
  description_508?: string;
  image_url?: string;
  image_full_url?: string;
  type?: string;
  status?: string;
  nasa_id?: string;
  center?: string;
  location?: string;
  photographer?: string;
  secondary_creator?: string;
  launch_date?: string;
  creation_date?: string;
  album?: string[];
  keywords?: string[];
  object_tags?: string[];
}

export interface SourceIngestResponse {
  source: Source | null;
  replayed: boolean;
  idempotency_key: string;
  bus: "http" | "kafka";
  status: "applied" | "accepted";
}

export interface ClassifyPreview {
  keywords: string[];
  object_tags: string[];
  visual_tags: string[];
  text_tags: string[];
  appearance_tags: string[];
  novel_candidates: string[];
}

export interface FacetValue {
  value: string;
  count: number;
}

export interface FacetResponse {
  centers: FacetValue[];
  keywords: FacetValue[];
  object_tags: FacetValue[];
  date_min?: string | null;
  date_max?: string | null;
}

export interface SearchFilters {
  centers: string[];
  keywords: string[];
  object_tags: string[];
  date_from?: string | null;
  date_to?: string | null;
  sort?: SortKey | null;
}

export interface SearchHit {
  source: Source;
  confidence: number;
  matched_object_tags: string[];
  matched_keywords: string[];
  matched_terms: string[];
}

export interface SearchResponse {
  query: string;
  activated_object_tags: string[];
  page: number;
  page_size: number;
  total: number;
  sort: SortKey;
  results: SearchHit[];
  history_id?: number | null;
}

export interface HistoryResultSnapshot {
  source_id: number;
  name: string;
  image_url?: string | null;
  center?: string | null;
  creation_date?: string | null;
  confidence: number;
  matched_object_tags: string[];
  matched_keywords: string[];
  matched_terms: string[];
}

export interface HistoryItem {
  id: number;
  query: string;
  filters: SearchFilters;
  activated_object_tags: string[];
  results: HistoryResultSnapshot[];
  result_count: number;
  created_at: string;
}

export interface HistoryPage {
  items: HistoryItem[];
  page: number;
  page_size: number;
  total: number;
}

export interface ViewResponse {
  id: number;
  view_count: number;
}

export interface AnalyticsResponse {
  top_keywords: { keyword: string; count: number }[];
  top_viewed: {
    id: number;
    name: string;
    image_url?: string | null;
    center?: string | null;
    view_count: number;
  }[];
  usage: {
    total_images: number;
    total_searches: number;
    history_result_rows: number;
    total_views: number;
    images_with_keywords: number;
    images_with_object_tags: number;
    distinct_keywords: number;
    distinct_object_tags: number;
  };
  new_classifications: {
    tag: string;
    source_id: number;
    source_name: string;
    center?: string | null;
    capture_date?: string | null;
  }[];
  ingest_classifications: {
    tag: string;
    source_id: number;
    source_name: string;
    center?: string | null;
    capture_date?: string | null;
  }[];
}

export interface GalleryFilters {
  centers: string[];
  keywords: string[];
  objectTags: string[];
  dateFrom?: string;
  dateTo?: string;
}
