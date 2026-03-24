import type {
  NeighborhoodResponse,
  PathResponse,
  ClustersResponse,
  GraphStatsResponse,
  SearchResponse,
  SuggestResponse,
  CIDetail,
  CITimelineResponse,
  SyncTriggerResponse,
  ETLStatusResponse,
  HealthResponse,
  ReadyResponse,
  ErrorResponse,
  NeighborhoodOptions,
  SearchFilters,
  SyncType,
} from "@/types";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const DEFAULT_TIMEOUT = 15_000;

export class APIError extends Error {
  constructor(
    public status: number,
    public detail: string,
    public type: string,
    public requestId: string | null,
  ) {
    super(detail);
    this.name = "APIError";
  }
}

export class NetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NetworkError";
  }
}

async function request<T>(path: string, init?: RequestInit & { timeout?: number }): Promise<T> {
  const { timeout = DEFAULT_TIMEOUT, ...fetchInit } = init ?? {};

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      ...fetchInit,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...fetchInit.headers,
      },
    });

    if (!res.ok) {
      let body: ErrorResponse | null = null;
      try {
        body = await res.json();
      } catch {
        // non-JSON error
      }
      throw new APIError(
        res.status,
        body?.detail ?? res.statusText,
        body?.type ?? "unknown",
        body?.request_id ?? null,
      );
    }

    return (await res.json()) as T;
  } catch (err) {
    if (err instanceof APIError) throw err;
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new NetworkError(`Request timed out after ${timeout}ms: ${path}`);
    }
    throw new NetworkError(
      err instanceof Error ? err.message : "Unknown network error",
    );
  } finally {
    clearTimeout(timer);
  }
}

// ── Graph Endpoints ────────────────────────────────────────

export async function fetchNeighborhood(
  ciId: string,
  opts: NeighborhoodOptions = {},
): Promise<NeighborhoodResponse> {
  const params = new URLSearchParams();
  if (opts.hops) params.set("hops", String(opts.hops));
  if (opts.maxNodes) params.set("max_nodes", String(opts.maxNodes));
  if (opts.degreeThreshold) params.set("degree_threshold", String(opts.degreeThreshold));
  if (opts.classFilter?.length) {
    for (const c of opts.classFilter) params.append("class", c);
  }
  if (opts.envFilter?.length) {
    for (const e of opts.envFilter) params.append("env", e);
  }
  const qs = params.toString();
  return request<NeighborhoodResponse>(`/graph/neighborhood/${ciId}${qs ? `?${qs}` : ""}`);
}

export async function fetchPath(
  sourceId: string,
  targetId: string,
  maxDepth = 5,
): Promise<PathResponse> {
  return request<PathResponse>(`/graph/path/${sourceId}/${targetId}?max_depth=${maxDepth}`);
}

export async function fetchClusters(): Promise<ClustersResponse> {
  return request<ClustersResponse>("/graph/clusters");
}

export async function fetchGraphStats(): Promise<GraphStatsResponse> {
  return request<GraphStatsResponse>("/graph/stats");
}

// ── Search Endpoints ───────────────────────────────────────

export async function search(
  query: string,
  filters: SearchFilters = {},
  limit = 20,
  offset = 0,
): Promise<SearchResponse> {
  const params = new URLSearchParams({ q: query, limit: String(limit), offset: String(offset) });
  if (filters.ciClass) params.set("ci_class", filters.ciClass);
  if (filters.environment) params.set("environment", filters.environment);
  if (filters.status !== undefined) params.set("operational_status", String(filters.status));
  return request<SearchResponse>(`/search?${params}`);
}

export async function suggest(query: string, limit = 8): Promise<SuggestResponse> {
  return request<SuggestResponse>(`/search/suggest?q=${encodeURIComponent(query)}&limit=${limit}`);
}

// ── CI Endpoints ───────────────────────────────────────────

export async function fetchCI(ciId: string): Promise<CIDetail> {
  return request<CIDetail>(`/ci/${ciId}`);
}

export async function fetchCITimeline(ciId: string): Promise<CITimelineResponse> {
  return request<CITimelineResponse>(`/ci/${ciId}/timeline`);
}

// ── ETL Endpoints ──────────────────────────────────────────

export async function triggerSync(type: SyncType = "incremental"): Promise<SyncTriggerResponse> {
  return request<SyncTriggerResponse>("/etl/sync", {
    method: "POST",
    body: JSON.stringify({ type }),
  });
}

export async function fetchETLStatus(): Promise<ETLStatusResponse> {
  return request<ETLStatusResponse>("/etl/status");
}

// ── Health Endpoints ───────────────────────────────────────

export async function fetchHealth(): Promise<HealthResponse> {
  return request<HealthResponse>("/health");
}

export async function fetchReady(): Promise<ReadyResponse> {
  return request<ReadyResponse>("/ready");
}

// ── SWR Fetcher ────────────────────────────────────────────

export function swrFetcher<T>(path: string): Promise<T> {
  return request<T>(path);
}
