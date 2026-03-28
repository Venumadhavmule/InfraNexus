"use client";

import { useRef, useCallback, useEffect, useLayoutEffect, useMemo, useState } from "react";
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
  EDGE_OPACITY,
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
  const pathSet = useMemo(() => new Set(pathHighlight), [pathHighlight]);

  const layoutMode = useUIStore((s) => s.layoutMode);
  const theme = useUIStore((s) => s.theme);
  const showLabels = useUIStore((s) => s.showLabels);
  const showParticles = useUIStore((s) => s.showParticles);

  const { filteredNodes, filteredEdges } = useGraphFilters();
  const { flyToNode, resetCamera, zoomToFit } = useCamera(graphRef);
  const { expandNode, loadNeighborhood } = useNeighborhood();
  const objectCacheRef = useRef<Map<string, THREE.Group>>(new Map());

  // Refs for transient visual state — prevent nodeThreeObject from changing
  // reference on every selection/path/theme change (which would wipe all node
  // positions via nodeDataMapper.clear()).
  const selectedNodeIdRef = useRef(selectedNodeId);
  const pathSetRef = useRef(pathSet);
  const themeRef = useRef(theme);
  const showLabelsRef = useRef(showLabels);
  // Sync refs after every render so callbacks see the latest values.
  // useLayoutEffect fires synchronously after DOM mutations, before paint.
  useLayoutEffect(() => {
    selectedNodeIdRef.current = selectedNodeId;
    pathSetRef.current = pathSet;
    themeRef.current = theme;
    showLabelsRef.current = showLabels;
  });

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

  const visibleNodeIds = useMemo(() => new Set(filteredNodes.map((n) => n.id)), [filteredNodes]);
  const focusNodeIds = useMemo(() => {
    const focused = new Set<string>(selectedNodeId ? [selectedNodeId] : []);
    for (const edge of filteredEdges) {
      const source = typeof edge.source === "string" ? edge.source : edge.source.id;
      const target = typeof edge.target === "string" ? edge.target : edge.target.id;
      if (source === selectedNodeId) focused.add(target);
      if (target === selectedNodeId) focused.add(source);
    }
    return focused.size > 0 ? focused : visibleNodeIds;
  }, [filteredEdges, selectedNodeId, visibleNodeIds]);

  const graphData = useMemo(
    () => ({ nodes: filteredNodes, links: filteredEdges }),
    [filteredEdges, filteredNodes],
  );
  const depthMap = useMemo(
    () => buildDepthMap(centerId, filteredNodes, filteredEdges),
    [centerId, filteredEdges, filteredNodes],
  );

  // Prune stale cache entries for nodes that are no longer visible.
  // We do NOT dispose geometry/materials here — the library's emptyObject()
  // already handles deallocation via its onRemoveObj lifecycle. Disposing
  // ourselves while the object is still in the scene causes WebGL errors.
  useEffect(() => {
    const cache = objectCacheRef.current;
    for (const nodeId of cache.keys()) {
      if (!visibleNodeIds.has(nodeId)) {
        cache.delete(nodeId);
      }
    }
  }, [visibleNodeIds]);

  // When a node with no label (low degree, not in path) becomes selected,
  // inject a label sprite directly without triggering a scene rebuild.
  useEffect(() => {
    try {
      if (!selectedNodeId || typeof selectedNodeId !== "string") return;
      const group = objectCacheRef.current.get(selectedNodeId);
      if (!group || !group.userData || group.userData.label) return; // already has a label

      const node = useGraphStore.getState().nodes.get(selectedNodeId);
      if (!node || !node.name) return;

      const config = getNodeConfig(node.ci_class ?? "Other");
      const degreeScale = Math.min(1.9, 1 + Math.log2(Math.max(node.degree ?? 1, 1) + 1) * 0.22);
      const size = (group.userData.nodeSize as number | undefined) ?? config.size * degreeScale;
      const currentTheme = themeRef.current ?? "dark";

      const sprite = new SpriteText(node.name) as SpriteText & {
        backgroundColor?: string;
        padding?: number;
        borderRadius?: number;
        fontWeight?: string;
      };
      sprite.color = currentTheme === "dark" ? "#ffffff" : "#0f172a";
      sprite.backgroundColor =
        currentTheme === "dark" ? "rgba(15,23,42,0.82)" : "rgba(255,255,255,0.92)";
      sprite.padding = 5;
      sprite.borderRadius = 6;
      sprite.fontWeight = "600";
      sprite.textHeight = 3.4;
      sprite.position.set(0, size + 5, 0);
      const spriteMat = sprite.material as THREE.Material;
      if (spriteMat) {
        spriteMat.depthWrite = false;
        spriteMat.depthTest = false;
      }
      sprite.renderOrder = 6;
      if (group && typeof group.add === "function") {
        group.add(sprite);
        group.userData.label = sprite;
      }
    } catch {
      // Label injection failed silently — next frame will rebuild the node if needed
    }
  }, [selectedNodeId]);

  useEffect(() => {
    const fg = graphRef.current;
    if (!fg || filteredNodes.length === 0) {
      return;
    }

    const shouldAutoFit = filteredNodes.length <= 14;
    if (!shouldAutoFit) {
      return;
    }

    const frameA = requestAnimationFrame(() => {
      const frameB = requestAnimationFrame(() => {
        fg.zoomToFit(
          500,
          filteredNodes.length <= 6 ? 220 : 160,
          (node) => focusNodeIds.has(node.id),
        );
      });

      return () => cancelAnimationFrame(frameB);
    });

    return () => {
      cancelAnimationFrame(frameA);
    };
  }, [filteredNodes.length, focusNodeIds, layoutMode]);

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
      // Immediately update selection for instant visual feedback
      selectNode(node.id);
      // Fetch the full neighborhood centered on this node and update the canvas.
      // This also updates centerId so that hop-depth changes re-fetch the correct CI.
      void loadNeighborhood(node.id);
    },
    [selectNode, loadNeighborhood],
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
      // Read transient state from refs — this keeps the callback reference STABLE
      // across selection/theme changes, preventing nodeDataMapper.clear() from
      // being triggered (which strips children from cached groups and resets all
      // node positions to the origin, making every node appear as a tiny dot).
      const isSelected = selectedNodeIdRef.current === node.id;
      const isOnPath = pathSetRef.current.has(node.id);
      const currentTheme = themeRef.current;
      const currentShowLabels = showLabelsRef.current;
      const shouldShowLabel =
        currentShowLabels &&
        (filteredNodes.length <= 80 || isSelected || isOnPath || node.degree >= 8);

      const config = getNodeConfig(node.ci_class);
      const opacity = getStatusOpacity(node.operational_status);
      // Base size — selection/path scale is applied via nodePositionUpdate (per-frame)
      // so that changing selection does NOT change the renderSignature (no scene rebuild).
      const degreeScale = Math.min(1.9, 1 + Math.log2(Math.max(node.degree, 1) + 1) * 0.22);
      const size = config.size * degreeScale;

      const renderSignature = [
        config.shape,
        config.color,
        size.toFixed(2),
        opacity,
        shouldShowLabel,
        currentTheme,
        node.name,
      ].join("|");

      const cache = objectCacheRef.current;
      let group = cache.get(node.id);
      if (!group) {
        group = new THREE.Group();
      }

      // ── Critical fix: the library's emptyObject() removes all children from
      // our cached group when nodeThreeObject prop changes reference. If the body
      // mesh was removed we must detect this and force full recreation; otherwise
      // we return an empty group (no geometry = invisible node / dot in scene).
      const cachedBody = group.userData.body as THREE.Mesh | undefined;
      if (cachedBody && !group.children.includes(cachedBody)) {
        // Library stripped our children — clear userData so we recreate below.
        group.userData.signature = undefined;
        group.userData.body = undefined;
        group.userData.label = undefined;
      }

      if (group.userData.signature === renderSignature) {
        cache.set(node.id, group);
        return group;
      }

      // ── Build geometry ─────────────────────────────────────────────────────
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
        opacity: opacity * 0.88,
        emissive: color,
        emissiveIntensity: config.glowIntensity,
      });

      // ── Reuse or create body mesh ──────────────────────────────────────────
      let body = group.userData.body as THREE.Mesh | undefined;
      if (!body) {
        body = new THREE.Mesh();
        group.userData.body = body;
      }
      // Ensure body is actually a child of the group (library may have removed it)
      if (!group.children.includes(body)) {
        group.add(body);
      }
      if (body.geometry) body.geometry.dispose();
      const oldMaterial = body.material;
      if (oldMaterial instanceof THREE.Material) oldMaterial.dispose();
      body.geometry = geometry;
      body.material = material;
      body.renderOrder = 4;
      group.renderOrder = 4;

      // ── Label sprite ───────────────────────────────────────────────────────
      const existingLabel = group.userData.label as SpriteText | undefined;
      if (existingLabel) {
        group.remove(existingLabel);
        group.userData.label = undefined;
      }

      if (shouldShowLabel) {
        const sprite = new SpriteText(node.name) as SpriteText & {
          backgroundColor?: string;
          padding?: number;
          borderRadius?: number;
          fontWeight?: string;
        };
        // Theme-aware label colours
        sprite.color = isSelected
          ? currentTheme === "dark" ? "#ffffff" : "#0f172a"
          : currentTheme === "dark" ? "#e2e8f0" : "#1e293b";
        sprite.backgroundColor =
          currentTheme === "dark" ? "rgba(15,23,42,0.82)" : "rgba(255,255,255,0.92)";
        sprite.padding = 5;
        sprite.borderRadius = 6;
        sprite.fontWeight = isSelected ? "600" : "400";
        sprite.textHeight = isSelected ? 3.4 : 2.1;
        sprite.position.set(0, size + 5, 0);
        const spriteMat = sprite.material as THREE.Material;
        spriteMat.depthWrite = false;
        spriteMat.depthTest = false;
        sprite.renderOrder = 6;
        group.add(sprite);
        group.userData.label = sprite;
      }

      group.userData.nodeSize = size; // store for nodePositionUpdate use
      group.userData.signature = renderSignature;
      cache.set(node.id, group);
      return group;
    },
    // Only depends on filteredNodes.length — structural changes only.
    // Selection / path / theme changes are handled per-frame in nodePositionUpdate
    // and via direct cache mutation, so the callback reference stays STABLE.
    [filteredNodes.length],
  );

  // ── Per-frame visual update (runs inside animation tick for every node) ───
  // Updates selection scale, emissive intensity, and label appearance without
  // requiring a scene rebuild. Return false to retain default position update.
  const nodePositionUpdate = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (obj: THREE.Object3D, _pos: { x: number; y: number; z: number }, node: any): boolean => {
      try {
        // Defensive: validate inputs
        if (!obj || !node || typeof node.id !== "string") return false;

        const nodeId = node.id as string;
        const isSelected = selectedNodeIdRef.current === nodeId;
        const isOnPath = pathSetRef.current?.has(nodeId) ?? false;
        const group = obj as THREE.Group;

        if (!group || !group.userData) return false;

        // Scale: selected > path > normal
        const targetScale = isSelected ? 1.22 : isOnPath ? 1.08 : 1.0;
        if (group.scale && Math.abs(group.scale.x - targetScale) > 0.001) {
          try {
            group.scale.setScalar(targetScale);
          } catch {
            // scale update failed, continue silently
          }
        }

        // Emissive intensity for glow/selection highlight
        const body = group.userData.body;
        if (body && typeof body === "object" && "material" in body) {
          const material = (body as THREE.Mesh).material;
          if (material instanceof THREE.MeshLambertMaterial) {
            try {
              const config = getNodeConfig(node.ci_class ?? "Other");
              const targetEmissive = isSelected ? 0.65 : isOnPath ? 0.38 : config.glowIntensity;
              if (Math.abs(material.emissiveIntensity - targetEmissive) > 0.005) {
                material.emissiveIntensity = targetEmissive;
              }
              const baseOpacity = getStatusOpacity(node.operational_status ?? 1) * 0.88;
              const targetOpacity = isSelected || isOnPath ? Math.min(1, baseOpacity / 0.88) : baseOpacity;
              if (Math.abs(material.opacity - targetOpacity) > 0.01) {
                material.opacity = targetOpacity;
              }
            } catch {
              // material update failed, continue silently
            }
          }
        }

        // Label: toggle visibility and update colour/weight based on current state
        const label = group.userData.label;
        if (label && typeof label === "object" && "visible" in label) {
          try {
            const labelObj = label as SpriteText; // SpriteText from three-spritetext
            const currentTheme = themeRef.current ?? "dark";
            const shouldShow =
              showLabelsRef.current &&
              (filteredNodes.length <= 80 || isSelected || isOnPath || (node.degree ?? 0) >= 8);
            if (typeof labelObj.visible === "boolean") labelObj.visible = shouldShow;

            const targetColor = isSelected
              ? currentTheme === "dark" ? "#ffffff" : "#0f172a"
              : currentTheme === "dark" ? "#e2e8f0" : "#1e293b";
            if (labelObj.color !== targetColor && typeof labelObj.color === "string") {
              labelObj.color = targetColor;
            }

            // Keep label background and font in sync with theme + selection state
            const labelExt = labelObj as SpriteText & { backgroundColor?: string; fontWeight?: string };
            const targetBg =
              currentTheme === "dark" ? "rgba(15,23,42,0.82)" : "rgba(255,255,255,0.92)";
            if (labelExt.backgroundColor !== targetBg) {
              labelExt.backgroundColor = targetBg;
            }

            const targetFontWeight = isSelected ? "600" : "400";
            if (typeof labelExt.fontWeight === "string" && labelExt.fontWeight !== targetFontWeight) {
              labelExt.fontWeight = targetFontWeight;
            }

            const targetHeight = isSelected ? 3.4 : 2.1;
            if (labelObj.textHeight !== undefined && Math.abs(labelObj.textHeight - targetHeight) > 0.05) {
              labelObj.textHeight = targetHeight;
            }
          } catch {
            // label update failed, continue silently
          }
        }
      } catch {
        // Catch-all to prevent errors from propagating to the library
      }

      return false; // let library apply default position update
    },
    [filteredNodes.length],
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

  const linkDirectionalArrowLength = useCallback(
    (link: GraphLink) => {
      const style = getEdgeStyle(link.rel_type);
      return Math.max(2, style.width * 1.1 + 0.8);
    },
    [],
  );

  const linkDirectionalArrowRelPos = useCallback(() => 0.78, []);

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
        nodePositionUpdate={nodePositionUpdate}
        onNodeClick={handleNodeClick}
        onNodeRightClick={handleNodeRightClick}
        onNodeHover={handleNodeHover}
        linkColor={linkColor}
        linkOpacity={EDGE_OPACITY}
        linkWidth={linkWidth}
        linkDirectionalArrowLength={linkDirectionalArrowLength}
        linkDirectionalArrowRelPos={linkDirectionalArrowRelPos}
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
