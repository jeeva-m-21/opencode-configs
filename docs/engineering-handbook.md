# Engineering Handbook

This is the authoritative source for how software is designed, built, reviewed, tested, documented, secured, deployed, and maintained in this engineering organization. All agents and all projects must follow these standards.

The complete platform specification is at `docs/platform-specification.md`. This handbook provides the principles and knowledge index; the specification provides the implementation details.

### Infrastructure Components

| Component | Document | Description |
|---|---|---|
| **Engineering Ontology** | `docs/engineering-ontology.md` | Definitive 10-type knowledge taxonomy. The schema for ALL atoms — what each type answers, how it behaves, how the compiler treats it. Read this before creating any atom. |
| **Context Compiler** | `docs/context-compiler-architecture.md` | Deterministic context optimization — resolves minimal knowledge for each task, maximizes prompt caching |
| **Knowledge Graph** | `docs/knowledge-graph-architecture.md` | Atom-centric knowledge system — decisions, patterns, constraints, strategies as composable graph nodes |
| **Reflection Engine** | `docs/reflection-engine-architecture.md` | Continuous learning system — observes every execution, accumulates evidence, proposes improvements |
| **Implementation Runtime** | `docs/implementation-runtime.md` | Deterministic code generation — resolves every engineering decision before the Builder runs, produces Implementation IR, the Builder behaves as a compiler backend |

These five components form the core infrastructure. The Ontology defines WHAT knowledge types exist. The Knowledge Graph stores them as atoms. The Context Compiler determines which atoms reach models. The Implementation Runtime pre-resolves every engineering decision into the IIR. The Reflection Engine learns from every execution and proposes improvements.

## Our Platform

**Stack:** TypeScript (strict) / Bun / React 18+ / Next.js or Vite / Hono or Express / PostgreSQL 16+ / Drizzle ORM / Redis / Zod / JWT Auth / Vitest / Docker / GitHub Actions

**Architecture:** Layered monolith — `routes/ → services/ → repositories/` with `src/shared/` for cross-cutting types and validation. Extract to microservices only when the pain of not doing so exceeds the pain of distributed systems.

**Repository:** `src/api/` (backend), `src/web/` (frontend), `src/shared/` (types, validation, utilities), `tests/` (integration, e2e). Tests co-located in `__tests__/` alongside source.

**API:** REST with JSON envelopes. `/api/v1/{resource}`. Structured success: `{ data, meta? }`. Structured error: `{ error: { code, message, details?, correlationId } }`. All endpoints auth-gated by default.

**Auth:** JWT access tokens (15 min) + rotating refresh tokens (7 days). RBAC with `admin`, `user` roles. Passwords: bcrypt (12 rounds).

**Testing:** Vitest + Testing Library + Supertest + Playwright. 90%+ branch coverage on services. All route response codes tested. All render states tested on components.

**CI/CD:** GitHub Actions — lint → typecheck → test → build → deploy staging → integration test → deploy production → smoke test.

## Engineering Principles

1. **Simplicity over cleverness.** The best code is the code that's easiest to understand and change.
2. **Testability is non-negotiable.** If you can't test it easily, the design is wrong.
3. **Fail fast and explicitly.** Errors surface at the earliest point with clear messages.
4. **Design for change.** Optimize for the reader. Clear names, small functions, single responsibilities.
5. **Convention over configuration.** Consistency across the codebase is more valuable than individual preference.
6. **Security by default.** Every input is untrusted. Every endpoint is authenticated unless explicitly public.
7. **Performance is a feature.** Measure before optimizing. Set budgets. Optimize the critical path.
8. **Automate everything repeatable.** Tests, builds, deployments, migrations — all automated, all in version control.
9. **Observability is not optional.** Health checks, structured logs, metrics. No service deploys without them.
10. **Document decisions, not code.** Document WHY behind choices. Code documents WHAT through clear names.

## Execution Contract System

Every engineering task is defined by an execution contract (`state/contract.md`). The contract captures everything downstream agents need — affected files, pattern references, knowledge modules, verification commands, and acceptance criteria — so they never need to re-explore, re-discover, or re-interpret.

The Orchestrator produces the contract during `/plan-feature`. The Builder consumes it. The Reviewer validates against it. No other context is needed.

## Context Compiler

The Context Compiler is the framework's context optimization engine. It sits between the Orchestrator and every model invocation, deterministically constructing the smallest, highest-quality, most cache-friendly execution context possible.

**Architecture:** `docs/context-compiler-architecture.md` — the complete design specification.

**How it works:**
1. The Orchestrator calls the `context-compiler` tool before dispatching any subagent
2. The compiler resolves the minimum required knowledge for the specific task
3. It removes duplicate information, compresses verbose content, and preserves a stable prompt prefix
4. The compiled context is all the subagent needs — no additional exploration or knowledge loading

**Key properties:**
- **Deterministic** — same inputs always produce the same output (no LLM calls)
- **Cache-aware** — stable prefix design maximizes provider prompt caching (up to 90% savings)
- **Capability-driven** — knowledge is selected by required engineering capabilities, not topics
- **Budget-aware** — respects per-agent token budgets, trims context when over budget

**Compilation pipeline:** Parse → Capability Resolve → Dependency Resolve → Atom Expand → Deduplicate → Compress → Assemble → Validate → Output

## Knowledge System

Detailed engineering standards for each domain live in knowledge modules. Agents load only the modules relevant to their current task — either explicitly specified in the execution contract or resolved deterministically by the Context Compiler.

### How Knowledge Is Selected

The Context Compiler resolves knowledge automatically. When you need to manually load:
1. Check if the execution contract specifies which modules to load
2. If the contract is silent, check if the knowledge is in the handbook
3. If not, call `skill({ name: "eng-<domain>" })` to load the relevant module
4. Apply the knowledge to your work
5. Do NOT load knowledge modules preemptively — let the compiler decide

### Knowledge Module Index

| Module | Load When | Content |
|---|---|---|
| `eng-platform` | Any implementation work | **Complete platform specification** — stack, repo structure, API design, auth, testing, deployment, AI integration |
| `eng-architecture` | Designing system structure | Platform architecture patterns, project structure, decision framework |
| `eng-api-design` | Creating or modifying APIs | REST endpoint design, response envelopes, route handler patterns |
| `eng-backend` | Building backend services | Service/repository layering, middleware, error handling, async processing |
| `eng-frontend` | Building UI components, pages | Component design, state management, routing, accessibility |
| `eng-database` | Schema design, queries, migrations | Drizzle ORM conventions, repository pattern, migration strategy |
| `eng-security` | Auth, security, input validation | JWT implementation, RBAC, Zod validation, secrets, headers |
| `eng-testing` | Writing or reviewing tests | Vitest patterns, coverage requirements, test organization |
| `eng-performance` | Optimizing speed, memory | Profiling, measurement, caching, optimization patterns |
| `eng-observability` | Logging, metrics, monitoring | Structured logging, RED metrics, health checks, alerting |
| `eng-deployment` | CI/CD, infrastructure | Docker, GitHub Actions, environment strategy, production checklist |
| `eng-error-handling` | Error handling in any context | Error taxonomy, recovery strategies, logging conventions |
| `eng-refactoring` | Restructuring existing code | Safe refactoring patterns, when to refactor |
| `eng-documentation` | Writing or updating documentation | Doc types, JSDoc standards, maintenance strategy |
| `eng-code-review` | Reviewing any code change | Review checklist, feedback standards, severity levels |
| `eng-production` | Preparing for production | Production readiness checklist, SRE principles |
| `eng-ai-prompt` | Writing prompts for AI agents | Prompt structure, delegation patterns, context budgets |
| `eng-ai-context` | Managing context windows | Caching, compaction, token efficiency |
| `eng-ai-mcp` | Integrating MCP servers | MCP selection, token impact, permission model |
| `eng-context-compiler` | Context compilation internals | Compiler architecture, capability taxonomy, atom model, pipeline design |
| `eng-reflection` | Reflection and evolution | Reflection engine, synthesis engine, improvement candidates, evolution pipeline |

### Loading Strategy by Agent

| Agent | Default Knowledge | Task-Specific |
|---|---|---|
| **Orchestrator** | Handbook (always loaded) | `eng-architecture` for design decisions, `eng-ai-context` for token optimization |
| **Analyst** | None by default | `eng-architecture` when mapping large codebases |
| **Builder** | Handbook principles | `eng-testing` (always), plus domain-specific modules based on task |
| **Reviewer** | Handbook principles | `eng-code-review` (always), `eng-security`, `eng-performance` as needed |
| **Docs-writer** | Handbook principles | `eng-documentation` (always) |
| **Security-auditor** | Handbook principles | `eng-security` (always), `eng-production` for infrastructure review |

### Extending the Knowledge System

To add a new knowledge module:
1. Create `.opencode/skills/eng-<domain>/SKILL.md` following the established format
2. Add it to the index above with description and loading guidance
3. If it supersedes or overlaps existing modules, note the relationship
4. Update agent prompts if the module should be loaded by default for specific agents
