import React, { useEffect } from 'react';
import { useRelated } from '../hooks/useRelated';
import type { Source } from '../types';

interface RelatedDrawerProps {
  source: Source | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function RelatedDrawer({ source, isOpen, onClose }: RelatedDrawerProps) {
  const { related, loading, error } = useRelated(source?.id ?? null);

  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Drawer panel */}
      <div
        className={`fixed top-0 right-0 h-full w-96 max-w-full bg-gray-900 shadow-2xl z-50 flex flex-col transform transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-gray-700">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Similar to</p>
            <h2 className="text-sm font-semibold text-white line-clamp-2">
              {source?.name ?? ''}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="ml-3 text-gray-400 hover:text-white transition-colors flex-shrink-0 p-1"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading && (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-indigo-500" />
            </div>
          )}

          {error && (
            <p className="text-red-400 text-sm text-center py-8">{error}</p>
          )}

          {!loading && !error && related.length === 0 && (
            <p className="text-gray-500 text-sm text-center py-12">
              No similar images found.
            </p>
          )}

          {!loading && related.length > 0 && (
            <div className="flex flex-col gap-4">
              {related.map(({ source: rel, similarity }) => (
                <div key={rel.id} className="bg-gray-800 rounded-xl overflow-hidden">
                  <div className="flex gap-3 p-3">
                    {/* Thumbnail */}
                    <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-gray-700">
                      {rel.image_url ? (
                        <img
                          src={rel.image_url}
                          alt={rel.name}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-500 text-xl">
                          🛸
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-white line-clamp-2 leading-tight">
                        {rel.name}
                      </p>
                      <span className="text-xs text-gray-500 capitalize mt-0.5 block">
                        {rel.type}
                      </span>

                      {/* Similarity bar */}
                      <div className="mt-2">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-gray-400">Similarity</span>
                          <span className="text-xs font-semibold text-indigo-300">
                            {Math.round(similarity * 100)}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-1.5">
                          <div
                            className="bg-indigo-500 h-1.5 rounded-full transition-all duration-500"
                            style={{ width: `${similarity * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {rel.image_url && (
                    <div className="px-3 pb-3">
                      <a
                        href={rel.image_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-center text-xs text-indigo-400 hover:text-indigo-300 transition-colors py-1 border border-gray-700 rounded-lg"
                      >
                        View Image
                      </a>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
