---
name: eng-observability
description: Observability standards for structured logging, metrics, tracing, alerting, and operational visibility
license: MIT
compatibility: opencode
metadata:
  domain: observability
  audience: builder, reviewer
  priority: medium
---

## Observability Principles

1. **Every service is observable by default.** No service deploys without logs, metrics, and health checks.
2. **Logs are structured.** Machine-parseable JSON. Human-readable is a bonus, not the source of truth.
3. **Metrics tell you WHAT is wrong. Logs and traces tell you WHY.**
4. **Alert on symptoms, not causes.** Alert on "error rate > 1%" not "CPU > 80%". The latter may be normal.
5. **Every error is traceable.** Correlation IDs propagate across services.

## Structured Logging

### Log Levels
| Level | When | Example |
|---|---|---|
| `error` | Requires immediate human attention | Database connection lost, payment failed |
| `warn` | Might need attention soon | Retry queue growing, disk 80% full |
| `info` | Significant business events | User signed up, order placed, deployment completed |
| `debug` | Diagnostic information | Request payload, query parameters, cache hit/miss |

### Required Fields
Every log entry includes: `timestamp`, `level`, `message`, `service`, `correlationId`, `environment`.

### Context Fields
Include when relevant: `userId`, `requestId`, `duration`, `statusCode`, `error.stack`.

### What NOT to Log
- Passwords, tokens, secrets, API keys
- Full credit card numbers, SSNs, PII
- Full request/response bodies (log summaries or sample)
- Stack traces in production `info` logs

## Metrics

### RED Metrics (Every Service)
- **Rate** — requests per second
- **Errors** — error rate per endpoint
- **Duration** — p50, p95, p99 latency per endpoint

### USE Metrics (Every Resource)
- **Utilization** — CPU, memory, disk, connection pool
- **Saturation** — queue depth, thread pool usage
- **Errors** — hardware errors, failed allocations

### Business Metrics
- Signups, orders, payments
- Active users, session count
- Feature adoption rates

## Distributed Tracing

- Every incoming request gets a correlation ID
- Correlation ID propagates to all downstream calls
- Every service boundary is a span (HTTP call, DB query, message publish)
- Trace sampling: 100% for errors, 10% for success (adjustable)

## Health Checks

Every service exposes:
- `GET /health` — liveness (is the process running?) — used by orchestrator
- `GET /health/ready` — readiness (can the service handle requests?) — used by load balancer
- Both return `200 OK` or `503 Service Unavailable` with details

## Alerting

### Alert Design
- Every alert has a runbook link
- Every alert has a clear owner (team or on-call rotation)
- Alert thresholds have hysteresis (don't flap)
- Critical alerts wake people up. Non-critical alerts wait for business hours.

### Alert Severity
| Severity | Response | Example |
|---|---|---|
| **Critical** | Immediate, 24/7 | Service down, data loss, security breach |
| **Warning** | Within 1 hour, business hours | Error rate elevated, queue growing |
| **Info** | During next business day | Disk 70% full, certificate expires in 30 days |

## Dashboards

- Service dashboard: RED metrics, health, deployment version
- Business dashboard: key business metrics
- Infrastructure dashboard: resource utilization
- Every dashboard answers a specific question. No dashboard is a grab-bag.
