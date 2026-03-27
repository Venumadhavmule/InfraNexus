"use client";

import { useMemo } from "react";
import { useGraphStore } from "@/store/graphStore";
import type { GraphNode } from "@/types";

/**
 * Returns filtered nodes and edges based on the current graph filter state.
 * When no filters are active, returns all nodes/edges.
 */
export function useGraphFilters() {
  const nodes = useGraphStore((s) => s.nodes);
  const edges = useGraphStore((s) => s.edges);
  const filters = useGraphStore((s) => s.filters);

  const filteredNodes = useMemo(() => {
    const hasClassFilter = filters.ciClasses.size > 0;
    const hasEnvFilter = filters.environments.size > 0;
    const hasMinDegree = filters.minDegree > 0;

    if (!hasClassFilter && !hasEnvFilter && !hasMinDegree) {
      return [...nodes.values()];
    }

    const result: GraphNode[] = [];
    for (const node of nodes.values()) {
      if (hasClassFilter && !filters.ciClasses.has(node.ci_class)) continue;
      if (hasEnvFilter && !filters.environments.has(node.environment)) continue;
      if (hasMinDegree && node.degree < filters.minDegree) continue;
      result.push(node);
    }
    return result;
  }, [nodes, filters]);

  const filteredNodeIds = useMemo(
    () => new Set(filteredNodes.map((n) => n.id)),
    [filteredNodes],
  );

  const filteredEdges = useMemo(() => {
    const hasRelFilter = filters.relTypes.size > 0;
    const allEdges = [...edges.values()];

    return allEdges.filter((edge) => {
      const src = typeof edge.source === "string" ? edge.source : edge.source.id;
      const tgt = typeof edge.target === "string" ? edge.target : edge.target.id;

      // Both endpoints must be in the filtered node set
      if (!filteredNodeIds.has(src) || !filteredNodeIds.has(tgt)) return false;

      // Relationship type filter
      if (hasRelFilter && !filters.relTypes.has(edge.rel_type)) return false;

      return true;
    });
  }, [edges, filters.relTypes, filteredNodeIds]);

  return { filteredNodes, filteredEdges, filteredNodeIds };
}
