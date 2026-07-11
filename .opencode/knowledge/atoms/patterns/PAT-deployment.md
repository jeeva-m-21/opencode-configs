---
id: PAT-deployment
type: pattern
title: Deployment Pipeline — Lint, Typecheck, Test, Build, Deploy
description: Standard CI/CD deployment pipeline using GitHub Actions with staging environment before production. Every step must pass before the next proceeds.
capabilities: [deployment, ci-cd]
tags: [deploy, ci, cd, github-actions, docker, staging]
domain: deployment
status: active
version: 1.0.0
created: 2026-07-12
updated: 2026-07-12
author: platform-team
reviewers: []
dependencies:
  requires: [RUL-test-required]
  optional: []
supersedes: []
superseded_by: null
conflicts_with: []
priority: recommended
token_estimate: 60
audience: [builder, orchestrator]
platform_version: 1.0.0
---

# Deployment Pipeline Pattern

## Pipeline Stages

```
Push to main/staging
  → 1. LINT (ESLint + Prettier)
  → 2. TYPECHECK (TypeScript strict)
  → 3. UNIT TESTS (Vitest with coverage)
  → 4. BUILD (Docker image or static bundle)
  → 5. DEPLOY STAGING
  → 6. INTEGRATION TESTS (against staging)
  → 7. E2E TESTS (Playwright)
  → 8. DEPLOY PRODUCTION
  → 9. SMOKE TESTS (health check + critical flow)
```

## Rules

- Every stage must pass before the next one starts
- A failed stage blocks the entire pipeline
- Never skip stages in production — staging is mandatory
- Secrets via GitHub Secrets, never in workflow files
- Rollback plan documented before every production deploy

## Docker Compose (Local Development)

```yaml
services:
  api:     # Backend on :3000
  web:     # Frontend on :5173 (hot reload)
  db:      # PostgreSQL on :5432
  redis:   # Redis on :6379
```

## Environment Strategy

| Environment | Data | Purpose |
|---|---|---|
| Development | Seed data | Local development |
| Staging | Anonymized production sample | Pre-production validation |
| Production | Real data | Live users |
