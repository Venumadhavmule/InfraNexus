"use client";

import type { SearchHit, SuggestHit } from "@/types";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { operationalStatusLabel, operationalStatusColor, truncateText } from "@/lib/utils";

interface SearchResultsProps {
  results: SearchHit[];
  suggestions: SuggestHit[];
  total: number;
  loading: boolean;
  suggestLoading: boolean;
  error: string | null;
  query: string;
  onSelect: (ciId: string) => void;
}

export function SearchResults({
  results,
  suggestions,
  total,
  loading,
  suggestLoading,
  error,
  query,
  onSelect,
}: SearchResultsProps) {
  if (error) {
    return (
      <div className="p-4 text-center text-sm text-destructive">{error}</div>
    );
  }

  // Show suggestions when typing (before search)
  if (results.length === 0 && suggestions.length > 0) {
    return (
      <ScrollArea className="max-h-72">
        <div className="p-1">
          {suggestions.map((s) => (
            <button
              key={s.ci_id}
              onClick={() => onSelect(s.ci_id)}
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-accent"
            >
              <Badge variant="outline" className="text-[10px]">
                {s.class_label}
              </Badge>
              <span className="truncate">{s.text}</span>
            </button>
          ))}
        </div>
      </ScrollArea>
    );
  }

  // Show full results
  if (results.length > 0) {
    return (
      <ScrollArea className="max-h-96">
        <div className="p-1">
          <div className="px-3 py-1.5 text-xs text-muted-foreground">
            {total} result{total !== 1 ? "s" : ""}
          </div>
          {results.map((hit) => (
            <button
              key={hit.sys_id}
              onClick={() => onSelect(hit.sys_id)}
              className="flex w-full flex-col gap-1 rounded-md px-3 py-2 text-left hover:bg-accent"
            >
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px]">
                  {hit.class_label}
                </Badge>
                <span className="text-sm font-medium">{hit.name}</span>
                <span className={`ml-auto text-[10px] ${operationalStatusColor(hit.operational_status)}`}>
                  {operationalStatusLabel(hit.operational_status)}
                </span>
              </div>
              {hit.short_description && (
                <span className="text-xs text-muted-foreground">
                  {truncateText(hit.short_description, 80)}
                </span>
              )}
              <div className="flex gap-2 text-[10px] text-muted-foreground/60">
                {hit.environment && <span>{hit.environment}</span>}
                {hit.ip_address && <span>{hit.ip_address}</span>}
              </div>
            </button>
          ))}
        </div>
      </ScrollArea>
    );
  }

  // Empty state
  if (query.length >= 2 && !loading && !suggestLoading) {
    return (
      <div className="p-4 text-center text-sm text-muted-foreground">
        No results found for &ldquo;{query}&rdquo;
      </div>
    );
  }

  return null;
}
