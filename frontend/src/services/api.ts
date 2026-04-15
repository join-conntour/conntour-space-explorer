import axios from 'axios';
import type { RelatedResult, SearchHistoryPage, SearchResponse, Source } from '../types';

const api = axios.create({ baseURL: '/api' });

export const sourcesApi = {
  getAll: (): Promise<Source[]> =>
    api.get('/sources').then((r) => r.data),

  search: (query: string): Promise<SearchResponse> =>
    api.post('/sources/search', { query }).then((r) => r.data),

  getRelated: (id: number, limit = 5): Promise<RelatedResult[]> =>
    api.get(`/sources/${id}/related`, { params: { limit } }).then((r) => r.data),
};

export const historyApi = {
  getPage: (page: number, pageSize = 10): Promise<SearchHistoryPage> =>
    api.get('/history', { params: { page, page_size: pageSize } }).then((r) => r.data),

  delete: (id: number): Promise<void> =>
    api.delete(`/history/${id}`).then(() => undefined),
};
