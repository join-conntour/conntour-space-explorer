import type { GalleryFilters } from "../types";

/**
 * When leaving search mode, drop only the object tags that the query activated.
 * Manually chosen filters that were not search-activated stay in place.
 */
export function filtersAfterClearingSearch(
  filters: GalleryFilters,
  activatedObjectTags: string[]
): GalleryFilters {
  if (!activatedObjectTags.length) {
    return filters;
  }
  const activated = new Set(activatedObjectTags);
  return {
    ...filters,
    objectTags: filters.objectTags.filter((tag) => !activated.has(tag)),
  };
}

/**
 * Replace the previous query's activated object tags with the new query's tags.
 * Keeps manually selected filters; does not accumulate activated tags across searches
 * (which would AND stale facets like "women" into a later "smile" query).
 */
export function filtersForNewSearch(
  filters: GalleryFilters,
  previousActivatedObjectTags: string[],
  nextActivatedObjectTags: string[]
): GalleryFilters {
  const previousActivated = new Set(previousActivatedObjectTags);
  const manualTags = filters.objectTags.filter((tag) => !previousActivated.has(tag));
  return {
    ...filters,
    objectTags: Array.from(new Set([...manualTags, ...nextActivatedObjectTags])),
  };
}

export function shouldClearSubmittedSearch(nextQuery: string, submittedQuery: string): boolean {
  return nextQuery.trim().length === 0 && submittedQuery.trim().length > 0;
}
