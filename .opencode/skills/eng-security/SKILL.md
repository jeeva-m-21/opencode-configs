---
name: eng-security
description: Platform security standards — JWT auth implementation, RBAC, input validation with Zod, secrets management, and security headers
license: MIT
compatibility: opencode
metadata:
  domain: security
  audience: builder, reviewer, security-auditor
  priority: critical
  extends: eng-platform
---

## Platform Auth Implementation

### JWT Token Lifecycle

```typescript
// Access token: 15 minutes
const accessToken = jwt.sign(
  { sub: user.id, role: user.role },
  process.env.JWT_SECRET,
  { expiresIn: '15m' }
)

// Refresh token: 7 days, single-use rotation
const refreshToken = crypto.randomBytes(32).toString('hex')
await tokenRepo.create({
  token: hashToken(refreshToken),
  userId: user.id,
  expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  family: crypto.randomUUID(),  // For detecting token reuse
})
```

### Refresh Token Rotation (Anti-Replay)

When a refresh token is used:
1. Invalidate the entire token family if the token was already used (replay attack detected) → force re-login
2. Otherwise, rotate: invalidate old token, issue new token in same family
3. This detects stolen refresh tokens

### Auth Middleware

```typescript
// src/api/middleware/auth.ts
function auth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Missing authorization header' } })
  }

  try {
    const payload = jwt.verify(header.slice(7), process.env.JWT_SECRET)
    req.user = { id: payload.sub, role: payload.role }
    next()
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ error: { code: 'TOKEN_EXPIRED', message: 'Access token expired' } })
    }
    return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Invalid token' } })
  }
}
```

### RBAC Authorization

```typescript
// src/api/middleware/authorize.ts
function authorize(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        error: { code: 'FORBIDDEN', message: 'Insufficient permissions' }
      })
    }
    next()
  }
}

// Usage: router.delete('/users/:id', auth, authorize('admin'), deleteUser)
```

### Input Validation (Zod)

All input validated at the boundary:

```typescript
// src/shared/validation/users.ts
const createUserSchema = z.object({
  email: z.string().email('Invalid email format').max(255),
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

type CreateUserInput = z.infer<typeof createUserSchema>

// src/api/middleware/validate.ts
function validate<T>(schema: z.ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body)
    if (!result.success) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request body',
          details: result.error.issues.map(i => ({ field: i.path.join('.'), message: i.message }))
        }
      })
    }
    req.body = result.data  // Use parsed (coerced, defaulted) data
    next()
  }
}
```

### Password Hashing

```typescript
// Use bcrypt with 12 rounds
import bcrypt from 'bcrypt'

async hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

async verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}
```

### Rate Limiting

```typescript
// Auth endpoints: 5 attempts per minute per IP
const authLimiter = rateLimit({
  windowMs: 60_000,
  max: 5,
  message: { error: { code: 'RATE_LIMITED', message: 'Too many attempts. Try again later.' } }
})

// General API: 100 requests per minute per user
const apiLimiter = rateLimit({
  windowMs: 60_000,
  max: 100,
  keyGenerator: (req) => req.user?.id || req.ip,
})
```

### Security Headers

```typescript
import helmet from 'helmet'

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    }
  },
  hsts: { maxAge: 31536000, includeSubDomains: true }
}))
```

### CORS

```typescript
const corsOptions = {
  origin: process.env.NODE_ENV === 'production'
    ? ['https://app.example.com']
    : ['http://localhost:5173'],
  credentials: true,
}
app.use(cors(corsOptions))
```

### Secrets Checklist

- [ ] `JWT_SECRET` — 256-bit random string, in environment variable
- [ ] `DATABASE_URL` — connection string with credentials, in environment variable
- [ ] `REDIS_URL` — if using Redis, in environment variable
- [ ] All API keys in environment variables, never in source
- [ ] `.env` in `.gitignore`
- [ ] `.env.example` committed (shows structure, no real values)
- [ ] GitHub Secrets configured for all CI/CD credentials
