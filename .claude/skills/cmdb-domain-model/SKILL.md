---
name: cmdb-domain-model
description: "Use when: modeling ServiceNow CMDB CI classes, relationship semantics, sys_id rules, status mappings, and graph topology behavior for InfraNexus. Keywords: cmdb_ci, cmdb_rel_ci, relation types, CI class mapping, operational_status, environment modeling."
---

# CMDB Domain Model

## Goal
Create accurate domain modeling for ServiceNow CMDB so graph ingestion and visualization preserve real infrastructure semantics.

## Use When
- Designing CI/relationship schemas.
- Mapping ServiceNow classes to product class labels.
- Resolving relationship direction and reverse labels.
- Defining validation rules for CMDB data quality.

## Core Rules
1. Treat CIs as nodes and cmdb_rel_ci rows as directed edges.
2. Validate sys_id as 32 lowercase hex characters.
3. Keep original sys_class_name and a normalized class_label.
4. Preserve relation type forward and reverse names.
5. Always keep sys_updated_on for incremental sync and freshness.

## Required Mappings
- Base classes: cmdb_ci, cmdb_ci_server, cmdb_ci_vm_instance, cmdb_ci_database, cmdb_ci_appl, cmdb_ci_service, cmdb_ci_cluster, cmdb_ci_container, cmdb_ci_kubernetes_cluster, cmdb_ci_lb, cmdb_ci_ip_switch, cmdb_ci_ip_router.
- Required status mapping: operational_status 1=Operational, 2=Non-Operational, 3=Repair, 4=Retired.
- Required environment normalization: production, development, test, staging, qa, dr.

## Relationship Semantics
- parent -> child expresses forward relation name.
- child -> parent expresses reverse relation name.
- Must support at least: Runs on, Hosted on, Depends on, Contains, Members of, Connected by, Cluster of, Provided by, Sends data to.

## Output Checklist
- Canonical CI schema with required + optional attributes.
- Canonical relationship schema with directional semantics.
- Normalization table for CI class labels and relation labels.
- Validation rules for required fields and illegal values.
