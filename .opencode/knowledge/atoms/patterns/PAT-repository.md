---
id: PAT-repository
type: pattern
title: Drizzle ORM Repository Pattern
description: Standard repository implementation using Drizzle ORM with parameterized queries, soft-delete filtering, pagination, and transaction support.
capabilities: [backend-repository, database-queries]
tags: [repository, drizzle, orm, postgresql, data-access]
domain: database
status: active
version: 1.0.0
created: 2026-01-15
updated: 2026-01-15
author: platform-team
reviewers: [backend-lead]
dependencies:
  requires: [RUL-repo-encapsulation]
  optional: [PAT-transaction]
supersedes: []
superseded_by: null
conflicts_with: []
related_to: [DEC-DB-NAMING-001]
priority: required
token_estimate: 100
audience: [builder]
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

# Drizzle ORM Repository Pattern

## Structure

Every repository file exports an object with methods. Each method encapsulates one database operation. Services import the repository object and call its methods.

## Standard Repository Template

```typescript
import { db } from '../db'
import { tableName, type Row, type NewRow } from '../db/schema/table-name'
import { eq, and, isNull, count, desc } from 'drizzle-orm'

export const resourceRepo = {
  async findById(id: string): Promise<Row | null> {
    return db.select().from(tableName)
      .where(and(eq(tableName.id, id), isNull(tableName.deletedAt)))
      .limit(1)
      .then(r => r[0] || null)
  },

  async create(data: NewRow): Promise<Row> {
    return db.insert(tableName).values(data).returning()
      .then(r => r[0])
  },

  async list(opts: { page: number; limit: number }): Promise<{ rows: Row[]; total: number }> {
    const where = isNull(tableName.deletedAt)
    const [rows, totalResult] = await Promise.all([
      db.select().from(tableName).where(where)
        .limit(opts.limit).offset((opts.page - 1) * opts.limit)
        .orderBy(desc(tableName.createdAt)),
      db.select({ count: count() }).from(tableName).where(where)
        .then(r => r[0].count),
    ])
    return { rows, total: Number(totalResult) }
  },

  async update(id: string, data: Partial<NewRow>): Promise<Row> {
    return db.update(tableName).set(data)
      .where(eq(tableName.id, id)).returning()
      .then(r => r[0])
  },

  async softDelete(id: string): Promise<void> {
    await db.update(tableName)
      .set({ deletedAt: new Date() })
      .where(eq(tableName.id, id))
  },
}
```

## Rules

- Always filter `isNull(deletedAt)` unless explicitly querying deleted records
- Always use `.limit()` on list queries — no unbounded queries
- Always `.returning()` after insert/update to get the created/modified row
- Use `Promise.all` for parallel independent queries (list + count)
- Repository methods accept and return plain objects, never HTTP types