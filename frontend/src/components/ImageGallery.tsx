import React, { useEffect, useRef } from "react";
import { useExplorer } from "../context/ExplorerContext";
import { confidenceForSource, ImageCard } from "./ImageCard";
import { Badge } from "./ui/badge";
import { Skeleton } from "./ui/skeleton";

export const ImageGallery: React.FC = () => {
  const {
    items,
    hits,
    loading,
    loadingMore,
    error,
    total,
    hasMore,
    loadMore,
    mode,
    activatedObjectTags,
    openSource,
    submittedQuery,
  } = useExplorer();

  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || mode === "history") {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          loadMore();
        }
      },
      { root: null, rootMargin: "240px 0px", threshold: 0 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [loadMore, mode, items.length, hasMore]);

  if (loading && items.length === 0) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <Skeleton key={index} className="h-72 w-full" />
        ))}
      </div>
    );
  }

  if (error && items.length === 0) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-destructive">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm text-muted-foreground">
            {mode === "history"
              ? "Restored search history snapshot"
              : submittedQuery
                ? `Search results for "${submittedQuery}"`
                : "Browsing NASA image catalog"}
          </p>
          <p className="text-lg font-semibold">
            Showing {items.length} of {total} images
          </p>
        </div>
        {activatedObjectTags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {activatedObjectTags.map((tag) => (
              <Badge key={tag} variant="default">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center text-muted-foreground">
          No images matched the current query and filters.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((source) => (
            <ImageCard
              key={source.id}
              source={source}
              confidence={mode === "browse" ? null : confidenceForSource(hits, source.id)}
              onOpen={openSource}
            />
          ))}
        </div>
      )}

      {mode !== "history" && hasMore && (
        <div ref={sentinelRef} className="flex justify-center py-4" aria-hidden={!loadingMore}>
          {loadingMore ? (
            <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-72 w-full" />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Scroll to load more</p>
          )}
        </div>
      )}

      {mode !== "history" && !hasMore && items.length > 0 && (
        <p className="pb-4 text-center text-sm text-muted-foreground">End of results</p>
      )}
    </div>
  );
};
