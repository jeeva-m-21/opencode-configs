---
id: PAT-password-hashing
type: pattern
title: Password Hashing with bcrypt (12 rounds)
description: Standard password hashing using bcrypt with 12 salt rounds. Passwords are never stored in plaintext. Hash comparison is constant-time.
capabilities: [authentication, secret-management]
tags: [bcrypt, password, hash, security]
domain: security
status: active
version: 1.0.0
created: 2026-01-15
updated: 2026-01-15
author: platform-team
reviewers: [security-lead]
dependencies:
  requires: [DEC-AUTH-001]
  optional: []
supersedes: []
superseded_by: null
conflicts_with: []
priority: required
token_estimate: 50
audience: [builder]
platform_version: 1.0.0
---

# Password Hashing Pattern

## Implementation

```typescript
import bcrypt from 'bcrypt'

const SALT_ROUNDS = 12

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}
```

## Rules

- Always use 12 salt rounds minimum (configurable via `BCRYPT_ROUNDS` env var)
- Never log passwords or password hashes
- Hash on registration and password change
- Compare on login
- Column type: `varchar(255)` named `password_hash`
- Never store plaintext passwords anywhere — not in logs, not in error messages, not in request/response bodies
