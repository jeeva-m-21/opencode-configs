---
id: DEC-DB-NAMING-001
type: decision
title: Database Naming Conventions
description: Tables use plural snake_case, columns use singular snake_case, primary keys are UUID with gen_random_uuid(), foreign keys use {table}_id, timestamps are TIMESTAMPTZ.
capabilities: [database-schema]
tags: [naming, convention, postgresql, schema]
domain: database
status: active
version: 1.0.0
created: 2026-01-15
updated: 2026-01-15
author: platform-team
reviewers: [backend-lead]
dependencies:
  requires: []
  optional: []
supersedes: []
superseded_by: null
conflicts_with: []
confidence: high
evidence: []
priority: required
token_estimate: 40
audience: [builder, reviewer, orchestrator]
platform_version: 1.0.0
---

# Database Naming Conventions

## Decision

Standardized naming conventions for PostgreSQL schemas using Drizzle ORM.

## Conventions

| Element | Convention | Example |
|---|---|---|
| Table | plural, snake_case | `order_items` |
| Column | singular, snake_case | `created_at` |
| Primary key | `id UUID DEFAULT gen_random_uuid()` | `users.id` |
| Foreign key | `{table}_id` | `user_id REFERENCES users(id) ON DELETE CASCADE` |
| Timestamps | `TIMESTAMPTZ NOT NULL DEFAULT NOW()` | `created_at`, `updated_at` |
| Soft delete | `deleted_at TIMESTAMPTZ` (nullable) | — |

## Rationale

Consistent naming eliminates ambiguity. New team members can predict column names without looking at the schema. ORM code generation produces predictable TypeScript types.
