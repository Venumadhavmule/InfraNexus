"use client";

import useSWR from "swr";
import { fetchCI, fetchCITimeline } from "@/lib/api";
import type { CIDetail, CITimelineResponse } from "@/types";
import { useGraphStore } from "@/store/graphStore";

export function useCI() {
  const selectedNodeId = useGraphStore((s) => s.selectedNodeId);

  const {
    data: ci,
    error: ciError,
    isLoading: ciLoading,
  } = useSWR<CIDetail>(
    selectedNodeId ? `/ci/${selectedNodeId}` : null,
    () => fetchCI(selectedNodeId!),
    { revalidateOnFocus: false, dedupingInterval: 30_000 },
  );

  const {
    data: timeline,
    error: timelineError,
    isLoading: timelineLoading,
  } = useSWR<CITimelineResponse>(
    selectedNodeId ? `/ci/${selectedNodeId}/timeline` : null,
    () => fetchCITimeline(selectedNodeId!),
    { revalidateOnFocus: false, dedupingInterval: 60_000 },
  );

  return {
    ci,
    ciError: ciError ? (ciError instanceof Error ? ciError.message : "Failed to load CI") : null,
    ciLoading,
    timeline,
    timelineError: timelineError
      ? (timelineError instanceof Error ? timelineError.message : "Failed to load timeline")
      : null,
    timelineLoading,
  };
}
