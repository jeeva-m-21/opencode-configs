---
name: testing-patterns
description: Test organization and patterns — load with eng-testing for comprehensive testing standards
license: MIT
compatibility: opencode
metadata:
  audience: developers
  workflow: testing
  requires: eng-testing
---

## Overview

This skill provides patterns for organizing and writing effective tests. For detailed testing standards (coverage requirements, mocking guidelines, strategy), load `eng-testing`.

## Test Organization

Co-locate tests with source:
```
src/components/Button.tsx
src/components/__tests__/Button.test.tsx
```

## Test Naming

```
describe('ComponentName', () => {
  describe('behaviorName', () => {
    it('should [expected behavior] when [condition]', () => {
      // test
    })
  })
})
```

## Test Structure (AAA)

```
// Arrange — set up test data and conditions
// Act — execute the behavior under test
// Assert — verify the outcome
```

## What to Test

| Code Type | Test Focus |
|---|---|
| Pure functions | All inputs, edge cases, error conditions |
| Components | All render states + user interactions |
| API handlers | Success, each error type, auth failures |
| Hooks | Initial state, state transitions, cleanup |
| Utilities | Boundary values, empty inputs, invalid inputs |

## Mocking Patterns

- Mock at architectural boundaries: API calls, database, file system
- Don't mock the module under test
- Reset mocks between tests
- Use test doubles over mocking libraries when possible

Always load `eng-testing` for comprehensive testing standards before writing or reviewing tests.
