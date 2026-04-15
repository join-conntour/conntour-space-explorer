import React from 'react';
import type { SearchHistoryEntry, SearchHistoryPage } from '../types';

interface SearchHistoryPanelProps {
  data: SearchHistoryPage | null;
  currentPage: number;
  loading: boolean;
  onPageChange: (page: number) => void;
  onDelete: (id: number) => void;
  onRerun: (query: string) => void;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function HistoryRow({
  entry,
  onDelete,
  onRerun,
}: {
  entry: SearchHistoryEntry;
  onDelete: (id: number) => void;
  onRerun: (query: string) => void;
}) {
  let preview: { name: string; score: number }[] = [];
  if (entry.results_json) {
    try {
      preview = JSON.parse(entry.results_json).slice(0, 3);
    } catch {}
  }

  return (
    <div className="bg-gray-800 rounded-xl p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <button
            onClick={() => onRerun(entry.query)}
            className="text-left font-semibold text-indigo-300 hover:text-indigo-200 transition-colors text-sm truncate w-full"
            title="Click to re-run this search"
          >
            {entry.query}
          </button>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-xs text-gray-400">{formatDate(entry.created_at)}</span>
            <span className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded-full">
              {entry.result_count} result{entry.result_count !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
        <button
          onClick={() => onDelete(entry.id)}
          className="text-gray-500 hover:text-red-400 transition-colors flex-shrink-0 p-1"
          title="Delete this entry"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>

      {preview.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {preview.map((item) => (
            <span key={item.name} className="text-xs bg-gray-700 text-gray-400 px-2 py-0.5 rounded">
              {item.name.length > 30 ? item.name.slice(0, 30) + '…' : item.name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default function SearchHistoryPanel({
  data,
  currentPage,
  loading,
  onPageChange,
  onDelete,
  onRerun,
}: SearchHistoryPanelProps) {
  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-indigo-500" />
      </div>
    );
  }

  if (!data || data.items.length === 0) {
    return (
      <div className="text-center py-16 text-gray-500">
        <div className="text-5xl mb-4">📋</div>
        <p className="text-lg">No search history yet</p>
        <p className="text-sm mt-2">Your searches will appear here.</p>
      </div>
    );
  }

  const totalPages = Math.ceil(data.total / data.page_size);

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-gray-400">
        {data.total} search{data.total !== 1 ? 'es' : ''} total
      </p>

      <div className="flex flex-col gap-3">
        {data.items.map((entry) => (
          <HistoryRow key={entry.id} entry={entry} onDelete={onDelete} onRerun={onRerun} />
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-4">
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage <= 1}
            className="px-4 py-2 text-sm bg-gray-700 hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-colors"
          >
            ← Prev
          </button>
          <span className="text-sm text-gray-400">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className="px-4 py-2 text-sm bg-gray-700 hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-colors"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
