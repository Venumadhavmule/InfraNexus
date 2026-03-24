"use client";

import { useCallback } from "react";
import type {
  ForceGraphMethods,
  LinkObject,
  NodeObject,
} from "react-force-graph-3d";
import type { GraphLink, GraphNode } from "@/types";
import { CAMERA_FLY_DURATION_MS } from "@/lib/constants";

type ForceGraphRef = Pick<
  ForceGraphMethods<NodeObject<GraphNode>, LinkObject<GraphNode, GraphLink>>,
  "cameraPosition" | "zoomToFit" | "d3ReheatSimulation"
>;

export function useCamera(graphRef: React.RefObject<ForceGraphRef | undefined>) {
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
