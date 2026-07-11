# Platform Specification v1.0

This document defines how this engineering organization builds software. Every project follows these standards unless explicitly exempted. Technology-specific implementations extend these standards; they do not replace them.

## 1. Technology Stack

### Core Stack

| Layer | Choice | Rationale |
|---|---|---|
| **Language** | TypeScript (strict mode) | Type safety across frontend and backend. Shared types eliminate a class of bugs. Strict mode enforces null checking, no implicit any. |
| **Runtime** | Bun (primary) or Node.js 20+ | Bun for speed and native TypeScript. Node.js 20+ as fallback when Bun compatibility is insufficient. |
| **Package Manager** | Bun or pnpm | Bun for monorepos and speed. pnpm for strict dependency resolution. Never npm or yarn. |
| **Frontend Framework** | React 18+ with TypeScript | Mature ecosystem, component model, server components (Next.js). |
| **Frontend Build** | Vite | Fast dev server, optimized builds, native ESM. |
| **Meta-framework** | Next.js (App Router) or Vite + React Router | Next.js for full-stack apps needing SSR/SSG. Vite for SPAs. |
| **Backend Framework** | Hono (edge-first) or Express.js | Hono for new projects (fast, lightweight, edge-ready). Express for projects with existing middleware dependencies. |
| **API Style** | REST with JSON | REST is universally understood. Structured response envelopes ensure consistency. |
| **Database** | PostgreSQL 16+ | Relational integrity, JSON support, mature ecosystem. |
| **ORM / Query Builder** | Drizzle ORM | Type-safe, SQL-like, lightweight. No magic. |
| **Cache** | Redis | Mature, fast, versatile (caching, sessions, queues). |
| **Validation** | Zod | Shared schemas between frontend and backend. Type inference eliminates duplication. |
| **Auth** | JWT + refresh token rotation | Stateless auth with secure token lifecycle. |
| **Testing** | Vitest + Testing Library + Supertest | Fast, Jest-compatible, component testing, API testing. |
| **Linting** | ESLint with strict TypeScript config | Enforce consistent code patterns. |
| **Formatting** | Prettier | Enforce consistent formatting. No debates. |
| **CI/CD** | GitHub Actions | Tight GitHub integration, marketplace actions, free for public repos. |
| **Infrastructure** | Docker + cloud-agnostic | Docker for local and CI consistency. Cloud-agnostic design avoids vendor lock-in. Support AWS, GCP, Azure. |
| **Monitoring** | Structured JSON logging + Prometheus metrics | Machine-parseable logs. Standard metrics protocol. |

### Why Not

| Rejected | Why |
|---|---|
| GraphQL | Added complexity without proportional benefit for most applications. REST with structured responses is simpler and sufficient. |
| MongoDB | Relational data benefits from relational databases. PostgreSQL handles JSON when document storage is needed. |
| Prisma | Abstraction overhead. Drizzle is closer to SQL and more performant. |
| CSS-in-JS | Runtime cost. Use CSS Modules or Tailwind instead. |
| Redux | Boilerplate-heavy. Prefer React Query for server state, Context + useReducer for UI state. |
| Kubernetes for small projects | Operational overhead doesn't justify the orchestration benefit. Docker Compose is sufficient until you outgrow a single machine. |
| Serverless-first | Cold starts, complexity, vendor lock-in. Use serverless only for event-driven workloads, not the primary application server. |

## 2. Repository Structure

Every new project follows this structure:

```
project/
├── src/
│   ├── api/                  # Backend API server
│   │   ├── routes/           # Route handlers — validate input, call service, format response
│   │   │   └── users.ts
│   │   ├── services/         # Business logic — framework-agnostic
│   │   │   └── users.ts
│   │   ├── middleware/       # Auth, logging, validation, rate limiting, error handling
│   │   │   ├── auth.ts
│   │   │   ├── error-handler.ts
│   │   │   └── logger.ts
│   │   ├── repositories/     # Data access — database queries live here
│   │   │   └── users.ts
│   │   ├── models/           # Domain types, enums, constants
│   │   │   └── user.ts
│   │   └── index.ts          # App entry — create server, register middleware, start
│   │
│   ├── web/                  # Frontend application
│   │   ├── components/       # Reusable UI components (Button, Card, Modal, Form)
│   │   │   ├── ui/           # Primitive components (design system)
│   │   │   └── features/     # Feature-specific composed components
│   │   ├── pages/            # Route-level page components
│   │   │   └── dashboard/
│   │   │       ├── page.tsx
│   │   │       └── __tests__/
│   │   ├── hooks/            # Custom React hooks (useAuth, useDebounce, useLocalStorage)
│   │   ├── services/         # API client, data fetching, external integrations
│   │   │   └── api-client.ts
│   │   ├── stores/           # Global state (Context providers, Zustand stores)
│   │   ├── lib/              # Pure utilities specific to the frontend
│   │   └── App.tsx           # Root component with providers and router
│   │
│   ├── shared/               # Shared between api/ and web/
│   │   ├── types/            # TypeScript interfaces and type guards
│   │   ├── validation/       # Zod schemas (shared validation rules)
│   │   ├── constants/        # Shared constants and enums
│   │   └── utils/            # Pure utility functions (no side effects)
│   │
│   └── infrastructure/       # Deployment, Docker, CI configuration
│       ├── docker/
│       │   ├── Dockerfile.api
│       │   └── Dockerfile.web
│       ├── docker-compose.yml
│       └── scripts/
│           ├── setup.sh
│           └── migrate.sh
│
├── tests/
│   ├── integration/          # API integration tests (one per route)
│   └── e2e/                  # Critical user flows (Playwright or Cypress)
│
├── docs/                     # Project documentation
├── state/                    # Framework state (OpenCode framework)
├── .opencode/                # Framework extensions
├── scripts/                  # Build, deploy, utility scripts
├── AGENTS.md                 # Project rules for AI agents
├── opencode.jsonc            # OpenCode config
├── tui.jsonc                 # OpenCode TUI config
├── package.json              # Workspace root (if monorepo)
└── tsconfig.json             # Base TypeScript config
```

### Structural Rules

1. **`routes/` never contains business logic.** Routes validate input, call a service, and format the response. Maximum 20 lines per route handler.
2. **`services/` never imports HTTP types.** Services are framework-agnostic. They work equally well behind REST, GraphQL, or a CLI.
3. **`repositories/` contain all SQL.** No raw queries in services. Every database interaction goes through a repository.
4. **`shared/` is pure.** No framework dependencies in shared (no React, no Express). Only TypeScript, Zod, and pure utility libraries.
5. **`components/ui/` has no business logic.** UI components only render. All behavior comes from hooks and services.
6. **`components/features/` compose UI components with business logic.** Feature components connect data to presentation.
7. **Tests live with their source.** Unit tests in `__tests__/` co-located. Integration tests in `tests/integration/`.

## 3. API Design Standard

### URL Convention
```
/api/v1/{resource}              Collection
/api/v1/{resource}/{id}         Single resource
/api/v1/{resource}/{id}/{sub}   Sub-resource
```
Plural nouns, kebab-case for multi-word, version in path.

### Response Envelopes

**Success:**
```typescript
{
  data: T;
  meta?: {
    page: number;
    totalPages: number;
    totalCount: number;
  };
}
```

**Error:**
```typescript
{
  error: {
    code: string;        // e.g., "VALIDATION_ERROR", "NOT_FOUND", "UNAUTHORIZED"
    message: string;     // Human-readable, safe to show users
    details?: Array<{
      field?: string;
      message: string;
    }>;
    correlationId: string;  // UUID v4 for tracing
  };
}
```

### HTTP Status Codes

| Code | When |
|---|---|
| 200 | Success (GET, PUT, PATCH) |
| 201 | Created (POST) |
| 204 | No Content (DELETE) |
| 400 | Bad Request (invalid input format) |
| 401 | Unauthorized (missing/expired auth) |
| 403 | Forbidden (valid auth, insufficient permissions) |
| 404 | Not Found |
| 409 | Conflict (duplicate, state violation) |
| 422 | Unprocessable Entity (valid format, invalid business rules) |
| 429 | Rate Limited |
| 500 | Internal Error (unexpected — never expose internals) |

### Pagination, Filtering, Sorting

```
GET /api/v1/users?page=1&limit=20&status=active&role=admin&sort=-createdAt
```
- `page/limit` — offset-based pagination (default: page=1, limit=20, max limit=100)
- Filtering — query params match field names
- Sorting — comma-separated, `-` prefix for descending

### Input Validation

Every route validates input at the boundary using Zod schemas from `src/shared/validation/`. Validation errors return 400 with `details` array listing each field failure. Never proceed with invalid input.

### Authentication

All endpoints require authentication except:
- `GET /health`, `GET /health/ready`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/refresh`
- Public content endpoints (explicitly designated)

Auth header: `Authorization: Bearer {token}`

### Rate Limiting

- Default: 100 requests/minute per authenticated user
- Auth endpoints: 5 requests/minute per IP
- Rate limit exceeded: 429 with `Retry-After` header

## 4. Security Model

### Authentication

- **Password hashing**: bcrypt (12 rounds) or argon2id
- **Access tokens**: JWT, 15-minute expiry, signed with RS256 or HS256
- **Refresh tokens**: opaque token, 7-day expiry, single-use rotation (invalidated after use, new token issued)
- **Token storage (web)**: HttpOnly, Secure, SameSite=Strict cookies for refresh tokens. Access tokens in memory (never localStorage).
- **Token storage (mobile/native)**: Secure storage (Keychain/Keystore)

### Authorization

- **Model**: Role-Based Access Control (RBAC)
- **Default roles**: `admin`, `user`
- **Custom roles**: Defined per project as needed
- **Enforcement**: Middleware checks role on every request. Routes declare required roles.
- **Resource ownership**: Users can only access/modify their own resources unless `admin`.

### Input Validation (Defense Layer)

1. Zod schema validation at route boundary → 400 if invalid
2. Business rule validation in service layer → 422 if violated
3. TypeScript types ensure data shape through the stack
4. Database constraints (NOT NULL, UNIQUE, CHECK) as final defense

### Secrets Management

- **Development**: `.env` file (in `.gitignore`, never committed)
- **CI/CD**: GitHub Secrets → injected as environment variables
- **Production**: Environment variables or secrets manager (AWS Secrets Manager, GCP Secret Manager)
- **Never**: hardcoded in source, committed to git, logged, returned in responses

### Security Headers

| Header | Value |
|---|---|
| `Content-Security-Policy` | `default-src 'self'` (tighten per app) |
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `DENY` |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |

### CORS

- Development: whitelist `http://localhost:5173` (Vite dev server)
- Production: whitelist the deployed frontend origin only
- Never: `Access-Control-Allow-Origin: *` in production

## 5. Testing Philosophy

### Test Pyramid (Enforced)

```
Unit tests        — 70% of tests — Business logic, utilities, hooks, components
Integration tests — 20% of tests — Every API endpoint, every service composition
E2E tests         — 10% of tests — 3-5 critical user flows
```

### Coverage Requirements

| Code Type | Branch Coverage | Notes |
|---|---|---|
| `services/` | 90%+ | This is where correctness matters most |
| `routes/` | Every success + error + auth path | Every response code tested |
| `repositories/` | All query methods | Test against a real database (test container) |
| `shared/utils/` | 90%+ | Edge cases and boundary values |
| `components/` | All render states + interactions | Loading, error, empty, populated |
| `hooks/` | All state transitions | Initial, update, cleanup |

### Testing Stack

- **Unit/Integration**: Vitest (fast, Jest-compatible)
- **Component tests**: Testing Library (render, interact, assert)
- **API tests**: Supertest (HTTP assertions without running server)
- **E2E**: Playwright (cross-browser, reliable)
- **Database tests**: Test containers or in-memory Postgres

### Test Conventions

- Test files: `*.test.ts` or `__tests__/filename.test.ts` co-located with source
- Describe block per function/component: `describe('functionName', () => {})`
- Test naming: `it('should [expected] when [condition]', () => {})`
- AAA pattern: Arrange → Act → Assert
- Reset state between tests (database transactions, mock reset)

### What We Test

- **Test behavior, not implementation.** If you refactor the internals and the tests pass, they're good tests. If they fail, they're testing implementation details.
- **Test the contract, not the code.** What does this function/module/endpoint promise to do? Test that promise.
- **Test edge cases.** Empty input, maximum input, boundary values, concurrent access.
- **Test error paths.** Not just the happy path. What happens when the database is down? When the input is invalid? When auth fails?

### What We Don't Test

- Trivial code (getters, setters, simple delegation)
- Third-party library behavior (test your usage, not their code)
- Framework wiring (unless it contains custom logic)
- Private methods (test through public API)
- Implementation details (internal state, private functions)

## 6. Database Standards

### Schema Conventions

- **Tables**: plural, snake_case — `users`, `order_items`
- **Columns**: singular, snake_case — `created_at`, `email_address`
- **Primary keys**: `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- **Foreign keys**: `{table}_id` — `user_id REFERENCES users(id) ON DELETE CASCADE`
- **Timestamps**: `TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- **Soft deletes**: `deleted_at TIMESTAMPTZ` (nullable)
- **Migrations**: Drizzle Kit — versioned, forward-only, tested on staging

### Query Standards

- All queries via repository layer (`src/api/repositories/`)
- Always parameterized — never string concatenation
- Select specific columns — never `SELECT *`
- Paginate list queries — never unbounded
- Timeout on all queries (default 10s)
- Use transactions for multi-statement operations

## 7. AI Engineering Integration

This platform is built for AI-first development. The OpenCode framework is the engineering layer.

### How AI Agents Work With This Platform

1. **Every project loads the platform specification.** The engineering handbook and platform spec are always in the agent's context via `instructions` in `opencode.jsonc`.
2. **Agents follow the same standards as humans.** No exception for AI-generated code. Same lint rules, same test requirements, same review process.
3. **The agent hierarchy handles all work.** Orchestrator classifies and dispatches, Analyst explores, Builder implements, Reviewer validates.
4. **All code, documentation, and decisions follow this specification.** If the platform spec says "use Drizzle ORM", agents use Drizzle ORM. No debate.
5. **State management bridges sessions.** `state/phase.json` tracks progress. Agents resume where they left off.

### AI-Specific Rules

- AI-generated code must pass the same CI checks as human-written code
- AI agents must write tests before or alongside implementation
- Every AI change must include a `state/decisions.md` entry if it introduces new patterns
- The Reviewer agent must review every Builder agent's output
- AI agents must never modify `opencode.jsonc`, `tui.jsonc`, or `AGENTS.md` without explicit instruction
- AI agents must never commit secrets, credentials, or `.env` files

## 8. Deployment & Infrastructure

### Environment Strategy

| Environment | Purpose | Data | Scale |
|---|---|---|---|
| **Development** | Local development | Synthetic/seed data | Single instance |
| **Staging** | Pre-production validation | Anonymized production samples | Single instance |
| **Production** | Live users | Real data | Scaled per load |

### Docker Compose (Local Development)

```yaml
services:
  api:     # Backend on :3000
  web:     # Frontend on :5173 (hot reload)
  db:      # PostgreSQL on :5432
  redis:   # Redis on :6379
```

### CI/CD Pipeline

```
Push → Lint → Typecheck → Unit Tests → Build → 
  → Deploy Staging → Integration Tests → E2E Tests → 
  → Deploy Production → Smoke Tests
```

- Every step must pass before the next
- Failed step blocks the pipeline
- Pipeline config is in `.github/workflows/`
- Secrets via GitHub Secrets

### Production Readiness

Before deploying to production, verify:
- [ ] All tests pass (unit, integration, E2E)
- [ ] Database migrations tested on staging
- [ ] Health endpoints respond: `/health`, `/health/ready`
- [ ] Structured logging with correlation IDs
- [ ] Error rate alerting configured
- [ ] Database backups configured and tested
- [ ] Security scan: no critical/high CVEs
- [ ] Rollback plan documented

## 9. Operational Standards

### Logging

Every log entry: `{ timestamp, level, message, service, correlationId, environment }`

| Level | When |
|---|---|
| `error` | Requires human attention (DB down, payment failed) |
| `warn` | Might need attention (retry queue growing, disk 80%) |
| `info` | Business events (user registered, order placed, deploy completed) |
| `debug` | Diagnostic (development only) |

### Metrics (Every Service)

- **Rate** — requests/second per endpoint
- **Errors** — error rate per endpoint
- **Duration** — p50, p95, p99 latency

### Health Checks

- `GET /health` → liveness (is the process alive?)
- `GET /health/ready` → readiness (can it handle requests? DB connected? Redis available?)

### Error Handling

Every error gets:
1. A correlation ID (UUID v4) — generated at request entry, propagated through all downstream calls
2. Structured logging with full context
3. A user-safe response (no stack traces, no internal details)
4. An alert if the error rate exceeds baseline (1% threshold)

## 10. Development Workflow

### Branch Strategy

```
main          ← Production. Protected. Deploys automatically.
├── staging   ← Pre-production. Auto-deployed.
└── feature/* ← Feature branches. Merged via PR to staging.
    └── fix/* ← Bug fix branches.
```

### Commit Convention

```
type(scope): description

feat(auth): add refresh token rotation
fix(api): handle null user in profile response
refactor(db): extract query builder to repository layer
docs(readme): update setup instructions
test(users): add integration tests for user routes
chore(deps): update typescript to 5.5
```

### PR Requirements

- [ ] Linked to an issue or task
- [ ] All CI checks pass (lint, typecheck, test)
- [ ] Reviewed by at least one reviewer (human or AI reviewer agent)
- [ ] UI changes include screenshots
- [ ] API changes include updated documentation
- [ ] Database changes include migration files
- [ ] Breaking changes noted in PR description

## Appendix: Technology-Specific Extensions

The following documents extend this specification for specific technology choices. They are loaded when the project uses that technology:

- `eng-backend` → Backend service patterns (general)
- `eng-backend-hono` → Hono-specific implementation (to be created)
- `eng-backend-express` → Express-specific implementation (to be created)
- `eng-frontend` → Frontend component patterns (general)
- `eng-frontend-react` → React-specific implementation (to be created)
- `eng-frontend-nextjs` → Next.js-specific implementation (to be created)
- `eng-database` → Database standards (uses Drizzle + PostgreSQL by default)
