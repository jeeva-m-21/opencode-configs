---
id: PAT-unit-testing
type: pattern
title: Vitest Unit Testing Pattern
description: Standard unit test structure using Vitest with describe/it/expect, mock at architectural boundaries, and AAA (Arrange-Act-Assert) pattern.
capabilities: [testing-unit]
tags: [vitest, unit-test, mock, coverage]
domain: testing
status: active
version: 1.0.0
created: 2026-01-15
updated: 2026-01-15
author: platform-team
reviewers: [qa-lead]
dependencies:
  requires: [DEC-COVERAGE-001]
  optional: []
supersedes: []
superseded_by: null
conflicts_with: []
priority: required
token_estimate: 80
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

# Vitest Unit Testing Pattern

## Structure

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { serviceFunction } from '../service-file'
import { repoObject } from '../../repositories/repo-file'

vi.mock('../../repositories/repo-file')

describe('serviceFunction', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('should return expected result when condition is met', async () => {
    // Arrange
    vi.mocked(repoObject.method).mockResolvedValue(mockData)

    // Act
    const result = await serviceFunction('input')

    // Assert
    expect(result).toEqual(expectedOutput)
  })

  it('should throw SpecificError when condition is not met', async () => {
    vi.mocked(repoObject.method).mockResolvedValue(null)
    await expect(serviceFunction('nonexistent')).rejects.toThrow(SpecificError)
  })
})
```

## Mocking Rules

- Mock at architectural boundaries: repositories, external APIs, database
- Use `vi.mock()` for module-level mocking
- Reset mocks in `beforeEach` to prevent cross-test contamination
- Never mock the module under test
- Prefer specific mock implementations over generic stubs

## Test Naming

Format: `it('should [expected behavior] when [condition]')`

## What to Test

- Happy path (success case)
- Error path (each error type)
- Edge cases: empty input, maximum input, boundary values, null/undefined
- Behavior, not implementation — if refactoring internals breaks tests, tests are wrong