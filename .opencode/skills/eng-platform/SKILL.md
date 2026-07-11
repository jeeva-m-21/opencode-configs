---
name: eng-platform
description: Complete platform specification — the authoritative source for stack choices, project structure, API design, security model, testing philosophy, deployment conventions, and operational standards in this engineering organization
license: MIT
compatibility: opencode
metadata:
  domain: platform
  audience: all
  priority: foundational
---

## Overview

This skill encapsulates the platform specification — how this organization builds software. It is the authoritative source for all implementation decisions. When an agent needs to know "how do we do X?", load this module.

The full platform specification is at `docs/platform-specification.md` (always in agent context via instructions). This skill provides the condensed version optimized for agent context.

## Quick Reference

### Stack
- **Language**: TypeScript strict mode
- **Runtime**: Bun (primary) or Node.js 20+
- **Frontend**: React 18+ / Next.js (App Router) or Vite + React Router
- **Backend**: Hono (preferred) or Express.js
- **API**: REST with JSON + structured envelopes
- **Database**: PostgreSQL 16+ with Drizzle ORM
- **Cache**: Redis
- **Validation**: Zod (shared frontend/backend)
- **Auth**: JWT access tokens (15 min) + refresh tokens (7 day, rotating)
- **Testing**: Vitest + Testing Library + Supertest
- **CI/CD**: GitHub Actions
- **Infrastructure**: Docker + cloud-agnostic

### Project Structure
```
src/api/       — Backend (routes → services → repositories)
src/web/       — Frontend (pages → components → hooks → services)
src/shared/    — Shared types, validation (Zod), constants, utils
tests/         — Integration + E2E tests
```

### API Rules
- `/api/v1/{resource}` — plural nouns, kebab-case
- Success: `{ data: T, meta?: { page, totalPages, totalCount } }`
- Error: `{ error: { code, message, details?, correlationId } }`
- 400 for validation, 422 for business rule violations
- All endpoints auth-gated except: health, login, register, refresh, public content

### Route Handler Pattern
```typescript
// routes/users.ts — THIN (max 20 lines)
router.get('/:id', auth, async (req, res) => {
  const input = getUserParamsSchema.parse(req.params)  // Zod validation
  const user = await userService.getById(input.id)       // Service call
  res.json({ data: user })                               // Format response
})
```

### Service Pattern
```typescript
// services/users.ts — BUSINESS LOGIC (no HTTP types)
async getById(id: string): Promise<User> {
  const user = await userRepo.findById(id)
  if (!user) throw new NotFoundError('User not found')
  return user
}
```

### Security
- Passwords: bcrypt (12 rounds) or argon2id
- Auth: `Authorization: Bearer {token}` header
- RBAC: `admin`, `user` (+ project-specific)
- Secrets: env vars only, never in code
- `Access-Control-Allow-Origin: *` never in production

### Testing
- Unit: `services/`, `shared/utils/`, `hooks/` → 90%+ branch coverage
- Integration: Every route (all response codes + auth failures)
- E2E: 3-5 critical user flows
- Test naming: `it('should [expected] when [condition]')`
- Co-located: `__tests__/` alongside source
- Mock at architectural boundaries only

### Database
- Tables: plural snake_case, UUID PKs, TIMESTAMPTZ
- Queries: via repositories, parameterized, specific columns
- Migrations: Drizzle Kit, forward-only, tested on staging

### Deployment
- Environments: dev (local) → staging → production
- Pipeline: lint → typecheck → test → build → deploy staging → integration test → deploy prod → smoke test
- Branch: `main` = production, `staging` = pre-prod, `feature/*` = development
- Commits: conventional (`feat(scope): description`)

### AI Agent Rules
- AI agents follow the same standards as humans
- Every AI change is reviewed (Reviewer agent or human)
- AI must write tests alongside implementation
- New patterns → document in `state/decisions.md`
- Never modify framework config without explicit instruction
- Never commit secrets or `.env` files
