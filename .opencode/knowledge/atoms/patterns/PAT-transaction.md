---
id: PAT-transaction
type: pattern
title: Database Transaction Pattern
description: Multi-statement operations that must succeed or fail together MUST be wrapped in a database transaction. Use Drizzle's transaction API. Never commit partial state.
capabilities: [database-transactions, backend-repository]
tags: [transaction, database, atomic, consistency]
domain: database
status: active
version: 1.0.0
created: 2026-01-15
updated: 2026-07-12
author: platform-team
reviewers: [backend-lead]
dependencies:
  requires: [RUL-repo-encapsulation]
  optional: []
supersedes: []
superseded_by: null
conflicts_with: []
priority: required
token_estimate: 60
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

# Database Transaction Pattern

## Rule

Any operation that modifies multiple rows or tables in a way that must be atomic MUST use a database transaction. If one statement fails, all previous statements in the transaction must roll back.

## When to Use Transactions

- Creating a user + profile in separate tables
- Token rotation: consume old token + create new token
- Payment: deduct balance + create transaction record
- Order placement: create order + update inventory + create shipment
- Any multi-table insert/update where partial success = corrupted state

## Implementation

```typescript
import { db } from '../db'

async function createUserWithProfile(userData: NewUser, profileData: NewProfile) {
  return db.transaction(async (tx) => {
    const user = await tx.insert(users).values(userData).returning().then(r => r[0])
    const profile = await tx.insert(profiles)
      .values({ ...profileData, userId: user.id })
      .returning().then(r => r[0])
    return { user, profile }
  })
}
```

## Transaction Isolation

PostgreSQL default (READ COMMITTED) is appropriate for most operations. Use SERIALIZABLE only when correctness demands it and you've measured the performance impact.