---
name: eng-production
description: Production readiness checklist, reliability standards, SRE principles, and operational maturity requirements
license: MIT
compatibility: opencode
metadata:
  domain: production
  audience: builder, reviewer
  priority: medium
---

## Production Readiness Checklist

A service is production-ready when it meets all of these standards. Review this checklist before any production deployment.

### Reliability
- [ ] Health check endpoints: `GET /health` (liveness) and `GET /health/ready` (readiness)
- [ ] Graceful shutdown: handles SIGTERM, drains in-flight requests
- [ ] Startup probe: doesn't accept traffic until ready
- [ ] Circuit breakers on external dependencies
- [ ] Retry logic with exponential backoff for transient failures
- [ ] Timeout configured for all outbound requests
- [ ] No single points of failure identified

### Observability
- [ ] Structured logging (JSON) with correlation IDs
- [ ] RED metrics exported (rate, errors, duration per endpoint)
- [ ] Distributed tracing enabled (correlation ID propagation)
- [ ] Error alerts configured with runbook links
- [ ] Dashboard exists showing service health at a glance

### Security
- [ ] All endpoints authenticated (except health and explicitly public)
- [ ] Authorization checked on every request
- [ ] Secrets externalized (environment variables or secrets manager)
- [ ] Dependency vulnerabilities scanned (no critical/high CVEs)
- [ ] HTTPS/TLS enforced
- [ ] Security headers set (CSP, HSTS, X-Content-Type-Options, etc.)

### Performance
- [ ] Load tested at expected peak throughput
- [ ] p95 latency within SLA
- [ ] Database queries optimized (indexes, no N+1)
- [ ] Caching strategy implemented for expensive operations
- [ ] Connection pooling configured

### Data
- [ ] Database backups configured and tested
- [ ] Backup restoration tested within recovery time objective
- [ ] Data retention policy defined and implemented
- [ ] PII/sensitive data identified and protected
- [ ] Database migrations tested on staging with production-like data volume

### Deployment
- [ ] CI/CD pipeline deploys automatically from main branch
- [ ] Rollback procedure documented and tested
- [ ] Deployment causes zero downtime
- [ ] Database migrations are backward-compatible (no breaking changes without deploy-migrate-deploy pattern)
- [ ] Feature flags available for risky changes

### Documentation
- [ ] README describes the service's purpose and architecture
- [ ] Setup guide lets a new team member run the service locally in < 30 minutes
- [ ] Runbook documents common operational tasks and alert responses
- [ ] API documentation is complete and current
- [ ] Architecture decisions are logged in `state/decisions.md`

### Operational Maturity
- [ ] On-call rotation defined (who gets paged?)
- [ ] SLA/SLO defined (what's the uptime target?)
- [ ] Escalation path documented (who to call if you can't fix it?)
- [ ] Capacity planning considered (what limits will we hit and when?)
- [ ] Disaster recovery plan exists (what if the database is lost?)

## Minimum Viable Production

For early-stage projects, at minimum:
1. Health check endpoints
2. Structured logging with correlation IDs
3. Error alerting (notify on error rate spike)
4. Automated deployment
5. Database backups
6. Secrets externalized

Add the remaining items incrementally as the service matures.
