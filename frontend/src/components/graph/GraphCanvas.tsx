"use client";

import { useRef, useCallback, useEffect, useState } from "react";
import ForceGraph3D, { type ForceGraphMethods } from "react-force-graph-3d";
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
  FORCE_CHARGE_STRENGTH,
  FORCE_LINK_DISTANCE,
  FORCE_WARMUP_TICKS,
  FORCE_COOLDOWN_TIME,
  LABEL_VISIBILITY_DISTANCE,
  NODE_HOVER_SCALE,
  EDGE_PARTICLE_COUNT,
  EDGE_PARTICLE_SPEED,
} from "@/lib/constants";
import SpriteText from "three-spritetext";
import * as THREE from "three";

export function GraphCanvas() {
  const graphRef = useRef<ForceGraphMethods<GraphNode, GraphLink>>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  const selectedNodeId = useGraphStore((s) => s.selectedNodeId);
  const hoveredNodeId = useGraphStore((s) => s.hoveredNodeId);
  const selectNode = useGraphStore((s) => s.selectNode);
  const hoverNode = useGraphStore((s) => s.hoverNode);
  const pathHighlight = useGraphStore((s) => s.pathHighlight);

  const showLabels = useUIStore((s) => s.showLabels);
  const showParticles = useUIStore((s) => s.showParticles);

  const { filteredNodes, filteredEdges } = useGraphFilters();
  const { flyToNode, resetCamera, zoomToFit } = useCamera(graphRef);
  const { expandNode } = useNeighborhood();

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

  const pathSet = new Set(pathHighlight);

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
      const isHovered = node.id === hoveredNodeId;
      const isOnPath = pathSet.has(node.id);

      const scale = isHovered ? NODE_HOVER_SCALE : isSelected ? 1.2 : 1;
      const size = config.size * scale;

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
        opacity: opacity * (isOnPath ? 1 : isSelected || isHovered ? 1 : 0.85),
        emissive: color,
        emissiveIntensity: isSelected ? 0.6 : isHovered ? 0.4 : config.glowIntensity,
      });

      const mesh = new THREE.Mesh(geometry, material);

      // Add label
      if (showLabels) {
        const sprite = new SpriteText(node.name);
        sprite.color = isSelected ? "#ffffff" : "#cccccc";
        sprite.textHeight = 3;
        sprite.position.set(0, size + 2, 0);
        mesh.add(sprite);
      }

      return mesh;
    },
    [selectedNodeId, hoveredNodeId, showLabels, pathSet],
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

  const graphData = {
    nodes: filteredNodes,
    links: filteredEdges,
  };

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
        d3AlphaDecay={0.02}
        d3VelocityDecay={0.3}
        warmupTicks={FORCE_WARMUP_TICKS}
        cooldownTime={FORCE_COOLDOWN_TIME}
        backgroundColor="rgba(0,0,0,0)"
        showNavInfo={false}
      />
    </div>
  );
}
