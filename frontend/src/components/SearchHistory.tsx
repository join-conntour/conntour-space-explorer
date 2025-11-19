import React, { useEffect, useState, useRef } from 'react';
import { debounce, DebouncedFunc } from 'lodash';
import apiClient from '../api';
import {
  Source,
  SearchHistoryItem,
  SearchHistoryResponse,
  SearchHistoryDetailResponse,
} from '../types';
import SearchHistoryItemComponent from './SearchHistoryItem';
import { Button, Icon, EmptyState, Pagination, ResultsCount, LoadingSpinner } from './shared';
import { cardClasses, textClasses } from '../styles/classes';
import { formatRelativeDate, isInvalidDate } from '../utils/dateUtils';
import { PAGINATION_LIMIT } from '../constants';

interface SearchHistoryProps {
  onSelectSearch: (
    results: Source[],
    searchId?: string,
    pagination?: { total: number; page: number; limit: number; total_pages: number }
  ) => void;
  currentSearchId?: string;
  inline?: boolean;
  startDate?: string;
  endDate?: string;
}

const SearchHistory: React.FC<SearchHistoryProps> = ({ onSelectSearch, currentSearchId, inline = false, startDate = '', endDate = '' }) => {
  const [history, setHistory] = useState<SearchHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(PAGINATION_LIMIT);
  const [isOpen, setIsOpen] = useState(false);

  const fetchHistoryRef = useRef<DebouncedFunc<(pageNum: number, start?: string, end?: string) => Promise<void>> | null>(null);

  const fetchHistory = async (pageNum: number, start?: string, end?: string) => {
    try {
      setLoading(true);
      const params: { page: number; limit: number; start_date?: string; end_date?: string } = {
        page: pageNum,
        limit: PAGINATION_LIMIT,
      };
      if (start) params.start_date = start;
      if (end) params.end_date = end;
      
      const response = await apiClient.get<SearchHistoryResponse>('/api/search-history', { params });
      setHistory(response.data.items);
      setTotalPages(response.data.total_pages);
      setTotal(response.data.total);
      setLimit(response.data.limit);
    } catch (err) {
      console.error('Failed to fetch search history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Don't make API call if dates are invalid
    if (isInvalidDate(startDate) || isInvalidDate(endDate)) {
      return;
    }

    const fetchHistoryDebounced = async (pageNum: number, start?: string, end?: string) => {
      await fetchHistory(pageNum, start, end);
    };

    // Create debounced version if it doesn't exist
    if (!fetchHistoryRef.current) {
      fetchHistoryRef.current = debounce(fetchHistoryDebounced, 400);
    } else {
      // Cancel previous debounced call and create new one with updated closure
      fetchHistoryRef.current.cancel();
      fetchHistoryRef.current = debounce(fetchHistoryDebounced, 400);
    }

    if (fetchHistoryRef.current) {
      fetchHistoryRef.current(page, startDate || undefined, endDate || undefined);
    }

    // Cleanup function to cancel pending debounced calls
    return () => {
      if (fetchHistoryRef.current) {
        fetchHistoryRef.current.cancel();
      }
    };
  }, [page, startDate, endDate]);

  useEffect(() => {
    // Reset to first page when filters change
    setPage(1);
  }, [startDate, endDate]);

  const handleSelectSearch = async (searchId: string) => {
    try {
      const response = await apiClient.get<SearchHistoryDetailResponse>(`/api/search-history/${searchId}`, {
        params: { page: 1, limit: PAGINATION_LIMIT },
      });
      onSelectSearch(
        response.data.results,
        searchId,
        {
          total: response.data.total,
          page: response.data.page,
          limit: response.data.limit,
          total_pages: response.data.total_pages,
        }
      );
      if (!inline) {
        setIsOpen(false);
      }
    } catch (err) {
      console.error('Failed to fetch search details:', err);
    }
  };

  const handleDelete = async (searchId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this search?')) {
      return;
    }

    try {
      await apiClient.delete(`/api/search-history/${searchId}`);
      fetchHistory(page);
    } catch (err) {
      console.error('Failed to delete search:', err);
    }
  };

  const formatDate = (timestamp: string) => {
    return formatRelativeDate(new Date(timestamp));
  };

  // Inline mode - show history directly in the gallery area
  if (inline) {
    return (
      <div className="mb-8">
        <h2 className={`${textClasses.heading2} mb-6`}>Search History</h2>
        
        {loading ? (
          <LoadingSpinner size="md" className="py-12" />
        ) : !history || history.length === 0 ? (
          <EmptyState message={`No search history found${(startDate || endDate) ? ' for the selected date range' : ''}`} />
        ) : (
          <>
            {/* Top Pagination */}
            {total > 0 && (
              <div className="mb-8">
                {totalPages > 1 && (
                  <Pagination
                    currentPage={page}
                    totalPages={totalPages}
                    onPageChange={(newPage) => setPage(newPage)}
                  />
                )}
                <ResultsCount
                  currentPage={page}
                  limit={limit}
                  total={total}
                />
              </div>
            )}
            <div className={`${cardClasses.container} divide-y divide-purple-500/30 overflow-hidden`}>
              {history.map((item) => (
                <SearchHistoryItemComponent
                  key={item.id}
                  item={item}
                  isSelected={currentSearchId === item.id}
                  onSelect={handleSelectSearch}
                  onDelete={handleDelete}
                  formatDate={formatDate}
                  variant="inline"
                />
              ))}
            </div>
            {/* Bottom Pagination */}
            {totalPages > 1 && (
              <div className="mt-6">
                <Pagination
                  currentPage={page}
                  totalPages={totalPages}
                  onPageChange={(newPage) => setPage(newPage)}
                />
                <ResultsCount
                  currentPage={page}
                  limit={limit}
                  total={total}
                />
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  // Popout mode - original dropdown behavior
  return (
    <div className="relative">
      <Button
        variant="secondary"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2"
      >
        <Icon name="clock" />
        Search History
      </Button>

      {isOpen && (
        <div className={`absolute right-0 top-full mt-3 w-96 ${cardClasses.container} z-50 max-h-[600px] flex flex-col overflow-hidden`}>
          <div className="p-5 border-b border-purple-500/30 flex justify-between items-center bg-gradient-to-r from-purple-900/30 to-blue-900/30">
            <h3 className={`font-bold text-lg ${textClasses.headingGradient}`}>Search History</h3>
            <Button
              variant="icon"
              onClick={() => setIsOpen(false)}
              className="text-purple-400 hover:text-purple-200"
            >
              <Icon name="close" />
            </Button>
          </div>

          <div className="overflow-y-auto flex-1">
            {loading ? (
              <LoadingSpinner size="md" className="p-8" />
            ) : !history || history.length === 0 ? (
              <EmptyState message={`No search history found${(startDate || endDate) ? ' for the selected date range' : ' yet'}`} className="p-8" />
            ) : (
              <div className="divide-y divide-purple-500/30">
                {history.map((item) => (
                  <SearchHistoryItemComponent
                    key={item.id}
                    item={item}
                    isSelected={currentSearchId === item.id}
                    onSelect={handleSelectSearch}
                    onDelete={handleDelete}
                    formatDate={formatDate}
                    variant="popout"
                  />
                ))}
              </div>
            )}
          </div>

          {totalPages > 1 && (
            <div className="p-4 border-t border-purple-500/30 bg-gradient-to-r from-purple-900/20 to-blue-900/20">
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={(newPage) => setPage(newPage)}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchHistory;

