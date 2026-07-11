# Execution Contract

_No active contract. Run `/plan-feature` or `/fix-bug` to create one._

The execution contract is the single source of truth for all engineering work. It is created once during planning and consumed by every downstream agent — Builder, Reviewer, and test runner. No agent should re-analyze information already captured here.

---

## Contract Template

When a contract is created, it follows this exact structure. Every section is required unless marked optional.

```markdown
# Execution Contract: [Short Title]

**Contract ID:** [uuid]
**Created:** [ISO date]
**Classification:** [feature | bug | refactor | maintenance | docs | performance]
**Scope:** [trivial | small | medium | large | major]
**Status:** planned | in-progress | review | complete

## Objective
[One to three sentences. What problem does this solve? Why now?]

## Scope

### In Scope
- [specific deliverable]
- [specific deliverable]

### Out of Scope (explicit)
- [thing we are deliberately not doing]
- [future consideration deferred]

### Affected Modules
- `src/api/routes/users.ts` — [what changes and why]
- `src/api/services/auth.ts` — [what changes and why]
- `src/shared/validation/auth.ts` — [what changes and why]

## Implementation Tasks

### Task 1: [Title]
- **Files to create:**
  - `src/api/routes/auth.ts` — login, register, refresh, logout endpoints
- **Files to modify:**
  - `src/api/middleware/auth.ts` — extract JWT verification to shared utility (lines 10-45)
  - `src/api/index.ts` — register new auth routes (line 42)
- **Pattern reference:** `src/api/routes/users.ts` — follow same handler/service/repository pattern
- **Knowledge modules:** `eng-security`, `eng-api-design`
- **Verification:** `bun test src/api/routes/__tests__/auth.test.ts` — all pass

### Task 2: [Title]
- **Files to create:**
  - ...
- **Files to modify:**
  - ...
- **Pattern reference:** ...
- **Knowledge modules:** ...
- **Verification:** ...

## Constraints
- [technical constraint — e.g., "Must use existing session middleware, do not introduce new auth framework"]
- [business constraint — e.g., "Existing tokens must remain valid for 24h after deploy"]

## Dependencies
- **New packages:** `bcrypt` (password hashing), `jsonwebtoken` (if not already in project)
- **New environment variables:** `JWT_SECRET`, `JWT_REFRESH_SECRET`
- **Prerequisite work:** None

## Testing Requirements
- [ ] Unit tests for `authService`: login success, login failure (wrong password), login failure (nonexistent user), token refresh success, token refresh replay detection
- [ ] Integration tests for `POST /auth/login` — 200, 400, 401
- [ ] Integration tests for `POST /auth/register` — 201, 400 (duplicate), 422
- [ ] Integration tests for `POST /auth/refresh` — 200, 401 (expired), 401 (replay)
- [ ] Integration tests for `POST /auth/logout` — 200, 401

## Acceptance Criteria
- [ ] Users can register with email + password
- [ ] Users can log in and receive access + refresh tokens
- [ ] Access token works for authenticated endpoints for 15 minutes
- [ ] Expired access token returns 401 with `TOKEN_EXPIRED` code
- [ ] Refresh token can be exchanged for new access token
- [ ] Reused refresh token invalidates the entire token family (anti-replay)
- [ ] Logout invalidates the refresh token
- [ ] All existing tests continue to pass

## Review Strategy
- **Focus:** security (token lifecycle, replay detection, password hashing), correctness (all auth flows), error handling
- **Skip:** frontend styling, database migration performance (minimal table size)
- **Review against:** `eng-security` module, `eng-api-design` module

## Contract Approval
- [ ] Orchestrator has reviewed and approved this contract
- [ ] User has approved this contract (if scope > small or new dependency)
```
