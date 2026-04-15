import React from 'react';
import { useNavigate } from 'react-router-dom';
import SearchHistoryPanel from '../components/SearchHistoryPanel';
import { useSearchHistory } from '../hooks/useSearchHistory';

export default function HistoryPage() {
  const navigate = useNavigate();
  const { data, currentPage, loading, error, goToPage, deleteEntry } = useSearchHistory();

  const handleRerun = (query: string) => {
    navigate(`/search?q=${encodeURIComponent(query)}`);
  };

  return (
    <>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white mb-1">Search History</h2>
        <p className="text-gray-400 text-sm">
          Click a query to re-run it. Use the trash icon to remove entries.
        </p>
      </div>

      {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

      <SearchHistoryPanel
        data={data}
        currentPage={currentPage}
        loading={loading}
        onPageChange={goToPage}
        onDelete={deleteEntry}
        onRerun={handleRerun}
      />
    </>
  );
}
