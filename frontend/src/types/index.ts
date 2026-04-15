export interface Source {
  id: number;
  name: string;
  description: string;
  launch_date: string;
  image_url: string | null;
  type: string;
  status: string;
  keywords: string;
}

export interface SearchResult {
  source: Source;
  score: number;
}

export interface SearchResponse {
  query: string;
  results: SearchResult[];
  total: number;
}

export interface RelatedResult {
  source: Source;
  similarity: number;
}

export interface SearchHistoryEntry {
  id: number;
  query: string;
  result_count: number;
  created_at: string;
  results_json: string | null;
}

export interface SearchHistoryPage {
  items: SearchHistoryEntry[];
  total: number;
  page: number;
  page_size: number;
}
