---
id: PAT-jwt-rotation
type: pattern
title: JWT Token Rotation Implementation Pattern
description: Implementation pattern for JWT access token creation, refresh token rotation, and token family invalidation using Drizzle ORM.
capabilities: [authentication, token-management]
tags: [jwt, rotation, refresh, drizzle, postgresql, token-family]
domain: backend
status: active
version: 1.1.0
created: 2026-02-01
updated: 2026-06-15
author: backend-team
reviewers: [security-lead]
dependencies:
  requires: [DEC-AUTH-001, PAT-repository, PAT-auth-middleware]
  optional: [PAT-error-handling]
supersedes: [PAT-jwt-simple]
superseded_by: null
conflicts_with: []
related_to: [PAT-refresh-token, EXM-auth-flow]
evidence:
  - https://www.rfc-editor.org/rfc/rfc6749
priority: required
token_estimate: 120
audience: [builder, reviewer]
platform_version: 1.0.0
---

# JWT Token Rotation Pattern

## Purpose

Implement JWT-based authentication with rotating refresh tokens securely.

## Database Schema

Table: `refresh_tokens`
- `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE`
- `family_id UUID NOT NULL` -- groups tokens in a rotation family
- `token_hash TEXT NOT NULL` -- SHA-256 hash of the opaque refresh token
- `expires_at TIMESTAMPTZ NOT NULL`
- `consumed_at TIMESTAMPTZ` -- NULL until used; reused token = replay
- `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`

Indexes:
- `idx_refresh_tokens_lookup ON refresh_tokens(token_hash)` -- for lookup
- `idx_refresh_tokens_family ON refresh_tokens(family_id, consumed_at)` -- for invalidation

## Token Lifecycle

### 1. Login
- Verify credentials (email + password via bcrypt)
- Generate access token (JWT, RS256, 15 min): `{ sub: user.id, role: user.role, iat, exp }`
- Generate refresh token (opaque UUID v4 → SHA-256 hash stored in DB)
- Create new `family_id` (UUID v4)
- INSERT into `refresh_tokens`: `(user_id, family_id, token_hash, expires_at)`
- Return: `{ access_token, refresh_token }` + set refresh token cookie

### 2. Refresh
- Receive refresh token from cookie
- SHA-256 hash the token
- Query: SELECT from `refresh_tokens` WHERE `token_hash = $1`
- If not found → 401
- If `consumed_at IS NOT NULL` → TOKEN_REPLAY → DELETE all WHERE `family_id = $2` → 401
- If `expires_at < NOW()` → 401 (TOKEN_EXPIRED)
- If valid:
  - UPDATE: SET `consumed_at = NOW()` WHERE `id = $3`
  - Generate new access token
  - Generate new refresh token (same `family_id`)
  - INSERT new row in `refresh_tokens`
  - Return new tokens

### 3. Logout
- Receive refresh token
- SHA-256 hash
- DELETE FROM `refresh_tokens` WHERE `token_hash = $1`
- Clear cookie
- 200 (tokens invalidated)

### 4. Replay Detection (critical path)
```
if (existingToken.consumed_at !== null) {
  // Someone is reusing a consumed token — likely stolen
  await db.transaction(async (tx) => {
    await tx.delete(refreshTokens)
      .where(eq(refreshTokens.family_id, existingToken.family_id))
  })
  throw new TokenReplayError()
}
```

## Repository Interface

```typescript
interface RefreshTokenRepository {
  create(params: {
    userId: string
    familyId: string
    tokenHash: string
    expiresAt: Date
  }): Promise<RefreshToken>

  findValid(hash: string): Promise<RefreshToken | null>

  consume(hash: string): Promise<void>

  invalidateFamily(familyId: string): Promise<void>

  purgeExpired(): Promise<number> // cleanup job
}
```

## Tradeoffs

| Pro | Con |
|---|---|
| Stateless access token validation | DB lookup on every refresh |
| Built-in replay detection | Token family invalidation logs out all devices in family |
| Industry standard (RFC 6749) | Refresh token table grows unbounded without cleanup |
| Atomic invalidation via DB transaction | Requires PostgreSQL for transaction guarantees |
