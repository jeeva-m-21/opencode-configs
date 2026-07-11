---
id: RUL-shared-purity
type: rule
title: Shared code must be free of framework dependencies
description: src/shared/ contains only pure TypeScript, Zod schemas, and utility functions. No React, no Express, no Hono, no framework imports of any kind.
capabilities: [architecture, project-structure]
tags: [shared, architecture, non-negotiable, purity]
domain: architecture
status: active
version: 1.0.0
created: 2026-01-01
updated: 2026-01-01
author: platform-team
reviewers: [architecture-lead]
dependencies:
  requires: []
  optional: []
supersedes: []
superseded_by: null
conflicts_with: []
priority: required
token_estimate: 25
audience: [builder, reviewer, orchestrator]
platform_version: 1.0.0
---

# Shared Layer Purity

## Rule

`src/shared/` contains code used by both `api/` and `web/`. It must contain zero framework-specific imports. This means no React hooks, no Express middleware, no Hono context types.

## What Belongs in shared/

- `types/` — TypeScript interfaces and type guards
- `validation/` — Zod schemas (shared validation rules)
- `constants/` — Shared enums and constants
- `utils/` — Pure functions with no side effects

## What Does NOT Belong

- React hooks, components, or context
- Express request/response types
- Database queries or ORM references
- HTTP client configuration
