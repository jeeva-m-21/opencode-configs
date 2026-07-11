---
id: RUL-service-isolation
type: rule
title: Services must never import HTTP types
description: Service layer code must be framework-agnostic. Never import Express Request/Response, Hono Context, or any HTTP framework types in service files.
capabilities: [backend-service, architecture]
tags: [service, isolation, architecture, non-negotiable]
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

# Service Layer Isolation

## Rule

Services in `src/api/services/` must never import types from HTTP frameworks (Express, Hono, etc.). Services receive plain TypeScript types and return plain TypeScript types. Route handlers are responsible for extracting data from HTTP requests and formatting service results into HTTP responses.

## Rationale

Keeping services framework-agnostic allows the same business logic to work behind REST, GraphQL, CLI tools, or background jobs without modification. It also makes services trivially testable without mocking HTTP objects.
