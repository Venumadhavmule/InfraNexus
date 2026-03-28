# All Cypher queries are parameterized constants - never dynamically constructed.

SHORTEST_PATH = """
MATCH path = shortestPath(
    (source:CI {sys_id: $source_id})-[r:RELATES_TO*1..{max_length}]-(target:CI {sys_id: $target_id})
)
RETURN nodes(path) AS path_nodes, rels(path) AS path_rels, length(path) AS path_length
"""

ALL_SHORTEST_PATHS = """
MATCH path = allShortestPaths(
    (source:CI {sys_id: $source_id})-[r:RELATES_TO*1..{max_length}]-(target:CI {sys_id: $target_id})
)
RETURN nodes(path) AS path_nodes, rels(path) AS path_rels, length(path) AS path_length
LIMIT $max_paths
"""
