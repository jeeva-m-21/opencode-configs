---
id: PAT-error-handling
type: pattern
title: Error Handling Pattern — Catch at Boundary, Throw in Logic
description: Business logic throws typed errors. Route handlers catch and translate to HTTP responses. Every error includes a correlation ID. Never expose internals to users.
capabilities: [error-handling, backend-service]
tags: [error, catch, boundary, correlation-id]
domain: error-handling
status: active
version: 1.0.0
created: 2026-01-15
updated: 2026-01-15
author: platform-team
reviewers: [backend-lead]
dependencies:
  requires: [RUL-no-empty-catch]
  optional: []
supersedes: []
superseded_by: null
conflicts_with: []
priority: required
token_estimate: 70
audience: [builder, reviewer]
intent: do
applies_to: routes layer code
tradeoffs:
  -       pro: "Consistent structure across the codebase",       con: "May feel verbose for simple cases"
canonical_reference:
  file: src/api/routes/users.ts
  imports: 1-9
  structure: 10-48
  handler: 50-65
primary_binding:
  layer: route
verification:
  test_file: src/api/__tests__/routes/users.test.ts
  test_pattern: should return expected output when given valid input
platform_version: 1.0.0
---

# Error Handling Pattern

## Philosophy

Catch errors at the boundary (route handlers), not in the middle (services). Business logic throws. Handlers catch and translate.

## Error Types and HTTP Mapping

| Error Type | HTTP Status | Retry? |
|---|---|---|
| `ValidationError` | 400 | No (fix input) |
| `AuthenticationError` | 401 | No (re-login) |
| `AuthorizationError` | 403 | No (insufficient permission) |
| `NotFoundError` | 404 | No |
| `ConflictError` | 409 | No (resolve conflict) |
| `BusinessRuleError` | 422 | No |
| `RateLimitError` | 429 | Yes (after Retry-After) |
| `InternalError` | 500 | Maybe (check logs) |

## Response Format

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable, safe for users",
    "details": [{ "field": "email", "message": "Invalid format" }],
    "correlationId": "uuid-v4-for-tracing"
  }
}
```

## Correlation IDs

Generate a UUID v4 at request entry. Propagate through all downstream calls. Include in all log messages and error responses. This enables tracing a single request across services.