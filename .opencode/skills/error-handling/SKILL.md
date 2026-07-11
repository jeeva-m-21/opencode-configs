---
name: error-handling
description: Error handling workflow — load with eng-error-handling for comprehensive error handling standards
license: MIT
compatibility: opencode
metadata:
  audience: developers
  workflow: error-handling
  requires: eng-error-handling
---

## Overview

This skill provides patterns for reviewing and implementing error handling. For detailed error handling standards (error taxonomy, recovery strategies, logging conventions), load `eng-error-handling`.

## When to Use

Load this skill when:
- Reviewing error handling in existing code
- Implementing error handling for new features
- Investigating production errors
- Setting up error monitoring

## Assessment Checklist

When reviewing error handling:

- [ ] Every catch block does something meaningful (log, recover, re-throw with context)
- [ ] Expected errors are distinguished from unexpected errors
- [ ] Users see actionable messages, not technical details
- [ ] Errors include correlation IDs for tracing
- [ ] External API calls have retry logic with backoff
- [ ] Database operations use transactions and handle deadlocks
- [ ] async operations properly handle rejected promises
- [ ] Error boundaries exist at route/service boundaries

## Common Patterns to Check

| Pattern | Problem | Fix |
|---|---|---|
| `catch (e) {}` | Silent failure | At minimum, log the error |
| `catch (e) { throw new Error('failed') }` | Lost original error | Use `throw new Error('context', { cause: e })` |
| `catch { return null }` | Hides failures from callers | Return a Result type or let it propagate |
| `try { await fn() } catch { ... }` + no `await` on nested promises | Unhandled promise rejection | Await all nested promises |
| Generic error response | Confuses users | Use specific error codes and messages |

Always load `eng-error-handling` for the complete error taxonomy, recovery strategies, and logging standards.
