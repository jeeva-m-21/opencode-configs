---
name: eng-architecture
description: Software architecture principles, patterns, decision framework, and project structure standards for this platform
license: MIT
compatibility: opencode
metadata:
  domain: architecture
  audience: all
  priority: foundational
  extends: eng-platform
---

## Architecture Principles

1. **Separate concerns.** Each module has a single, well-defined responsibility.
2. **Depend on abstractions, not implementations.** Use interfaces and dependency injection.
3. **Favor composition over inheritance.** Compose behavior through delegation.
4. **Keep the core domain pure.** Business logic is free of framework dependencies.
5. **Design boundaries around data ownership.** Services own their data.

## Platform Architecture

This platform follows a **layered architecture** within a **modular monolith**:

```
Presentation (routes/)  →  Application (services/)  →  Domain (models/)  →  Infrastructure (repositories/)
```

- **routes/** — HTTP handlers. Validate input, call service, format response. Framework-dependent.
- **services/** — Business logic. Framework-agnostic. Contains the application's value.
- **repositories/** — Data access. All database queries live here.
- **models/** — Domain types, enums, constants. Pure TypeScript.
- **middleware/** — Cross-cutting concerns: auth, logging, validation, error handling.

### Shared Layer

`src/shared/` contains code used by both `api/` and `web/`:
- **types/**: TypeScript interfaces and type guards
- **validation/**: Zod schemas (single source of truth for validation rules)
- **constants/**: Shared enums and constants
- **utils/**: Pure utility functions with no framework dependencies

This eliminates duplication between frontend validation and backend validation.

## Project Structure

Every project follows the structure defined in `docs/platform-specification.md`. Key rules:

1. `routes/` never contains business logic (max 20 lines)
2. `services/` never imports HTTP types (framework-agnostic)
3. `repositories/` contain all SQL (no raw queries in services)
4. `shared/` is pure (no React, no Express, no framework code)
5. `components/ui/` has no business logic (rendering only)
6. Tests co-located with source in `__tests__/`

## When to Extract Services

Start as a **single-process application** with the layered structure above. Extract to microservices only when:
- Independent deployment velocity is required
- Different scaling requirements exist
- Different technology stacks are justified
- Team autonomy demands separate services

The monolith is not a stepping stone — it's the optimal architecture for most applications. Split only when the pain of not splitting exceeds the pain of distributed systems.

## Decision Framework

When making an architectural decision:
1. Identify the problem and constraints
2. List viable options (at least 2)
3. Evaluate trade-offs (complexity, performance, maintainability)
4. Choose the simplest option that satisfies requirements
5. Document in `state/decisions.md`: context, decision, rationale, consequences

## Anti-Patterns (Platform-Specific)

- Mixing business logic into route handlers
- Raw SQL in services (bypasses repository layer)
- Framework dependencies in `src/shared/`
- React imports in `src/api/`
- Express imports in `src/web/`
- Cross-cutting concerns handled per-route instead of in middleware
