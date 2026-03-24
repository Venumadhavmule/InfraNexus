import { describe, it, expect } from "vitest";
import { mergeNeighborhood, responseToMaps, removeNode } from "@/lib/graphMerge";
import type { GraphNode, GraphLink, NeighborhoodResponse } from "@/types";

function makeNode(id: string, overrides?: Partial<GraphNode>): GraphNode {
  return {
    id,
    name: `Node ${id}`,
    ci_class: "Server",
    ci_class_raw: "cmdb_ci_server",
    environment: "Production",
    operational_status: 1,
    degree: 2,
    cluster_id: 0,
    ...overrides,
  };
}

function makeEdge(source: string, target: string, rel = "Runs on"): GraphLink {
  return { source, target, rel_type: rel, rel_type_reverse: `Reverse of ${rel}` };
}

function makeResponse(
  nodes: GraphNode[],
  edges: GraphLink[],
  centerId = "a",
): NeighborhoodResponse {
  return {
    nodes,
    edges,
    center_id: centerId,
    total_in_neighborhood: nodes.length,
    truncated: false,
    query_time_ms: 5,
    cached: false,
  };
}

describe("responseToMaps", () => {
  it("converts response to Maps keyed by id/composite", () => {
    const res = makeResponse(
      [makeNode("a"), makeNode("b")],
      [makeEdge("a", "b")],
    );
    const { nodes, edges } = responseToMaps(res);

    expect(nodes.size).toBe(2);
    expect(nodes.get("a")?.name).toBe("Node a");
    expect(edges.size).toBe(1);
    expect([...edges.keys()][0]).toBe("a::Runs on::b");
  });
});

describe("mergeNeighborhood", () => {
  it("adds new nodes and preserves existing positions", () => {
    const existing = new Map<string, GraphNode>();
    existing.set("a", makeNode("a", { x: 10, y: 20, z: 30 }));

    const res = makeResponse(
      [makeNode("a", { degree: 5 }), makeNode("c")],
      [makeEdge("a", "c")],
    );

    const { nodes, edges } = mergeNeighborhood(existing, new Map(), res);

    expect(nodes.size).toBe(2);
    // Positions preserved for existing node
    expect(nodes.get("a")?.x).toBe(10);
    expect(nodes.get("a")?.y).toBe(20);
    expect(nodes.get("a")?.z).toBe(30);
    // Updated data merged
    expect(nodes.get("a")?.degree).toBe(5);
    // New node added
    expect(nodes.get("c")).toBeDefined();
    expect(edges.size).toBe(1);
  });

  it("deduplicates edges by composite key", () => {
    const existingEdges = new Map<string, GraphLink>();
    existingEdges.set("a::Runs on::b", makeEdge("a", "b"));

    const res = makeResponse([], [makeEdge("a", "b"), makeEdge("a", "b", "Depends on")]);

    const { edges } = mergeNeighborhood(new Map(), existingEdges, res);
    expect(edges.size).toBe(2); // original + new type
  });
});

describe("removeNode", () => {
  it("removes node and all connected edges", () => {
    const nodes = new Map<string, GraphNode>();
    nodes.set("a", makeNode("a"));
    nodes.set("b", makeNode("b"));
    nodes.set("c", makeNode("c"));

    const edges = new Map<string, GraphLink>();
    edges.set("a::Runs on::b", makeEdge("a", "b"));
    edges.set("b::Depends on::c", makeEdge("b", "c", "Depends on"));
    edges.set("a::Depends on::c", makeEdge("a", "c", "Depends on"));

    const result = removeNode(nodes, edges, "b");
    expect(result.nodes.size).toBe(2);
    expect(result.nodes.has("b")).toBe(false);
    expect(result.edges.size).toBe(1); // only a->c remains
  });
});
