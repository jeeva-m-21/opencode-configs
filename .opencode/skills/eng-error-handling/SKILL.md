---
name: eng-error-handling
description: Error handling patterns, error taxonomy, recovery strategies, logging conventions, and user-facing error messaging
license: MIT
compatibility: opencode
metadata:
  domain: error-handling
  audience: builder, reviewer
  priority: high
---

## Error Handling Philosophy

1. **Catch errors at the boundary, not in the middle.** Business logic should throw; handlers should catch and translate.
2. **Never swallow errors silently.** If you catch an error, do something with it (log it, wrap it, recover from it).
3. **Distinguish expected from unexpected.** Validation failures are expected. Database connection failures are unexpected. Handle them differently.
4. **Provide context.** Every error should include enough context to diagnose the problem: what operation failed, what inputs were involved, when it happened.

## Error Taxonomy

| Type | HTTP Status | User-Visible? | Example |
|---|---|---|---|
| `ValidationError` | 400 / 422 | Yes (actionable message) | Invalid email format |
| `NotFoundError` | 404 | Yes | User does not exist |
| `AuthenticationError` | 401 | Yes | Invalid credentials |
| `AuthorizationError` | 403 | Yes | Insufficient permissions |
| `ConflictError` | 409 | Yes | Duplicate resource |
| `RateLimitError` | 429 | Yes | Too many requests |
| `InternalError` | 500 | No (generic message) | Database connection failure |

## Structured Error Responses

```
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The request contains invalid data.",
    "details": [
      { "field": "email", "message": "Must be a valid email address" }
    ],
    "correlationId": "abc-123-def"
  }
}
```

Every error response includes a `correlationId` for tracing the error in logs.

## Recovery Strategies

| Scenario | Strategy |
|---|---|
| External API timeout | Retry with exponential backoff (max 3 attempts, starting at 1s) |
| External API 5xx | Retry with exponential backoff, then return degraded response |
| External API 4xx | DO NOT retry — fix the request or flag as misconfiguration |
| Database query timeout | Retry once with fresh connection, then fail |
| Database deadlock | Retry transaction up to 2 times |
| Message queue failure | Dead letter queue after N retries with exponential backoff |
| File system full | Alert immediately, do not retry |

## Logging Errors

- `error` level: Unexpected failures requiring immediate attention
- `warn` level: Expected recoverable failures (retry succeeded, degraded mode)
- `info` level: Significant error events (rate limit hit, validation spike)
- Include: correlation ID, user ID (if authenticated), operation, inputs (sanitized), stack trace
- Never log: passwords, tokens, full credit card numbers, PII
- Use structured logging (JSON) for machine parsability

## User-Facing Error Messages

- Be specific: "Email address is already registered" not "An error occurred"
- Be actionable: "File must be under 5MB" not "Invalid file"
- Be polite: "We couldn't process your request. Please try again." not "Error 500"
- Never expose internals: no stack traces, no DB errors, no file paths
- Offer a path forward: "Please try again or contact support with reference: abc-123"

## Anti-Patterns to Avoid

- `catch (e) {}` — empty catch block (always at minimum log the error)
- `catch (e) { throw e }` — pointless re-throw (either handle it or let it propagate)
- `catch (e) { throw new Error('something failed') }` — losing the original error and stack trace (use `throw new Error('context', { cause: e })`)
- `try { ... } catch { return null }` — hiding errors with null returns
- Generic "Something went wrong" for errors the user can fix
