---
name: eng-backend
description: Backend service design, route/service/repository layering, middleware architecture, and async processing standards for this platform
license: MIT
compatibility: opencode
metadata:
  domain: backend
  audience: builder
  priority: high
  extends: eng-platform
---

## Platform Backend Architecture

This platform uses a strict layered architecture:

```
routes/ → services/ → repositories/
  ↓          ↓            ↓
HTTP     Business      Data
logic    logic         access
```

### Route Layer (`src/api/routes/`)

**Purpose**: HTTP concerns only. Validate input, call service, format response.
**Rule**: Maximum 20 lines per handler. If longer, extract to a service or middleware.
**Dependencies**: Express/Hono types, Zod schemas, service layer.
**Never**: Business logic, database queries, raw SQL.

```typescript
router.get('/:id', auth, async (req, res) => {
  const { id } = getUserParamsSchema.parse(req.params)
  const user = await userService.getById(id)
  res.json({ data: user })
})
```

### Service Layer (`src/api/services/`)

**Purpose**: Business logic. Orchestrates operations, enforces business rules.
**Rule**: Framework-agnostic. Never imports Express/Hono types.
**Dependencies**: Repository layer, domain models, shared utilities.
**Never**: HTTP request/response objects, raw SQL, framework-specific code.

```typescript
async getById(id: string): Promise<User> {
  const user = await userRepo.findById(id)
  if (!user) throw new NotFoundError('User not found')
  if (user.deletedAt) throw new NotFoundError('User has been deleted')
  return user
}
```

### Repository Layer (`src/api/repositories/`)

**Purpose**: Data access. All database queries live here.
**Rule**: One repository per aggregate root.
**Dependencies**: Drizzle ORM, database connection.
**Never**: Business logic, HTTP concerns.

```typescript
async findById(id: string): Promise<User | null> {
  return db.select().from(users).where(eq(users.id, id)).limit(1)
    .then(rows => rows[0] || null)
}
```

## Middleware Architecture

Middleware handles cross-cutting concerns. Order matters:

```typescript
// src/api/index.ts
app.use(cors(corsConfig))           // 1. CORS
app.use(json())                      // 2. Body parsing
app.use(requestId)                   // 3. Correlation ID
app.use(requestLogger)               // 4. Logging
app.use(rateLimiter)                 // 5. Rate limiting
app.use(securityHeaders)            // 6. Security headers
app.use('/api/v1/auth', authRoutes) // 7. Auth routes (public)
app.use(auth)                        // 8. Authentication
app.use('/api/v1', apiRoutes)       // 9. Protected API routes
app.use(errorHandler)               // 10. Error handling (last)
```

### Custom Middleware Standards

```typescript
// Each middleware:
// 1. Has a single responsibility
// 2. Calls next() or sends a response (never both)
// 3. Attaches data to request (e.g., req.user, req.correlationId)
// 4. Handles its own errors or passes to next(err)
```

## Error Handling

All errors extend a base `AppError` class:

```typescript
class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public code: string,
    public details?: Array<{ field?: string; message: string }>
  ) { super(message) }
}

class NotFoundError extends AppError {
  constructor(message: string) { super(message, 404, 'NOT_FOUND') }
}
class ValidationError extends AppError {
  constructor(message: string, details: ValidationError['details']) {
    super(message, 400, 'VALIDATION_ERROR', details)
  }
}
```

Services throw `AppError` instances. The global error handler catches them and formats the response.

## Async Processing

For operations that don't need to complete before responding:
- **Queue**: BullMQ with Redis (for reliable, durable processing)
- **Pattern**: Route enqueues job, returns 202 with job ID, client polls status
- **Never**: Fire-and-forget without error handling (use dead letter queues)

## Configuration

```typescript
// Load from environment (with defaults), validate with Zod
const config = z.object({
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string(),
  REDIS_URL: z.string().optional(),
  JWT_SECRET: z.string(),
}).parse(process.env)
```

Validate at startup. Fail fast if required config is missing.
