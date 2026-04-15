import { useCallback, useEffect, useState } from 'react';
import { historyApi } from '../services/api';
import type { SearchHistoryPage } from '../types';

export function useSearchHistory(initialPage = 1, pageSize = 10) {
  const [data, setData] = useState<SearchHistoryPage | null>(null);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPage = useCallback(
    (page: number) => {
      setLoading(true);
      historyApi
        .getPage(page, pageSize)
        .then(setData)
        .catch(() => setError('Failed to load history.'))
        .finally(() => setLoading(false));
    },
    [pageSize],
  );

  useEffect(() => {
    fetchPage(currentPage);
  }, [currentPage, fetchPage]);

  const goToPage = (page: number) => setCurrentPage(page);

  const deleteEntry = async (id: number) => {
    await historyApi.delete(id);
    fetchPage(currentPage);
  };

  return { data, currentPage, loading, error, goToPage, deleteEntry };
}
