import type { GraphNode, GraphLink, NeighborhoodResponse } from "@/types";

/**
 * Builds a composite key for an edge that is stable regardless of
 * whether source/target are string IDs or resolved node objects.
 */
function edgeKey(edge: GraphLink): string {
  const src = typeof edge.source === "string" ? edge.source : edge.source.id;
  const tgt = typeof edge.target === "string" ? edge.target : edge.target.id;
  return `${src}::${edge.rel_type}::${tgt}`;
}

/**
 * Convert a NeighborhoodResponse into Maps keyed for O(1) lookups.
 */
export function responseToMaps(
  response: NeighborhoodResponse,
): { nodes: Map<string, GraphNode>; edges: Map<string, GraphLink> } {
  const nodes = new Map<string, GraphNode>();
  for (const node of response.nodes) {
    nodes.set(node.id, node);
  }

  const edges = new Map<string, GraphLink>();
  for (const edge of response.edges) {
    edges.set(edgeKey(edge), edge);
  }

  return { nodes, edges };
}

/**
 * Merge new neighborhood data into existing graph state.
 * - Existing nodes: preserve force-sim positions (x, y, z, vx, vy, vz, fx, fy, fz)
 * - New nodes: added as-is
 * - Edges: deduped by composite key (source::rel_type::target)
 * - Returns new Map instances (immutable pattern for Zustand)
 */
export function mergeNeighborhood(
  existingNodes: Map<string, GraphNode>,
  existingEdges: Map<string, GraphLink>,
  response: NeighborhoodResponse,
): { nodes: Map<string, GraphNode>; edges: Map<string, GraphLink> } {
  const nodes = new Map(existingNodes);

  for (const incoming of response.nodes) {
    const existing = nodes.get(incoming.id);
    if (existing) {
      // Preserve positions from force simulation
      nodes.set(incoming.id, {
        ...incoming,
        x: existing.x,
        y: existing.y,
        z: existing.z,
        vx: existing.vx,
        vy: existing.vy,
        vz: existing.vz,
        fx: existing.fx,
        fy: existing.fy,
        fz: existing.fz,
      });
    } else {
      nodes.set(incoming.id, incoming);
    }
  }

  const edges = new Map(existingEdges);
  for (const edge of response.edges) {
    const key = edgeKey(edge);
    if (!edges.has(key)) {
      edges.set(key, edge);
    }
  }

  return { nodes, edges };
}

/**
 * Remove a node and all its connected edges from the graph.
 */
export function removeNode(
  nodes: Map<string, GraphNode>,
  edges: Map<string, GraphLink>,
  nodeId: string,
): { nodes: Map<string, GraphNode>; edges: Map<string, GraphLink> } {
  const nextNodes = new Map(nodes);
  nextNodes.delete(nodeId);

  const nextEdges = new Map<string, GraphLink>();
  for (const [key, edge] of edges) {
    const src = typeof edge.source === "string" ? edge.source : edge.source.id;
    const tgt = typeof edge.target === "string" ? edge.target : edge.target.id;
    if (src !== nodeId && tgt !== nodeId) {
      nextEdges.set(key, edge);
    }
  }

  return { nodes: nextNodes, edges: nextEdges };
}
