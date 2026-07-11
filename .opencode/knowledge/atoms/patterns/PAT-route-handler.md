---
id: PAT-route-handler
type: pattern
title: API Route Handler Pattern — Validate, Call Service, Respond
description: Standard route handler structure using Zod validation, service layer calls, and JSON envelope responses. Every handler follows the same 3-step pattern.
capabilities: [api-design, api-validation, backend-service]
tags: [route, handler, api, express, hono, validation, zod]
domain: backend
status: active
version: 1.0.0
created: 2026-07-12
updated: 2026-07-12
author: platform-team
reviewers: [backend-lead]
dependencies:
  requires: [RUL-route-purity, RUL-service-isolation, RUL-auth-gated]
  optional: [PAT-error-handling]
supersedes: []
superseded_by: null
conflicts_with: []
priority: required
token_estimate: 70
audience: [builder]
platform_version: 1.0.0
---

# API Route Handler Pattern

## The Pattern (Express)

```typescript
// src/api/routes/users.ts
import { Router } from 'express'
import { userService } from '../services/users'
import { createUserSchema } from '../../shared/validation/users'
import { auth, validate, authorize } from '../middleware'

const router = Router()

// GET /api/v1/users?page=1&limit=20
router.get('/', auth, async (req, res) => {
  const page = parseInt(req.query.page as string) || 1
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 100)
  const result = await userService.list({ page, limit })
  res.json({ data: result.users, meta: { page, totalPages: Math.ceil(result.total / limit), totalCount: result.total } })
})

// GET /api/v1/users/:id
router.get('/:id', auth, async (req, res) => {
  const user = await userService.getById(req.params.id)
  res.json({ data: user })
})

// POST /api/v1/users
router.post('/', validate(createUserSchema), async (req, res) => {
  const user = await userService.create(req.body)
  res.status(201).json({ data: user })
})

// DELETE /api/v1/users/:id
router.delete('/:id', auth, authorize('admin'), async (req, res) => {
  await userService.softDelete(req.params.id)
  res.status(204).send()
})

export default router
```

## The Pattern (Hono)

```typescript
// Same 3-step pattern, Hono syntax
app.get('/api/v1/users/:id', auth, async (c) => {
  const user = await userService.getById(c.req.param('id'))
  return c.json({ data: user })
})
```

## Rules

- **Validate** at the boundary using Zod (400 on invalid input)
- **Call the service** — exactly one service method per handler
- **Respond** with the standard JSON envelope (`{ data, meta? }` or `{ error }`)
- Never more than 20 lines per handler
- Always include auth middleware unless endpoint is explicitly public
