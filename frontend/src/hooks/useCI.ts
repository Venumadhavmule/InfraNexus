"use client";

import useSWR from "swr";
import { APIError, fetchCI, fetchCITimeline } from "@/lib/api";
import type { CIDetail, CITimelineResponse } from "@/types";
import { useGraphStore } from "@/store/graphStore";
import { useETLStore } from "@/store/etlStore";

export function useCI() {
  const selectedNodeId = useGraphStore((s) => s.selectedNodeId);
  const etlStatus = useETLStore((s) => s.status);
  const currentSyncType = useETLStore((s) => s.currentSyncType);
  const syncPaused = etlStatus === "running" && currentSyncType === "full";

  const {
    data: ci,
    error: ciError,
    isLoading: ciLoading,
  } = useSWR<CIDetail>(
    selectedNodeId && !syncPaused ? `/ci/${selectedNodeId}` : null,
    () => fetchCI(selectedNodeId!),
    { revalidateOnFocus: false, dedupingInterval: 30_000 },
  );

  const {
    data: timeline,
    error: timelineError,
    isLoading: timelineLoading,
  } = useSWR<CITimelineResponse>(
    selectedNodeId && !syncPaused ? `/ci/${selectedNodeId}/timeline` : null,
    () => fetchCITimeline(selectedNodeId!),
    { revalidateOnFocus: false, dedupingInterval: 60_000 },
  );

  const ciErrorMessage =
    ciError instanceof APIError && ciError.type === "ci_not_found" && syncPaused
      ? null
      : ciError
        ? (ciError instanceof Error ? ciError.message : "Failed to load CI")
        : null;

  const timelineErrorMessage =
    timelineError instanceof APIError && timelineError.type === "ci_not_found" && syncPaused
      ? null
      : timelineError
        ? (timelineError instanceof Error ? timelineError.message : "Failed to load timeline")
        : null;

  return {
    ci,
    ciError: ciErrorMessage,
    ciLoading: syncPaused || ciLoading,
    timeline,
    timelineError: timelineErrorMessage,
    timelineLoading: syncPaused || timelineLoading,
    syncPaused,
  };
}
