import React from 'react';
import type { SearchResult, Source } from '../types';
import SourceCard from './SourceCard';

interface SearchResultsProps {
  results: SearchResult[];
  query: string;
  onDiscover: (source: Source) => void;
}

export default function SearchResults({ results, query, onDiscover }: SearchResultsProps) {
  if (results.length === 0) {
    return (
      <div className="text-center py-16 text-gray-500">
        <div className="text-5xl mb-4">🔭</div>
        <p className="text-lg">No results found for "{query}"</p>
        <p className="text-sm mt-2">Try different keywords or browse all images.</p>
      </div>
    );
  }

  return (
    <div>
      <p className="text-sm text-gray-400 mb-6">
        {results.length} result{results.length !== 1 ? 's' : ''} for{' '}
        <span className="text-indigo-400 font-medium">"{query}"</span>
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {results.map(({ source, score }) => (
          <SourceCard key={source.id} source={source} score={score} onDiscover={onDiscover} />
        ))}
      </div>
    </div>
  );
}
