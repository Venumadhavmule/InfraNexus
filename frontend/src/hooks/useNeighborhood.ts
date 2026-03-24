"use client";

import { useCallback } from "react";
import { fetchNeighborhood } from "@/lib/api";
import { responseToMaps, mergeNeighborhood } from "@/lib/graphMerge";
import { useGraphStore } from "@/store/graphStore";

/**
 * Hook for fetching and merging neighborhood data.
 * - First call sets the graph (replaces).
 * - Subsequent calls (expand) merge into existing graph, preserving positions.
 */
export function useNeighborhood() {
  const {
    nodes,
    edges,
    setGraph,
    mergeGraph,
    markExpanded,
    expandedNodeIds,
    setLoading,
    setError,
    getNeighborhoodOptions,
  } = useGraphStore();

  const loadNeighborhood = useCallback(
    async (ciId: string) => {
      setLoading(true);
      setError(null);
      try {
        const opts = getNeighborhoodOptions();
        const response = await fetchNeighborhood(ciId, opts);
        const { nodes: newNodes, edges: newEdges } = responseToMaps(response);
        setGraph(newNodes, newEdges, response.center_id, response.truncated, response.total_in_neighborhood);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load neighborhood");
      } finally {
        setLoading(false);
      }
    },
    [setGraph, setLoading, setError, getNeighborhoodOptions],
  );

  const expandNode = useCallback(
    async (ciId: string) => {
      if (expandedNodeIds.has(ciId)) return;
      setLoading(true);
      setError(null);
      try {
        const opts = getNeighborhoodOptions();
        const response = await fetchNeighborhood(ciId, opts);
        const { nodes: newNodes, edges: newEdges } = responseToMaps(response);

        const merged = mergeNeighborhood(nodes, edges, response);
        mergeGraph(merged.nodes, merged.edges);
        markExpanded(ciId);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to expand node");
      } finally {
        setLoading(false);
      }
    },
    [nodes, edges, expandedNodeIds, mergeGraph, markExpanded, setLoading, setError, getNeighborhoodOptions],
  );

  return { loadNeighborhood, expandNode };
}
