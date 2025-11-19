// Shared types and interfaces for the application

export interface Source {
  id: number;
  name: string;
  description: string;
  launch_date: string;
  image_url: string | null;
  thumb_url: string | null;
  medium_url: string | null;
  original_url: string | null;
  medium_width: number | null;
  medium_height: number | null;
  type: string;
  status: string;
  confidence?: number;
  keywords?: string[] | null;
}

export type ViewMode = 'browse' | 'history' | 'search' | 'detail';

export interface SourcesResponse {
  results: Source[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface SearchResponse {
  results: Source[];
  search_id: string;
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface SearchHistoryItem {
  id: string;
  query: string;
  timestamp: string;
  result_count: number;
}

export interface SearchHistoryResponse {
  items: SearchHistoryItem[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface SearchHistoryDetailResponse {
  id: string;
  query: string;
  timestamp: string;
  results: Source[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

