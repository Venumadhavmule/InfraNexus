from __future__ import annotations

from typing import Any

import networkx as nx

from app.logging import get_logger

log = get_logger(__name__)


class Position3D:
    __slots__ = ("x", "y", "z")

    def __init__(self, x: float, y: float, z: float) -> None:
        self.x = x
        self.y = y
        self.z = z


class LayoutService:
    @staticmethod
    def compute_positions(
        nodes: list[dict[str, Any]],
        edges: list[dict[str, Any]],
        *,
        algorithm: str = "spring",
    ) -> dict[str, Position3D]:
        g = nx.Graph()
        for n in nodes:
            g.add_node(n["id"])
        for e in edges:
            g.add_edge(e["source"], e["target"])

        if algorithm == "kamada_kawai" and len(nodes) <= 500:
            pos_2d = nx.kamada_kawai_layout(g, dim=3)
        else:
            pos_2d = nx.spring_layout(g, dim=3, seed=42)

        scale = 100.0
        return {
            node_id: Position3D(
                x=float(coords[0]) * scale,
                y=float(coords[1]) * scale,
                z=float(coords[2]) * scale,
            )
            for node_id, coords in pos_2d.items()
        }
