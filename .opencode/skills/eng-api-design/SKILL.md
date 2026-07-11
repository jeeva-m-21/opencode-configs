---
name: eng-api-design
description: REST API design standards — endpoint structure, response envelopes, error handling, pagination, and versioning for this platform
license: MIT
compatibility: opencode
metadata:
  domain: api-design
  audience: builder, reviewer
  priority: high
  extends: eng-platform
---

## Platform API Convention

This organization builds REST APIs with structured JSON envelopes. See `docs/platform-specification.md` for the full standard. This module provides implementation guidance.

### Endpoint Structure

```
/api/v1/{resource}              GET (list), POST (create)
/api/v1/{resource}/{id}         GET, PUT, PATCH, DELETE
/api/v1/{resource}/{id}/{sub}   Sub-resource operations
```

Plural nouns. Kebab-case for multi-word. Version in URL path.

### Response Format

**Success** (`src/shared/types/api.ts`):
```typescript
type ApiResponse<T> = {
  data: T
  meta?: {
    page: number
    totalPages: number
    totalCount: number
  }
}
```

**Error** (`src/shared/types/api.ts`):
```typescript
type ApiError = {
  error: {
    code: string
    message: string
    details?: Array<{ field?: string; message: string }>
    correlationId: string
  }
}
```

### Status Code Guide

| Code | Meaning | When to Use |
|---|---|---|
| 200 | OK | GET, PUT, PATCH success |
| 201 | Created | POST success |
| 204 | No Content | DELETE success |
| 400 | Bad Request | Zod validation failure |
| 401 | Unauthorized | Missing/invalid/expired token |
| 403 | Forbidden | Valid token, insufficient permissions |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Duplicate, state conflict |
| 422 | Unprocessable | Valid syntax, invalid business rules |
| 429 | Rate Limited | Too many requests |
| 500 | Internal Error | Unexpected (never expose internals) |

### Route Handler Template

```typescript
// src/api/routes/users.ts
import { Router } from 'express' // or Hono
import { z } from 'zod'
import { auth, validate } from '../middleware'
import { userService } from '../services/users'
import { ApiResponse } from '../../shared/types/api'

const router = Router()

const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
})

router.post('/', auth, validate(createUserSchema), async (req, res) => {
  const user = await userService.create(req.body)
  res.status(201).json({ data: user } satisfies ApiResponse<User>)
})

router.get('/', auth, async (req, res) => {
  const page = Number(req.query.page) || 1
  const limit = Math.min(Number(req.query.limit) || 20, 100)
  const { users, total } = await userService.list({ page, limit })
  res.json({
    data: users,
    meta: { page, totalPages: Math.ceil(total / limit), totalCount: total }
  } satisfies ApiResponse<User[]>)
})
```

### Pagination Standard

- Query params: `?page=1&limit=20`
- Default limit: 20, max limit: 100
- Response includes `meta` with `page`, `totalPages`, `totalCount`
- For large datasets (10k+ rows): cursor-based pagination with `?cursor=...&limit=20`

### Filtering & Sorting

```
GET /api/v1/users?status=active&sort=-createdAt,name
```
- Filter params match field names
- Sort: comma-separated, `-` prefix for descending

### Error Handling Pattern

```typescript
// middleware/error-handler.ts
function errorHandler(err: Error, req: Request, res: Response, next: NextFunction) {
  const correlationId = req.headers['x-correlation-id'] || crypto.randomUUID()

  if (err instanceof ValidationError) {
    return res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: err.message, details: err.details, correlationId }
    })
  }
  if (err instanceof NotFoundError) {
    return res.status(404).json({
      error: { code: 'NOT_FOUND', message: err.message, correlationId }
    })
  }
  // ... other error types

  logger.error({ err, correlationId })
  res.status(500).json({
    error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred', correlationId }
  })
}
```

### Auth Gating

All routes are authenticated by default. Public routes are explicit exceptions:
```typescript
router.get('/health', healthHandler)           // PUBLIC
router.post('/auth/login', loginHandler)       // PUBLIC
router.get('/users', auth, listUsersHandler)   // AUTHENTICATED
router.get('/users/:id', auth, getUserHandler) // AUTHENTICATED
```
