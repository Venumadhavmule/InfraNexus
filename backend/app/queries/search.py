# Kuzu-based text search queries - used when Meilisearch is disabled.
# All queries are parameterized constants - never dynamically constructed.

_SEARCH_RETURN = """
    c.sys_id AS sys_id,
    coalesce(c.name, '') AS name,
    coalesce(c.class_label, '') AS class_label,
    coalesce(c.environment, '') AS environment,
    coalesce(c.operational_status, 1) AS operational_status,
    coalesce(c.ip_address, '') AS ip_address,
    coalesce(c.short_description, '') AS short_description
"""

SEARCH_BY_NAME = """
MATCH (c:CI)
WHERE lower(c.name) CONTAINS lower($query)
RETURN
    c.sys_id AS sys_id,
    coalesce(c.name, '') AS name,
    coalesce(c.class_label, '') AS class_label,
    coalesce(c.environment, '') AS environment,
    coalesce(c.operational_status, 1) AS operational_status,
    coalesce(c.ip_address, '') AS ip_address,
    coalesce(c.short_description, '') AS short_description
ORDER BY c.degree DESC
SKIP $offset
LIMIT $limit
"""

SEARCH_BY_NAME_WITH_CLASS = """
MATCH (c:CI)
WHERE lower(c.name) CONTAINS lower($query)
    AND c.class_label IN $classes
RETURN
    c.sys_id AS sys_id,
    coalesce(c.name, '') AS name,
    coalesce(c.class_label, '') AS class_label,
    coalesce(c.environment, '') AS environment,
    coalesce(c.operational_status, 1) AS operational_status,
    coalesce(c.ip_address, '') AS ip_address,
    coalesce(c.short_description, '') AS short_description
ORDER BY c.degree DESC
SKIP $offset
LIMIT $limit
"""

SEARCH_BY_NAME_WITH_ENV = """
MATCH (c:CI)
WHERE lower(c.name) CONTAINS lower($query)
    AND c.environment IN $envs
RETURN
    c.sys_id AS sys_id,
    coalesce(c.name, '') AS name,
    coalesce(c.class_label, '') AS class_label,
    coalesce(c.environment, '') AS environment,
    coalesce(c.operational_status, 1) AS operational_status,
    coalesce(c.ip_address, '') AS ip_address,
    coalesce(c.short_description, '') AS short_description
ORDER BY c.degree DESC
SKIP $offset
LIMIT $limit
"""

SEARCH_BY_NAME_WITH_BOTH = """
MATCH (c:CI)
WHERE lower(c.name) CONTAINS lower($query)
    AND c.class_label IN $classes
    AND c.environment IN $envs
RETURN
    c.sys_id AS sys_id,
    coalesce(c.name, '') AS name,
    coalesce(c.class_label, '') AS class_label,
    coalesce(c.environment, '') AS environment,
    coalesce(c.operational_status, 1) AS operational_status,
    coalesce(c.ip_address, '') AS ip_address,
    coalesce(c.short_description, '') AS short_description
ORDER BY c.degree DESC
SKIP $offset
LIMIT $limit
"""

SEARCH_COUNT = """
MATCH (c:CI)
WHERE lower(c.name) CONTAINS lower($query)
RETURN count(c) AS total
"""

SUGGEST_BY_PREFIX = """
MATCH (c:CI)
WHERE lower(c.name) STARTS WITH lower($prefix)
RETURN c.sys_id AS sys_id, coalesce(c.name, '') AS name, coalesce(c.class_label, '') AS class_label
ORDER BY c.degree DESC
LIMIT $limit
"""

