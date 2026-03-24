import { describe, it, expect } from "vitest";
import { act } from "@testing-library/react";
import { useGraphStore } from "@/store/graphStore";
import type { GraphNode, GraphLink } from "@/types";

function makeNode(id: string): GraphNode {
  return {
    id,
    name: `Node ${id}`,
    ci_class: "Server",
    ci_class_raw: "cmdb_ci_server",
    environment: "Production",
    operational_status: 1,
    degree: 2,
    cluster_id: 0,
  };
}

describe("graphStore", () => {
  beforeEach(() => {
    act(() => useGraphStore.getState().clearGraph());
  });

  it("starts with empty state", () => {
    const state = useGraphStore.getState();
    expect(state.nodes.size).toBe(0);
    expect(state.edges.size).toBe(0);
    expect(state.selectedNodeId).toBeNull();
  });

  it("setGraph replaces all graph data", () => {
    const nodes = new Map<string, GraphNode>();
    nodes.set("a", makeNode("a"));
    nodes.set("b", makeNode("b"));

    const edges = new Map<string, GraphLink>();
    edges.set("a::Runs on::b", {
      source: "a",
      target: "b",
      rel_type: "Runs on",
      rel_type_reverse: "Is run by",
    });

    act(() => {
      useGraphStore.getState().setGraph(nodes, edges, "a", false, 2);
    });

    const state = useGraphStore.getState();
    expect(state.nodes.size).toBe(2);
    expect(state.edges.size).toBe(1);
    expect(state.centerId).toBe("a");
    expect(state.selectedNodeId).toBe("a");
    expect(state.expandedNodeIds.has("a")).toBe(true);
  });

  it("selectNode and hoverNode update state", () => {
    act(() => useGraphStore.getState().selectNode("x"));
    expect(useGraphStore.getState().selectedNodeId).toBe("x");

    act(() => useGraphStore.getState().hoverNode("y"));
    expect(useGraphStore.getState().hoveredNodeId).toBe("y");

    act(() => useGraphStore.getState().selectNode(null));
    expect(useGraphStore.getState().selectedNodeId).toBeNull();
  });

  it("toggles class filter", () => {
    act(() => useGraphStore.getState().toggleClassFilter("Server"));
    expect(useGraphStore.getState().filters.ciClasses.has("Server")).toBe(true);

    act(() => useGraphStore.getState().toggleClassFilter("Server"));
    expect(useGraphStore.getState().filters.ciClasses.has("Server")).toBe(false);
  });

  it("resets filters", () => {
    act(() => {
      useGraphStore.getState().toggleClassFilter("Server");
      useGraphStore.getState().toggleEnvFilter("Production");
      useGraphStore.getState().setMinDegree(5);
      useGraphStore.getState().resetFilters();
    });

    const filters = useGraphStore.getState().filters;
    expect(filters.ciClasses.size).toBe(0);
    expect(filters.environments.size).toBe(0);
    expect(filters.minDegree).toBe(0);
  });

  it("setHops and setMaxNodes", () => {
    act(() => {
      useGraphStore.getState().setHops(3);
      useGraphStore.getState().setMaxNodes(1000);
    });

    expect(useGraphStore.getState().hops).toBe(3);
    expect(useGraphStore.getState().maxNodes).toBe(1000);
  });

  it("clearGraph resets all state", () => {
    const nodes = new Map<string, GraphNode>();
    nodes.set("a", makeNode("a"));

    act(() => {
      useGraphStore.getState().setGraph(nodes, new Map(), "a", false, 1);
      useGraphStore.getState().clearGraph();
    });

    const state = useGraphStore.getState();
    expect(state.nodes.size).toBe(0);
    expect(state.centerId).toBeNull();
    expect(state.selectedNodeId).toBeNull();
  });
});
