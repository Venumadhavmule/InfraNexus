# All Cypher queries are parameterized constants — never dynamically constructed.

CI_BY_ID = """
MATCH (c:CI {sys_id: $ci_id})
RETURN
    c.sys_id AS sys_id,
    coalesce(c.name, '') AS name,
    coalesce(c.sys_class_name, '') AS sys_class_name,
    coalesce(c.class_label, '') AS class_label,
    coalesce(c.environment, 'Unknown') AS environment,
    coalesce(c.operational_status, 1) AS operational_status,
    coalesce(c.ip_address, '') AS ip_address,
    coalesce(c.fqdn, '') AS fqdn,
    coalesce(c.os, '') AS os,
    coalesce(c.os_version, '') AS os_version,
    c.cpu_count AS cpu_count,
    c.ram_mb AS ram_mb,
    c.disk_space_gb AS disk_space_gb,
    coalesce(c.location, '') AS location,
    coalesce(c.department, '') AS department,
    coalesce(c.assigned_to, '') AS assigned_to,
    coalesce(c.support_group, '') AS support_group,
    coalesce(c.short_description, '') AS short_description,
    c.sys_created_on AS sys_created_on,
    c.sys_updated_on AS sys_updated_on,
    coalesce(c.degree, 0) AS degree,
    coalesce(c.cluster_id, -1) AS cluster_id
"""

CI_INCOMING_RELATIONSHIPS = """
MATCH (other:CI)-[r:RELATES_TO]->(target:CI {sys_id: $ci_id})
RETURN
    coalesce(r.rel_type, '') AS rel_type,
    other.sys_id AS ci_id,
    coalesce(other.name, '') AS ci_name,
    coalesce(other.class_label, '') AS ci_class
"""

CI_OUTGOING_RELATIONSHIPS = """
MATCH (source:CI {sys_id: $ci_id})-[r:RELATES_TO]->(other:CI)
RETURN
    coalesce(r.rel_type, '') AS rel_type,
    other.sys_id AS ci_id,
    coalesce(other.name, '') AS ci_name,
    coalesce(other.class_label, '') AS ci_class
"""

CI_NEIGHBOR_IDS = """
MATCH (center:CI {sys_id: $ci_id})-[:RELATES_TO]-(neighbor:CI)
RETURN DISTINCT neighbor.sys_id AS sys_id
"""

CI_EXISTS = """
MATCH (c:CI {sys_id: $ci_id})
RETURN count(c) AS cnt
"""

UPSERT_CI = """
MERGE (c:CI {sys_id: $sys_id})
SET c.name = $name,
    c.sys_class_name = $sys_class_name,
    c.class_label = $class_label,
    c.environment = $environment,
    c.operational_status = $operational_status,
    c.ip_address = $ip_address,
    c.fqdn = $fqdn,
    c.os = $os,
    c.os_version = $os_version,
    c.cpu_count = $cpu_count,
    c.ram_mb = $ram_mb,
    c.disk_space_gb = $disk_space_gb,
    c.location = $location,
    c.department = $department,
    c.assigned_to = $assigned_to,
    c.support_group = $support_group,
    c.short_description = $short_description,
    c.sys_created_on = $sys_created_on,
    c.sys_updated_on = $sys_updated_on
"""

UPSERT_RELATIONSHIP = """
MATCH (parent:CI {sys_id: $parent_id}), (child:CI {sys_id: $child_id})
MERGE (parent)-[r:RELATES_TO {sys_id: $rel_sys_id}]->(child)
SET r.rel_type = $rel_type,
    r.rel_type_reverse = $rel_type_reverse
"""

UPDATE_DEGREE = """
MATCH (c:CI)
OPTIONAL MATCH (c)-[r:RELATES_TO]-()
WITH c, count(r) AS deg
SET c.degree = deg
"""
