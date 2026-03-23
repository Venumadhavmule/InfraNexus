---
name: security-and-governance
description: "Use when: handling credentials, API hardening, input validation, rate limits, and secure data handling for CMDB data in InfraNexus. Keywords: secrets, CORS, validation, auth roadmap, least privilege."
---

# Security And Governance

## Goal
Protect CMDB data and service boundaries while preserving local-first usability.

## Use When
- Adding new API endpoints.
- Handling secrets and env config.
- Reviewing data exposure risks.
- Defining authn/authz evolution.

## Required Practices
1. Keep secrets only in .env.local and environment variables.
2. Never log credentials or sensitive tokens.
3. Validate all external input, especially sys_id and query params.
4. Enforce per-IP rate limiting on public API paths.
5. Keep CORS explicit to trusted origins.
6. Use parameterized Cypher always.

## Governance Baseline
- Data minimization in API responses.
- Stable audit fields for ETL state changes.
- Error messages safe for users, rich only in logs.

## Auth Roadmap
- Phase 1 local mode: no auth on localhost.
- Phase 2 team mode: API keys.
- Phase 3 enterprise mode: OIDC + RBAC.

## Output Checklist
- Threat-aware design notes for change.
- Input validation and failure behavior covered.
- Secret handling reviewed.
- Rate limit and abuse-path review included.
