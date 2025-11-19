import React, { useState } from 'react';
import { Dayjs } from 'dayjs';
import SearchBar from './components/SearchBar';
import SearchHistory from './components/SearchHistory';
import Sources from './components/Sources';
import ImageDetail from './components/ImageDetail';
import FiltersSection from './components/FiltersSection';
import { BackButton, Tabs, ErrorMessage, Icon } from './components/shared';
import { textClasses, cardClasses } from './styles/classes';
import { scrollToTop, isInvalidDate } from './utils/dateUtils';
import { PAGINATION_LIMIT } from './constants';
import apiClient from './api';
import { Source, ViewMode, SearchResponse, SearchHistoryDetailResponse } from './types';

const App: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('browse');
  const [searchResults, setSearchResults] = useState<Source[]>([]);
  const [currentSearchId, setCurrentSearchId] = useState<string | undefined>();
  const [selectedSource, setSelectedSource] = useState<Source | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchPagination, setSearchPagination] = useState<{
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  } | null>(null);
  const [startDate, setStartDate] = useState<Dayjs | null>(null);
  const [endDate, setEndDate] = useState<Dayjs | null>(null);

  const handleSearchResults = (
    results: Source[],
    searchId: string,
    query: string,
    pagination: { total: number; page: number; limit: number; total_pages: number }
  ) => {
    setSearchResults(results);
    setCurrentSearchId(searchId);
    setSearchQuery(query);
    setSearchPagination(pagination);
    setViewMode('search');
    scrollToTop();
  };

  const handleSearchPageChange = async (page: number) => {
    if (!searchQuery) return;

    // Don't make API call if dates are invalid
    // Check Dayjs validity first, then format and check the string
    if (startDate && !startDate.isValid()) {
      return;
    }
    if (endDate && !endDate.isValid()) {
      return;
    }
    
    const startDateStr = startDate ? startDate.format('YYYY-MM-DD') : '';
    const endDateStr = endDate ? endDate.format('YYYY-MM-DD') : '';
    
    if (isInvalidDate(startDateStr) || isInvalidDate(endDateStr)) {
      return;
    }

    try {
      const params: { q: string; page: number; limit: number; start_date?: string; end_date?: string } = {
          q: searchQuery,
          page: page,
          limit: PAGINATION_LIMIT,
      };
      if (startDateStr) params.start_date = startDateStr;
      if (endDateStr) params.end_date = endDateStr;

      const response = await apiClient.get<SearchResponse>('/api/search', { params });
      setSearchResults(response.data.results);
      setSearchPagination({
        total: response.data.total,
        page: response.data.page,
        limit: response.data.limit,
        total_pages: response.data.total_pages,
      });
      scrollToTop();
    } catch (err) {
      console.error('Failed to fetch search page:', err);
    }
  };

  const handleSelectHistorySearch = (
    results: Source[],
    searchId?: string,
    pagination?: { total: number; page: number; limit: number; total_pages: number }
  ) => {
    setSearchResults(results);
    setSearchQuery(''); // Clear search query to indicate we're viewing history results
    if (searchId) {
      setCurrentSearchId(searchId);
    }
    if (pagination) {
      setSearchPagination(pagination);
    }
    setViewMode('search');
    scrollToTop();
  };

  const handleHistoryPageChange = async (page: number) => {
    if (!currentSearchId) return;

    try {
      const response = await apiClient.get<SearchHistoryDetailResponse>(`/api/search-history/${currentSearchId}`, {
        params: {
          page: page,
          limit: PAGINATION_LIMIT,
        },
      });
      setSearchResults(response.data.results);
      setSearchPagination({
        total: response.data.total,
        page: response.data.page,
        limit: response.data.limit,
        total_pages: response.data.total_pages,
      });
      scrollToTop();
    } catch (err) {
      console.error('Failed to fetch history page:', err);
    }
  };

  const handleSourceClick = (source: Source) => {
    setSelectedSource(source);
    setViewMode('detail');
    scrollToTop();
  };

  const handleBackFromDetail = () => {
    setSelectedSource(null);
    // Return to previous view mode (browse, history, or search)
    if (searchResults.length > 0) {
      setViewMode('search');
    } else {
      setViewMode('browse');
    }
    scrollToTop();
  };

  const clearDateFilters = () => {
    setStartDate(null);
    setEndDate(null);
  };

  return (
    <div className="min-h-screen relative">
      {/* Starfield Background */}
      <div className="starfield">
        <div className="stars"></div>
        <div className="stars-small"></div>
      </div>
      
      {/* Content Layer */}
      <div className="relative z-10">
      {/* Header */}
      <header className={cardClasses.header}>
        {viewMode === 'detail' && (
          <BackButton onClick={handleBackFromDetail} />
        )}
        <div className="container mx-auto px-4 py-6">
          <h1 className={`${textClasses.heading} text-center`}>
            <span className={textClasses.headingGradient}>
            Conntour Space Explorer
            </span>
          </h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 relative z-10">
        {viewMode === 'detail' && selectedSource ? (
          <ImageDetail source={selectedSource} onBack={handleBackFromDetail} />
        ) : (
          <>
            {/* Search Bar */}
            <SearchBar 
              onSearchResults={handleSearchResults}
              startDate={startDate ? startDate.format('YYYY-MM-DD') : ''}
              endDate={endDate ? endDate.format('YYYY-MM-DD') : ''}
              value={searchQuery}
              onChange={setSearchQuery}
            />

            {/* Shared Filters Section */}
            <FiltersSection
              startDate={startDate}
              endDate={endDate}
              onStartDateChange={setStartDate}
              onEndDateChange={setEndDate}
              onClear={clearDateFilters}
            />

            {/* Tabs */}
            <Tabs
              tabs={[
                { id: 'browse', label: 'Browse' },
                { id: 'history', label: 'History' },
                ...(searchResults.length > 0 ? [{ id: 'search', label: 'Search Results', badge: searchResults.length }] : []),
              ]}
              activeTab={viewMode}
              onTabChange={(tabId) => {
                if (tabId === 'browse' || tabId === 'history') {
                  setViewMode(tabId as ViewMode);
                  setSearchResults([]);
                  setCurrentSearchId(undefined);
                  setSearchQuery('');
                  setSearchPagination(null);
                  clearDateFilters();
                } else {
                  setViewMode(tabId as ViewMode);
                }
              }}
            />

            {/* Content */}
            {viewMode === 'browse' ? (
              <Sources 
                onSourceClick={handleSourceClick}
                startDate={startDate ? startDate.format('YYYY-MM-DD') : ''}
                endDate={endDate ? endDate.format('YYYY-MM-DD') : ''}
              />
            ) : viewMode === 'history' ? (
              <SearchHistory
                onSelectSearch={handleSelectHistorySearch}
                currentSearchId={currentSearchId}
                inline={true}
                startDate={startDate ? startDate.format('YYYY-MM-DD') : ''}
                endDate={endDate ? endDate.format('YYYY-MM-DD') : ''}
              />
            ) : viewMode === 'search' && searchResults.length > 0 ? (
              <>
                <div className="mb-6">
                  <p className="text-purple-200 font-medium text-lg">
                    Found {searchPagination?.total || searchResults.length} result{(searchPagination?.total || searchResults.length) !== 1 ? 's' : ''}
                  </p>
                </div>
                <Sources
                  sources={searchResults}
                  showConfidence={true}
                  onSourceClick={handleSourceClick}
                  pagination={searchPagination ? {
                    ...searchPagination,
                    onPageChange: currentSearchId && !searchQuery ? handleHistoryPageChange : handleSearchPageChange,
                  } : searchResults.length > 0 ? {
                    total: searchResults.length,
                    page: 1,
                    limit: searchResults.length,
                    total_pages: 1,
                    onPageChange: () => {},
                  } : undefined}
                />
              </>
            ) : viewMode === 'search' && searchQuery && searchResults.length === 0 ? (
              <>
                <div className="mb-6">
                  <ErrorMessage
                    variant="warning"
                    message={
                      <span className="flex items-center gap-2">
                        <Icon name="info" className="w-6 h-6" />
                        No results found for "{searchQuery}", showing browse mode instead
                      </span>
                    }
                  />
                </div>
                <Sources 
                  onSourceClick={handleSourceClick}
                  startDate={startDate ? startDate.format('YYYY-MM-DD') : ''}
                  endDate={endDate ? endDate.format('YYYY-MM-DD') : ''}
                />
              </>
            ) : (
              <Sources 
                onSourceClick={handleSourceClick}
                startDate={startDate ? startDate.format('YYYY-MM-DD') : ''}
                endDate={endDate ? endDate.format('YYYY-MM-DD') : ''}
              />
            )}
          </>
        )}
      </main>
      </div>
    </div>
  );
};

export default App;
