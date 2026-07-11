---
id: RUL-repo-encapsulation
type: rule
title: All SQL and database queries must live in repositories
description: Every database interaction goes through a repository function. Services never contain raw SQL or ORM query builders. Repositories are the single access point for data.
capabilities: [backend-repository, database-queries, architecture]
tags: [repository, database, architecture, non-negotiable]
domain: architecture
status: active
version: 1.0.0
created: 2026-01-01
updated: 2026-01-01
author: platform-team
reviewers: [architecture-lead]
dependencies:
  requires: [RUL-service-isolation]
  optional: []
supersedes: []
superseded_by: null
conflicts_with: []
priority: required
token_estimate: 25
audience: [builder, reviewer, orchestrator]
platform_version: 1.0.0
---

# Repository Encapsulation

## Rule

All SQL queries, Drizzle ORM calls, and database interactions must be encapsulated in repository functions in `src/api/repositories/`. Services call repository methods. Services never import Drizzle or write SQL directly.

## Why

Repositories provide a clean abstraction over data access. When queries are scattered across services, changing the database schema requires hunting through every service file. When queries are centralized in repositories, schema changes are localized.
