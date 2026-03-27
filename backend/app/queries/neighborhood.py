# All Cypher queries are parameterized constants — never dynamically constructed.

NEIGHBORHOOD_BASIC = """
MATCH (center:CI {sys_id: $ci_id})-[r:RELATES_TO*1..{hops}]-(neighbor:CI)
WHERE neighbor.degree <= $degree_threshold
RETURN DISTINCT
    neighbor.sys_id AS id,
    coalesce(neighbor.name, '') AS name,
    coalesce(neighbor.class_label, '') AS ci_class,
    coalesce(neighbor.sys_class_name, '') AS ci_class_raw,
    coalesce(neighbor.environment, 'Unknown') AS environment,
    coalesce(neighbor.operational_status, 1) AS operational_status,
    coalesce(neighbor.degree, 0) AS degree,
    coalesce(neighbor.cluster_id, -1) AS cluster_id
LIMIT $max_nodes
"""

NEIGHBORHOOD_EDGES = """
MATCH (a:CI)-[r:RELATES_TO]->(b:CI)
WHERE a.sys_id IN $node_ids AND b.sys_id IN $node_ids
RETURN DISTINCT
    a.sys_id AS source,
    b.sys_id AS target,
    coalesce(r.rel_type, '') AS rel_type,
    coalesce(r.rel_type_reverse, '') AS rel_type_reverse
"""

NEIGHBORHOOD_WITH_CLASS_FILTER = """
MATCH (center:CI {sys_id: $ci_id})-[r:RELATES_TO*1..{hops}]-(neighbor:CI)
WHERE neighbor.degree <= $degree_threshold
    AND neighbor.class_label IN $classes
RETURN DISTINCT
    neighbor.sys_id AS id,
    coalesce(neighbor.name, '') AS name,
    coalesce(neighbor.class_label, '') AS ci_class,
    coalesce(neighbor.sys_class_name, '') AS ci_class_raw,
    coalesce(neighbor.environment, 'Unknown') AS environment,
    coalesce(neighbor.operational_status, 1) AS operational_status,
    coalesce(neighbor.degree, 0) AS degree,
    coalesce(neighbor.cluster_id, -1) AS cluster_id
LIMIT $max_nodes
"""

NEIGHBORHOOD_WITH_ENV_FILTER = """
MATCH (center:CI {sys_id: $ci_id})-[r:RELATES_TO*1..{hops}]-(neighbor:CI)
WHERE neighbor.degree <= $degree_threshold
    AND neighbor.environment IN $envs
RETURN DISTINCT
    neighbor.sys_id AS id,
    coalesce(neighbor.name, '') AS name,
    coalesce(neighbor.class_label, '') AS ci_class,
    coalesce(neighbor.sys_class_name, '') AS ci_class_raw,
    coalesce(neighbor.environment, 'Unknown') AS environment,
    coalesce(neighbor.operational_status, 1) AS operational_status,
    coalesce(neighbor.degree, 0) AS degree,
    coalesce(neighbor.cluster_id, -1) AS cluster_id
LIMIT $max_nodes
"""

NEIGHBORHOOD_WITH_BOTH_FILTERS = """
MATCH (center:CI {sys_id: $ci_id})-[r:RELATES_TO*1..{hops}]-(neighbor:CI)
WHERE neighbor.degree <= $degree_threshold
    AND neighbor.class_label IN $classes
    AND neighbor.environment IN $envs
RETURN DISTINCT
    neighbor.sys_id AS id,
    coalesce(neighbor.name, '') AS name,
    coalesce(neighbor.class_label, '') AS ci_class,
    coalesce(neighbor.sys_class_name, '') AS ci_class_raw,
    coalesce(neighbor.environment, 'Unknown') AS environment,
    coalesce(neighbor.operational_status, 1) AS operational_status,
    coalesce(neighbor.degree, 0) AS degree,
    coalesce(neighbor.cluster_id, -1) AS cluster_id
LIMIT $max_nodes
"""

CENTER_NODE = """
MATCH (c:CI {sys_id: $ci_id})
RETURN
    c.sys_id AS id,
    coalesce(c.name, '') AS name,
    coalesce(c.class_label, '') AS ci_class,
    coalesce(c.sys_class_name, '') AS ci_class_raw,
    coalesce(c.environment, 'Unknown') AS environment,
    coalesce(c.operational_status, 1) AS operational_status,
    coalesce(c.degree, 0) AS degree,
    coalesce(c.cluster_id, -1) AS cluster_id
"""

STARTER_CENTER = """
MATCH (c:CI)
RETURN c.sys_id AS sys_id
ORDER BY c.degree DESC, c.name ASC
LIMIT 1
"""

NEIGHBORHOOD_COUNT = """
MATCH (center:CI {sys_id: $ci_id})-[r:RELATES_TO*1..{hops}]-(neighbor:CI)
RETURN count(DISTINCT neighbor) AS total
"""
