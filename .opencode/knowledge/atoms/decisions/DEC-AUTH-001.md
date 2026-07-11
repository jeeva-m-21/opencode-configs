---
id: DEC-AUTH-001
type: decision
title: JWT Access Tokens with Rotating Refresh Tokens
description: Use short-lived JWT access tokens (15 min) paired with opaque rotating refresh tokens (7 days) for stateless authentication with replay detection.
capabilities: [authentication, authorization, token-management]
tags: [jwt, refresh-token, token-rotation, replay-detection]
domain: security
status: active
version: 1.2.0
created: 2026-01-15
updated: 2026-07-01
author: platform-team
reviewers: [security-lead, backend-lead]
dependencies:
  requires: [DEC-SECRET-001, PAT-bcrypt-hashing]
  optional: [DEC-RATE-LIMIT-001]
supersedes: [DEC-AUTH-000]
superseded_by: null
conflicts_with: [DEC-SESSION-001]
related_to: [DEC-CORS-001, PAT-middleware-ordering]
confidence: high
evidence:
  - https://auth0.com/docs/secure/tokens/refresh-tokens/refresh-token-rotation
  - https://owasp.org/www-project-web-security-testing-guide/
priority: required
token_estimate: 85
audience: [builder, reviewer, security-auditor, orchestrator]
alternatives:
  -       option: "See body",       why_rejected: "See body"
rationale: JWT Access Tokens with Rotating Refresh Tokens   Decision
platform_version: 1.0.0
---

# JWT Access Tokens with Rotating Refresh Tokens

## Decision

Use short-lived JWT access tokens (15-minute expiry) paired with opaque rotating refresh tokens (7-day expiry, single-use) for stateless authentication with built-in revocation.

## Rationale

- Access tokens are stateless -- no DB lookup required per authenticated request
- 15-minute expiry limits the blast radius of a leaked token
- Refresh token rotation detects replay attacks: reusing a consumed refresh token invalidates the entire token family
- Industry consensus (Auth0, Okta, Supabase use this pattern)

## Alternatives Considered

**DEC-SESSION-001: Server-side sessions**
Rejected because: requires shared Redis/database for horizontal scaling. Adds latency to every request. Doesn't align with our stateless-first API design.

**OAuth2-only with third-party provider**
Not rejected, deferred. May be offered as an option but the platform starts with first-party JWT.

**Long-lived JWT without refresh**
Rejected because: no revocation mechanism. Leaked tokens are valid until expiry. Security downgrade.

## Implementation

Access tokens: RS256-signed JWT, 15-minute expiry. Payload: `{ sub, role, iat, exp }`.
Refresh tokens: Opaque UUID stored in `refresh_tokens` table with `family_id` for rotation tracking.
Replay detection: consumed refresh token presented again → invalidate entire `family_id` → 401 with `TOKEN_REPLAY`.

See: PAT-jwt-rotation, PAT-refresh-token, PAT-auth-middleware
Example: EXM-auth-flow.ts

## Constraints

- Access tokens: never localStorage (web), never NSUserDefaults (iOS)
- Refresh tokens: HttpOnly, Secure, SameSite=Strict cookies (web)
- Token family invalidation must be atomic (database transaction)
- Rotation endpoint: rate-limited to 5 req/min per IP