# All Cypher queries are parameterized constants — never dynamically constructed.

NEIGHBORHOOD_BASIC = """
MATCH (center:CI {sys_id: $ci_id})-[r:RELATES_TO*1..{hops}]-(neighbor:CI)
WHERE neighbor.degree <= $degree_threshold
RETURN DISTINCT
    neighbor.sys_id AS id,
    neighbor.name AS name,
    neighbor.class_label AS ci_class,
    neighbor.sys_class_name AS ci_class_raw,
    neighbor.environment AS environment,
    neighbor.operational_status AS operational_status,
    neighbor.degree AS degree,
    neighbor.cluster_id AS cluster_id
LIMIT $max_nodes
"""

NEIGHBORHOOD_EDGES = """
MATCH (a:CI)-[r:RELATES_TO]->(b:CI)
WHERE a.sys_id IN $node_ids AND b.sys_id IN $node_ids
RETURN DISTINCT
    a.sys_id AS source,
    b.sys_id AS target,
    r.rel_type AS rel_type,
    r.rel_type_reverse AS rel_type_reverse
"""

NEIGHBORHOOD_WITH_CLASS_FILTER = """
MATCH (center:CI {sys_id: $ci_id})-[r:RELATES_TO*1..{hops}]-(neighbor:CI)
WHERE neighbor.degree <= $degree_threshold
    AND neighbor.class_label IN $classes
RETURN DISTINCT
    neighbor.sys_id AS id,
    neighbor.name AS name,
    neighbor.class_label AS ci_class,
    neighbor.sys_class_name AS ci_class_raw,
    neighbor.environment AS environment,
    neighbor.operational_status AS operational_status,
    neighbor.degree AS degree,
    neighbor.cluster_id AS cluster_id
LIMIT $max_nodes
"""

NEIGHBORHOOD_WITH_ENV_FILTER = """
MATCH (center:CI {sys_id: $ci_id})-[r:RELATES_TO*1..{hops}]-(neighbor:CI)
WHERE neighbor.degree <= $degree_threshold
    AND neighbor.environment IN $envs
RETURN DISTINCT
    neighbor.sys_id AS id,
    neighbor.name AS name,
    neighbor.class_label AS ci_class,
    neighbor.sys_class_name AS ci_class_raw,
    neighbor.environment AS environment,
    neighbor.operational_status AS operational_status,
    neighbor.degree AS degree,
    neighbor.cluster_id AS cluster_id
LIMIT $max_nodes
"""

NEIGHBORHOOD_WITH_BOTH_FILTERS = """
MATCH (center:CI {sys_id: $ci_id})-[r:RELATES_TO*1..{hops}]-(neighbor:CI)
WHERE neighbor.degree <= $degree_threshold
    AND neighbor.class_label IN $classes
    AND neighbor.environment IN $envs
RETURN DISTINCT
    neighbor.sys_id AS id,
    neighbor.name AS name,
    neighbor.class_label AS ci_class,
    neighbor.sys_class_name AS ci_class_raw,
    neighbor.environment AS environment,
    neighbor.operational_status AS operational_status,
    neighbor.degree AS degree,
    neighbor.cluster_id AS cluster_id
LIMIT $max_nodes
"""

CENTER_NODE = """
MATCH (c:CI {sys_id: $ci_id})
RETURN
    c.sys_id AS id,
    c.name AS name,
    c.class_label AS ci_class,
    c.sys_class_name AS ci_class_raw,
    c.environment AS environment,
    c.operational_status AS operational_status,
    c.degree AS degree,
    c.cluster_id AS cluster_id
"""

NEIGHBORHOOD_COUNT = """
MATCH (center:CI {sys_id: $ci_id})-[r:RELATES_TO*1..{hops}]-(neighbor:CI)
RETURN count(DISTINCT neighbor) AS total
"""
