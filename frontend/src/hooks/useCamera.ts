"use client";

import { useCallback, useRef } from "react";
import type { GraphNode } from "@/types";
import { CAMERA_FLY_DURATION_MS } from "@/lib/constants";

type ForceGraphRef = {
  cameraPosition: (pos: { x: number; y: number; z: number }, lookAt?: { x: number; y: number; z: number }, ms?: number) => void;
  centerAt: (x?: number, y?: number, ms?: number) => void;
  zoomToFit: (ms?: number, padding?: number) => void;
  d3ReheatSimulation: () => void;
};

export function useCamera(graphRef: React.RefObject<ForceGraphRef | null>) {
  const flyToNode = useCallback(
    (node: GraphNode) => {
      const fg = graphRef.current;
      if (!fg || node.x == null || node.y == null || node.z == null) return;

      const distance = 200;
      const distRatio = 1 + distance / Math.hypot(node.x, node.y, node.z || 1);

      fg.cameraPosition(
        {
          x: node.x * distRatio,
          y: node.y * distRatio,
          z: (node.z ?? 0) * distRatio,
        },
        { x: node.x, y: node.y, z: node.z ?? 0 },
        CAMERA_FLY_DURATION_MS,
      );
    },
    [graphRef],
  );

  const resetCamera = useCallback(() => {
    const fg = graphRef.current;
    if (!fg) return;
    fg.cameraPosition({ x: 0, y: 0, z: 500 }, { x: 0, y: 0, z: 0 }, CAMERA_FLY_DURATION_MS);
  }, [graphRef]);

  const zoomToFit = useCallback(
    (padding = 50) => {
      const fg = graphRef.current;
      if (!fg) return;
      fg.zoomToFit(CAMERA_FLY_DURATION_MS, padding);
    },
    [graphRef],
  );

  const reheatSimulation = useCallback(() => {
    const fg = graphRef.current;
    if (!fg) return;
    fg.d3ReheatSimulation();
  }, [graphRef]);

  return { flyToNode, resetCamera, zoomToFit, reheatSimulation };
}
