import axios from "axios";
import type {
  AnalyticsResponse,
  ClassifyPreview,
  FacetResponse,
  GalleryFilters,
  HistoryPage,
  SearchFilters,
  SearchResponse,
  SortKey,
  Source,
  SourceCreatePayload,
  SourceIngestResponse,
  SourcePage,
  ViewResponse,
} from "../types";

const api = axios.create({
  baseURL: "/api",
});

function toSearchFilters(filters: GalleryFilters, sort?: SortKey): SearchFilters {
  return {
    centers: filters.centers,
    keywords: filters.keywords,
    object_tags: filters.objectTags,
    date_from: filters.dateFrom || null,
    date_to: filters.dateTo || null,
    sort: sort || null,
  };
}

export async function fetchSources(params: {
  page: number;
  pageSize: number;
  sort: SortKey;
  filters: GalleryFilters;
}): Promise<SourcePage> {
  const response = await api.get<SourcePage>("/sources", {
    params: {
      page: params.page,
      page_size: params.pageSize,
      sort: params.sort === "highest_confidence" ? "most_recent" : params.sort,
      center: params.filters.centers,
      keyword: params.filters.keywords,
      object_tag: params.filters.objectTags,
      date_from: params.filters.dateFrom || undefined,
      date_to: params.filters.dateTo || undefined,
    },
    paramsSerializer: {
      indexes: null,
    },
  });
  return response.data;
}

export async function fetchSource(id: number): Promise<Source> {
  const response = await api.get<Source>(`/sources/${id}`);
  return response.data;
}

export async function createSource(
  payload: SourceCreatePayload,
  idempotencyKey?: string
): Promise<SourceIngestResponse> {
  const response = await api.post<SourceIngestResponse>("/sources", payload, {
    headers: idempotencyKey ? { "Idempotency-Key": idempotencyKey } : undefined,
  });
  return response.data;
}

export async function deleteSource(id: number): Promise<void> {
  await api.delete(`/sources/${id}`);
}

export async function previewClassification(payload: {
  name?: string;
  description?: string;
  description_508?: string;
  nasa_id?: string;
  keywords?: string[];
  object_tags?: string[];
}): Promise<ClassifyPreview> {
  const response = await api.post<ClassifyPreview>("/classify/preview", payload);
  return response.data;
}

export async function recordView(id: number, viewKey: string): Promise<ViewResponse> {
  const response = await api.post<ViewResponse>(
    `/sources/${id}/view`,
    {},
    { headers: { "X-View-Key": viewKey } }
  );
  return response.data;
}

export async function fetchFacets(): Promise<FacetResponse> {
  const response = await api.get<FacetResponse>("/facets");
  return response.data;
}

export async function searchImages(params: {
  query: string;
  filters: GalleryFilters;
  sort: SortKey;
  page: number;
  pageSize: number;
  recordHistory: boolean;
}): Promise<SearchResponse> {
  const response = await api.post<SearchResponse>("/search", {
    query: params.query,
    filters: toSearchFilters(params.filters, params.sort),
    sort: params.sort,
    page: params.page,
    page_size: params.pageSize,
    record_history: params.recordHistory,
  });
  return response.data;
}

export async function fetchHistory(page: number, pageSize = 10): Promise<HistoryPage> {
  const response = await api.get<HistoryPage>("/history", {
    params: { page, page_size: pageSize },
  });
  return response.data;
}

export async function deleteHistory(id: number): Promise<void> {
  await api.delete(`/history/${id}`);
}

export async function clearHistory(): Promise<void> {
  await api.delete("/history");
}

export async function fetchAnalytics(token: string): Promise<AnalyticsResponse> {
  const response = await api.get<AnalyticsResponse>("/admin/analytics", {
    headers: { "X-Admin-Token": token },
  });
  return response.data;
}
