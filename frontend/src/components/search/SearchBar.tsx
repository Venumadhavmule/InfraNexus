"use client";

import { useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { useSearch } from "@/hooks/useSearch";
import { useUIStore } from "@/store/uiStore";
import { useNeighborhood } from "@/hooks/useNeighborhood";
import { SearchResults } from "./SearchResults";
import { isValidSysId } from "@/lib/utils";

export function SearchBar() {
  const inputRef = useRef<HTMLInputElement>(null);
  const searchOpen = useUIStore((s) => s.searchOpen);
  const setSearchOpen = useUIStore((s) => s.setSearchOpen);
  const {
    query,
    results,
    suggestions,
    total,
    loading,
    suggestLoading,
    error,
    updateQuery,
    executeSearch,
    clearSearch,
  } = useSearch();
  const { loadNeighborhood } = useNeighborhood();

  useEffect(() => {
    if (searchOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [searchOpen]);

  const handleSelect = (ciId: string) => {
    if (isValidSysId(ciId)) {
      loadNeighborhood(ciId);
      setSearchOpen(false);
      clearSearch();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      executeSearch();
    }
    if (e.key === "Escape") {
      setSearchOpen(false);
      clearSearch();
    }
  };

  if (!searchOpen) return null;

  return (
    <div className="absolute left-1/2 top-4 z-50 w-full max-w-xl -translate-x-1/2">
      <div className="rounded-lg border border-border bg-background/95 shadow-xl backdrop-blur-sm">
        <div className="flex items-center border-b border-border px-3">
          <svg
            className="mr-2 h-4 w-4 shrink-0 text-muted-foreground"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => updateQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search CIs by name, IP, class…"
            className="border-0 bg-transparent shadow-none focus-visible:ring-0"
          />
          {loading && (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          )}
        </div>

        <SearchResults
          results={results}
          suggestions={suggestions}
          total={total}
          loading={loading}
          suggestLoading={suggestLoading}
          error={error}
          query={query}
          onSelect={handleSelect}
        />
      </div>
    </div>
  );
}
