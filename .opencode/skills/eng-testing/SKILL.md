---
name: eng-testing
description: Testing strategy, Vitest configuration, patterns, coverage requirements, and quality standards for this platform
license: MIT
compatibility: opencode
metadata:
  domain: testing
  audience: builder, reviewer
  priority: high
  extends: eng-platform
---

## Platform Testing Stack

- **Unit/Integration**: Vitest (fast, Jest API compatible, native ESM)
- **Component tests**: Testing Library (render, interact, assert behavior)
- **API tests**: Supertest (HTTP assertions, no running server needed)
- **E2E**: Playwright (cross-browser, reliable selectors, trace viewer)

### Test Organization

```
src/api/services/__tests__/users.test.ts    ← Unit tests for service
src/api/routes/__tests__/users.test.ts      ← Integration tests for route
src/web/components/ui/__tests__/Button.test.tsx ← Component tests
tests/integration/users.test.ts             ← Cross-service integration
tests/e2e/signup-flow.test.ts               ← Critical user flow
```

### Coverage Requirements (Enforced)

| Module Type | Branch Coverage | Blocking? |
|---|---|---|
| `services/` | 90%+ | Yes — must pass |
| `shared/utils/` | 90%+ | Yes |
| `routes/` | All response codes + auth | Yes |
| `repositories/` | All query methods | Yes |
| `components/` | All render states | No (warning) |
| `hooks/` | All state transitions | No (warning) |

Coverage threshold in `vitest.config.ts`: 80% overall branch coverage.

### Unit Test Pattern

```typescript
// src/api/services/__tests__/users.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { userService } from '../users'
import { userRepo } from '../../repositories/users'
import { NotFoundError } from '../../models/errors'

vi.mock('../../repositories/users')

describe('userService', () => {
  beforeEach(() => { vi.clearAllMocks() })

  describe('getById', () => {
    it('should return user when found', async () => {
      const mockUser = { id: '1', name: 'Alice', email: 'alice@test.com' }
      vi.mocked(userRepo.findById).mockResolvedValue(mockUser as any)

      const result = await userService.getById('1')
      expect(result).toEqual(mockUser)
    })

    it('should throw NotFoundError when user not found', async () => {
      vi.mocked(userRepo.findById).mockResolvedValue(null)
      await expect(userService.getById('nonexistent')).rejects.toThrow(NotFoundError)
    })

    it('should throw NotFoundError for soft-deleted users', async () => {
      vi.mocked(userRepo.findById).mockResolvedValue({ deletedAt: new Date() } as any)
      await expect(userService.getById('1')).rejects.toThrow(NotFoundError)
    })
  })
})
```

### API Integration Test Pattern

```typescript
// tests/integration/users.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import { app } from '../../src/api'
import { db } from '../../src/api/db'
import { users } from '../../src/api/db/schema/users'

describe('GET /api/v1/users/:id', () => {
  let authToken: string

  beforeAll(async () => {
    await db.insert(users).values({ id: 'test-user', email: 'test@test.com', name: 'Test', passwordHash: 'hash' })
    authToken = await getAuthToken('test@test.com')
  })

  afterAll(async () => {
    await db.delete(users).where(eq(users.id, 'test-user'))
  })

  it('should return 200 and user data when authenticated', async () => {
    const res = await request(app)
      .get('/api/v1/users/test-user')
      .set('Authorization', `Bearer ${authToken}`)

    expect(res.status).toBe(200)
    expect(res.body.data.id).toBe('test-user')
    expect(res.body.data.email).toBe('test@test.com')
  })

  it('should return 401 when not authenticated', async () => {
    const res = await request(app).get('/api/v1/users/test-user')
    expect(res.status).toBe(401)
  })

  it('should return 404 for non-existent user', async () => {
    const res = await request(app)
      .get('/api/v1/users/nonexistent')
      .set('Authorization', `Bearer ${authToken}`)
    expect(res.status).toBe(404)
  })
})
```

### Mocking Rules

- Mock at architectural boundaries: repository calls, external APIs, database
- Use `vi.mock()` for module-level mocking
- Reset mocks in `beforeEach` to prevent cross-test contamination
- Prefer fake implementations over mocking libraries
- Never mock the module under test

### What Tests Must Cover

- Every public function in `services/`
- Every route handler (all response codes: 200, 201, 400, 401, 403, 404, 409, 422)
- Every Zod schema validation path
- Every error handling path
- Edge cases: empty input, max-length input, boundary values, null/undefined

### CI Integration

```yaml
# .github/workflows/test.yml
- run: bun test --coverage
- run: bun test:integration  # Requires test database
```
Test suite must complete in under 5 minutes for CI. Slow tests go in a separate nightly run.
