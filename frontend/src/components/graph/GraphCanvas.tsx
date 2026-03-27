"use client";

import { useRef, useCallback, useEffect, useMemo, useState } from "react";
import ForceGraph3D, {
  type ForceGraphMethods,
  type LinkObject,
  type NodeObject,
} from "react-force-graph-3d";
import type { GraphNode, GraphLink } from "@/types";
import { useGraphStore } from "@/store/graphStore";
import { useUIStore } from "@/store/uiStore";
import { useGraphFilters } from "@/hooks/useGraphFilters";
import { useCamera } from "@/hooks/useCamera";
import { useNeighborhood } from "@/hooks/useNeighborhood";
import { useKeyboardNav } from "@/hooks/useKeyboardNav";
import { getNodeConfig, getStatusOpacity } from "@/lib/colorMap";
import { getEdgeStyle } from "@/lib/edgeStyles";
import {
  FORCE_ALPHA_DECAY,
  FORCE_CHARGE_STRENGTH,
  FORCE_LINK_DISTANCE,
  HIERARCHICAL_LAYER_SPACING,
  RADIAL_RING_SPACING,
  FORCE_WARMUP_TICKS,
  FORCE_COOLDOWN_TIME,
  EDGE_PARTICLE_COUNT,
  EDGE_PARTICLE_SPEED,
} from "@/lib/constants";
import SpriteText from "three-spritetext";
import * as THREE from "three";

export function GraphCanvas() {
  const graphRef = useRef<
    ForceGraphMethods<NodeObject<GraphNode>, LinkObject<GraphNode, GraphLink>> | undefined
  >(undefined);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  const selectedNodeId = useGraphStore((s) => s.selectedNodeId);
  const centerId = useGraphStore((s) => s.centerId);
  const selectNode = useGraphStore((s) => s.selectNode);
  const hoverNode = useGraphStore((s) => s.hoverNode);
  const pathHighlight = useGraphStore((s) => s.pathHighlight);

  const layoutMode = useUIStore((s) => s.layoutMode);
  const theme = useUIStore((s) => s.theme);
  const showLabels = useUIStore((s) => s.showLabels);
  const showParticles = useUIStore((s) => s.showParticles);

  const { filteredNodes, filteredEdges } = useGraphFilters();
  const { flyToNode, resetCamera, zoomToFit } = useCamera(graphRef);
  const { expandNode } = useNeighborhood();
  const objectCacheRef = useRef<Map<string, THREE.Group>>(new Map());

  useKeyboardNav({
    onResetCamera: resetCamera,
    onZoomToFit: zoomToFit,
  });

  // Track container size
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Fly to selected node
  useEffect(() => {
    if (!selectedNodeId) return;
    const nodes = useGraphStore.getState().nodes;
    const node = nodes.get(selectedNodeId);
    if (node) flyToNode(node);
  }, [selectedNodeId, flyToNode]);

  const pathSet = useMemo(() => new Set(pathHighlight), [pathHighlight]);
  const visibleNodeIds = useMemo(() => new Set(filteredNodes.map((node) => node.id)), [filteredNodes]);
  const graphData = useMemo(
    () => ({
      nodes: filteredNodes,
      links: filteredEdges,
    }),
    [filteredEdges, filteredNodes],
  );
  const depthMap = useMemo(
    () => buildDepthMap(centerId, filteredNodes, filteredEdges),
    [centerId, filteredEdges, filteredNodes],
  );

  useEffect(() => {
    const cache = objectCacheRef.current;
    for (const [nodeId, object] of cache.entries()) {
      if (!visibleNodeIds.has(nodeId)) {
        disposeObject3D(object);
        cache.delete(nodeId);
      }
    }
  }, [visibleNodeIds]);

  useEffect(() => {
    const fg = graphRef.current as unknown as LayoutGraphRef | undefined;
    if (!fg) {
      return;
    }

    const graphNodes = useGraphStore.getState().nodes;
    const mutableNodes = filteredNodes
      .map((node) => graphNodes.get(node.id))
      .filter((node): node is GraphNode => Boolean(node));

    if (layoutMode === "force3d") {
      for (const node of mutableNodes) {
        node.fx = undefined;
        node.fy = undefined;
        node.fz = undefined;
      }
      const chargeForce = fg.d3Force?.("charge");
      const linkForce = fg.d3Force?.("link");
      chargeForce?.strength?.(FORCE_CHARGE_STRENGTH);
      linkForce?.distance?.(FORCE_LINK_DISTANCE);
    } else if (layoutMode === "radial") {
      applyRadialLayout(mutableNodes, depthMap);
      const chargeForce = fg.d3Force?.("charge");
      const linkForce = fg.d3Force?.("link");
      chargeForce?.strength?.(-30);
      linkForce?.distance?.(FORCE_LINK_DISTANCE * 1.15);
    } else {
      applyHierarchicalLayout(mutableNodes, depthMap);
      const chargeForce = fg.d3Force?.("charge");
      const linkForce = fg.d3Force?.("link");
      chargeForce?.strength?.(-18);
      linkForce?.distance?.(FORCE_LINK_DISTANCE * 1.35);
    }

    const frameId = requestAnimationFrame(() => {
      graphRef.current?.d3ReheatSimulation();
    });

    return () => {
      cancelAnimationFrame(frameId);
    };
  }, [depthMap, filteredNodes, layoutMode]);

  const handleNodeClick = useCallback(
    (node: GraphNode) => {
      selectNode(node.id);
    },
    [selectNode],
  );

  const handleNodeRightClick = useCallback(
    (node: GraphNode) => {
      expandNode(node.id);
    },
    [expandNode],
  );

  const handleNodeHover = useCallback(
    (node: GraphNode | null) => {
      hoverNode(node?.id ?? null);
      if (containerRef.current) {
        containerRef.current.style.cursor = node ? "pointer" : "default";
      }
    },
    [hoverNode],
  );

  const nodeThreeObject = useCallback(
    (node: GraphNode) => {
      const config = getNodeConfig(node.ci_class);
      const opacity = getStatusOpacity(node.operational_status);
      const isSelected = node.id === selectedNodeId;
      const isOnPath = pathSet.has(node.id);
      const shouldShowLabel = showLabels && (filteredNodes.length <= 80 || isSelected || isOnPath || node.degree >= 8);

      const scale = isSelected ? 1.2 : 1;
      const size = config.size * scale;
      const renderSignature = [
        config.shape,
        config.color,
        size,
        opacity,
        isSelected,
        isOnPath,
        shouldShowLabel,
        theme,
        node.name,
      ].join("|");

      const cache = objectCacheRef.current;
      const group = cache.get(node.id) ?? new THREE.Group();
      if (group.userData.signature === renderSignature) {
        return group;
      }

      // Create geometry based on shape
      let geometry: THREE.BufferGeometry;
      switch (config.shape) {
        case "box":
          geometry = new THREE.BoxGeometry(size, size, size);
          break;
        case "cylinder":
          geometry = new THREE.CylinderGeometry(size * 0.5, size * 0.5, size, 16);
          break;
        case "cone":
          geometry = new THREE.ConeGeometry(size * 0.5, size, 16);
          break;
        case "octahedron":
          geometry = new THREE.OctahedronGeometry(size * 0.5);
          break;
        case "dodecahedron":
          geometry = new THREE.DodecahedronGeometry(size * 0.5);
          break;
        case "icosahedron":
          geometry = new THREE.IcosahedronGeometry(size * 0.5);
          break;
        case "torus":
          geometry = new THREE.TorusGeometry(size * 0.4, size * 0.15, 8, 16);
          break;
        default:
          geometry = new THREE.SphereGeometry(size * 0.5, 16, 16);
      }

      const color = new THREE.Color(config.color);
      const material = new THREE.MeshLambertMaterial({
        color,
        transparent: true,
        opacity: opacity * (isOnPath ? 1 : isSelected ? 1 : 0.85),
        emissive: color,
        emissiveIntensity: isSelected ? 0.6 : config.glowIntensity,
      });

      let body = group.userData.body as THREE.Mesh | undefined;
      if (!body) {
        body = new THREE.Mesh();
        group.userData.body = body;
        group.add(body);
      }

      if (body.geometry) {
        body.geometry.dispose();
      }
      const oldMaterial = body.material;
      if (oldMaterial instanceof THREE.Material) {
        oldMaterial.dispose();
      }
      body.geometry = geometry;
      body.material = material;
      body.renderOrder = 1;

      const existingLabel = group.userData.label as SpriteText | undefined;
      if (existingLabel) {
        group.remove(existingLabel);
        const labelMaterial = existingLabel.material as THREE.Material | undefined;
        labelMaterial?.dispose();
        group.userData.label = undefined;
      }

      if (shouldShowLabel) {
        const sprite = new SpriteText(node.name) as SpriteText & {
          backgroundColor?: string;
          padding?: number;
          borderRadius?: number;
        };
        sprite.color = isSelected
          ? theme === "dark" ? "#ffffff" : "#111827"
          : theme === "dark" ? "#d9e3ee" : "#475569";
        sprite.backgroundColor = theme === "dark" ? "rgba(10,15,26,0.74)" : "rgba(255,255,255,0.92)";
        sprite.padding = 4;
        sprite.borderRadius = 4;
        sprite.textHeight = isSelected ? 4.2 : 2.7;
        sprite.position.set(0, size + 4, 0);
        const spriteMaterial = sprite.material as THREE.Material;
        spriteMaterial.depthWrite = false;
        spriteMaterial.depthTest = false;
        group.add(sprite);
        group.userData.label = sprite;
      }

      group.userData.signature = renderSignature;
      cache.set(node.id, group);
      return group;
    },
    [filteredNodes.length, pathSet, selectedNodeId, showLabels, theme],
  );

  const linkColor = useCallback(
    (link: GraphLink) => {
      const style = getEdgeStyle(link.rel_type);
      return style.color;
    },
    [],
  );

  const linkWidth = useCallback(
    (link: GraphLink) => {
      const style = getEdgeStyle(link.rel_type);
      return style.width;
    },
    [],
  );

  return (
    <div ref={containerRef} className="h-full w-full">
      <ForceGraph3D<GraphNode, GraphLink>
        ref={graphRef}
        width={dimensions.width}
        height={dimensions.height}
        graphData={graphData}
        nodeId="id"
        linkSource="source"
        linkTarget="target"
        nodeThreeObject={nodeThreeObject}
        nodeThreeObjectExtend={false}
        onNodeClick={handleNodeClick}
        onNodeRightClick={handleNodeRightClick}
        onNodeHover={handleNodeHover}
        linkColor={linkColor}
        linkWidth={linkWidth}
        linkDirectionalArrowLength={4}
        linkDirectionalArrowRelPos={0.9}
        linkDirectionalParticles={showParticles ? EDGE_PARTICLE_COUNT : 0}
        linkDirectionalParticleSpeed={EDGE_PARTICLE_SPEED}
        linkDirectionalParticleWidth={2}
        d3AlphaDecay={FORCE_ALPHA_DECAY}
        d3VelocityDecay={0.3}
        warmupTicks={FORCE_WARMUP_TICKS}
        cooldownTime={FORCE_COOLDOWN_TIME}
        backgroundColor="rgba(0,0,0,0)"
        showNavInfo={false}
      />
    </div>
  );
}

type LayoutGraphRef = ForceGraphMethods<NodeObject<GraphNode>, LinkObject<GraphNode, GraphLink>> & {
  d3Force?: (forceName: string) => {
    strength?: (value: number) => void;
    distance?: (value: number) => void;
  } | undefined;
};

function buildDepthMap(
  centerId: string | null,
  nodes: GraphNode[],
  edges: GraphLink[],
): Map<string, number> {
  const adjacency = new Map<string, string[]>();
  for (const node of nodes) {
    adjacency.set(node.id, []);
  }

  for (const edge of edges) {
    const source = typeof edge.source === "string" ? edge.source : edge.source.id;
    const target = typeof edge.target === "string" ? edge.target : edge.target.id;
    adjacency.get(source)?.push(target);
    adjacency.get(target)?.push(source);
  }

  const fallbackCenterId = centerId ?? nodes[0]?.id;
  const depths = new Map<string, number>();
  if (!fallbackCenterId) {
    return depths;
  }

  const queue: string[] = [fallbackCenterId];
  depths.set(fallbackCenterId, 0);

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) {
      continue;
    }

    const currentDepth = depths.get(current) ?? 0;
    for (const neighbor of adjacency.get(current) ?? []) {
      if (!depths.has(neighbor)) {
        depths.set(neighbor, currentDepth + 1);
        queue.push(neighbor);
      }
    }
  }

  for (const node of nodes) {
    if (!depths.has(node.id)) {
      depths.set(node.id, 0);
    }
  }

  return depths;
}

function applyRadialLayout(nodes: GraphNode[], depthMap: Map<string, number>): void {
  const grouped = groupNodesByDepth(nodes, depthMap);
  for (const [depth, levelNodes] of grouped.entries()) {
    const radius = depth === 0 ? 0 : depth * RADIAL_RING_SPACING;
    levelNodes.forEach((node, index) => {
      if (depth === 0) {
        node.fx = 0;
        node.fy = 0;
        node.fz = 0;
        return;
      }

      const angle = (Math.PI * 2 * index) / levelNodes.length;
      node.fx = Math.cos(angle) * radius;
      node.fy = Math.sin(angle) * radius;
      node.fz = 0;
    });
  }
}

function applyHierarchicalLayout(nodes: GraphNode[], depthMap: Map<string, number>): void {
  const grouped = groupNodesByDepth(nodes, depthMap);
  const maxLevelSize = Math.max(...grouped.values().map((group) => group.length), 1);

  for (const [depth, levelNodes] of grouped.entries()) {
    const y = depth * HIERARCHICAL_LAYER_SPACING;
    const spread = Math.max(levelNodes.length - 1, 1);
    levelNodes.forEach((node, index) => {
      node.fx = ((index - spread / 2) * HIERARCHICAL_LAYER_SPACING * 1.15) / Math.max(maxLevelSize / 2, 1);
      node.fy = y;
      node.fz = 0;
    });
  }
}

function groupNodesByDepth(nodes: GraphNode[], depthMap: Map<string, number>): Map<number, GraphNode[]> {
  const grouped = new Map<number, GraphNode[]>();
  for (const node of nodes) {
    const depth = depthMap.get(node.id) ?? 0;
    const levelNodes = grouped.get(depth) ?? [];
    levelNodes.push(node);
    grouped.set(depth, levelNodes);
  }
  return grouped;
}

function disposeObject3D(object: THREE.Object3D): void {
  object.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (mesh.geometry) {
      mesh.geometry.dispose();
    }

    if (Array.isArray(mesh.material)) {
      mesh.material.forEach((material) => material.dispose());
    } else if (mesh.material) {
      mesh.material.dispose();
    }
  });
}
