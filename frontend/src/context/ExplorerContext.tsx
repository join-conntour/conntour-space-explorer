import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  clearHistory,
  deleteHistory,
  fetchFacets,
  fetchHistory,
  fetchSources,
  searchImages,
} from "../api/client";
import {
  filtersAfterClearingSearch,
  filtersForNewSearch,
  shouldClearSubmittedSearch,
} from "../lib/searchState";
import type {
  ExplorerMode,
  FacetResponse,
  GalleryFilters,
  HistoryItem,
  SearchHit,
  SortKey,
  Source,
} from "../types";

interface HistoryState {
  items: HistoryItem[];
  page: number;
  total: number;
  loading: boolean;
}

interface ExplorerContextValue {
  query: string;
  submittedQuery: string;
  setQuery: (value: string) => void;
  submitSearch: (value?: string) => Promise<void>;
  clearSearch: () => void;
  filters: GalleryFilters;
  setCenters: (centers: string[]) => void;
  toggleCenter: (center: string) => void;
  toggleKeyword: (keyword: string) => void;
  toggleObjectTag: (tag: string) => void;
  setDateRange: (from?: string, to?: string) => void;
  clearFilters: () => void;
  sort: SortKey;
  setSort: (sort: SortKey) => void;
  page: number;
  pageSize: number;
  total: number;
  setPage: (page: number) => void;
  hasMore: boolean;
  loadingMore: boolean;
  loadMore: () => void;
  mode: ExplorerMode;
  items: Source[];
  hits: SearchHit[];
  activatedObjectTags: string[];
  loading: boolean;
  error: string | null;
  facets: FacetResponse | null;
  history: HistoryState;
  loadHistory: (page?: number) => Promise<void>;
  restoreHistory: (item: HistoryItem) => void;
  removeHistory: (id: number) => Promise<void>;
  clearAllHistory: () => Promise<void>;
  activeHistoryId: number | null;
  selectedSource: Source | null;
  selectedConfidence: number | null;
  openSource: (source: Source, confidence?: number | null) => void;
  closeSource: () => void;
  updateSelectedViewCount: (viewCount: number) => void;
  refreshCatalog: () => void;
}

const defaultFilters: GalleryFilters = {
  centers: [],
  keywords: [],
  objectTags: [],
};

const ExplorerContext = createContext<ExplorerContextValue | undefined>(undefined);

export const ExplorerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [filters, setFilters] = useState<GalleryFilters>(defaultFilters);
  const [sort, setSortState] = useState<SortKey>("most_recent");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [mode, setMode] = useState<ExplorerMode>("browse");
  const [items, setItems] = useState<Source[]>([]);
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [activatedObjectTags, setActivatedObjectTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [facets, setFacets] = useState<FacetResponse | null>(null);
  const [history, setHistory] = useState<HistoryState>({
    items: [],
    page: 1,
    total: 0,
    loading: false,
  });
  const [activeHistoryId, setActiveHistoryId] = useState<number | null>(null);
  const [selectedSource, setSelectedSource] = useState<Source | null>(null);
  const [selectedConfidence, setSelectedConfidence] = useState<number | null>(null);
  const [catalogVersion, setCatalogVersion] = useState(0);

  const loadHistory = useCallback(async (historyPage = 1) => {
    setHistory((prev) => ({ ...prev, loading: true }));
    try {
      const data = await fetchHistory(historyPage, 10);
      setHistory({
        items: data.items,
        page: data.page,
        total: data.total,
        loading: false,
      });
    } catch {
      setHistory((prev) => ({ ...prev, loading: false }));
    }
  }, []);

  useEffect(() => {
    fetchFacets()
      .then(setFacets)
      .catch(() => setFacets(null));
    loadHistory(1);
  }, [loadHistory]);

  useEffect(() => {
    let cancelled = false;
    const append = page > 1;

    const mergeUniqueSources = (existing: Source[], incoming: Source[]) => {
      const seen = new Set(existing.map((item) => item.id));
      return [...existing, ...incoming.filter((item) => !seen.has(item.id))];
    };

    const mergeUniqueHits = (existing: SearchHit[], incoming: SearchHit[]) => {
      const seen = new Set(existing.map((hit) => hit.source.id));
      return [...existing, ...incoming.filter((hit) => !seen.has(hit.source.id))];
    };

    const run = async () => {
      if (mode === "history") {
        return;
      }
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      setError(null);
      try {
        if (submittedQuery.trim()) {
          const data = await searchImages({
            query: submittedQuery.trim(),
            filters,
            sort,
            page,
            pageSize,
            recordHistory: false,
          });
          if (cancelled) return;
          setMode("search");
          const nextHits = data.results;
          const nextItems = data.results.map((hit) => hit.source);
          setHits((prev) => (append ? mergeUniqueHits(prev, nextHits) : nextHits));
          setItems((prev) => (append ? mergeUniqueSources(prev, nextItems) : nextItems));
          setTotal(data.total);
          if (!append) {
            setActivatedObjectTags(data.activated_object_tags);
          }
        } else {
          const data = await fetchSources({ page, pageSize, sort, filters });
          if (cancelled) return;
          setMode("browse");
          setItems((prev) => (append ? mergeUniqueSources(prev, data.items) : data.items));
          if (!append) {
            setHits([]);
            setActivatedObjectTags([]);
          }
          setTotal(data.total);
        }
      } catch {
        if (!cancelled) {
          setError("Failed to load NASA images");
          if (!append) {
            setItems([]);
            setHits([]);
            setTotal(0);
          }
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    };

    run();
    return () => {
      cancelled = true;
    };
    // `mode` is included so restoring history pauses live refetching.
  }, [submittedQuery, filters, sort, page, pageSize, mode, catalogVersion]);

  const submitSearch = useCallback(
    async (value?: string) => {
      const next = (value ?? query).trim();
      if (!next) {
        return;
      }
      setQuery(next);
      setPage(1);
      setActiveHistoryId(null);
      setLoading(true);
      setError(null);
      const nextSort: SortKey = sort === "most_recent" ? "highest_confidence" : sort;
      try {
        // Probe with manual filters only (strip prior search-activated tags) so a new query
        // like "smile" is not AND'd with a leftover activated tag from "women".
        const probeFilters = filtersForNewSearch(filters, activatedObjectTags, []);
        const probe = await searchImages({
          query: next,
          filters: probeFilters,
          sort: nextSort,
          page: 1,
          pageSize,
          recordHistory: false,
        });
        const mergedFilters = filtersForNewSearch(
          filters,
          activatedObjectTags,
          probe.activated_object_tags
        );
        const data = await searchImages({
          query: next,
          filters: mergedFilters,
          sort: nextSort,
          page: 1,
          pageSize,
          recordHistory: true,
        });
        setSubmittedQuery(next);
        setMode("search");
        if (nextSort !== sort) {
          setSortState(nextSort);
        }
        setFilters(mergedFilters);
        setHits(data.results);
        setItems(data.results.map((hit) => hit.source));
        setTotal(data.total);
        setActivatedObjectTags(data.activated_object_tags);
        await loadHistory(1);
      } catch {
        setError("Search failed");
      } finally {
        setLoading(false);
      }
    },
    [query, filters, sort, pageSize, loadHistory, activatedObjectTags]
  );

  const clearSearch = useCallback(() => {
    setQuery("");
    setSubmittedQuery("");
    setActiveHistoryId(null);
    setMode("browse");
    setPage(1);
    setHits([]);
    setFilters((prev) => filtersAfterClearingSearch(prev, activatedObjectTags));
    setActivatedObjectTags([]);
    if (sort === "highest_confidence") {
      setSortState("most_recent");
    }
    // Force the browse effect to re-run even when page/filters are already at defaults.
    setCatalogVersion((value) => value + 1);
  }, [sort, activatedObjectTags]);

  const refreshCatalog = useCallback(() => {
    setQuery("");
    setSubmittedQuery("");
    setActivatedObjectTags([]);
    setActiveHistoryId(null);
    setMode("browse");
    setPage(1);
    setSortState("most_recent");
    setCatalogVersion((value) => value + 1);
    // New ingest tags must appear in Filters immediately.
    fetchFacets()
      .then(setFacets)
      .catch(() => setFacets(null));
  }, []);

  const handleSetQuery = useCallback(
    (value: string) => {
      setQuery(value);
      if (shouldClearSubmittedSearch(value, submittedQuery)) {
        clearSearch();
      }
    },
    [submittedQuery, clearSearch]
  );

  const resetPage = () => setPage(1);

  const hasMore = mode !== "history" && items.length < total;

  const loadMore = useCallback(() => {
    if (mode === "history" || loading || loadingMore || !hasMore) {
      return;
    }
    setPage((prev) => prev + 1);
  }, [mode, loading, loadingMore, hasMore]);

  const toggleCenter = (center: string) => {
    setActiveHistoryId(null);
    if (mode === "history") setMode(submittedQuery ? "search" : "browse");
    setFilters((prev) => ({
      ...prev,
      centers: prev.centers.includes(center)
        ? prev.centers.filter((c) => c !== center)
        : [...prev.centers, center],
    }));
    resetPage();
  };

  const setCenters = (centers: string[]) => {
    setActiveHistoryId(null);
    if (mode === "history") setMode(submittedQuery ? "search" : "browse");
    setFilters((prev) => ({ ...prev, centers }));
    resetPage();
  };

  const toggleKeyword = (keyword: string) => {
    setActiveHistoryId(null);
    if (mode === "history") setMode(submittedQuery ? "search" : "browse");
    setFilters((prev) => ({
      ...prev,
      keywords: prev.keywords.includes(keyword)
        ? prev.keywords.filter((k) => k !== keyword)
        : [...prev.keywords, keyword],
    }));
    resetPage();
  };

  const toggleObjectTag = (tag: string) => {
    setActiveHistoryId(null);
    if (mode === "history") setMode(submittedQuery ? "search" : "browse");
    setFilters((prev) => ({
      ...prev,
      objectTags: prev.objectTags.includes(tag)
        ? prev.objectTags.filter((t) => t !== tag)
        : [...prev.objectTags, tag],
    }));
    resetPage();
  };

  const setDateRange = (from?: string, to?: string) => {
    setActiveHistoryId(null);
    if (mode === "history") setMode(submittedQuery ? "search" : "browse");
    setFilters((prev) => ({ ...prev, dateFrom: from, dateTo: to }));
    resetPage();
  };

  const clearFilters = () => {
    setActiveHistoryId(null);
    if (mode === "history") setMode(submittedQuery ? "search" : "browse");
    setFilters(defaultFilters);
    resetPage();
  };

  const setSort = (next: SortKey) => {
    if (!submittedQuery && next === "highest_confidence") {
      return;
    }
    setActiveHistoryId(null);
    if (mode === "history") setMode(submittedQuery ? "search" : "browse");
    setSortState(next);
    resetPage();
  };

  const restoreHistory = (item: HistoryItem) => {
    setMode("history");
    setActiveHistoryId(item.id);
    setQuery(item.query);
    setSubmittedQuery(item.query);
    setFilters({
      centers: item.filters.centers || [],
      keywords: item.filters.keywords || [],
      objectTags: item.filters.object_tags || [],
      dateFrom: item.filters.date_from || undefined,
      dateTo: item.filters.date_to || undefined,
    });
    setActivatedObjectTags(item.activated_object_tags || []);
    setSortState(item.filters.sort || "highest_confidence");
    setHits(
      item.results.map((snapshot) => ({
        source: {
          id: snapshot.source_id,
          name: snapshot.name,
          type: "image",
          launch_date: snapshot.creation_date || "",
          description: "",
          image_url: snapshot.image_url,
          status: "Active",
          center: snapshot.center,
          creation_date: snapshot.creation_date,
          view_count: 0,
          keywords: [],
          keywords_raw: [],
          object_tags: snapshot.matched_object_tags || [],
          album: [],
        },
        confidence: snapshot.confidence,
        matched_object_tags: snapshot.matched_object_tags || [],
        matched_keywords: snapshot.matched_keywords || [],
        matched_terms: snapshot.matched_terms || [],
      }))
    );
    setItems(
      item.results.map((snapshot) => ({
        id: snapshot.source_id,
        name: snapshot.name,
        type: "image",
        launch_date: snapshot.creation_date || "",
        description: "",
        image_url: snapshot.image_url,
        status: "Active",
        center: snapshot.center,
        creation_date: snapshot.creation_date,
        view_count: 0,
        keywords: [],
        keywords_raw: [],
        object_tags: snapshot.matched_object_tags || [],
        album: [],
      }))
    );
    setTotal(item.result_count);
    setPage(1);
    setLoading(false);
    setError(null);
  };

  const removeHistory = async (id: number) => {
    await deleteHistory(id);
    if (activeHistoryId === id) {
      setActiveHistoryId(null);
      setMode(submittedQuery ? "search" : "browse");
    }
    await loadHistory(history.page);
  };

  const clearAllHistory = async () => {
    await clearHistory();
    if (activeHistoryId !== null) {
      setActiveHistoryId(null);
      setMode(submittedQuery ? "search" : "browse");
    }
    await loadHistory(1);
  };

  const openSource = (source: Source, confidence?: number | null) => {
    setSelectedSource(source);
    setSelectedConfidence(confidence ?? null);
  };

  const closeSource = () => {
    setSelectedSource(null);
    setSelectedConfidence(null);
  };

  const updateSelectedViewCount = (viewCount: number) => {
    setSelectedSource((prev) => (prev ? { ...prev, view_count: viewCount } : prev));
    setItems((prev) => prev.map((item) => (item.id === selectedSource?.id ? { ...item, view_count: viewCount } : item)));
    setHits((prev) =>
      prev.map((hit) =>
        hit.source.id === selectedSource?.id
          ? { ...hit, source: { ...hit.source, view_count: viewCount } }
          : hit
      )
    );
  };

  const value = useMemo<ExplorerContextValue>(
    () => ({
      query,
      submittedQuery,
      setQuery: handleSetQuery,
      submitSearch,
      clearSearch,
      filters,
      setCenters,
      toggleCenter,
      toggleKeyword,
      toggleObjectTag,
      setDateRange,
      clearFilters,
      sort,
      setSort,
      page,
      pageSize,
      total,
      setPage,
      hasMore,
      loadingMore,
      loadMore,
      mode,
      items,
      hits,
      activatedObjectTags,
      loading,
      error,
      facets,
      history,
      loadHistory,
      restoreHistory,
      removeHistory,
      clearAllHistory,
      activeHistoryId,
      selectedSource,
      selectedConfidence,
      openSource,
      closeSource,
      updateSelectedViewCount,
      refreshCatalog,
    }),
    [
      query,
      submittedQuery,
      handleSetQuery,
      submitSearch,
      clearSearch,
      filters,
      sort,
      page,
      pageSize,
      total,
      hasMore,
      loadingMore,
      loadMore,
      mode,
      items,
      hits,
      activatedObjectTags,
      loading,
      error,
      facets,
      history,
      loadHistory,
      activeHistoryId,
      selectedSource,
      selectedConfidence,
      refreshCatalog,
    ]
  );

  return <ExplorerContext.Provider value={value}>{children}</ExplorerContext.Provider>;
};

export function useExplorer(): ExplorerContextValue {
  const ctx = useContext(ExplorerContext);
  if (!ctx) {
    throw new Error("useExplorer must be used within ExplorerProvider");
  }
  return ctx;
}
