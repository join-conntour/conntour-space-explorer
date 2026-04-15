import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import RelatedDrawer from '../components/RelatedDrawer';
import SearchBar from '../components/SearchBar';
import SearchResults from '../components/SearchResults';
import { useSearch } from '../hooks/useSearch';
import type { Source } from '../types';

export default function SearchPage() {
  const [searchParams] = useSearchParams();
  const { results, loading, error, lastQuery, search } = useSearch();
  const [drawerSource, setDrawerSource] = useState<Source | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  // Support ?q= query param (e.g. re-running from history)
  const prefilledQuery = searchParams.get('q') ?? '';

  useEffect(() => {
    if (prefilledQuery) {
      setHasSearched(true);
      search(prefilledQuery);
    }
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = (query: string) => {
    setHasSearched(true);
    search(query);
  };

  return (
    <>
      <div className="mb-8 text-center">
        <h2 className="text-2xl font-bold text-white mb-2">Search NASA Images</h2>
        <p className="text-gray-400 text-sm mb-6">
          Use natural language to find images (e.g. "Mars rovers", "solar flares", "shuttle launch")
        </p>
        <SearchBar onSearch={handleSearch} loading={loading} initialValue={prefilledQuery} />
      </div>

      {error && (
        <p className="text-center text-red-400 text-sm mt-4">{error}</p>
      )}

      {!hasSearched && !loading && (
        <div className="text-center py-16 text-gray-600">
          <div className="text-6xl mb-4">🔭</div>
          <p className="text-lg">Enter a query above to begin exploring</p>
        </div>
      )}

      {hasSearched && !loading && (
        <SearchResults results={results} query={lastQuery} onDiscover={setDrawerSource} />
      )}

      <RelatedDrawer
        source={drawerSource}
        isOpen={!!drawerSource}
        onClose={() => setDrawerSource(null)}
      />
    </>
  );
}
