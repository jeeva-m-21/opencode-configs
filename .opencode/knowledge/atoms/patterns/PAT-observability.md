---
id: PAT-observability
type: pattern
title: Observability — Structured Logging, Health Checks, Metrics
description: Every service must expose health endpoints, emit structured JSON logs with correlation IDs, and track request rate, error rate, and duration metrics.
capabilities: [observability]
tags: [logging, metrics, health-check, correlation-id, monitoring]
domain: observability
status: active
version: 1.0.0
created: 2026-07-12
updated: 2026-07-12
author: platform-team
reviewers: []
dependencies:
  requires: []
  optional: [PAT-error-handling]
supersedes: []
superseded_by: null
conflicts_with: []
priority: recommended
token_estimate: 55
audience: [builder, orchestrator]
platform_version: 1.0.0
---

# Observability Pattern

## Health Checks (Required)

Every service MUST expose:
- `GET /health` — liveness (is the process alive? returns 200)
- `GET /health/ready` — readiness (can it serve? DB connected? Redis available?)

No auth required on health endpoints.

## Structured Logging

Every log entry is JSON with these fields:
```
{ timestamp, level, message, service, correlationId, environment }
```

Log levels:
- `error` — requires human attention (DB down, payment failed)
- `warn` — might need attention (retry queue growing, disk 80%)
- `info` — business events (user registered, order placed)
- `debug` — diagnostic (development only)

## Correlation IDs

Generate UUID v4 at request entry. Attach to every log, every downstream call, every error response. Enables tracing a single request across services.

## Metrics (RED)

Every service tracks:
- **Rate** — requests/second per endpoint
- **Errors** — error rate per endpoint
- **Duration** — p50, p95, p99 latency per endpoint

## What NOT to Log

- Passwords, tokens, secrets
- Full credit card numbers
- PII (emails only in hash form outside development)
- Stack traces in production responses (log them, return generic 500 to user)
