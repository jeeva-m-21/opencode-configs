---
id: PAT-integration-testing
type: pattern
title: API Integration Testing with Supertest
description: Integration test pattern for API endpoints using Supertest. Every route is tested for all response codes including auth failures.
capabilities: [testing-integration]
tags: [supertest, integration-test, api-test, vitest]
domain: testing
status: active
version: 1.0.0
created: 2026-01-15
updated: 2026-01-15
author: platform-team
reviewers: [qa-lead]
dependencies:
  requires: [DEC-COVERAGE-001, PAT-unit-testing]
  optional: []
supersedes: []
superseded_by: null
conflicts_with: []
priority: required
token_estimate: 75
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

# API Integration Testing Pattern

## Structure

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import { app } from '../../src/api'

describe('POST /api/v1/resource', () => {
  let authToken: string

  beforeAll(async () => {
    authToken = await getTestAuthToken()
  })

  afterAll(async () => {
    await cleanupTestData()
  })

  it('should return 201 and created resource when authenticated and valid', async () => {
    const res = await request(app)
      .post('/api/v1/resource')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ name: 'Test', email: 'test@example.com' })

    expect(res.status).toBe(201)
    expect(res.body.data.id).toBeDefined()
  })

  it('should return 400 when input is invalid', async () => {
    const res = await request(app)
      .post('/api/v1/resource')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ name: '' })

    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('VALIDATION_ERROR')
  })

  it('should return 401 when not authenticated', async () => {
    const res = await request(app).post('/api/v1/resource').send({ name: 'Test' })
    expect(res.status).toBe(401)
  })

  it('should return 409 when duplicate resource', async () => {
    const res = await request(app)
      .post('/api/v1/resource')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ name: 'Existing', email: 'duplicate@test.com' })

    expect(res.status).toBe(409)
  })
})
```

## Requirements

- Every route handler tested for all applicable response codes
- Auth failures tested: 401 (missing token), 401 (expired), 403 (wrong role)
- Set up test data in `beforeAll`, clean up in `afterAll`
- Use a real test database (Docker container or in-memory)