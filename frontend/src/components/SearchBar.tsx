import React, { useState } from 'react';
import apiClient from '../api';
import { Source, SearchResponse } from '../types';
import { Button, Icon, ErrorMessage } from './shared';
import { inputClasses } from '../styles/classes';
import { PAGINATION_LIMIT } from '../constants';
import { isInvalidDate } from '../utils/dateUtils';

interface SearchBarProps {
  onSearchResults: (results: Source[], searchId: string, query: string, pagination: {
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  }) => void;
  startDate?: string;
  endDate?: string;
  value?: string;
  onChange?: (value: string) => void;
}

const SearchBar: React.FC<SearchBarProps> = ({ onSearchResults, startDate = '', endDate = '', value = '', onChange }) => {
  const [internalQuery, setInternalQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Use controlled value if provided, otherwise use internal state
  const query = onChange ? value : internalQuery;
  
  const handleQueryChange = (newValue: string) => {
    if (onChange) {
      onChange(newValue);
    } else {
      setInternalQuery(newValue);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!query.trim()) {
      return;
    }

    // Don't make API call if dates are invalid
    if (isInvalidDate(startDate) || isInvalidDate(endDate)) {
      setError('Please select valid dates');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const params: { q: string; page: number; limit: number; start_date?: string; end_date?: string } = {
        q: query.trim(),
        page: 1,
        limit: PAGINATION_LIMIT,
      };
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;

      const response = await apiClient.get<SearchResponse>('/api/search', { params });
      onSearchResults(
        response.data.results,
        response.data.search_id,
        query.trim(),
        {
          total: response.data.total,
          page: response.data.page,
          limit: response.data.limit,
          total_pages: response.data.total_pages,
        }
      );
    } catch (err: any) {
      const errorMessage = err?.response?.data?.detail || err?.message || 'Failed to search. Please try again.';
      setError(errorMessage);
      console.error('Search error:', err);
      if (err?.response) {
        console.error('Response status:', err.response.status);
        console.error('Response data:', err.response.data);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full mb-8">
      <form onSubmit={handleSearch} className="space-y-4">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <input
              type="text"
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              placeholder="Search NASA images... (e.g., 'Mars rovers', 'solar flares')"
              className={inputClasses.text}
              disabled={loading}
            />
            <Icon name="search" className="absolute left-5 top-1/2 transform -translate-y-1/2 w-5 h-5 text-purple-400" />
            {query && (
              <button
                type="button"
                onClick={() => handleQueryChange('')}
                className="absolute right-5 top-1/2 transform -translate-y-1/2 text-purple-400 hover:text-purple-200 transition-colors p-1 rounded-full hover:bg-purple-500/20"
              >
                <Icon name="close" className="w-5 h-5" />
              </button>
            )}
          </div>
          <Button
            type="submit"
            variant="primary"
            disabled={loading || !query.trim()}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <Icon name="loading" className="animate-spin h-5 w-5" />
                Searching...
              </span>
            ) : (
              'Search'
            )}
          </Button>
        </div>
      </form>
      {error && (
        <div className="mt-4">
          <ErrorMessage message={error} />
        </div>
      )}
    </div>
  );
};

export default SearchBar;

