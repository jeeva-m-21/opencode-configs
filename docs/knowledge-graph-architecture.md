# Engineering Knowledge Graph Architecture

**Status:** Design Phase
**Version:** 1.0
**Date:** 2026-07-12
**Supersedes:** Document-centric knowledge model (eng-* SKILL.md files)
**Related:** `docs/context-compiler-architecture.md` (compiler integration)

---

## Table of Contents

1. [First Principles: Why Not Documents](#1-first-principles-why-not-documents)
2. [The Knowledge Atom](#2-the-knowledge-atom)
3. [The Four Graphs](#3-the-four-graphs)
4. [Relationship Model](#4-relationship-model)
5. [Storage Architecture](#5-storage-architecture)
6. [Registry Architecture](#6-registry-architecture)
7. [Query Model](#7-query-model)
8. [Versioning Model](#8-versioning-model)
9. [Knowledge Lifecycle](#9-knowledge-lifecycle)
10. [Conflict Detection](#10-conflict-detection)
11. [Validation System](#11-validation-system)
12. [Context Compiler Integration](#12-context-compiler-integration)
13. [Document View Compilation](#13-document-view-compilation)
14. [Metrics System](#14-metrics-system)
15. [Governance Model](#15-governance-model)
16. [Evolution Process](#16-evolution-process)
17. [Extensibility](#17-extensibility)
18. [Migration from Document-Centric Model](#18-migration-from-document-centric-model)
19. [Appendix: Complete Atom Taxonomy](#appendix-complete-atom-taxonomy)

---

## 1. First Principles: Why Not Documents

### 1.1 The Document Problem

Documents are the wrong abstraction for engineering knowledge. They are a **serialization format for humans**, not a **query model for machines**.

| Document-Centric | Atom-Centric |
|---|---|
| One file = many decisions, patterns, rules, examples bundled together | One file = one decision, pattern, rule, or example |
| Implicit relationships (buried in prose) | Explicit relationships (declared in metadata) |
| Versioned as a monolithic blob | Versioned independently per atom |
| "Load the security module" → 600 tokens | "Load atoms AUTH-001, PAT-jwt-rotation" → 200 tokens |
| Redundant content across documents | Single source of truth per atom |
| Can't query: "what depends on JWT?" | `SELECT atoms WHERE depends_on CONTAINS 'AUTH-001'` |
| Human-readable but machine-opaque | Human-readable AND machine-queryable |

### 1.2 The Engineering Knowledge Ontology

Engineering knowledge is not prose. It is a structured graph of:

```
Engineering Knowledge
├── Decisions      — "We chose X over Y because Z"
│   ├── Architecture decisions (ADR)
│   ├── Technology choices
│   └── Trade-off analyses
│
├── Patterns       — "Here's how to implement X correctly"
│   ├── Implementation patterns
│   ├── Design patterns
│   └── Anti-patterns (what NOT to do)
│
├── Rules          — "X is non-negotiable"
│   ├── Structural rules (layering, import boundaries)
│   ├── Security rules (auth, secrets)
│   ├── Quality rules (testing, linting)
│   └── Operational rules (deployment, monitoring)
│
├── Capabilities   — "The system can do X"
│   ├── Composable engineering abilities
│   ├── Hierarchical (auth → JWT → rotation)
│   └── The primary query index
│
├── Examples       — "Here is a concrete implementation"
│   ├── Reference implementations
│   ├── Code snippets
│   └── Template files
│
└── Relationships  — "X depends on Y, conflicts with Z, replaces W"
    ├── Dependency edges
    ├── Conflict edges
    ├── Supersede edges
    └── Composition edges
```

### 1.3 Design Principles

| Principle | Meaning |
|---|---|
| **Atomicity** | One atom = one unit of knowledge. No bundling. |
| **Explicitness** | All relationships are declared, never implied. |
| **Queryability** | Every atom is findable by capability, type, status, and relationships. |
| **Versionability** | Atoms evolve independently with semantic versioning. |
| **Composability** | Documents are compiled views. Atoms are the source of truth. |
| **Determinism** | Same query → same set of atoms. No LLM interpretation needed. |
| **Immutability** | Once published, an atom's past versions are never modified. Only new versions supersede. |
| **Providence** | Every atom has an author, creation date, and evidence trail. |

---

## 2. The Knowledge Atom

### 2.1 Definition

An **atom** is the smallest reusable, independently versioned, composable unit of engineering knowledge. It is self-contained: reading it requires no other context. It is self-describing: its metadata declares what it is, what it depends on, and where it fits in the knowledge graph.

### 2.2 Atom Types

| Type | Symbol | Description | Example |
|---|---|---|---|
| `decision` | `DEC` | An architectural decision or trade-off analysis | "JWT with rotating refresh tokens" |
| `pattern` | `PAT` | A reusable implementation pattern or anti-pattern | "Repository pattern with Drizzle ORM" |
| `rule` | `RUL` | A non-negotiable constraint | "routes/ never contains business logic" |
| `example` | `EXM` | A concrete reference implementation | "Complete auth middleware with JWT verification" |
| `capability` | `CAP` | A composable engineering ability | "Authentication", "API Design" |

### 2.3 Atom Schema

```yaml
# Every atom is a Markdown file with this YAML frontmatter.
# The YAML is machine-parsed; the Markdown body is human-read.

---
# IDENTITY
id: string                    # Globally unique. Format: {TYPE}-{NNN} or {TYPE}-{slug}
                              # Examples: DEC-AUTH-001, PAT-jwt-rotation, RUL-route-purity
type: decision | pattern | rule | example | capability

# CONTENT
title: string                 # Short human-readable title (1 line)
description: string           # 1-3 sentence summary used in search results

# CLASSIFICATION
capabilities: string[]        # Capabilities this atom provides knowledge about
                              # Example: ["authentication", "authorization"]
tags: string[]                # Freeform tags for supplementary search
domain: string                # Primary engineering domain
                              # One of: architecture, backend, frontend, database,
                              #         security, testing, deployment, observability,
                              #         performance, ai-engineering, documentation

# LIFECYCLE
status: draft | proposed | accepted | active | superseded | deprecated | rejected
version: string               # Semver: MAJOR.MINOR.PATCH
created: ISO8601
updated: ISO8601
author: string                # Person or system that created this atom
reviewers: string[]           # People who reviewed this atom

# RELATIONSHIPS
dependencies:
  requires: string[]          # Atom IDs this atom hard-depends on
  optional: string[]          # Atom IDs that enhance but aren't required

supersedes: string[]          # Atom IDs this atom replaces
superseded_by: string | null  # Atom ID that replaces this atom (if status=superseded)

conflicts_with: string[]      # Atom IDs incompatible with this atom
related_to: string[]          # Atom IDs with a non-binding relationship

# PATTERNS (decision-type atoms only)
implements:                   # How to implement this decision
  patterns: string[]          # Pattern atom IDs

# QUALITY
confidence: high | medium | low
                              # How confident are we in this decision/pattern?
evidence: string[]            # URLs, documents, benchmarks supporting this atom
rationale: string             # (inline in frontmatter or in the Markdown body)

# COMPILER HINTS
priority: required | recommended | contextual
                              # required = always include when capability matches
                              # recommended = include when budget allows
                              # contextual = include only when explicitly relevant
token_estimate: number        # Pre-computed token count for budget planning
audience: string[]            # Agent types that benefit: [builder, reviewer, orchestrator, etc.]

# METADATA
platform_version: string      # Framework version this atom was authored against
deprecated_in_favor_of: string | null  # Suggested replacement (if deprecated)
removal_date: ISO8601 | null  # When deprecated content should be removed
---

# {title}

{Markdown body — rationale, implementation details, examples, constraints}
```

### 2.4 Atom Example: Decision

```yaml
---
id: DEC-AUTH-001
type: decision
title: JWT Access Tokens with Rotating Refresh Tokens
description: Use short-lived JWT access tokens (15 min) paired with opaque rotating refresh tokens (7 days) for stateless authentication with revocation capability.
capabilities: [authentication, authorization, token-management]
tags: [jwt, refresh-token, token-rotation, replay-detection]
domain: security
status: active
version: 1.2.0
created: 2026-01-15
updated: 2026-07-01
author: platform-team
reviewers: [security-lead, backend-lead]
dependencies:
  requires: [DEC-SECRET-001, PAT-bcrypt-hashing]
  optional: [DEC-RATE-LIMIT-001]
supersedes: [DEC-AUTH-000]
superseded_by: null
conflicts_with: [DEC-SESSION-001]
related_to: [DEC-CORS-001, PAT-middleware-ordering]
implements:
  patterns: [PAT-jwt-rotation, PAT-refresh-token, PAT-auth-middleware]
confidence: high
evidence:
  - https://auth0.com/docs/secure/tokens/refresh-tokens/refresh-token-rotation
  - https://owasp.org/www-project-web-security-testing-guide/
priority: required
token_estimate: 85
audience: [builder, reviewer, security-auditor, orchestrator]
platform_version: 1.0.0
---

# JWT Access Tokens with Rotating Refresh Tokens

## Decision

Use short-lived JWT access tokens (15-minute expiry) paired with opaque rotating refresh tokens (7-day expiry, single-use) for stateless authentication with built-in revocation.

## Rationale

Short-lived access tokens eliminate the need for server-side token blacklists on every request — the token either validates or it doesn't. Pairing with rotating refresh tokens provides a revocation mechanism: if a refresh token is reused (replay attack), the entire token family is invalidated.

## Alternatives Considered

**DEC-SESSION-001: Server-side sessions**
Rejected because: Requires shared session store for horizontal scaling. Adds latency to every authenticated request. Doesn't align with our stateless-first API design.

**OAuth2-only with third-party provider**
Not rejected, deferred. May be offered as an option in the future but the platform starts with first-party JWT auth.

## Implementation

Access tokens: RS256-signed JWT, 15-minute expiry. Contains `{ sub, role, iat, exp }`.
Refresh tokens: Opaque UUID stored in `refresh_tokens` table with `family_id` for rotation tracking.
Replay detection: If a consumed refresh token is presented again, invalidate the entire `family_id`.

See: PAT-jwt-rotation, PAT-refresh-token, PAT-auth-middleware.
Example: EXM-auth-flow.ts

## Constraints

- Access tokens never stored client-side (memory only for web, Keychain/Keystore for mobile)
- Refresh tokens stored in HttpOnly, Secure, SameSite=Strict cookies
- Token family invalidation must be atomic (database transaction)
```

### 2.5 Atom Example: Rule

```yaml
---
id: RUL-route-purity
type: rule
title: Route handlers must not contain business logic
description: Route handler functions (in src/api/routes/) must only validate input, call a service, and format the response. Maximum 20 lines per handler.
capabilities: [api-design, backend-service]
tags: [route, handler, architecture, layering]
domain: architecture
status: active
version: 1.0.0
created: 2026-01-01
updated: 2026-01-01
author: platform-team
reviewers: [architecture-lead]
dependencies:
  requires: [RUL-service-isolation, RUL-repository-encapsulation]
  optional: []
supersedes: []
superseded_by: null
conflicts_with: []
related_to: [DEC-LAYERED-ARCH-001]
priority: required
token_estimate: 40
audience: [builder, reviewer]
platform_version: 1.0.0
---

# Route Handler Purity

## Rule

Every route handler in `src/api/routes/` must:
1. Validate input using Zod schemas from `src/shared/validation/`
2. Call exactly ONE service method
3. Format the response using the standard envelope
4. Be at most 20 lines long (excluding imports and blank lines)

## Why

Routes are the HTTP boundary. Making them thin ensures:
- Business logic is testable independent of HTTP framework
- Route files remain readable at a glance
- The same service can be used by REST, GraphQL, or CLI without modification
- New team members can understand any route immediately

## Violations

If a route handler exceeds 20 lines or contains business logic, extract the logic into the service layer. This rule is enforced by code review (Reviewer agent checks it).
```

### 2.6 Atom Example: Pattern

```yaml
---
id: PAT-jwt-rotation
type: pattern
title: JWT Token Rotation Pattern
description: Implementation pattern for JWT access token creation, refresh token rotation, and token family invalidation using Drizzle ORM and PostgreSQL.
capabilities: [authentication, token-management]
tags: [jwt, rotation, refresh, drizzle, postgresql]
domain: backend
status: active
version: 1.1.0
created: 2026-02-01
updated: 2026-06-15
author: backend-team
reviewers: [security-lead]
dependencies:
  requires: [DEC-AUTH-001, PAT-repository, PAT-auth-middleware]
  optional: [PAT-error-handling]
supersedes: []
superseded_by: null
conflicts_with: []
related_to: [PAT-refresh-token, EXM-auth-flow]
priority: required
token_estimate: 120
audience: [builder]
platform_version: 1.0.0
---

# JWT Token Rotation Pattern

## Purpose

Implement token rotation securely using the `refresh_tokens` table with family-based invalidation.

## When to Use

When implementing authentication for any API endpoint. This is the standard pattern for the platform.

## When Not to Use

- Public endpoints (no auth needed)
- Service-to-service communication (use API keys, not JWT)
- WebSocket connections (use connection-scoped tokens)

## Database Schema

Table: `refresh_tokens`
- `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE`
- `family_id UUID NOT NULL` — groups tokens in a rotation family
- `token_hash TEXT NOT NULL` — SHA-256 hash of the refresh token
- `expires_at TIMESTAMPTZ NOT NULL`
- `consumed_at TIMESTAMPTZ` — NULL until used
- `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`

Index: `(family_id, consumed_at)` for fast invalidation queries.

## Rotation Flow

1. Login: Create access token (15 min) + refresh token (7 day). Store refresh token hash in `refresh_tokens` with new `family_id`.
2. Refresh: Verify refresh token hash exists, is not expired, `consumed_at IS NULL`. If valid: mark as consumed (`consumed_at = NOW()`), issue new access + refresh tokens in same `family_id`.
3. Replay detection: If refresh token hash exists but `consumed_at IS NOT NULL` → token was already used → invalidate entire `family_id` (DELETE all tokens with that `family_id`). Return 401 with `TOKEN_REPLAY` error code.

## Repository Pattern

See PAT-repository for the general pattern. The refresh token repository must provide:
- `createToken(userId, familyId, tokenHash, expiresAt)`
- `consumeToken(tokenHash)` — marks as consumed
- `invalidateFamily(familyId)` — deletes all tokens in family
- `findValidToken(tokenHash)` — finds unconsumed, unexpired token

All operations must be in a transaction when consuming + creating new tokens.

## Tradeoffs

| Pro | Con |
|---|---|
| Stateless auth for access tokens (no DB lookup per request) | Requires DB lookup on every refresh |
| Built-in replay detection | Token family invalidation logs out all devices sharing a family |
| Industry standard | Refresh token table grows unbounded (mitigated by TTL cleanup job) |
```

### 2.7 Why Atoms Replace Documents

```
BEFORE (document-centric):
  eng-security.md  ──contains──►  JWT pattern + bcrypt rules + CORS + RBAC + input validation + ...
  Compiler loads: ALL of eng-security.md (600 tokens)
  Actual need:    JWT rotation pattern only (120 tokens)
  Waste:          480 tokens of irrelevant security knowledge

AFTER (atom-centric):
  DEC-AUTH-001    ──requires──►  PAT-jwt-rotation
  Compiler loads: DEC-AUTH-001 (85 tokens) + PAT-jwt-rotation (120 tokens)
  Actual need:    Exactly what's loaded
  Waste:          0 tokens

Savings: 480 tokens per compilation where only JWT is needed.
Across 100 compilations: 48,000 tokens saved.
```

---

## 3. The Four Graphs

The knowledge system is a single graph with four overlapping subgraphs. Atoms can belong to multiple subgraphs simultaneously.

### 3.1 Decision Graph

Purpose: Capture WHY the platform works the way it does.

```
                    ┌─────────────────────┐
                    │   DEC-LAYERED-001   │
                    │  "Layered Monolith" │
                    │  confidence: high   │
                    └─────────┬───────────┘
                              │
            ┌─────────────────┼─────────────────┐
            │                 │                 │
            ▼                 ▼                 ▼
   ┌────────────────┐ ┌──────────────┐ ┌────────────────┐
   │  DEC-AUTH-001  │ │ DEC-API-001  │ │  DEC-DB-001    │
   │  "JWT + Rotate"│ │ "REST + JSON"│ │ "PostgreSQL"   │
   │  confidence:hi │ │ conf: high   │ │  conf: high    │
   └───────┬────────┘ └──────┬───────┘ └───────┬────────┘
           │                 │                  │
   ┌───────▼────────┐       │         ┌────────▼────────┐
   │DEC-PASSWORD-001│       │         │  DEC-MIGRATE-001│
   │ "bcrypt 12 rd" │       │         │ "Forward-only"  │
   │  conf: high    │       │         │  conf: medium   │
   └────────────────┘       │         └─────────────────┘
                    ┌───────▼────────┐
                    │  DEC-CORS-001  │
                    │ "Origin list"  │
                    │  conf: medium  │
                    └────────────────┘
```

Key properties:
- Every architecture decision is a node
- Decisions link to the decisions they depend on
- Decisions that supersede older decisions explicitly declare it
- Confidence levels signal what's settled vs. what's debatable
- Evidence links ground decisions in external validation

### 3.2 Pattern Graph

Purpose: Capture HOW to implement things correctly.

```
                    ┌─────────────────────┐
                    │   PAT-repository    │
                    │  "Drizzle ORM repo" │
                    └─────────┬───────────┘
                              │ implements DEC-DB-001
            ┌─────────────────┼─────────────────┐
            │                 │                 │
            ▼                 ▼                 ▼
   ┌────────────────┐ ┌──────────────┐ ┌────────────────┐
   │ PAT-jwt-rotate │ │ PAT-paginate │ │ PAT-migrate    │
   │ "JWT rotation" │ │ "Pagination" │ │ "Drizzle Kit"  │
   └───────┬────────┘ └──────────────┘ └────────────────┘
           │
   ┌───────▼────────┐
   │PAT-refresh-tok │
   │ "Token family" │
   └───────┬────────┘
           │
   ┌───────▼────────┐
   │PAT-auth-midware│
   │ "Auth middleware│
   └────────────────┘
```

Key properties:
- Each pattern is independently loadable
- Patterns declare which decisions they implement
- Patterns have explicit dependencies on other patterns
- Patterns have trade-off documentation (when to use, when NOT to use)

### 3.3 Capability Graph

Purpose: The primary lookup mechanism. "What can the system do?"

```
                    ┌─────────────────────────────┐
                    │        ENGINEERING           │
                    └─────────────┬───────────────┘
                                  │
        ┌─────────────┬───────────┼───────────┬─────────────┐
        │             │           │           │             │
        ▼             ▼           ▼           ▼             ▼
  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
  │ SECURITY │ │   API    │ │DATABASE  │ │FRONTEND  │ │QUALITY   │
  │          │ │  DESIGN  │ │          │ │          │ │          │
  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘
       │            │            │            │            │
  ┌────▼────┐  ┌───▼────┐  ┌───▼─────┐  ┌──▼──────┐  ┌──▼──────┐
  │AUTHEN-  │  │REST    │  │SCHEMA   │  │COMPONENT│  │TESTING  │
  │TICATION │  │ENVELOPE│  │DESIGN   │  │DESIGN   │  │         │
  └────┬────┘  └────────┘  └────┬────┘  └────┬────┘  └────┬────┘
       │                        │            │            │
  ┌────▼────┐              ┌───▼─────┐  ┌──▼──────┐  ┌──▼──────┐
  │JWT      │              │QUERY    │  │STATE    │  │UNIT     │
  │ROTATION │              │PATTERNS │  │MANAGE   │  │TESTING  │
  └────┬────┘              └─────────┘  └─────────┘  └─────────┘
       │
  ┌────▼────┐
  │REFRESH  │
  │TOKEN    │
  └─────────┘
```

Key properties:
- Capabilities are hierarchical (parent → child)
- Leaf capabilities map to specific atoms
- The compiler's first query is always: "which capabilities are needed?"
- Capabilities compose: "authentication" implies "JWT" implies "rotation" implies "refresh"
- Agent baselines declare minimum capabilities per agent type

### 3.4 Rule Graph

Purpose: Non-negotiable constraints that apply regardless of decisions or patterns.

```
                    ┌─────────────────────────────┐
                    │    RUL-architectural-core    │
                    │  (always loaded, all agents) │
                    └─────────────┬───────────────┘
                                  │
        ┌─────────────┬───────────┼───────────┬─────────────┐
        │             │           │           │             │
        ▼             ▼           ▼           ▼             ▼
  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
  │RUL-route │ │RUL-srvce │ │RUL-repo  │ │RUL-shared│ │RUL-comp  │
  │ -purity  │ │-isolate  │ │-encapsul │ │-purity   │ │-purity   │
  │ priority │ │ priority │ │ priority │ │ priority │ │ priority │
  │: required│ │: required│ │: required│ │: required│ │: required│
  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘
        │
  ┌──────────┐ ┌──────────┐ ┌──────────┐
  │RUL-auth  │ │RUL-test  │ │RUL-secret│
  │ -gated   │ │ -req     │ │ -mgmt    │
  │ priority │ │ priority │ │ priority │
  │: required│ │: required│ │: required│
  └──────────┘ └──────────┘ └──────────┘
```

Key properties:
- Rules are always `priority: required`
- Rules have no `confidence` field (they are axioms, not hypotheses)
- Rules do not supersede each other (they accumulate)
- Rules are the smallest atoms (20-50 tokens each)
- Rules form the stable prefix in the compiled context

### 3.5 Graph Topology as a Whole

All four graphs overlay on the same set of atoms:

```
                    CAPABILITY GRAPH
                    (what: "authentication")
                          │
                    ┌─────▼──────┐
    DECISION GRAPH  │            │  PATTERN GRAPH
    (why: "JWT") ◄──┤   ATOMS    ├──► (how: "rotation pattern")
                    │            │
                    └─────┬──────┘
                          │
                     RULE GRAPH
                    (constraint: "auth-gated by default")
```

A single compilation resolves atoms from all four graphs simultaneously:
1. "What capabilities are required?" → capability graph
2. "Why these capabilities?" → decision graph
3. "How to implement?" → pattern graph
4. "What constraints apply?" → rule graph

---

## 4. Relationship Model

### 4.1 Relationship Types

```
depends_on ────────►  Hard dependency. If A requires B, B must be loaded.
                      Example: PAT-jwt-rotation requires PAT-repository.

optional ──────────►  Soft dependency. B enhances A but A works without B.
                      Example: DEC-AUTH-001 optionally depends on DEC-RATE-LIMIT-001.

supersedes ────────►  A replaces B. B is now inactive. A is the new authority.
                      Example: DEC-AUTH-001 supersedes DEC-AUTH-000.

superseded_by ─────►  Inverse of supersedes. B is replaced by A.
                      Only present on atoms with status=superseded.

implements ────────►  A pattern or example implements a decision.
                      Example: PAT-jwt-rotation implements DEC-AUTH-001.

conflicts_with ────►  A and B cannot both be active. Compiler must choose.
                      Example: DEC-AUTH-001 conflicts_with DEC-SESSION-001.

related_to ────────►  Non-binding association. Useful for discovery.
                      Example: DEC-AUTH-001 related_to DEC-CORS-001.

validated_by ──────►  A test atom validates a pattern or decision.
                      Example: DEC-AUTH-001 validated_by TST-auth-flow.

referenced_by ─────►  Inverse of all relationship types. Auto-computed by registry.
                      The registry builds inbound edges automatically.

provides ──────────►  A capability atom provides a certain engineering ability.
                      Example: CAP-authentication provides authentication capabilities.

requires_cap ──────►  An atom requires a specific capability to be present.
                      Example: DEC-AUTH-001 requires_cap token-management.
```

### 4.2 Relationship Constraints

```
1. No circular dependencies (enforced at build time)
2. supersedes edges must point to atoms with the same or broader capability scope
3. conflicts_with is always bidirectional (auto-normalized)
4. A supersedes B AND B supersedes C implies A supersedes C (transitive)
5. requires is NOT transitive for compilation (only direct dependencies are loaded)
   BUT requires IS transitive for validation (C must exist if A→B→C)
6. A pattern cannot implement a decision that conflicts with its own dependencies
```

### 4.3 Relationship Example: Authentication Subgraph

```
DEC-AUTH-001 (JWT rotation, active, confidence=high)
│
├─ supersedes: DEC-AUTH-000 (session-based auth, status=superseded)
├─ conflicts_with: DEC-SESSION-001 (server-side sessions, status=deprecated)
├─ requires: DEC-SECRET-001 (secret management), PAT-bcrypt-hashing
├─ optional: DEC-RATE-LIMIT-001 (rate limiting)
├─ implements_patterns: PAT-jwt-rotation, PAT-refresh-token, PAT-auth-middleware
├─ related_to: DEC-CORS-001, PAT-middleware-ordering
│
├─ implemented by:
│   ├─ PAT-jwt-rotation (JWT creation + verification)
│   │   └─ requires: PAT-repository, PAT-error-handling
│   ├─ PAT-refresh-token (token family rotation)
│   │   └─ requires: PAT-jwt-rotation, PAT-repository
│   └─ PAT-auth-middleware (Express/Hono middleware)
│       └─ requires: PAT-jwt-rotation, RUL-route-purity
│
├─ validated by:
│   └─ TST-auth-flow (auth integration test suite)
│       └─ covers: login, refresh, replay detection, expiration
│
└─ example:
    └─ EXM-auth-flow (complete auth implementation)
        └─ references: PAT-jwt-rotation, PAT-refresh-token, PAT-auth-middleware
```

---

## 5. Storage Architecture

### 5.1 Directory Structure

```
.opencode/knowledge/
│
├── registry.json                    # Auto-generated index of all atoms
├── registry.schema.json             # JSON Schema for registry validation
│
├── atoms/                           # Source of truth — one file per atom
│   ├── decisions/                   # Architecture Decision Records
│   │   ├── DEC-AUTH-001.md          # JWT with rotating refresh tokens
│   │   ├── DEC-AUTH-002.md          # Password hashing (bcrypt 12 rounds)
│   │   ├── DEC-DB-001.md            # UUID primary keys
│   │   ├── DEC-DB-002.md            # Soft deletes vs hard deletes
│   │   ├── DEC-LAYERED-001.md       # Layered monolith architecture
│   │   ├── DEC-API-001.md           # REST with JSON envelopes
│   │   ├── DEC-TEST-001.md          # Test pyramid: 70/20/10 split
│   │   └── ...
│   │
│   ├── patterns/                    # Implementation patterns
│   │   ├── PAT-repository.md        # Drizzle ORM repository pattern
│   │   ├── PAT-jwt-rotation.md      # JWT token rotation pattern
│   │   ├── PAT-refresh-token.md     # Refresh token family pattern
│   │   ├── PAT-auth-middleware.md   # Authentication middleware
│   │   ├── PAT-middleware-ordering.md
│   │   ├── PAT-pagination.md        # Offset-based pagination
│   │   ├── PAT-error-handling.md    # Error handling middleware
│   │   ├── PAT-service-layer.md     # Service layer pattern
│   │   ├── PAT-circuit-breaker.md   # Circuit breaker for external calls
│   │   ├── PAT-retry-backoff.md     # Exponential backoff retry
│   │   └── ...
│   │
│   ├── rules/                       # Non-negotiable constraints
│   │   ├── RUL-route-purity.md      # Routes ≤ 20 lines
│   │   ├── RUL-service-isolation.md # Services never import HTTP types
│   │   ├── RUL-repo-encapsulation.md# All SQL in repositories
│   │   ├── RUL-shared-purity.md     # No framework deps in shared/
│   │   ├── RUL-component-purity.md  # No business logic in ui/
│   │   ├── RUL-auth-gated.md        # All endpoints auth-gated by default
│   │   ├── RUL-test-required.md     # Tests alongside implementation
│   │   ├── RUL-secret-management.md # Never commit secrets
│   │   └── ...
│   │
│   ├── capabilities/                # Capability definitions
│   │   ├── CAP-authentication.md    # Authentication capability
│   │   ├── CAP-api-design.md        # API design capability
│   │   ├── CAP-database-schema.md   # Database schema capability
│   │   └── ...
│   │
│   ├── examples/                    # Concrete code examples
│   │   ├── EXM-auth-flow.ts         # Complete auth implementation
│   │   ├── EXM-repository.ts        # Repository pattern example
│   │   ├── EXM-route-handler.ts     # Route handler example
│   │   └── ...
│   │
│   └── tests/                       # Test atoms (validate patterns)
│       ├── TST-auth-flow.md         # Auth integration test requirements
│       └── ...
│
├── views/                           # Compiled documents (auto-generated)
│   ├── eng-platform.md              # Platform specification view
│   ├── eng-security.md              # Security standards view
│   ├── eng-api-design.md            # API design view
│   ├── eng-backend.md               # Backend patterns view
│   ├── eng-frontend.md              # Frontend patterns view
│   ├── eng-database.md              # Database standards view
│   ├── eng-testing.md               # Testing standards view
│   ├── eng-deployment.md            # Deployment view
│   └── ...
│
├── history/                         # Version history (git tags per atom)
│   └── .gitkeep                     # Git provides version history natively
│
└── schemas/
    ├── atom.schema.json             # JSON Schema for atom frontmatter
    ├── atom.schema.yaml             # Human-readable schema reference
    └── registry.schema.json         # JSON Schema for registry structure
```

### 5.2 Why Markdown + YAML Frontmatter

| Format | Human Readable | Machine Parsable | Git Diffable | Supports Metadata | Self-Describing |
|---|---|---|---|---|---|
| Pure JSON | No | Yes | Poor | Yes | Yes |
| Pure YAML | Yes | Yes | Good | Yes | Yes |
| Pure Markdown | Yes | No | Good | No | No |
| **Markdown + YAML FM** | **Yes** | **Yes** | **Good** | **Yes** | **Yes** |
| Database (SQLite) | No | Yes | No | Yes | Yes |

Markdown + YAML frontmatter is the optimal format because:
1. **Human readability**: You can open any atom in any editor and understand it
2. **Machine parsability**: The YAML frontmatter is structured data
3. **Git-friendly**: Diffs are readable, merges are straightforward
4. **Self-describing**: Schema is in the frontmatter; no external lookup needed
5. **No infrastructure**: Just files. No database, no service, no MCP.

### 5.3 Why Not a Database

A graph database (Neo4j, Dgraph) would be the natural fit for a knowledge graph. We deliberately avoid this because:
1. **Portability**: Files work everywhere. No DB to install, configure, or maintain.
2. **Git**: Version control for knowledge is critical. Git is the gold standard.
3. **Simplicity**: Agents read files with the `read` tool. No MCP overhead.
4. **Build-time optimization**: The registry is pre-computed at build time. No runtime queries.
5. **Scale**: Even with 1000 atoms, the total data is <10MB. A database is overkill.

### 5.4 Registry as Build Artifact

The registry (`registry.json`) is NOT manually authored. It is a build artifact generated by scanning all atom files:

```
Build step: registry-build
  1. Glob: .opencode/knowledge/atoms/**/*.md
  2. For each file: parse YAML frontmatter
  3. Validate: atom schema compliance
  4. Index: by id, type, capability, status, relationship
  5. Compute: inbound edges (referenced_by)
  6. Validate: no circular deps, no orphan capabilities
  7. Write: .opencode/knowledge/registry.json
```

This means:
- Atom files are the source of truth
- The registry is always consistent with atom files
- CI can verify registry freshness (fail if atom changed but registry not rebuilt)
- No manual synchronization between files and index

---

## 6. Registry Architecture

### 6.1 Registry Structure

```typescript
interface KnowledgeRegistry {
  version: string                    // Registry schema version
  generated_at: string               // ISO 8601 timestamp
  atom_count: number
  graph_metrics: GraphMetrics

  atoms: {
    [atom_id: string]: AtomEntry     // Fast lookup by ID
  }

  indices: {
    by_type: Record<AtomType, string[]>           // type → atom IDs
    by_capability: Record<string, string[]>        // capability → atom IDs
    by_status: Record<AtomStatus, string[]>         // status → atom IDs
    by_domain: Record<string, string[]>             // domain → atom IDs
    by_priority: Record<string, string[]>           // priority → atom IDs
    by_audience: Record<string, string[]>           // agent type → atom IDs
  }

  graphs: {
    dependencies: AdjacencyList       // requires edges
    supersedes: AdjacencyList         // supersedes edges
    conflicts: ConflictPair[]         // conflicts_with edges
    implements: AdjacencyList         // implements edges
    capabilities: CapabilityTree      // capability hierarchy
  }

  queries: {
    // Pre-computed common queries for 0ms lookup
    active_required: string[]         // All active, required-priority atoms
    core_rules: string[]              // All rule-type atoms
    by_capability_active: Record<string, string[]>  // capability → active atoms
  }
}

interface AtomEntry {
  id: string
  type: AtomType
  title: string
  description: string
  capabilities: string[]
  status: AtomStatus
  version: string
  priority: Priority
  audience: string[]
  token_estimate: number
  file_path: string                  // Relative path to atom file
  content_hash: string               // SHA-256 of full file content
  dependencies: {
    requires: string[]
    optional: string[]
    supersedes: string[]
    superseded_by: string | null
    conflicts_with: string[]
    implements_patterns: string[]
  }
  inbound: {                          // Auto-computed by registry builder
    required_by: string[]
    optional_for: string[]
    superseded_by: string[]
    conflicts_with: string[]
    implemented_by: string[]
    related_to: string[]
  }
  created: string
  updated: string
}
```

### 6.2 Registry Build Step

```
registry-build: (runs as a CI check and local pre-commit hook)
  Input:  .opencode/knowledge/atoms/**/*.md
  Output: .opencode/knowledge/registry.json

  Steps:
  1. Scan all atom files
  2. Parse YAML frontmatter from each
  3. Validate each atom against atom.schema.json
  4. Build indices (by type, capability, status, etc.)
  5. Compute inbound edges (reverse all relationship types)
  6. Build capability hierarchy tree
  7. Detect conflicts (two active atoms with conflicts_with)
  8. Detect orphan atoms (no inbound edges, not a capability)
  9. Detect circular dependencies
  10. Write registry.json
  11. Report: warnings and errors
```

### 6.3 Pre-Computed Queries

The registry pre-computes common queries to enable 0ms lookup:

```jsonc
{
  "queries": {
    "active_required": [
      "RUL-route-purity", "RUL-service-isolation", "RUL-repo-encapsulation",
      "RUL-shared-purity", "RUL-component-purity", "RUL-auth-gated",
      "RUL-test-required", "RUL-secret-management"
    ],
    "core_rules": [
      "RUL-route-purity", "RUL-service-isolation", /* ... */
    ],
    "by_capability_active": {
      "authentication": ["DEC-AUTH-001", "PAT-jwt-rotation", "PAT-refresh-token", "PAT-auth-middleware"],
      "api-design": ["DEC-API-001", "PAT-router-handler", "PAT-middleware-ordering"],
      // ...
    }
  }
}
```

---

## 7. Query Model

### 7.1 Query API

The compiler queries atoms using a type-safe predicate interface:

```typescript
interface AtomQuery {
  // Identity filters
  ids?: string[]                     // Specific atom IDs to include

  // Type filters
  type?: AtomType | AtomType[]       // Filter by type

  // Classification filters
  capabilities?: string | string[]   // Must provide knowledge for these capabilities
  domain?: string | string[]         // Must belong to this domain
  tags?: string | string[]           // Must have these tags

  // Lifecycle filters
  status?: AtomStatus | AtomStatus[] // Must be in this status
  version_constraint?: string        // Semver constraint (e.g., ">=1.0.0 <2.0.0")

  // Quality filters
  priority?: Priority | Priority[]   // Must be this priority
  confidence?: Confidence | Confidence[] // Must have this confidence level

  // Relationship filters
  requires?: string[]                // Must require these atoms
  supersedes?: string[]              // Must supersede these atoms
  conflicts_with?: string[]          // Must conflict with these atoms

  // Compilation filters
  audience?: string | string[]       // Must target this agent type
  max_token_estimate?: number        // Total token budget for results

  // Traversal
  include_dependencies?: boolean     // Recursively include required atoms
  include_implementations?: boolean  // Include patterns implementing matched decisions
  include_superseded?: boolean       // Include superseded atoms (usually false)
  traversal_depth?: number           // Max recursion depth (default: 3)
}

interface QueryResult {
  atoms: AtomEntry[]                 // Matched atoms
  total_tokens: number               // Sum of token_estimate
  query_time_ms: number              // Query execution time
  traversal_depth_reached: number    // Actual recursion depth used
  warnings: string[]                 // Query warnings (e.g., budget exceeded)
}
```

### 7.2 Query Examples

```typescript
// Example 1: "What does a Builder need for JWT authentication?"
registry.query({
  type: ["decision", "pattern"],
  capabilities: ["authentication"],
  status: "active",
  priority: ["required", "recommended"],
  audience: "builder",
  include_dependencies: true,
  include_implementations: true,
  max_token_estimate: 2000
})
// → DEC-AUTH-001, PAT-jwt-rotation, PAT-refresh-token, PAT-auth-middleware,
//   PAT-repository, DEC-SECRET-001, PAT-bcrypt-hashing

// Example 2: "What non-negotiable rules apply to all work?"
registry.query({
  type: "rule",
  status: "active",
  priority: "required"
})
// → All RUL-* atoms (the stable prefix)

// Example 3: "What supersedes DEC-AUTH-000?"
registry.query({
  supersedes: ["DEC-AUTH-000"],
  status: "active"
})
// → DEC-AUTH-001

// Example 4: "What decisions are we not confident about?"
registry.query({
  type: "decision",
  confidence: ["low", "medium"],
  status: "active"
})
// → Decisions that need revisiting

// Example 5: "Traverse the full dependency tree for JWT"
registry.query({
  ids: ["DEC-AUTH-001"],
  include_dependencies: true,
  include_implementations: true,
  traversal_depth: 5
})
// → The entire authentication knowledge subgraph
```

### 7.3 Query Optimization

The registry pre-builds indices to make common queries O(1):

| Query Pattern | Index Used | Complexity |
|---|---|---|
| Query by ID | `atoms[id]` hash map | O(1) |
| Query by type + capability | `indices.by_capability[cap]` filtered | O(n) where n = atoms with that capability |
| Query by status | `indices.by_status[status]` | O(1) |
| Query active + required | `queries.active_required` | O(1) |
| Query core rules | `queries.core_rules` | O(1) |
| Dependency traversal | `graphs.dependencies` BFS | O(V + E) in subgraph |

### 7.4 Recursive Traversal

When `include_dependencies: true`:

```
function resolveWithDependencies(
  atoms: AtomEntry[],
  registry: KnowledgeRegistry,
  depth: number
): AtomEntry[] {
  let resolved = new Set(atoms.map(a => a.id))
  let queue = [...atoms]
  let currentDepth = 0

  while (queue.length > 0 && currentDepth < depth) {
    let atom = queue.shift()!
    for (let depId of atom.dependencies.requires) {
      if (!resolved.has(depId)) {
        let dep = registry.atoms[depId]
        if (dep && dep.status === 'active') {
          resolved.add(depId)
          queue.push(dep)
        }
      }
    }
    currentDepth++
  }

  return [...resolved].map(id => registry.atoms[id])
}
```

---

## 8. Versioning Model

### 8.1 Per-Atom Semantic Versioning

Every atom is independently versioned with Semantic Versioning 2.0.0:

| Version Bump | Trigger |
|---|---|
| **MAJOR** (1.0.0 → 2.0.0) | Breaking change: decision reversed, pattern fundamentally changed, rule scope expanded |
| **MINOR** (1.0.0 → 1.1.0) | New information: added capability, new evidence, expanded rationale, new alternative listed |
| **PATCH** (1.0.0 → 1.0.1) | Non-semantic changes: clarity improvements, typo fixes, metadata updates, reformatting |

### 8.2 Version Constraints in Dependencies

Atom dependencies can specify version constraints:

```yaml
dependencies:
  requires:
    - DEC-AUTH-001          # Always latest active version
    - PAT-repository@^1.0.0 # Compatible with 1.x.x
    - PAT-bcrypt@~1.2.0     # Compatible with 1.2.x
```

The registry resolves these constraints when building the index.

### 8.3 Version History

Git provides version history natively. Each atom file is version-controlled. The git log for an atom file shows its evolution:

```
$ git log --oneline .opencode/knowledge/atoms/decisions/DEC-AUTH-001.md
a1b2c3d DEC-AUTH-001: v1.2.0 — add token family invalidation detail
d4e5f6g DEC-AUTH-001: v1.1.0 — add evidence links to Auth0 docs
g7h8i9j DEC-AUTH-001: v1.0.0 — initial decision: JWT with rotation
```

### 8.4 Version Compatibility Matrix

When atom A v2.0.0 supersedes A v1.0.0:
- A v1.0.0 is marked `status: superseded, superseded_by: A`
- A v2.0.0 is marked `supersedes: [A]`
- The registry keeps both entries (history is preserved)
- Queries with `status: "active"` only return v2.0.0
- Queries with `include_superseded: true` can see the evolution chain

---

## 9. Knowledge Lifecycle

### 9.1 Lifecycle States

```
                    ┌─────────┐
                    │  draft  │  Initial creation. Not visible to queries.
                    └────┬────┘
                         │ author proposes
                         ▼
                    ┌──────────┐
                    │ proposed │  Awaiting review. Visible in dev environments.
                    └────┬─────┘
                         │ reviewer accepts
                         ▼
                    ┌──────────┐
                    │ accepted │  Approved but not yet platform-wide. Gradual rollout.
                    └────┬─────┘
                         │ platform-wide notification
                         ▼
              ┌──────────────────┐
              │     active       │  Live. Returned by all queries. The source of truth.
              └────┬─────────────┘
                   │
        ┌──────────┼──────────┐
        │          │          │
        ▼          ▼          ▼
  ┌──────────┐ ┌──────────┐ ┌──────────┐
  │superseded│ │deprecated│ │ rejected │
  │ replaced │ │  removed │ │  denied  │
  │ by newer │ │  soon    │ │permanently│
  └──────────┘ └──────────┘ └──────────┘
                    │
                    ▼ (after removal_date)
              ┌──────────┐
              │ removed  │  Deleted from active registry. Git history preserved.
              └──────────┘
```

### 9.2 State Transitions

| From | To | Trigger | Required |
|---|---|---|---|
| `draft` | `proposed` | Author submits for review | Atom passes schema validation |
| `proposed` | `accepted` | Reviewer approves | At least 1 reviewer, no blocking comments |
| `proposed` | `rejected` | Reviewer rejects | Reason documented |
| `proposed` | `draft` | Author withdraws | — |
| `accepted` | `active` | Platform-wide notification | CI passes, no conflict with active atoms |
| `active` | `superseded` | New atom supersedes this one | New atom is `active` and declares supersedes |
| `active` | `deprecated` | Platform deprecates without replacement | `deprecated_in_favor_of` set or removal plan documented |
| `deprecated` | `removed` | After `removal_date` passes | No active atoms depend on this |
| `rejected` | `draft` | Author revises and resubmits | Major changes documented |
| Any | `draft` | Author force-resets | Admin permission required |

### 9.3 Lifecycle Rules

1. **Active atoms cannot conflict with other active atoms.** The registry build will fail.
2. **Active atoms cannot depend on non-active atoms (except optional).** The registry build will warn.
3. **Deprecated atoms must set `deprecated_in_favor_of` or `removal_date`.**
4. **Superseded atoms must set `superseded_by`.**
5. **Removed atoms have their files moved to `history/` directory (git preserves history).**
6. **Rejected atoms remain in the repository for reference — they document decisions NOT made.**

---

## 10. Conflict Detection

### 10.1 Conflict Types

```typescript
type ConflictType =
  | "direct"          // Atom A has conflicts_with: [B] and both are active
  | "transitive"      // A conflicts with B, B requires C, and C conflicts with A
  | "supersede_chain" // A supersedes B, B supersedes A (circular supersede)
  | "version"         // A@2.0.0 conflicts with B@1.0.0 but A@1.0.0 didn't
  | "capability"      // Two active atoms provide the same capability with different guidance
  | "dependency"      // A depends on B, but A conflicts with C, and B requires C
```

### 10.2 Detection Algorithm

```
function detectConflicts(registry: KnowledgeRegistry): ConflictReport {
  let conflicts = []

  // Direct conflicts
  for (let atom of registry.activeAtoms) {
    for (let conflictId of atom.dependencies.conflicts_with) {
      let conflictAtom = registry.atoms[conflictId]
      if (conflictAtom && conflictAtom.status === 'active') {
        conflicts.push({
          type: 'direct',
          atoms: [atom.id, conflictId],
          severity: 'error',
          message: `Active atoms ${atom.id} and ${conflictId} declare mutual conflict.`
        })
      }
    }
  }

  // Transitive dependency conflicts
  for (let atom of registry.activeAtoms) {
    let transitiveDeps = resolveTransitiveDeps(atom, registry)
    for (let conflictId of atom.dependencies.conflicts_with) {
      if (transitiveDeps.has(conflictId)) {
        conflicts.push({
          type: 'transitive',
          atoms: [atom.id, conflictId],
          severity: 'error',
          message: `${atom.id} conflicts with ${conflictId} but depends on something that requires it.`
        })
      }
    }
  }

  // Supersede chain conflict
  for (let atom of registry.activeAtoms) {
    for (let supersededId of atom.dependencies.supersedes) {
      let supersededAtom = registry.atoms[supersededId]
      if (supersededAtom?.dependencies.supersedes?.includes(atom.id)) {
        conflicts.push({
          type: 'supersede_chain',
          atoms: [atom.id, supersededId],
          severity: 'error',
          message: `Circular supersede: ${atom.id} ↔ ${supersededId}`
        })
      }
    }
  }

  return { conflicts, hasErrors: conflicts.some(c => c.severity === 'error') }
}
```

### 10.3 Conflict Resolution Strategy

| Conflict | Resolution |
|---|---|
| Two active atoms conflict | One must be superseded, deprecated, or its `conflicts_with` amended |
| Transitive dependency conflict | The dependency chain must be broken — change a dependency or a conflict |
| Capability overlap without conflict declaration | Mark one as superseding, or add `conflicts_with` |
| Dependency chain exceeds MAX_DEPTH | Warn — architecture may be too deeply nested |

---

## 11. Validation System

### 11.1 Validation Layers

```
Layer 1: Schema Validation (at build time)
  - Every atom file parsed against atom.schema.json
  - Missing required fields → error
  - Invalid enum values → error
  - Invalid semver → error

Layer 2: Graph Integrity (at build time)
  - Circular dependencies → error
  - Dependencies on non-existent atoms → error
  - Active atoms with status conflicts → error
  - Supersede chain length > 5 → warning (possible instability)

Layer 3: Capability Coverage (at build time)
  - Capability with no active atoms → warning (gap)
  - Required capability missing from agent baseline → warning
  - Atom providing capability not in capability hierarchy → warning

Layer 4: Compiler Validation (at compile time)
  - Selected atoms exceed token budget → trim or warn
  - Required capability not covered by selected atoms → error
  - Selected atoms contain conflicts → error

Layer 5: CI Validation (in CI pipeline)
  - Registry freshness (registry older than latest atom change) → error
  - Atom files without corresponding registry entries → error
  - Registry entries without corresponding atom files → error
```

### 11.2 Validation Schema

```typescript
interface ValidationReport {
  passed: boolean
  errors: ValidationError[]
  warnings: ValidationWarning[]
  metrics: {
    total_atoms: number
    active_atoms: number
    deprecated_atoms: number
    orphan_atoms: number          // No inbound edges
    conflict_pairs: number
    circular_deps: number
    max_chain_depth: number
    coverage_gaps: string[]       // Capabilities without atoms
  }
}
```

### 11.3 Validation in CI

```yaml
# .github/workflows/knowledge-validation.yml
name: Knowledge Validation
on:
  push:
    paths:
      - '.opencode/knowledge/atoms/**'
      - '.opencode/knowledge/registry.json'
jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Validate atoms
        run: npx knowledge-validate atoms --strict
      - name: Check registry freshness
        run: npx knowledge-validate registry --check-freshness
      - name: Check graph integrity
        run: npx knowledge-validate graph --no-orphans --no-conflicts
      - name: Report coverage
        run: npx knowledge-validate coverage --min-coverage 0.8
```

---

## 12. Context Compiler Integration

### 12.1 New Compilation Pipeline

The updated compiler pipeline replaces document loading with graph traversal:

```
INPUT: task, agent_type, contract, state
  │
  ▼
PASS 1: PARSE
  Extract keywords, intent, scope
  Output: ParsedRequest
  │
  ▼
PASS 2: CAPABILITY RESOLVE
  Map keywords → capabilities using registry indices
  Output: CapabilitySet
  │
  ▼
PASS 3: ATOM QUERY                    ← NEW: replaces "dependency resolve"
  Query registry for atoms matching:
    - capabilities ∈ CapabilitySet
    - status = active
    - type ∈ [decision, pattern, rule]
    - audience includes agent_type
  Output: AtomSet (unsorted)
  │
  ▼
PASS 4: DEPENDENCY TRAVERSAL         ← NEW: graph traversal
  For each atom in AtomSet:
    resolve requires dependencies (recursive, depth-limited)
    resolve implements patterns (for decision atoms)
  Output: ExpandedAtomSet
  │
  ▼
PASS 5: DEDUPLICATE
  Remove duplicate atoms (same ID)
  Remove superseded atoms if their superseder is present
  Merge atoms with identical content
  Output: DeduplicatedAtomSet
  │
  ▼
PASS 6: CONFLICT CHECK               ← NEW: atom-level conflict detection
  Check conflicts_with edges in selected set
  If conflicts found: resolve by priority (keep higher-priority atom)
  Output: ConflictFreeAtomSet
  │
  ▼
PASS 7: COMPRESS
  Apply compression strategies to atom content
  Output: CompressedAtomSet
  │
  ▼
PASS 8: ASSEMBLE
  Order atoms: rules → decisions → patterns → examples
  Build stable prefix (from rule atoms)
  Build dynamic content (from decision + pattern atoms)
  Output: OrderedContext
  │
  ▼
PASS 9: VALIDATE
  Token budget check
  Capability coverage check
  No conflicts, no deprecated content
  Output: ValidatedContext
  │
  ▼
PASS 10: OUTPUT
  Generate final context string with cache metadata
  Output: ExecutionContext
```

### 12.2 Compiler Query Builder

The compiler constructs queries programmatically:

```typescript
function compileContext(request: ParsedRequest): ExecutionContext {
  const registry = loadRegistry()

  // Step 1: Resolve capabilities from keywords + contract + agent baseline
  const capabilities = resolveCapabilities(request)

  // Step 2: Query atoms for these capabilities
  let atoms = registry.query({
    capabilities: [...capabilities],
    status: 'active',
    priority: ['required', 'recommended'],
    audience: request.agentType,
    max_token_estimate: getBudget(request.agentType) * 0.8  // leave 20% headroom
  })

  // Step 3: Add agent baseline rules (always included)
  const coreRules = registry.query({
    type: 'rule',
    status: 'active',
    priority: 'required'
  })
  atoms = atoms.concat(coreRules)

  // Step 4: Traverse dependencies (1 level for patterns, 2 for decisions)
  atoms = registry.resolveTransitive(atoms, {
    maxDepth: 2,
    includePatternImplementations: request.agentType === 'builder'
  })

  // Step 5: Deduplicate
  atoms = deduplicateAtoms(atoms)

  // Step 6: Resolve conflicts
  const conflicts = detectConflictsInSet(atoms, registry)
  if (conflicts.length > 0) {
    atoms = resolveConflicts(atoms, conflicts)
  }

  // Step 7: Compress
  atoms = compressAtoms(atoms, getBudget(request.agentType))

  // Step 8: Separate stable from dynamic
  const ruleAtoms = atoms.filter(a => a.type === 'rule')
  const dynamicAtoms = atoms.filter(a => a.type !== 'rule')

  // Step 9: Assemble
  const stablePrefix = assembleStablePrefix(ruleAtoms, request)
  const dynamicContent = assembleDynamicContent(dynamicAtoms, request)

  // Step 10: Validate and output
  return validateAndOutput(stablePrefix, dynamicContent, getBudget(request.agentType))
}
```

### 12.3 Atom Content Assembly

The compiler assembles atom content into the final context:

```typescript
function assembleDynamicContent(atoms: AtomEntry[], request: ParsedRequest): string {
  const sections: string[] = []

  // Section: Task
  sections.push(`## Task\n${request.task}\n`)

  // Section: Decisions (why we do it this way)
  const decisions = atoms.filter(a => a.type === 'decision')
  if (decisions.length > 0) {
    sections.push(`## Architectural Decisions`)
    for (let atom of decisions) {
      sections.push(loadAtomContent(atom))  // Loads the Markdown body
    }
  }

  // Section: Patterns (how to implement)
  const patterns = atoms.filter(a => a.type === 'pattern')
  if (patterns.length > 0) {
    sections.push(`## Implementation Patterns`)
    for (let atom of patterns) {
      sections.push(loadAtomContent(atom))
    }
  }

  // Section: Files (what to change)
  if (request.relevantFiles?.length > 0) {
    sections.push(`## Relevant Files`)
    for (let file of request.relevantFiles) {
      sections.push(`- ${file}`)
    }
  }

  // Section: Verification
  sections.push(`## Verification`)
  sections.push(`Run lint, typecheck, and tests after implementation.`)

  return sections.join('\n\n')
}
```

### 12.4 Cache Impact

With atom-centric compilation, the stable prefix is composed entirely of rule atoms:

```
STABLE PREFIX (cached):
  RUL-route-purity (40 tokens)
  RUL-service-isolation (35 tokens)
  RUL-repo-encapsulation (30 tokens)
  RUL-shared-purity (25 tokens)
  RUL-component-purity (28 tokens)
  RUL-auth-gated (22 tokens)
  RUL-test-required (20 tokens)
  RUL-secret-management (18 tokens)
  Framework header (40 tokens)
  Project identity (60 tokens)
  ─────────────────────────
  TOTAL: ~318 tokens (smaller, more stable than document-based prefix)

DYNAMIC CONTENT (varies per task):
  DEC-AUTH-001 (85 tokens)
  PAT-jwt-rotation (120 tokens)
  PAT-auth-middleware (70 tokens)
  Task instructions (100 tokens)
  ─────────────────────────
  TOTAL: ~375 tokens (for auth task)

GRAND TOTAL: ~693 tokens vs. ~2,500 with document-centric approach.
```

---

## 13. Document View Compilation

### 13.1 Views as Compiled Output

Documents become compiled views assembled from atoms. They are never authored directly after the initial migration.

```typescript
function compileView(viewName: string, registry: KnowledgeRegistry): string {
  const viewConfig = loadViewConfig(viewName)  // e.g., views/eng-security.config.json

  // Query atoms for this view
  const atoms = registry.query({
    capabilities: viewConfig.capabilities,
    type: viewConfig.include_types,
    status: 'active',
    priority: ['required', 'recommended']
  })

  // Sort by view's section order
  const sorted = sortByViewConfig(atoms, viewConfig.section_order)

  // Assemble markdown document
  return assembleDocument(sorted, viewConfig)
}
```

### 13.2 View Configuration

```jsonc
// views/eng-security.config.json
{
  "title": "Security Standards",
  "description": "Authentication, authorization, input validation, and secrets management standards.",
  "capabilities": ["authentication", "authorization", "input-validation", "secret-management", "security-headers", "security-audit"],
  "include_types": ["decision", "pattern", "rule"],
  "audience": ["builder", "reviewer", "security-auditor"],
  "section_order": [
    { "title": "Architecture Decisions", "filter": { "type": "decision" } },
    { "title": "Implementation Patterns", "filter": { "type": "pattern" } },
    { "title": "Non-Negotiable Rules", "filter": { "type": "rule" } }
  ],
  "output_path": ".opencode/skills/eng-security/SKILL.md"
}
```

### 13.3 View Freshness

Views are rebuilt whenever atoms change. CI verifies that views match atom content. A view that doesn't match its source atoms fails CI.

---

## 14. Metrics System

### 14.1 Knowledge Graph Metrics

```typescript
interface KnowledgeMetrics {
  // Size
  total_atoms: number
  active_atoms: number
  by_type: Record<AtomType, number>
  by_status: Record<AtomStatus, number>
  by_domain: Record<string, number>

  // Graph topology
  total_edges: number
  max_dependency_depth: number
  average_dependencies_per_atom: number
  strongly_connected_components: number   // Should be 0
  orphan_atoms: string[]                  // No incoming edges (except capabilities)
  isolated_subgraphs: number              // Disconnected components > 1

  // Quality
  low_confidence_decisions: string[]      // Decisions to revisit
  deprecated_but_still_referenced: string[]  // Deps on deprecated atoms
  superseded_chain_lengths: number[]      // Long chains may indicate instability
  coverage_gaps: string[]                 // Capabilities without atoms

  // Evolution
  atoms_created_last_30d: number
  atoms_superseded_last_30d: number
  atoms_deprecated_last_30d: number
  average_atom_age_days: number

  // Token
  total_token_estimate: number            // All active atoms combined
  average_atom_tokens: number
  heaviest_atom: { id: string, tokens: number }
  lightest_atom: { id: string, tokens: number }

  // Compilation
  average_compilation_atoms: number       // Atoms per typical compilation
  average_compilation_tokens: number      // Tokens per typical compilation
  cache_hit_ratio: number                 // Stable prefix hit rate
}
```

### 14.2 Metrics Dashboard

A generated metrics report (updated on registry build):

```
Knowledge Graph Metrics — 2026-07-12
─────────────────────────────────────
Atoms: 87 active, 12 superseded, 3 deprecated, 2 draft
Decisions: 23 (3 low confidence)
Patterns:   31 (0 orphaned)
Rules:      18 (all active)
Examples:   12
Capabilities: 8

Graph: 245 edges, max depth 3, 0 cycles
Coverage: 100% (all capabilities have atoms)
Conflicts: 0 (all atom pairs compatible)

Token: 7,250 total, 83 avg per atom
Compilation: 8.3 atoms avg, 680 tokens avg, 72% cache hit rate

Warnings: 2 low-confidence decisions (DEC-CORS-001, DEC-MIGRATE-001)
```

---

## 15. Governance Model

### 15.1 Contribution Rules

| Rule | Description |
|---|---|
| **One atom per file** | Each atom file contains exactly one atom. No bundling. |
| **Evidence required** | Decision atoms must cite at least one piece of evidence. |
| **Alternatives required** | Decision atoms must list at least one alternative considered. |
| **Tradeoffs required** | Pattern atoms must document tradeoffs. |
| **No circular dependencies** | The graph must remain a DAG. |
| **Version before publish** | Active atoms must have version ≥ 1.0.0. |
| **Review before active** | Status `active` requires at least one reviewer approval. |
| **Supersede, don't delete** | Never remove an active atom. Supersede or deprecate it. |
| **Backward references** | When superseding, the new atom must explicitly declare `supersedes`. |

### 15.2 Review Checklist

When reviewing a new or updated atom:

```
- [ ] Atom is self-contained (can be understood without reading other atoms)
- [ ] Atom addresses ONE decision, pattern, rule, or example
- [ ] All declared relationships are accurate and bidirectional where appropriate
- [ ] Dependencies exist and are active (or explicitly optional)
- [ ] No conflict with existing active atoms (or conflict is declared and resolved)
- [ ] Evidence links are valid and relevant
- [ ] Version bump is appropriate for the change
- [ ] Priority level is justified
- [ ] Token estimate is accurate (within 20%)
- [ ] Audience includes all relevant agent types
```

### 15.3 Role-Based Access

| Role | Can Create | Can Review | Can Activate | Can Supersede | Can Deprecate |
|---|---|---|---|---|---|
| **Author** | draft → proposed | — | — | — | — |
| **Reviewer** | — | proposed → accepted/rejected | — | — | — |
| **Maintainer** | — | — | accepted → active | active → superseded | active → deprecated |
| **Admin** | — | — | — | — | deprecated → removed |

### 15.4 Automated Governance

The registry build enforces governance automatically:

```
Pre-build checks (fail the build if violated):
  ✗ Active atom depends on draft atom
  ✗ Active atom conflicts with another active atom
  ✗ Circular dependency detected
  ✗ Atom references non-existent dependency
  ✗ Two atoms provide identical content (hash collision)
  ✗ Capability has zero atoms (coverage gap)

Post-build warnings (report but don't fail):
  ⚠ Low-confidence decision that hasn't been updated in 6 months
  ⚠ Deprecated atom still referenced by active atoms
  ⚠ Atom with 10+ dependencies (possible over-coupling)
  ⚠ Orphan atom (no inbound edges, not a capability)
```

---

## 16. Evolution Process

### 16.1 How Knowledge Evolves

```
LEARNING LOOP:

  1. OBSERVE
     Compiler metrics show a capability is frequently queried
     but has low coverage (few atoms)
     ↓
  2. INVESTIGATE
     Is the capability genuinely uncovered?
     Or are the existing atoms insufficiently granular?
     ↓
  3. CREATE
     Author new atoms to close the gap
     ↓
  4. REVIEW
     Existing active atoms reviewed for conflicts
     ↓
  5. SUPERSEDE
     If new atoms improve on existing ones, supersede the old
     ↓
  6. MEASURE
     Track compilation token counts, cache hit ratios, quality scores
     ↓
  7. REPEAT
```

### 16.2 Evolution Patterns

| Pattern | When | Example |
|---|---|---|
| **Refinement** | Improve an existing active atom | DEC-AUTH-001 v1.0 → v1.1: add evidence links |
| **Supersession** | Replace an old decision with a better one | DEC-AUTH-001 supersedes DEC-AUTH-000 |
| **Decomposition** | Split a large atom into smaller ones | PAT-repository → PAT-repository-query + PAT-repository-write |
| **Composition** | Merge related atoms that are always loaded together | PAT-auth-mid + PAT-jwt-verify → PAT-auth-middleware (compositional) |
| **Deprecation** | Remove a pattern that's no longer recommended | PAT-class-components → deprecated in favor of PAT-functional-components |
| **Discovery** | Add atoms for a newly identified capability | New: CAP-graphql, DEC-graphql-001, PAT-graphql-resolver |

### 16.3 Deprecation Policy

1. **30-day notice**: Deprecated atoms remain queryable for 30 days after deprecation.
2. **Migration path**: `deprecated_in_favor_of` must point to an active replacement.
3. **Automatic cleanup**: After `removal_date`, deprecated atoms are excluded from queries.
4. **History preserved**: Atom files move to `history/` directory, never deleted from git.

---

## 17. Extensibility

### 17.1 Adding New Atom Types

New atom types can be added without modifying existing infrastructure:

```jsonc
// schemas/atom.schema.json — extend the type enum
{
  "type": {
    "enum": ["decision", "pattern", "rule", "example", "capability", "test", "benchmark", "migration"]
  }
}
```

### 17.2 Adding New Relationship Types

```yaml
# New relationship types are added to the schema and registry builder
dependencies:
  requires: string[]
  optional: string[]
  replaces: string[]         # NEW: replaces but doesn't supersede (different lineage)
  composes: string[]         # NEW: this atom is composed of these atoms
  benchmarks: string[]       # NEW: performance benchmarks supporting this decision
```

### 17.3 Custom Atom Validators

Plugins can register custom validators:

```typescript
// .opencode/plugins/knowledge-validators.ts
registry.addValidator({
  name: "trademark-check",
  check: (atom: AtomEntry) => {
    if (atom.content.includes("Kubernetes") && !atom.tags.includes("k8s")) {
      return { passed: false, message: "Tag 'k8s' recommended for K8s content" }
    }
    return { passed: true }
  }
})
```

### 17.4 External Knowledge Sources

The registry can import atoms from external sources:

```yaml
# Atom that references external knowledge
---
id: EXT-OWASP-001
type: decision
title: OWASP Top 10 Compliance
source: external
source_url: https://owasp.org/www-project-top-ten/
imported_at: 2026-07-12
sync_frequency: quarterly
---
```

### 17.5 Multi-Project Knowledge Sharing

Atoms can be shared across projects:

```
Global knowledge (all projects):
  ~/.config/opencode/knowledge/atoms/   ← Framework-level atoms

Project knowledge (this project):
  .opencode/knowledge/atoms/            ← Project-specific atoms

Merged at registry build time.
Project atoms can supersede global atoms.
```

---

## 18. Migration from Document-Centric Model

### 18.1 Migration Strategy

```
Phase 1: Extract (Week 1-2)
  For each eng-* SKILL.md:
    Identify discrete decisions, patterns, rules, examples
    Create atom files in atoms/ directory
    Mark all as status: draft
  Tool: semi-automated extraction (AI-assisted, human-reviewed)

Phase 2: Connect (Week 2-3)
  Add relationships between extracted atoms
  Build initial dependency graph
  Resolve identified conflicts
  Tool: graph visualization to spot orphans and gaps

Phase 3: Build Views (Week 3-4)
  Generate compiled views from atoms
  Compare with original documents
  Verify: no knowledge lost, no contradictions introduced
  Tool: automated diff between original and compiled view

Phase 4: Activate (Week 4)
  Promote atoms from draft → accepted → active
  Update compiler to query atoms instead of loading skills
  Deprecate old eng-* SKILL.md files
  Tool: registry promotion script

Phase 5: Verify (Week 4-5)
  Run full test suite of compilation scenarios
  Compare token counts (before vs after)
  Verify cache hit ratios
  Deploy to staging, then production

Phase 6: Evolve (Ongoing)
  New knowledge added as atoms, not documents
  Documents rebuilt from atoms on every change
  CI enforces document-atom consistency
```

### 18.2 Extraction Mapping

| Current Document | Atom Types | Estimated Atoms |
|---|---|---|
| `eng-platform/SKILL.md` | 8 rules, 4 decisions, 6 patterns | 18 |
| `eng-architecture/SKILL.md` | 2 rules, 3 decisions | 5 |
| `eng-api-design/SKILL.md` | 1 rule, 2 decisions, 4 patterns | 7 |
| `eng-backend/SKILL.md` | 3 rules, 2 decisions, 5 patterns | 10 |
| `eng-frontend/SKILL.md` | 2 rules, 1 decision, 4 patterns | 7 |
| `eng-database/SKILL.md` | 1 rule, 2 decisions, 3 patterns | 6 |
| `eng-security/SKILL.md` | 3 rules, 4 decisions, 5 patterns | 12 |
| `eng-testing/SKILL.md` | 2 rules, 2 decisions, 3 patterns | 7 |
| `eng-performance/SKILL.md` | 1 rule, 1 decision, 2 patterns | 4 |
| `eng-observability/SKILL.md` | 1 rule, 1 decision, 2 patterns | 4 |
| `eng-deployment/SKILL.md` | 1 rule, 2 decisions, 3 patterns | 6 |
| `eng-error-handling/SKILL.md` | 1 rule, 1 decision, 2 patterns | 4 |
| `eng-refactoring/SKILL.md` | 1 rule, 1 decision, 2 patterns | 4 |
| `eng-documentation/SKILL.md` | 1 rule, 1 decision, 1 pattern | 3 |
| `eng-code-review/SKILL.md` | 1 rule, 1 decision, 1 pattern | 3 |
| `eng-production/SKILL.md` | 1 rule, 1 decision, 1 pattern | 3 |
| `eng-ai-prompt/SKILL.md` | 1 rule, 1 decision, 1 pattern | 3 |
| `eng-ai-context/SKILL.md` | 1 rule, 1 decision, 1 pattern | 3 |
| `eng-ai-mcp/SKILL.md` | 1 rule, 1 decision, 1 pattern | 3 |
| **Total** | | **~112 atoms** |

After deduplication (same rule in multiple documents → one atom): **~70-85 unique atoms**

### 18.3 Backward Compatibility

During migration:
1. Old `skill({ name: "eng-security" })` calls still work — the skill file is a compiled view from atoms.
2. The compiler first checks for the new atom system; falls back to document loading if registry unavailable.
3. Gradual rollout: activate one capability's atoms at a time, not all at once.
4. Feature flag: `KNOWLEDGE_ATOM_MODE=true` enables atom queries; default is document mode until Phase 4 completes.

---

## 19. Appendix: Complete Atom Taxonomy

### 19.1 Core Rules (Always Active)

These 8 rules form the stable prefix. They never change, never deprecate, never supersede.

| ID | Rule |
|---|---|
| `RUL-route-purity` | Route handlers ≤ 20 lines, no business logic |
| `RUL-service-isolation` | Services never import HTTP types |
| `RUL-repo-encapsulation` | All SQL in repositories |
| `RUL-shared-purity` | No framework dependencies in shared/ |
| `RUL-component-purity` | No business logic in ui/ components |
| `RUL-auth-gated` | All endpoints authenticated unless explicitly public |
| `RUL-test-required` | Tests written alongside or before implementation |
| `RUL-secret-management` | Never commit secrets or .env files |

### 19.2 Capability Hierarchy

```
engineering
├── architecture
│   ├── layered-design
│   └── service-extraction
├── api-design
│   ├── rest-conventions
│   ├── response-envelopes
│   ├── input-validation
│   ├── pagination
│   └── error-formatting
├── backend
│   ├── service-layer
│   ├── repository-pattern
│   ├── middleware
│   └── async-processing
├── frontend
│   ├── component-design
│   ├── state-management
│   ├── routing
│   └── api-client
├── database
│   ├── schema-design
│   ├── query-patterns
│   ├── migrations
│   └── transactions
├── authentication
│   ├── jwt-rotation
│   ├── refresh-token
│   ├── password-hashing
│   └── token-storage
├── authorization
│   ├── rbac
│   └── resource-ownership
├── security
│   ├── input-validation
│   ├── secret-management
│   ├── security-headers
│   └── cors
├── testing
│   ├── unit-testing
│   ├── integration-testing
│   ├── component-testing
│   └── e2e-testing
├── deployment
│   ├── docker
│   ├── ci-cd
│   └── environment-strategy
├── observability
│   ├── logging
│   ├── metrics
│   └── health-checks
├── error-handling
│   ├── error-taxonomy
│   └── correlation-ids
├── performance
│   ├── profiling
│   └── caching
├── documentation
│   ├── jsdoc-standards
│   └── adr-format
├── ai-engineering
│   ├── context-engineering
│   ├── prompt-engineering
│   └── mcp-integration
└── refactoring
    └── safe-refactoring-patterns
```

### 19.3 Relationship Type Reference

```typescript
type RelationType =
  // Structural
  | "requires"          // Atom A cannot function without Atom B
  | "optional"          // Atom A benefits from Atom B but works without it
  | "composes"          // Atom A is composed of atoms [B, C, D]

  // Evolutionary
  | "supersedes"        // Atom A replaces Atom B (newer version or better approach)
  | "superseded_by"     // Inverse of supersedes
  | "extends"           // Atom A builds on Atom B without replacing it
  | "generalizes"       // Atom A is a more general form of Atom B

  // Relational
  | "implements"        // A pattern implements a decision
  | "validates"         // A test atom validates a pattern
  | "exemplifies"       // An example demonstrates a pattern
  | "related_to"        // Non-binding association

  // Conflict
  | "conflicts_with"    // Atoms A and B cannot both be active

  // Capability
  | "provides"          // An atom provides knowledge for a capability
  | "subcapability_of"  // Capability hierarchy edge
```

---

*End of Knowledge Graph Architecture Design.*
