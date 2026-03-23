---
name: devops-local-first
description: "Use when: setting up Docker Compose services, environment files, startup workflows, and reliability checks for local-first InfraNexus operation. Keywords: docker compose, healthcheck, volumes, make targets, single-machine."
---

# DevOps Local First

## Goal
Ensure one-command reliable startup and stable local development at realistic scale.

## Use When
- Editing compose files and Dockerfiles.
- Defining env defaults and onboarding flow.
- Troubleshooting dependency startup order.
- Adding health checks or resource limits.

## Required Services
- backend, frontend, redis, meilisearch, redis-insight.
- Persistent volumes for kuzu, redis, and meili data.

## Reliability Rules
1. Backend depends on healthy Redis and Meilisearch.
2. Keep explicit healthchecks for critical services.
3. Preserve data volumes across restarts.
4. Respect local machine resource budget.
5. Keep quick bootstrap path for first-time contributors.

## Developer Experience Baseline
- Clear .env.example with required vars.
- Make targets for up/down/logs/sync/test.
- Fast troubleshooting guidance around health endpoints.

## Output Checklist
- Compose changes validated for startup sequence.
- Env additions documented.
- Persistent data impact considered.
- Dev commands remain simple and repeatable.
