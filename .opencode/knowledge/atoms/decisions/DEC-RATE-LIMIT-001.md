---
id: DEC-RATE-LIMIT-001
type: decision
title: Rate Limiting Strategy
description: Auth endpoints rate-limited at 5 req/min per IP. General API at 100 req/min per authenticated user. Rate limit exceeded returns 429 with Retry-After header.
capabilities: [authentication, api-design]
tags: [rate-limit, security, api]
domain: security
status: active
version: 1.0.0
created: 2026-01-15
updated: 2026-01-15
author: platform-team
reviewers: [security-lead]
dependencies:
  requires: []
  optional: [DEC-AUTH-001]
supersedes: []
superseded_by: null
conflicts_with: []
confidence: high
evidence: [OWASP rate limiting recommendations]
priority: recommended
token_estimate: 40
audience: [builder, security-auditor, orchestrator]
platform_version: 1.0.0
---

# Rate Limiting Strategy

## Decision

Rate limiting is applied at two levels: strict limits on auth endpoints (brute-force protection) and standard limits on the general API (fair-use enforcement).

## Limits

| Scope | Rate | Key |
|---|---|---|
| Auth endpoints (login, register, refresh) | 5 req/min | Per IP |
| General API | 100 req/min | Per authenticated user ID |
| Rate limit exceeded | 429 with `Retry-After` header | — |

## Implementation

Use a rate-limiting middleware. Apply auth limiter to auth routes explicitly. Apply general limiter as default middleware on all routes.
