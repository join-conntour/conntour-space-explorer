import { useState } from 'react';
import { sourcesApi } from '../services/api';
import type { SearchResult } from '../types';

export function useSearch() {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastQuery, setLastQuery] = useState('');

  const search = async (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) return;
    setLoading(true);
    setError(null);
    setLastQuery(trimmed);
    try {
      const response = await sourcesApi.search(trimmed);
      setResults(response.results);
    } catch {
      setError('Search failed. Please try again.');
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  return { results, loading, error, lastQuery, search };
}
