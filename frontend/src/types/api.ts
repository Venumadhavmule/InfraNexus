// API response types — matches backend models exactly

export interface SearchHit {
  sys_id: string;
  name: string;
  class_label: string;
  environment: string;
  operational_status: number;
  ip_address: string;
  short_description: string;
  highlight: Record<string, string>;
}

export interface SearchResponse {
  hits: SearchHit[];
  total: number;
  facets: Record<string, Record<string, number>>;
  limit: number;
  offset: number;
  query_time_ms: number;
  cached: boolean;
}

export interface SuggestHit {
  text: string;
  ci_id: string;
  class_label: string;
}

export interface SuggestResponse {
  suggestions: SuggestHit[];
  query: string;
  query_time_ms: number;
  cached: boolean;
}

export interface RelationshipSummary {
  rel_type: string;
  ci_id: string;
  ci_name: string;
  ci_class: string;
}

export interface CIDetail {
  sys_id: string;
  name: string;
  sys_class_name: string;
  class_label: string;
  environment: string;
  operational_status: number;
  ip_address: string;
  fqdn: string;
  os: string;
  os_version: string;
  cpu_count: number | null;
  ram_mb: number | null;
  disk_space_gb: number | null;
  location: string;
  department: string;
  assigned_to: string;
  support_group: string;
  short_description: string;
  sys_created_on: string | null;
  sys_updated_on: string | null;
  degree: number;
  cluster_id: number;
  relationships_incoming: RelationshipSummary[];
  relationships_outgoing: RelationshipSummary[];
}

export interface CITimelineEntry {
  timestamp: string;
  change_type: string;
  field: string | null;
  old_value: string | null;
  new_value: string | null;
}

export interface CITimelineResponse {
  ci_id: string;
  changes: CITimelineEntry[];
  total_changes: number;
  query_time_ms: number;
  cached: boolean;
}

export type SyncType = "full" | "incremental";
export type SyncStatus = "idle" | "running" | "failed";

export interface SyncTriggerResponse {
  sync_id: string;
  type: SyncType;
  status: SyncStatus;
  started_at: string;
}

export interface ETLStatusResponse {
  status: SyncStatus;
  last_sync_type: SyncType | null;
  last_sync_timestamp: string | null;
  last_sync_duration_seconds: number | null;
  last_sync_ci_count: number | null;
  last_sync_rel_count: number | null;
  last_sync_error: string | null;
  next_scheduled_sync: string | null;
}

export interface HealthResponse {
  status: "ok" | "degraded" | "down";
  timestamp: string;
}

export interface DependencyCheck {
  status: "ready" | "not_ready";
  latency_ms: number | null;
}

export interface ReadyResponse {
  status: "ready" | "not_ready";
  checks: Record<string, DependencyCheck>;
  timestamp: string;
}

export interface ErrorResponse {
  detail: string;
  type: string;
  status_code: number;
  request_id: string | null;
  timestamp: string;
}

export interface SearchFilters {
  ciClass?: string;
  environment?: string;
  status?: number;
}

export interface WSEvent {
  type: "sync_started" | "sync_progress" | "sync_completed" | "sync_failed" | "sync_error";
  sync_id?: string;
  sync_type?: SyncType;
  progress?: number;
  stage?: string;
  message?: string;
  ci_count?: number;
  rel_count?: number;
  error?: string;
}
