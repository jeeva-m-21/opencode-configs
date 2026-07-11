---
name: eng-database
description: Database schema design, Drizzle ORM conventions, migration strategy, and query standards for this platform
license: MIT
compatibility: opencode
metadata:
  domain: database
  audience: builder, reviewer
  priority: high
  extends: eng-platform
---

## Platform Database Stack

- **Database**: PostgreSQL 16+
- **ORM**: Drizzle ORM (type-safe SQL, no magic)
- **Migrations**: Drizzle Kit (forward-only, versioned)
- **Connection**: Connection pooling via `pg` driver

### Why Drizzle

- Type-safe queries without abstraction overhead
- SQL-like syntax — what you write is close to what runs
- No code generation step (vs Prisma)
- Excellent TypeScript inference
- Lightweight and fast

### Schema Definition

```typescript
// src/api/db/schema/users.ts
import { pgTable, uuid, varchar, timestamp, boolean } from 'drizzle-orm/pg-core'

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  role: varchar('role', { length: 50 }).notNull().default('user'),
  emailVerified: boolean('email_verified').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
})

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
```

### Naming Conventions

| Element | Convention | Example |
|---|---|---|
| Table | plural, snake_case | `order_items` |
| Column | singular, snake_case | `created_at` |
| Primary key | `id UUID DEFAULT gen_random_uuid()` | `users.id` |
| Foreign key | `{table}_id` | `user_id REFERENCES users(id)` |
| Timestamps | `TIMESTAMPTZ` | `created_at`, `updated_at` |
| Soft delete | `deleted_at TIMESTAMPTZ` | Nullable |

### Repository Pattern

All queries through repositories. Never raw queries in services.

```typescript
// src/api/repositories/users.ts
import { db } from '../db'
import { users, type User, type NewUser } from '../db/schema/users'
import { eq, and, isNull } from 'drizzle-orm'

export const userRepo = {
  async findById(id: string): Promise<User | null> {
    return db.select().from(users)
      .where(and(eq(users.id, id), isNull(users.deletedAt)))
      .limit(1)
      .then(r => r[0] || null)
  },

  async findByEmail(email: string): Promise<User | null> {
    return db.select().from(users)
      .where(and(eq(users.email, email), isNull(users.deletedAt)))
      .limit(1)
      .then(r => r[0] || null)
  },

  async create(data: NewUser): Promise<User> {
    return db.insert(users).values(data).returning()
      .then(r => r[0])
  },

  async list(opts: { page: number; limit: number }): Promise<{ users: User[]; total: number }> {
    const where = isNull(users.deletedAt)
    const [result] = await Promise.all([
      db.select().from(users).where(where).limit(opts.limit).offset((opts.page - 1) * opts.limit),
      db.select({ count: count() }).from(users).where(where).then(r => r[0].count),
    ])
    return { users: result, total: Number(result.total) }
  },
}
```

### Migration Strategy

1. Schema changes go in Drizzle schema files
2. Generate migrations: `bun run db:generate`
3. Apply migrations: `bun run db:migrate`
4. Migrations are committed to git
5. Test migrations on staging before production
6. Backward-compatible changes: add column → deploy → remove old column next release
7. Never modify a deployed migration — create a new one

### Query Standards

- Always parameterized (Drizzle handles this)
- Select specific columns — `db.select({ id: users.id, name: users.name })` not `db.select()`
- Paginate list queries — always include `limit`
- Set query timeout: 10 seconds default
- Use transactions for multi-statement operations:
  ```typescript
  await db.transaction(async (tx) => {
    await tx.insert(users).values(userData)
    await tx.insert(profiles).values(profileData)
  })
  ```

### Indexing Strategy

Add indexes for:
- Foreign keys used in JOINs
- Columns used in WHERE clauses
- Columns used in ORDER BY
- Columns with UNIQUE constraints (automatic)
- Composite indexes for queries filtering on multiple columns

### Soft Deletes

Use `deleted_at TIMESTAMPTZ` for soft deletes:
- Add `isNull(table.deletedAt)` to every query
- Never permanently delete user data without a retention policy
- Implement hard delete as a scheduled cleanup for records deleted > 90 days ago
