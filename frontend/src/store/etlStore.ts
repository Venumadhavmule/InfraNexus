import { create } from "zustand";
import type { SyncStatus, SyncType, WSEvent } from "@/types";

const STAGE_PROGRESS: Record<string, number> = {
  resetting_tables: 5,
  fetching_rel_types: 10,
  fetching_cis: 20,
  loading_cis: 45,
  fetching_relationships: 60,
  loading_relationships: 80,
  updating_degrees: 90,
  indexing_search: 95,
  fetching_changed_cis: 35,
  fetching_changed_relationships: 70,
};

interface ETLState {
  status: SyncStatus;
  progress: number; // 0-100
  currentStage: string | null;
  currentStageStartedAt: string | null;
  lastSyncType: SyncType | null;
  lastSyncTimestamp: string | null;
  lastSyncDuration: number | null;
  lastCICount: number | null;
  lastRelCount: number | null;
  lastError: string | null;
  nextScheduledSync: string | null;
  currentSyncId: string | null;

  // ── Actions ──────────────────────────────────────────────
  setStatus: (status: SyncStatus) => void;
  setProgress: (progress: number) => void;
  handleWSEvent: (event: WSEvent) => void;
  setFromStatus: (data: {
    status: SyncStatus;
    current_sync_id: string | null;
    current_sync_type: SyncType | null;
    current_stage: string | null;
    current_stage_started_at: string | null;
    last_sync_type: SyncType | null;
    last_sync_timestamp: string | null;
    last_sync_duration_seconds: number | null;
    last_sync_ci_count: number | null;
    last_sync_rel_count: number | null;
    last_sync_error: string | null;
    next_scheduled_sync: string | null;
  }) => void;
  reset: () => void;
}

export const useETLStore = create<ETLState>((set) => ({
  status: "idle",
  progress: 0,
  currentStage: null,
  currentStageStartedAt: null,
  lastSyncType: null,
  lastSyncTimestamp: null,
  lastSyncDuration: null,
  lastCICount: null,
  lastRelCount: null,
  lastError: null,
  nextScheduledSync: null,
  currentSyncId: null,

  setStatus: (status) => set({ status }),
  setProgress: (progress) => set({ progress }),

  handleWSEvent: (event) => {
    switch (event.type) {
      case "sync_started":
        set({
          status: "running",
          progress: 0,
          currentStage: null,
          currentStageStartedAt: null,
          lastSyncType: event.sync_type ?? null,
          currentSyncId: event.sync_id ?? null,
          lastError: null,
        });
        break;
      case "sync_progress":
        set({
          progress: event.progress ?? (event.stage ? STAGE_PROGRESS[event.stage] ?? 0 : 0),
          currentStage: event.stage ?? null,
          currentStageStartedAt: new Date().toISOString(),
        });
        break;
      case "sync_completed":
        set({
          status: "idle",
          progress: 100,
          currentStage: null,
          currentStageStartedAt: null,
          lastSyncTimestamp: new Date().toISOString(),
          lastCICount: event.ci_count ?? null,
          lastRelCount: event.rel_count ?? null,
          lastSyncType: event.sync_type ?? null,
          currentSyncId: null,
          lastError: null,
        });
        break;
      case "sync_error":
      case "sync_failed":
        set({
          status: "failed",
          progress: 0,
          currentStage: event.stage ?? null,
          lastError: event.error ?? "Unknown error",
          currentSyncId: null,
        });
        break;
    }
  },

  setFromStatus: (data) =>
    set({
      status: data.status,
      currentSyncId: data.current_sync_id,
      currentStage: data.current_stage,
      currentStageStartedAt: data.current_stage_started_at,
      lastSyncType: data.last_sync_type,
      lastSyncTimestamp: data.last_sync_timestamp,
      lastSyncDuration: data.last_sync_duration_seconds,
      lastCICount: data.last_sync_ci_count,
      lastRelCount: data.last_sync_rel_count,
      lastError: data.last_sync_error,
      nextScheduledSync: data.next_scheduled_sync,
    }),

  reset: () =>
    set({
      status: "idle",
      progress: 0,
      currentStage: null,
      currentStageStartedAt: null,
      lastSyncType: null,
      lastSyncTimestamp: null,
      lastSyncDuration: null,
      lastCICount: null,
      lastRelCount: null,
      lastError: null,
      nextScheduledSync: null,
      currentSyncId: null,
    }),
}));
