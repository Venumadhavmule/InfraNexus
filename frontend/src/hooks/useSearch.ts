"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { search, suggest } from "@/lib/api";
import type { SearchHit, SuggestHit, SearchFilters } from "@/types";
import { SEARCH_DEBOUNCE_MS } from "@/lib/constants";

export function useSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchHit[]>([]);
  const [suggestions, setSuggestions] = useState<SuggestHit[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<SearchFilters>({});
  const [offset, setOffset] = useState(0);

  const suggestTimer = useRef<ReturnType<typeof setTimeout>>();
  const searchTimer = useRef<ReturnType<typeof setTimeout>>();

  // Debounced suggestions
  const updateQuery = useCallback((q: string) => {
    setQuery(q);
    clearTimeout(suggestTimer.current);

    if (q.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    setSuggestLoading(true);
    suggestTimer.current = setTimeout(async () => {
      try {
        const res = await suggest(q.trim());
        setSuggestions(res.suggestions);
      } catch {
        setSuggestions([]);
      } finally {
        setSuggestLoading(false);
      }
    }, SEARCH_DEBOUNCE_MS);
  }, []);

  // Full search
  const executeSearch = useCallback(
    async (q?: string, f?: SearchFilters, page = 0) => {
      const searchQuery = q ?? query;
      const searchFilters = f ?? filters;

      if (!searchQuery.trim()) {
        setResults([]);
        setTotal(0);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const res = await search(searchQuery.trim(), searchFilters, 20, page * 20);
        setResults(page === 0 ? res.hits : (prev) => [...prev, ...res.hits]);
        setTotal(res.total);
        setOffset(page);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Search failed");
      } finally {
        setLoading(false);
      }
    },
    [query, filters],
  );

  const loadMore = useCallback(() => {
    executeSearch(undefined, undefined, offset + 1);
  }, [executeSearch, offset]);

  const clearSearch = useCallback(() => {
    setQuery("");
    setResults([]);
    setSuggestions([]);
    setTotal(0);
    setOffset(0);
    setError(null);
  }, []);

  // Clean up timers
  useEffect(() => {
    return () => {
      clearTimeout(suggestTimer.current);
      clearTimeout(searchTimer.current);
    };
  }, []);

  return {
    query,
    results,
    suggestions,
    total,
    loading,
    suggestLoading,
    error,
    filters,
    setFilters,
    updateQuery,
    executeSearch,
    loadMore,
    clearSearch,
  };
}
