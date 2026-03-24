# All Cypher queries are parameterized constants — never dynamically constructed.

GRAPH_STATS = """
MATCH (c:CI)
WITH count(c) AS total_nodes
MATCH ()-[r:RELATES_TO]->()
WITH total_nodes, count(r) AS total_edges
MATCH (c2:CI)
WITH total_nodes, total_edges, avg(c2.degree) AS avg_degree, max(c2.degree) AS max_degree
RETURN total_nodes, total_edges, avg_degree, max_degree
"""

CLASS_DISTRIBUTION = """
MATCH (c:CI)
RETURN c.class_label AS ci_class, count(c) AS count
ORDER BY count DESC
"""

RELATIONSHIP_DISTRIBUTION = """
MATCH ()-[r:RELATES_TO]->()
RETURN r.rel_type AS rel_type, count(r) AS count
ORDER BY count DESC
"""

ENVIRONMENT_DISTRIBUTION = """
MATCH (c:CI)
RETURN c.environment AS environment, count(c) AS count
ORDER BY count DESC
"""

CLUSTER_OVERVIEW = """
MATCH (c:CI)
WHERE c.cluster_id >= 0
RETURN c.cluster_id AS cluster_id, count(c) AS size
ORDER BY size DESC
LIMIT $limit
"""

CLUSTER_DETAIL = """
MATCH (c:CI)
WHERE c.cluster_id = $cluster_id
RETURN c.class_label AS ci_class, count(c) AS count
ORDER BY count DESC
"""

CLUSTER_SAMPLES = """
MATCH (c:CI)
WHERE c.cluster_id = $cluster_id
RETURN c.sys_id AS sys_id, c.name AS name, c.class_label AS ci_class
LIMIT 5
"""
