"use client";

import { useCallback } from "react";
import * as THREE from "three";
import type {
  ForceGraphMethods,
  LinkObject,
  NodeObject,
} from "react-force-graph-3d";
import type { GraphLink, GraphNode } from "@/types";
import {
  CAMERA_FLY_DURATION_MS,
  CAMERA_MAX_FOCUS_DISTANCE,
  CAMERA_MIN_FOCUS_DISTANCE,
} from "@/lib/constants";

type ForceGraphRef = Pick<
  ForceGraphMethods<NodeObject<GraphNode>, LinkObject<GraphNode, GraphLink>>,
  "cameraPosition" | "zoomToFit" | "d3ReheatSimulation" | "camera" | "controls"
>;

type OrbitControlsLike = {
  target?: THREE.Vector3;
};

export function useCamera(graphRef: React.RefObject<ForceGraphRef | undefined>) {
  const flyToNode = useCallback(
    (node: GraphNode) => {
      const fg = graphRef.current;
      if (!fg || node.x == null || node.y == null || node.z == null) return;

      const target = new THREE.Vector3(node.x, node.y, node.z);
      const camera = fg.camera?.();
      const controls = fg.controls?.() as OrbitControlsLike | undefined;
      const currentTarget = controls?.target?.clone() ?? new THREE.Vector3(0, 0, 0);
      const currentPosition = camera && "position" in camera
        ? (camera.position as THREE.Vector3).clone()
        : new THREE.Vector3(0, 0, 500);

      const offset = currentPosition.sub(currentTarget);
      if (offset.lengthSq() < 1e-4) {
        offset.set(1, 0.35, 1).normalize().multiplyScalar(CAMERA_MIN_FOCUS_DISTANCE);
      } else {
        offset.setLength(
          Math.min(
            CAMERA_MAX_FOCUS_DISTANCE,
            Math.max(CAMERA_MIN_FOCUS_DISTANCE, offset.length()),
          ),
        );
      }

      const destination = target.clone().add(offset);

      fg.cameraPosition(
        {
          x: destination.x,
          y: destination.y,
          z: destination.z,
        },
        { x: target.x, y: target.y, z: target.z },
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
