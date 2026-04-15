import React, { useState } from 'react';
import RelatedDrawer from '../components/RelatedDrawer';
import SourceCard from '../components/SourceCard';
import { useInfiniteScroll } from '../hooks/useInfiniteScroll';
import { useSources } from '../hooks/useSources';
import type { Source } from '../types';

export default function BrowsePage() {
  const { sources, loading, error } = useSources();
  const [drawerSource, setDrawerSource] = useState<Source | null>(null);
  const { visible, hasMore, sentinelRef } = useInfiniteScroll(sources, 12);

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-indigo-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-24 text-red-400">
        <p className="text-lg">{error}</p>
      </div>
    );
  }

  return (
    <>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white mb-1">NASA Image Gallery</h2>
        <p className="text-gray-400 text-sm">
          Showing {visible.length} of {sources.length} images
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {visible.map((source) => (
          <SourceCard key={source.id} source={source} onDiscover={setDrawerSource} />
        ))}
      </div>

      {hasMore && (
        <div ref={sentinelRef} className="flex justify-center py-10">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-indigo-500" />
        </div>
      )}

      <RelatedDrawer
        source={drawerSource}
        isOpen={!!drawerSource}
        onClose={() => setDrawerSource(null)}
      />
    </>
  );
}
