# Engineering Knowledge Ontology

**Status:** Definitive Design — the single source of truth for all knowledge types
**Version:** 2.0
**Date:** 2026-07-12
**Supersedes:** Original 5-type ontology (decision, pattern, rule, example, capability) from `docs/knowledge-graph-architecture.md`

---

## Table of Contents

1. [First Principles: Deriving the Ontology](#1-first-principles-deriving-the-ontology)
2. [The Ten Knowledge Types](#2-the-ten-knowledge-types)
3. [Type Definitions](#3-type-definitions)
4. [Relationship Model](#4-relationship-model)
5. [Compiler Integration](#5-compiler-integration)
6. [ID System](#6-id-system)
7. [Storage Model](#7-storage-model)
8. [Validation Rules](#8-validation-rules)
9. [Lifecycle](#9-lifecycle)
10. [Governance](#10-governance)
11. [Migration from v1](#11-migration-from-v1)
12. [Ontology Validation Tests](#12-ontology-validation-tests)

---

## 1. First Principles: Deriving the Ontology

### 1.1 The Fundamental Test

A knowledge type earns its existence by answering one question that no other type answers. If two types answer the same question, merge them. If one type answers two questions, split it.

### 1.2 The Questions

We start not with categories but with the questions engineering knowledge must answer:

```
When I am engineering software, I ask:

1. "What must I NEVER do?"                  → Constraint
2. "Why did we choose THIS approach?"       → Decision
3. "What principles should guide my choice?" → Guidance
4. "How should I THINK about this problem?" → Strategy
5. "How should I IMPLEMENT this?"           → Pattern
6. "What STEPS do I follow, in order?"      → Procedure
7. "What must I VERIFY before proceeding?"  → Checklist
8. "What does a working version look like?" → Example
9. "What can this system actually DO?"      → Capability
10. "How do I MEASURE success?"             → Metric
```

These ten questions are exhaustive. Every piece of engineering knowledge answers one of them. No piece of engineering knowledge answers two.

### 1.3 Why v1 Was Wrong

The original 5-type ontology (decision, pattern, rule, example, capability) failed because:

| v1 Type | Actually Contains | Problem |
|---|---|---|
| `rule` | Non-negotiable constraints + policies enforced by system | Mixed enforcement domains. Same type, different behavior. |
| `pattern` | Implementation patterns + cognitive strategies + workflows + anti-patterns | Four fundamentally different kinds of knowledge jammed into one type. PAT-sequential-thinking (a cognitive strategy) shares a type with PAT-repository (an implementation pattern). They answer entirely different questions. |
| `decision` | Architecture decisions only | Correct but incomplete — missing structured evidence and alternatives. |
| `example` | Reference implementations | Correct but too loosely coupled to patterns. |
| `capability` | Taxonomy nodes | Correct but underdeveloped. |

The symptom: PAT-sequential-thinking (strategy) and PAT-release-workflow (procedure) and PAT-repository (pattern) all used the same frontmatter schema. The compiler treated them identically. But they serve fundamentally different purposes during compilation.

### 1.4 What Did NOT Become a Type

Several candidates were rejected after applying the uniqueness test:

| Candidate | Why Rejected |
|---|---|
| **Policy** | Merged into Constraint. A policy IS a constraint — the enforcement mechanism (system vs. reviewer) differs but the knowledge type is the same. Distinguished by the `enforcement` field. |
| **Heuristic** | Merged into Guidance. A heuristic ("prefer composition") is guidance. A principle ("simplicity over cleverness") is guidance. They differ in scope, not type. Distinguished by the `strength` field. |
| **Anti-pattern** | Merged into Pattern. An anti-pattern IS a pattern — a pattern of failure. Distinguished by the `intent` field: `do` (pattern) or `avoid` (anti-pattern). |
| **Risk** | Not a standalone type. Risk is a field on any atom type: "what could go wrong if you apply this?" |
| **Assumption** | Not a standalone type. Assumptions are metadata on Decisions: "what are we assuming for this to hold?" |
| **Playbook** | Merged into Procedure. A playbook IS a procedure with conditional branching. Distinguished by the `branching` field. |
| **Template** | Merged into Example. A template IS an example structured for parameterization. |
| **Test** | Merged into Checklist. Test requirements are verification items. |

---

## 2. The Ten Knowledge Types

### 2.1 Complete Type Table

| Code | Type | Question | Intrinsic Nature | Compiler Priority |
|---|---|---|---|---|
| `CON` | **Constraint** | What must never be violated? | Binary. Either followed or violated. No nuance. | 1 — always loaded, forms stable prefix |
| `DEC` | **Decision** | Why was this chosen? | Evidentiary. Must cite evidence and alternatives. | 2 — loaded when capability matches |
| `GUI` | **Guidance** | What values or heuristics guide choices? | Advisory. Allows informed exceptions. | 7 — loaded as supplementary context |
| `STR` | **Strategy** | How should I think about this problem? | Cognitive. Mental framework, not implementation. | 3 — loaded when problem type matches |
| `PAT` | **Pattern** | How should I implement this? | Implementative. Structural template with tradeoffs. | 4 — loaded when capability + audience matches |
| `PRO` | **Procedure** | What ordered steps must I follow? | Temporal. Step sequence with checkpoints. | 4 — loaded for workflow tasks |
| `CHK` | **Checklist** | What must I verify before proceeding? | Verificative. Unordered set of pass/fail gates. | 5 — loaded during verification phases |
| `EXM` | **Example** | What does a working implementation look like? | Illustrative. Concrete reference. Always references another type. | 8 — loaded only when budget permits |
| `CAP` | **Capability** | What can the system do? | Taxonomic. Groups atoms for lookup. Not knowledge content. | — (lookup mechanism, never loaded into context) |
| `MET` | **Metric** | How do I measure success or failure? | Quantitative. Thresholds with warning/failure levels. | 6 — loaded when quality gates referenced |

### 2.2 Visual Summary

```
                    KNOWLEDGE USED BY MODELS
                    =========================
                    │
        ┌───────────┼───────────┐
        │           │           │
        ▼           ▼           ▼
    CONSTRAINTS  DECISIONS   STRATEGIES
    (always)     (capability (problem-type
     non-neg     -matched)   -matched)
        │           │           │
        └───────────┼───────────┘
                    │
        ┌───────────┼───────────┐
        │           │           │
        ▼           ▼           ▼
    PATTERNS    PROCEDURES   CHECKLISTS
    (how to     (steps to    (verify
     implement)  follow)      before)
        │           │           │
        └───────────┼───────────┘
                    │
        ┌───────────┼───────────┐
        │           │           │
        ▼           ▼           ▼
    METRICS     GUIDANCE    EXAMPLES
    (measure    (advisory   (reference
     success)   values)     code)
                    │
    ─ ─ ─ ─ ─ ─ ─ ─ ┼ ─ ─ ─ ─ ─ ─ ─ ─
                    │
    KNOWLEDGE USED FOR LOOKUP
    =========================
                    │
                    ▼
              CAPABILITIES
              (taxonomy, not loaded into context)
```

### 2.3 What Makes Types Distinct

The test: if you changed an atom from type X to type Y, would it feel fundamentally wrong?

```
PAT-repository (Pattern):
  "Here's the Drizzle ORM repository structure. Use it for data access."
  → Answers: "How should I IMPLEMENT data access?"
  → If re-typed as STR-repository (Strategy): Wrong. It's not a mental framework, it's a code structure.

STR-sequential-thinking (Strategy):
  "Decompose the problem, plan the approach, execute stepwise, verify each step."
  → Answers: "How should I THINK about complex tasks?"
  → If re-typed as PAT-sequential-thinking (Pattern): Wrong. It's not a code structure, it's a mental framework.

PRO-release (Procedure):
  "1. Run full test suite. 2. Build artifacts. 3. Deploy to staging. 4. Run smoke tests. 5. Deploy to production."
  → Answers: "What ordered STEPS must I follow to release?"
  → If re-typed as PAT-release (Pattern): Wrong. It's not a reusable structure, it's a sequence of actions.

CHK-deployment (Checklist):
  "Before deploy: all tests pass, DB migrations tested, health endpoints respond, rollback plan documented."
  → Answers: "What must I VERIFY before deploying?"
  → If re-typed as PRO-deployment (Procedure): Wrong. It's verification gates, not ordered steps.
```

---

## 3. Type Definitions

### 3.1 Constraint (CON)

**Question:** What must never be violated?

**Nature:** Binary. A constraint is either followed or violated. There is no "partial compliance." Violation severity is declared but the constraint itself is absolute.

**Compiler behavior:** Always loaded. Forms the stable prefix. Never trimmed under context pressure. The model receives every applicable constraint before any other knowledge type.

**Required frontmatter fields:**
```yaml
enforcement: reviewer | system | ci    # Who/what enforces this?
violation_severity: blocking | warning  # Consequence of violation
scope: always | conditional             # Applies everywhere or context-specific?
condition: string | null                # If scope=conditional, when does it apply?
```

**Example:**
```yaml
id: CON-route-purity
type: constraint
title: Route handlers must not contain business logic
enforcement: reviewer
violation_severity: blocking
scope: always
```

### 3.2 Decision (DEC)

**Question:** Why was this chosen over alternatives?

**Nature:** Evidentiary. A decision must cite what was considered and why alternatives were rejected. Decisions evolve — they are superseded when better evidence emerges. They are never just deleted.

**Compiler behavior:** Loaded when any referenced capability matches the task. Discarded only after Patterns and Strategies under extreme budget pressure.

**Required frontmatter fields:**
```yaml
confidence: high | medium | low
evidence: string[]                     # URLs, documents, benchmarks
alternatives:                          # What else was considered?
  - option: string
    why_rejected: string
rationale: string                      # Why this choice?
```

**Example:**
```yaml
id: DEC-AUTH-001
type: decision
title: JWT Access Tokens with Rotating Refresh Tokens
confidence: high
evidence:
  - https://auth0.com/docs/secure/tokens/refresh-tokens/refresh-token-rotation
alternatives:
  - option: Server-side sessions
    why_rejected: Requires shared session store, adds latency, misaligned with stateless API design
  - option: Long-lived JWT without refresh
    why_rejected: No revocation mechanism, leaked tokens valid until expiry
rationale: Stateless access token validation eliminates per-request DB lookups. Refresh rotation provides revocation.
```

### 3.3 Guidance (GUI)

**Question:** What values, principles, or heuristics should guide my choices?

**Nature:** Advisory. Unlike Constraints, Guidance allows exceptions. Unlike Patterns, Guidance is not implementative — it shapes decisions rather than providing a structural template.

**Compiler behavior:** Loaded as supplementary context. Discarded first under budget pressure. Guidance is "nice to have," not "need to have."

**Required frontmatter fields:**
```yaml
strength: strongly_prefer | prefer | consider
applies_when: string                   # What situations trigger this guidance?
exceptions: string                     # When is it acceptable to not follow this?
```

**Example:**
```yaml
id: GUI-simplicity-first
type: guidance
title: Prefer simplicity over cleverness
strength: strongly_prefer
applies_when: Choosing between multiple valid implementation approaches
exceptions: Performance-critical paths where simplicity demonstrably cannot meet requirements
```

### 3.4 Strategy (STR)

**Question:** How should I think about solving this kind of problem?

**Nature:** Cognitive. A strategy provides a mental framework — a way to approach a problem class. It is not an implementation pattern (which would describe code structure) nor a procedure (which would describe ordered steps). It describes a thinking process.

**Compiler behavior:** Loaded when the problem type inferred from the task matches the strategy's `applies_when`. Discarded after Decisions.

**Required frontmatter fields:**
```yaml
applies_when: string                   # What kind of problem triggers this strategy?
cognitive_steps:                       # The mental framework steps
  - step: string
    purpose: string
```

**Example:**
```yaml
id: STR-sequential-thinking
type: strategy
title: Decompose, Plan, Execute, Verify
applies_when: Task involves multiple steps, unknown code, or architectural decisions
cognitive_steps:
  - step: Decompose the problem into independent sub-problems
    purpose: Identify what can be solved in parallel vs. what has dependencies
  - step: Plan the approach for each sub-problem
    purpose: Determine files, patterns, and verification for each piece
  - step: Execute one sub-problem at a time
    purpose: Make the smallest verifiable change for each piece
  - step: Verify before proceeding to the next sub-problem
    purpose: Localize failures to a single change
```

### 3.5 Pattern (PAT)

**Question:** How should I implement this?

**Nature:** Implementative. A pattern describes a reusable code structure with tradeoffs. It includes BOTH patterns (do this) and anti-patterns (avoid this), distinguished by the `intent` field.

**Compiler behavior:** Loaded when capability + audience matches. Core implementation knowledge.

**Required frontmatter fields:**
```yaml
intent: do | avoid                    # pattern or anti-pattern?
applies_to: string                    # What kind of code does this apply to?
tradeoffs:                            # The honest downsides
  - pro: string
    con: string
```

**Example (Pattern):**
```yaml
id: PAT-repository
type: pattern
title: Drizzle ORM Repository Pattern
intent: do
applies_to: All database access in src/api/repositories/
tradeoffs:
  - pro: Centralized data access, easy schema changes
    con: Extra layer of indirection, simple queries feel verbose
```

**Example (Anti-pattern):**
```yaml
id: PAT-empty-catch
type: pattern
title: Empty Catch Blocks
intent: avoid
applies_to: Any try/catch block
tradeoffs:
  - pro: Suppresses compiler warnings
    con: Hides failures, makes debugging impossible, violates CON-no-empty-catch
```

### 3.6 Procedure (PRO)

**Question:** What ordered steps must I follow?

**Nature:** Temporal. A procedure is a sequence of steps with checkpoints. Unlike a Pattern (spatial structure), a Procedure is temporal — step 2 must happen after step 1. Unlike a Checklist (unordered verification), order matters.

**Compiler behavior:** Loaded when the task type is a workflow (release, deploy, migrate, incident response).

**Required frontmatter fields:**
```yaml
trigger: string                        # What event initiates this procedure?
steps:                                 # Ordered sequence
  - order: number
    action: string
    verification: string               # How to confirm this step succeeded
checkpoints:                           # Gates that must pass
  - after_step: number
    criteria: string[]
rollback: string                       # How to undo if it fails
branching:                             # Conditional paths
  - condition: string
    goto_step: number
```

**Example:**
```yaml
id: PRO-release
type: procedure
title: Production Release Process
trigger: Release is approved and all PRs merged to main
steps:
  - order: 1
    action: Run full test suite
    verification: All tests pass, coverage ≥ 80%
  - order: 2
    action: Build production artifacts
    verification: Docker image builds successfully, size within budget
  - order: 3
    action: Deploy to staging
    verification: Health endpoints return 200, smoke tests pass
  - order: 4
    action: Deploy to production
    verification: Health endpoints return 200, error rate unchanged
  - order: 5
    action: Tag release in git
    verification: Tag exists, release notes published
checkpoints:
  - after_step: 3
    criteria:
      - All integration tests pass against staging
      - E2E tests pass
      - Rollback plan is current
  - after_step: 4
    criteria:
      - Smoke tests pass within 60 seconds
      - Error rate ≤ baseline for 5 minutes
rollback: Revert the deployment, redeploy previous version tag, verify health
```

### 3.7 Checklist (CHK)

**Question:** What must I verify before proceeding?

**Nature:** Verificative. An unordered set of gates. Unlike a Procedure (ordered steps), a Checklist is a flat list — all items must pass, but order doesn't matter. Unlike a Constraint (always applies), a Checklist is triggered by a specific event.

**Compiler behavior:** Loaded during verification phases (review, pre-deployment, testing).

**Required frontmatter fields:**
```yaml
trigger: string                        # When to use this checklist?
items:                                 # Verification items (unordered)
  - description: string
    severity: blocking | advisory       # Does failure block proceeding?
    verification: string                # How to check this item?
```

**Example:**
```yaml
id: CHK-deployment
type: checklist
title: Pre-Production Deployment Checklist
trigger: Before deploying any change to production
items:
  - description: All tests pass (unit, integration, E2E)
    severity: blocking
    verification: CI pipeline shows green on the deploy commit
  - description: Database migrations tested on staging
    severity: blocking
    verification: Migration ran without errors on staging, rollback tested
  - description: Health endpoints respond
    severity: blocking
    verification: GET /health and /health/ready return 200 on staging
  - description: Rollback plan documented
    severity: blocking
    verification: Plan exists in deploy notes, has been reviewed
  - description: Security scan shows no critical/high CVEs
    severity: advisory
    verification: npm audit / bun pm audit shows no critical or high severity
```

### 3.8 Example (EXM)

**Question:** What does a working implementation look like?

**Nature:** Illustrative. An example is always concrete code that demonstrates a Pattern or Procedure. It has no independent existence — it always references another atom type.

**Compiler behavior:** Loaded only when budget permits. Most expendable — the model can infer structure from the Pattern without seeing the Example.

**Required frontmatter fields:**
```yaml
references: string                     # Which Pattern, Procedure, or Decision does this exemplify?
language: string                       # Programming language
framework: string                      # Framework or library
```

**Example:**
```yaml
id: EXM-auth-flow
type: example
title: Complete Authentication Flow Implementation
references: PAT-jwt-rotation
language: typescript
framework: Express
---
# (The example body is the actual code file)
```

### 3.9 Capability (CAP)

**Question:** What can the system do?

**Nature:** Taxonomic. Capabilities are not knowledge content — they are lookup nodes. They group other atoms so the compiler can find them. A capability atom describes what a capability IS; it doesn't contain implementative knowledge.

**Compiler behavior:** Never loaded into model context. Used only for querying: "find all atoms with capability=authentication."

**Required frontmatter fields:**
```yaml
parent: string | null                  # Parent capability in hierarchy
subcapabilities: string[]              # Child capabilities (auto-computed)
required_by: string[]                  # Task types that trigger this capability
```

**Example:**
```yaml
id: CAP-authentication
type: capability
title: Authentication
parent: security
subcapabilities: [token-management, password-hashing, session-management]
required_by: [feature, bug, security]
```

### 3.10 Metric (MET)

**Question:** How do I measure success or failure?

**Nature:** Quantitative. Unlike a Constraint (binary pass/fail), a Metric defines thresholds — a warning level and a failure level. Metrics answer "how good is good enough?"

**Compiler behavior:** Loaded when quality gates are referenced in the task context.

**Required frontmatter fields:**
```yaml
unit: string                           # percentage, milliseconds, count, ratio
thresholds:
  warning: number                      # Alert but don't block
  failure: number                      # Block proceeding
measured_by: string                    # Tool or method (vitest --coverage, lighthouse, custom)
direction: higher_is_better | lower_is_better
```

**Example:**
```yaml
id: MET-coverage-threshold
type: metric
title: Branch Coverage Thresholds
unit: percentage
thresholds:
  warning: 75
  failure: 90
measured_by: vitest --coverage
direction: higher_is_better
```

---

## 4. Relationship Model

### 4.1 Relationship Types

Relationships are declared in the `relationships` block of every atom. They differ from dependencies (`dependencies.requires`) — relationships are semantic connections between atoms of potentially different types.

```yaml
relationships:
  # Structural
  requires: string[]             # Hard dependency. A cannot function without B.
  optional: string[]             # Soft dependency. A benefits from B.
  composes: string[]             # A is composed of atoms [B, C, D]

  # Evolutionary
  supersedes: string[]           # A replaces B. B is now inactive.
  superseded_by: string | null   # B is replaced by A.
  extends: string[]              # A builds on B without replacing.

  # Referential
  implements: string[]           # A pattern/procedure implements a decision.
  exemplifies: string[]          # An example demonstrates a pattern/procedure.
  validates: string[]            # A checklist/metric validates other atoms.
  conforms_to: string[]          # This atom conforms to a constraint.
  guides: string[]               # Guidance shapes how a decision is applied.

  # Conflict
  conflicts_with: string[]       # A and B cannot both be active.
  incompatible_with: string[]    # A should not be used with B.

  # Association
  related_to: string[]           # Non-binding semantic link.
  see_also: string[]             # Related external resources.
```

### 4.2 Cross-Type Relationship Constraints

Certain relationship targets are constrained by type:

| Relationship | Source Can Be | Target Must Be |
|---|---|---|
| `requires` | Any | Any |
| `implements` | PAT, PRO, EXM | DEC, STR |
| `exemplifies` | EXM | PAT, PRO |
| `validates` | CHK, MET | Any |
| `conforms_to` | PAT, PRO, EXM | CON |
| `guides` | GUI | DEC |
| `supersedes` | Same type as target | Same type as source |
| `extends` | Same type as target | Same type as source |
| `conflicts_with` | DEC, PAT, PRO | Same or compatible type |

### 4.3 Transitive Resolution Rules

```
1. requires IS transitive for compilation: A→B→C means load A, B, C.
2. optional is NOT transitive: if A→B(optional)→C, only load A and B.
3. implements is NOT transitive for compilation: a pattern implementing a decision
   does not automatically load the pattern's dependencies. The compiler resolves
   patterns separately after loading decisions.
4. supersedes is transitive: A supersedes B, B supersedes C implies A supersedes C.
5. conflicts_with IS transitive through requires: if A conflicts with B, and C requires B,
   then A conflicts with C transitively.
```

---

## 5. Compiler Integration

### 5.1 Retrieval Priority Order

When the compiler must trim context due to budget pressure, atoms are discarded in this order:

```
LAST TO BE TRIMMED (highest priority)
──────────────────────────────────────
1. CON (Constraints)
   Never trimmed. Form the stable prefix. Always present.

2. DEC (Decisions)
   Trimmed only under extreme pressure after all lower types are exhausted.
   Decisions define WHY — without them, patterns lack authority.

3. STR (Strategies)
   Trimmed when budget < 85%. Strategies are cognitive frameworks.
   Model can function without them but performs better with them.

4. PAT (Patterns) + PRO (Procedures)
   Tied priority. Patterns define HOW to implement. Procedures define steps to follow.
   Trimmed when budget < 70%. These are the core implementation knowledge.

5. CHK (Checklists)
   Trimmed when budget < 60%. Verification gates are important but model
   can infer "run the tests" without seeing the full checklist.

6. MET (Metrics)
   Trimmed when budget < 50%. Quantitative thresholds supplement but
   don't replace qualitative guidance from Constraints and Patterns.

7. GUI (Guidance)
   Trimmed when budget < 35%. Advisory values. "Nice to have."

8. EXM (Examples)
   Trimmed when budget < 20%. Most expendable.
   The model can implement from a Pattern without seeing the Example.

FIRST TO BE TRIMMED (lowest priority)
──────────────────────────────────────
```

### 5.2 Agent-Specific Priority Adjustments

| Agent | Elevates | Depresses |
|---|---|---|
| **Builder** | PAT +2, EXM +1 | STR -1, GUI -1 |
| **Reviewer** | CHK +2, MET +2, CON +1 | STR -1, EXM -1 |
| **Orchestrator** | STR +2, DEC +1, PRO +1 | EXM -1, MET -1 |
| **Analyst** | STR +1, EXM +1 | PRO -1, CHK -1 |
| **Docs-writer** | EXM +1, GUI +1 | MET -1, CHK -1 |
| **Security-auditor** | CHK +2, MET +1, CON +1 | GUI -1, EXM -1 |

### 5.3 Stable Prefix Composition

The stable prefix is composed exclusively of CON atoms with `scope: always`:

```
STABLE PREFIX (identical across all compilations for same agent type):
  - All CON atoms with scope=always
  - Framework identity header
  - Project identity

This prefix must reach 1024+ tokens to trigger Anthropic prompt caching.
CON atoms are designed to be small (20-50 tokens each) so 20-30 of them
will naturally reach the threshold.
```

### 5.4 Compilation Query Flow

```
1. CAPABILITY RESOLVE
   Parse task → keywords → capability matching → set of capabilities

2. CON LOAD (always)
   Load all CON atoms with scope=always.
   Load CON atoms with scope=conditional where condition matches.

3. DEC QUERY
   Query: type=decision, capability ∈ resolved, status=active
   Resolve transitive requires (decisions may depend on other decisions)

4. STR QUERY
   Query: type=strategy, applies_when matches task type/scope

5. PAT + PRO QUERY
   Query: type=pattern, capability ∈ resolved, audience includes agent_type
   Query: type=procedure, trigger matches task type
   Resolve transitive requires + implements

6. SUPPLEMENTARY QUERY (budget-permitting)
   CHK → if task_type == release|deploy|review
   MET → if quality gates referenced
   GUI → if multiple valid approaches exist
   EXM → if budget > 80% unused after all above
```

---

## 6. ID System

### 6.1 ID Format

```
{TYPE_CODE}-{slug}

TYPE_CODE: 3-letter code from the type table
slug: lowercase, hyphenated, unique within type

Examples:
  CON-route-purity
  DEC-AUTH-001                    (numbered sequence for decisions)
  GUI-simplicity-first
  STR-sequential-thinking
  PAT-repository
  PRO-release
  CHK-deployment
  EXM-auth-flow
  CAP-authentication
  MET-coverage-threshold
```

### 6.2 Naming Rules

1. **Constraints**: descriptive slug using domain-term (`CON-route-purity`, `CON-auth-gated`)
2. **Decisions**: domain prefix + sequential number (`DEC-AUTH-001`, `DEC-DB-003`)
3. **Guidance**: principle-as-slug (`GUI-simplicity-first`, `GUI-composition-over-inheritance`)
4. **Strategies**: strategy-name-as-slug (`STR-sequential-thinking`, `STR-root-cause-analysis`)
5. **Patterns**: pattern-name-as-slug (`PAT-repository`, `PAT-circuit-breaker`)
6. **Procedures**: workflow-name-as-slug (`PRO-release`, `PRO-incident-response`)
7. **Checklists**: gate-name-as-slug (`CHK-deployment`, `CHK-code-review`)
8. **Examples**: reference-name-as-slug (`EXM-auth-flow`, `EXM-repository-implementation`)
9. **Capabilities**: domain-name-as-slug (`CAP-authentication`, `CAP-api-design`)
10. **Metrics**: metric-name-as-slug (`MET-coverage-threshold`, `MET-response-time`)

### 6.3 ID Stability

Once assigned, an atom's ID never changes. If the atom's purpose changes significantly, create a new atom with a new ID and supersede the old one. IDs are permanent identifiers for traceability.

---

## 7. Storage Model

### 7.1 Directory Structure

```
.opencode/knowledge/atoms/
├── constraints/                    # CON-*.md
│   ├── CON-route-purity.md
│   ├── CON-auth-gated.md
│   └── ...
├── decisions/                      # DEC-*.md
│   ├── DEC-AUTH-001.md
│   └── ...
├── guidance/                       # GUI-*.md
│   ├── GUI-simplicity-first.md
│   └── ...
├── strategies/                     # STR-*.md
│   ├── STR-sequential-thinking.md
│   └── ...
├── patterns/                       # PAT-*.md
│   ├── PAT-repository.md
│   └── ...
├── procedures/                     # PRO-*.md
│   ├── PRO-release.md
│   └── ...
├── checklists/                     # CHK-*.md
│   ├── CHK-deployment.md
│   └── ...
├── examples/                       # EXM-*.{ts,tsx,js,md}
│   ├── EXM-auth-flow.ts
│   └── ...
├── capabilities/                   # CAP-*.md
│   ├── CAP-authentication.md
│   └── ...
└── metrics/                        # MET-*.md
    ├── MET-coverage-threshold.md
    └── ...
```

### 7.2 File Format

Every atom is a single Markdown file with YAML frontmatter. The frontmatter contains all structured metadata. The Markdown body contains human-readable explanation.

Capability and Example atoms use the same format. Examples may use the file extension of their source language (`.ts`, `.tsx`) with frontmatter embedded.

### 7.3 The Registry

The registry (`state/knowledge-registry.json`) is auto-generated by scanning all atom files. It is a build artifact, never manually edited. It contains:
- Full-text index of all atom metadata
- Pre-computed queries (active constraints, by-capability indices)
- Inbound relationship edges (auto-computed reverse of all declared relationships)
- Conflict detection report
- Coverage report (capabilities without atoms)

---

## 8. Validation Rules

### 8.1 Per-Type Required Fields

| Field | CON | DEC | GUI | STR | PAT | PRO | CHK | EXM | CAP | MET |
|---|---|---|---|---|---|---|---|---|---|---|
| enforcement | ✓ | | | | | | | | | |
| violation_severity | ✓ | | | | | | | | | |
| scope | ✓ | | | | | | | | | |
| confidence | | ✓ | | | | | | | | |
| evidence | | ✓ | | | | | | | | |
| alternatives | | ✓ | | | | | | | | |
| strength | | | ✓ | | | | | | | |
| applies_when | | | ✓ | ✓ | | | | | | |
| cognitive_steps | | | | ✓ | | | | | | |
| intent | | | | | ✓ | | | | | |
| tradeoffs | | | | | ✓ | | | | | |
| trigger | | | | | | ✓ | ✓ | | | |
| steps | | | | | | ✓ | | | | |
| branch | | | | | | ✓ | | | | |
| items | | | | | | | ✓ | | | |
| references | | | | | | | | ✓ | | |
| parent | | | | | | | | | ✓ | |
| thresholds | | | | | | | | | | ✓ |
| direction | | | | | | | | | | ✓ |

### 8.2 Cross-Type Validation

```
1. An atom cannot supersede an atom of a different type.
2. An atom cannot depend on (requires) a CAP atom. CAPs are taxonomy, not content.
3. An EXM atom must reference at least one PAT or PRO atom.
4. A PRO atom's rollback field cannot be empty — every procedure must have undo.
5. A CHK atom must have at least one blocking item.
6. A DEC atom's evidence array cannot be empty.
7. Two active atoms cannot declare mutual conflicts_with.
8. An atom cannot be active if any of its requires dependencies are not active.
```

---

## 9. Lifecycle

### 9.1 Universal States

All atom types share the same lifecycle:

```
draft → proposed → accepted → active → superseded → deprecated → removed
  │                  │          │
  └──────────────────┴──────────┘
              rejected
```

### 9.2 Type-Specific Lifecycle Rules

| Type | Draft→Active Gate | Supersede Behavior | Deprecation Safety |
|---|---|---|---|
| CON | Platform-wide review required. 2+ reviewers. | Rare. Only when the constraint is genuinely wrong, not just "we don't like it anymore." | Never deprecate without a replacement CON. |
| DEC | Evidence review. At least 1 alternative considered. Confidence ≥ medium. | Common. New evidence supersedes old decisions. Chain must be traceable. | Safe — old decisions remain as historical record. |
| GUI | 1 reviewer. Low bar — guidance is advisory. | When community consensus shifts. | Safe — guidance is advisory. |
| STR | Demonstrated effectiveness in ≥3 reflections. | When better strategy emerges. | Safe. |
| PAT | Implementation validated by ≥2 successful usages. | When pattern proves harmful or incomplete. | Must migrate existing code first. |
| PRO | Dry-run on staging. Rollback tested. | When process changes. | Must update runbooks. |
| CHK | 1 reviewer. Items must be verifiable. | When gates change. | Safe — just stops checking. |
| EXM | Must compile and pass tests. | When referenced pattern changes. | Must update or remove. |
| CAP | Taxonomy completeness check (no orphans). | When capabilities are reorganized. | Must reassign child atoms. |
| MET | Benchmark validation (thresholds achievable). | When standards change. | Must update CI configs. |

---

## 10. Governance

### 10.1 Who Can Change What

| Change | Requires |
|---|---|
| Create any atom type | Author + schema validation |
| Promote to active (CON) | 2 reviewers, platform-wide notice |
| Promote to active (DEC, PAT, PRO) | 1 reviewer, evidence attached |
| Promote to active (GUI, STR, CHK, MET) | 1 reviewer |
| Promote to active (EXM) | Compiles + tests pass |
| Promote to active (CAP) | Taxonomy consistency check |
| Supersede CON | 3 reviewers, migration plan, 30-day notice |
| Supersede DEC, PAT, PRO | 1 reviewer, new evidence cited |
| Deprecate any type | Must set deprecated_in_favor_of or removal_date |

### 10.2 The Immutable Set

These specific atoms CANNOT be superseded through the Reflection Engine's automated pipeline. They require human governance:

- All CON atoms (constraints are the foundation)
- DEC atoms with confidence=high and ≥3 positive reflections
- CAP hierarchy roots (security, architecture, testing, deployment)

---

## 11. Migration from v1

### 11.1 Type Mapping

| v1 Type | v2 Type | Action |
|---|---|---|
| `rule` → `RUL-*` | `constraint` → `CON-*` | Rename directory, type field, and IDs |
| `decision` → `DEC-*` | `decision` → `DEC-*` | Add required `alternatives`, `evidence`, `rationale` fields |
| `pattern` → `PAT-*` (implementation) | `pattern` → `PAT-*` | Add `intent`, `tradeoffs`. Move STR and PRO out. |
| `pattern` → `PAT-*` (cognitive) | `strategy` → `STR-*` | Move to strategies/ directory |
| `pattern` → `PAT-*` (workflow) | `procedure` → `PRO-*` | Move to procedures/ directory |
| `example` → `EXM-*` | `example` → `EXM-*` | Add `references` field |
| `capability` → `CAP-*` | `capability` → `CAP-*` | Add `parent`, `subcapabilities`, `required_by` |
| (new) | `guidance` → `GUI-*` | Extract from existing atoms where values are embedded |
| (new) | `checklist` → `CHK-*` | Extract from existing documents |
| (new) | `metric` → `MET-*` | Extract thresholds from existing atoms |

### 11.2 Migration Order

1. Create new directories (`constraints/`, `guidance/`, `strategies/`, `procedures/`, `checklists/`, `metrics/`)
2. Move existing `rules/` → `constraints/` (rename IDs)
3. Split `patterns/` — move PAT-sequential-thinking → `strategies/STR-sequential-thinking`
4. Create new PAT atoms with `intent: do` and `tradeoffs`
5. Extract GUI atoms from principle-like content in DEC and PAT bodies
6. Extract CHK atoms from checklist content in existing docs
7. Extract MET atoms from threshold content
8. Update all relationship references to point to new IDs
9. Rebuild registry
10. Recompile all document views
11. Update compiler to handle new types

---

## 12. Ontology Validation Tests

Every proposed change to the ontology must pass these tests:

### Test 1: Uniqueness
For any two types A and B, there exists at least one piece of engineering knowledge that clearly belongs in A and would be semantically wrong in B.

### Test 2: Completeness
For any piece of engineering knowledge the framework needs, exactly one type can represent it.

### Test 3: No Ambiguity
No atom could reasonably be classified as two different types. An atom is unambiguously one type.

### Test 4: Compiler Distinction
The compiler treats different types differently. If two types have identical compiler behavior, they should be the same type.

### Test 5: Longevity
The type answers a question that will still be relevant in 5 years. It is not tied to current technology or temporary organizational structure.

### Test 6: Retrieval Predictability
Given a task, a human can predict with >90% accuracy which atoms of this type the compiler will select.

---

*End of Engineering Knowledge Ontology v2.0 — the definitive schema for all future knowledge atoms.*
