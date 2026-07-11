---
id: RUL-auth-gated
type: rule
title: All endpoints must be authenticated unless explicitly public
description: Every API endpoint requires authentication. Only health, login, register, refresh, and explicitly designated public endpoints may skip auth middleware.
capabilities: [authentication, authorization, api-design]
tags: [auth, middleware, non-negotiable, security]
domain: security
status: active
version: 1.0.0
created: 2026-01-01
updated: 2026-01-01
author: platform-team
reviewers: [security-lead]
dependencies:
  requires: [RUL-route-purity]
  optional: []
supersedes: []
superseded_by: null
conflicts_with: []
priority: required
token_estimate: 30
audience: [builder, reviewer, security-auditor, orchestrator]
enforcement: reviewer
violation_severity: blocking
scope: always
platform_version: 1.0.0
---

# Auth-Gated Endpoints

## Rule

Every API endpoint must enforce authentication unless it appears on the explicit public list. Route handlers must include the `auth` middleware. Missing authentication on a non-public endpoint is a blocking review finding.

## Public Endpoints (Exempt)

- `GET /health`
- `GET /health/ready`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/refresh`
- Any endpoint explicitly designated as public content in the contract

## Enforcement

Reviewer checks every route for `auth` middleware. Builder must add auth middleware to all new routes unless the contract explicitly marks them as public.