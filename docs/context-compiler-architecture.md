# Context Compiler Architecture

**Status:** Design Phase (being superseded by Knowledge Graph Architecture)
**Version:** 1.0 → 2.0 (Knowledge Graph integration)
**Date:** 2026-07-12
**Related:** `docs/knowledge-graph-architecture.md` — the atom-centric knowledge system that replaces document-centric knowledge loading.

---

## Table of Contents

1. [Problem Statement](#1-problem-statement)
2. [First Principles](#2-first-principles)
3. [Architecture Overview](#3-architecture-overview)
4. [Compiler Pipeline](#4-compiler-pipeline)
5. [Capability Resolution System](#5-capability-resolution-system)
6. [Knowledge Dependency Graph](#6-knowledge-dependency-graph)
7. [Stable vs Dynamic Context Separation](#7-stable-vs-dynamic-context-separation)
8. [Context Merging & Deduplication](#8-context-merging--deduplication)
9. [Compression Strategy](#9-compression-strategy)
10. [Prompt Ordering](#10-prompt-ordering)
11. [Context Validation](#11-context-validation)
12. [Context Scoring](#12-context-scoring)
13. [Cache-Aware Prompt Generation](#13-cache-aware-prompt-generation)
14. [Failure Recovery](#14-failure-recovery)
15. [Extensibility](#15-extensibility)
16. [Implementation Plan](#16-implementation-plan)
17. [Integration with Existing Framework](#17-integration-with-existing-framework)
18. [Testing Strategy](#18-testing-strategy)
19. [Appendix: Capability Registry](#appendix-capability-registry)

---

## 1. Problem Statement

### 1.1 Current State

The framework currently loads a fixed set of documents into every agent's context via `opencode.jsonc` → `instructions`:

```
AGENTS.md                          (~125 lines, always loaded)
docs/engineering-handbook.md       (~96 lines, always loaded)
docs/platform-specification.md     (~468 lines, always loaded)
state/decisions.md                 (~79 lines, always loaded)
state/phase.json                   (~10 lines, always loaded)
state/analysis.json                (variable, always loaded)
state/cache/repo-structure.json    (variable, always loaded)
```

**Total: ~800+ lines before any task-specific context.**

Additionally, knowledge modules (`eng-*` skills) are loaded on-demand via the `skill` tool, but the decision of which modules to load is made by the LLM at runtime — adding reasoning latency and potential for loading irrelevant modules.

### 1.2 The Scaling Problem

As the framework matures, more knowledge is added:
- More ADRs in `state/decisions.md`
- More knowledge modules for technology-specific patterns
- More platform constraints
- Larger repository caches for complex projects

**Simply adding more knowledge to the `instructions` array will eventually consume the entire context budget, leaving no room for actual work.**

### 1.3 What the Context Compiler Solves

The Context Compiler is an infrastructure component that sits between the Orchestrator and every model invocation. It deterministically constructs the smallest, highest-quality, most cache-friendly context possible for each specific task.

```
Input: Engineering Knowledge (~10,000+ tokens available)
   ↓
Context Compiler (deterministic, rules-based)
   ↓
Output: Minimal Execution Context (~1,000-3,000 tokens)
```

---

## 2. First Principles

### 2.1 Design Principles

| Principle | Description |
|---|---|
| **Determinism** | Same inputs → same outputs. No LLM calls, no randomness. |
| **Minimality** | Include nothing that the model can derive or that isn't needed. |
| **Cache-first** | Maximize provider-side prompt caching by stabilizing prefixes. |
| **Capability-driven** | Knowledge is selected by required engineering capabilities, not topics. |
| **Completeness** | Never omit knowledge that would cause the model to violate standards. |
| **Separability** | Knowledge is structured as atoms that can be independently selected. |
| **Idempotency** | Compilation N times with same inputs produces identical output. |
| **Observability** | Every compilation decision is logged for audit. |

### 2.2 Anti-Principles

- The compiler does NOT call an LLM (no reasoning overhead, no non-determinism)
- The compiler does NOT concatenate documents
- The compiler does NOT "summarize" (lossy compression of standards is dangerous)
- The compiler does NOT load knowledge preemptively
- The compiler does NOT make judgment calls — it follows explicit rules

### 2.3 Inspired By

| System | What We Adapt |
|---|---|
| **Compilers (GCC/LLVM)** | Multi-pass optimization pipeline, intermediate representations, dead code elimination |
| **Dependency resolvers (npm/cargo)** | Transitive dependency resolution with version constraints |
| **Query planners (PostgreSQL)** | Cost-based optimization, index-aware execution |
| **Content-addressable storage (Git)** | Hashing for deduplication, immutable content blocks |
| **Anthropic Prompt Caching** | Stable prefix design, cache breakpoint optimization |
| **RAG systems** | Relevance scoring, chunk selection, retrieval strategies |
| **Tree-shaking (esbuild/rollup)** | Dead code elimination, unused export removal |

---

## 3. Architecture Overview

### 3.1 Position in the Framework

```
                    ┌─────────────────────────┐
                    │      User Request        │
                    └───────────┬─────────────┘
                                │
                                ▼
                    ┌─────────────────────────┐
                    │     Orchestrator         │
                    │  (classifies, plans)     │
                    └───────────┬─────────────┘
                                │
              ┌─────────────────┼─────────────────┐
              │                 │                 │
              ▼                 ▼                 ▼
     ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
     │  Dispatch     │  │  Dispatch     │  │  Dispatch     │
     │  Builder      │  │  Reviewer     │  │  Analyst      │
     └──────┬───────┘  └──────┬───────┘  └──────┬───────┘
            │                 │                 │
            ▼                 ▼                 ▼
     ┌─────────────────────────────────────────────────┐
     │           CONTEXT COMPILER                       │
     │  (intercepts every subagent invocation)          │
     │                                                  │
     │  Input  → Compile → Output                       │
     │  (task,   (resolve,  (minimal                    │
     │   state,   dedup,     execution                  │
     │   agent)   compress)  context)                   │
     └─────────────────────────────────────────────────┘
            │                 │                 │
            ▼                 ▼                 ▼
     ┌─────────────────────────────────────────────────┐
     │              MODEL INVOCATION                    │
     │  (receives compiled context as briefing)         │
     └─────────────────────────────────────────────────┘
```

### 3.2 Component Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                     CONTEXT COMPILER                          │
│                                                               │
│  ┌─────────────┐   ┌──────────────┐   ┌───────────────────┐ │
│  │   INPUT      │   │  COMPILATION  │   │     OUTPUT        │ │
│  │   PARSER     │   │  PIPELINE     │   │     GENERATOR     │ │
│  │              │   │               │   │                   │ │
│  │ • task       │   │ • capability  │   │ • stable prefix   │ │
│  │ • contract   │   │   resolution  │   │ • dynamic content │ │
│  │ • state      │   │ • dependency  │   │ • token budget    │ │
│  │ • agent type │   │   resolution  │   │ • cache metadata  │ │
│  │ • repo meta  │   │ • deduplicate │   │                   │ │
│  └──────┬───────┘   │ • compress    │   └─────────┬─────────┘ │
│         │           │ • validate    │             │           │
│         │           │ • score       │             │           │
│         ▼           │ • order       │             ▼           │
│  ┌─────────────┐   └──────┬────────┘   ┌───────────────────┐ │
│  │  KNOWLEDGE   │          │            │   COMPILATION      │ │
│  │  REGISTRY    │◄─────────┘            │   AUDIT LOG        │ │
│  │              │                       │                    │ │
│  │ • capability │                       │ • what was selected│ │
│  │   → module   │                       │ • what was dropped │ │
│  │   mapping    │                       │ • token counts     │ │
│  │ • dependency │                       │ • cache hit info   │ │
│  │   graph      │                       │ • timing           │ │
│  │ • atoms      │                       └───────────────────┘ │
│  └─────────────┘                                               │
└──────────────────────────────────────────────────────────────┘
```

### 3.3 Knowledge Registry

The Knowledge Registry is a static data structure that maps capabilities to knowledge sources. It replaces the manual "Load When" table in `engineering-handbook.md` with a machine-readable, dependency-aware index.

```
state/knowledge-registry.json:
{
  "version": "1.0.0",
  "modules": {
    "eng-platform": {
      "path": ".opencode/skills/eng-platform/SKILL.md",
      "provides": ["PLATFORM_STACK", "PROJECT_STRUCTURE", "API_CONVENTIONS", "AUTH_PATTERNS"],
      "depends_on": [],
      "priority": "foundational",
      "audience": ["orchestrator", "builder", "reviewer", "analyst"],
      "atom_count": 24,
      "estimated_tokens": 850
    },
    "eng-architecture": {
      "path": ".opencode/skills/eng-architecture/SKILL.md",
      "provides": ["ARCHITECTURE_PATTERNS", "LAYERED_DESIGN", "SERVICE_EXTRACTION"],
      "depends_on": ["eng-platform"],
      "priority": "foundational",
      "audience": ["orchestrator", "builder"],
      "atom_count": 18,
      "estimated_tokens": 600
    },
    ...
  }
}
```

### 3.4 Knowledge Atom Model

Each knowledge module is decomposed into **atoms** — the smallest unit of independently selectable knowledge. An atom is a single rule, pattern, convention, or reference that can be included or excluded without breaking coherence.

```
Atom: {
  id: string,              // "eng-platform:api:envelope-structure"
  module: string,          // "eng-platform"
  capability: string,      // "API_CONVENTIONS"
  content: string,         // The actual text
  token_count: number,     // Pre-computed token estimate
  priority: "required" | "recommended" | "contextual",
  conflicts_with: [],      // Atoms that supersede this one
  superseded_by: string|null // Atom that replaces this one
}
```

Atoms enable:
- **Granular selection**: Don't load an entire module for one rule
- **Deduplication**: Two modules with the same rule → one atom survives
- **Conflict resolution**: More specific atom supersedes general one
- **Token budgeting**: Include/exclude atoms to fit within budget

---

## 4. Compiler Pipeline

### 4.1 Pipeline Overview

The compiler runs through sequential passes. Each pass transforms the intermediate representation (IR). Passes are pure functions — no side effects.

```
INPUT
  │
  ▼
┌──────────────────┐
│ PASS 1: PARSE    │ Extract structured data from inputs
│                  │ • Parse execution contract sections
│                  │ • Extract task keywords and intent
│                  │ • Load project state
│                  │ • Identify target agent type
└───────┬──────────┘
        │ IR v1: ParsedRequest
        ▼
┌──────────────────┐
│ PASS 2: CAPABILITY│ Map task → required engineering capabilities
│  RESOLVE         │ • Match keywords to capability taxonomy
│                  │ • Infer from contract sections
│                  │ • Consider agent type (builder needs more)
└───────┬──────────┘
        │ IR v2: CapabilitySet
        ▼
┌──────────────────┐
│ PASS 3: DEPENDENCY│ Resolve knowledge modules for capabilities
│  RESOLVE         │ • Lookup capability → module mapping
│                  │ • Resolve transitive dependencies
│                  │ • Apply agent-type filters
└───────┬──────────┘
        │ IR v3: ModuleSet
        ▼
┌──────────────────┐
│ PASS 4: ATOM     │ Expand modules to relevant atoms
│  EXPANSION       │ • Select atoms for resolved capabilities
│                  │ • Skip atoms for non-requested capabilities
│                  │ • Apply priority filtering
└───────┬──────────┘
        │ IR v4: AtomSet
        ▼
┌──────────────────┐
│ PASS 5: DEDUP    │ Remove duplicate and superseded atoms
│                  │ • Hash-based duplicate detection
│                  │ • Resolve supersedes relationships
│                  │ • Merge near-duplicate atoms
└───────┬──────────┘
        │ IR v5: DeduplicatedAtomSet
        ▼
┌──────────────────┐
│ PASS 6: COMPRESS │ Apply structural compression
│                  │ • Extract params from templates
│                  │ • Replace full paths with references
│                  │ • Elide examples when clear
└───────┬──────────┘
        │ IR v6: CompressedAtomSet
        ▼
┌──────────────────┐
│ PASS 7: ASSEMBLE │ Construct ordered output
│                  │ • Generate stable prefix
│                  │ • Assemble dynamic section
│                  │ • Apply ordering rules
└───────┬──────────┘
        │ IR v7: OrderedContext
        ▼
┌──────────────────┐
│ PASS 8: VALIDATE │ Check constraints
│                  │ • Token budget compliance
│                  │ • Capability coverage check
│                  │ • No contradictory rules
│                  │ • No secrets/PII
└───────┬──────────┘
        │ IR v8: ValidatedContext
        ▼
┌──────────────────┐
│ PASS 9: OUTPUT   │ Generate final context string
│                  │ • Add cache metadata
│                  │ • Generate compilation audit
│                  │ • Emit
└───────┬──────────┘
        │
        ▼
OUTPUT: ExecutionContext
```

### 4.2 Intermediate Representations

Each IR is a typed, serializable data structure:

```typescript
// IR v1: ParsedRequest
interface ParsedRequest {
  taskType: "feature" | "bug" | "refactor" | "docs" | "security" | "performance" | "exploration" | "maintenance";
  scope: "trivial" | "small" | "medium" | "large" | "major";
  keywords: string[];
  contract: ContractSections | null;
  targetAgent: "builder" | "reviewer" | "analyst" | "docs-writer" | "security-auditor";
  projectState: ProjectState;
  repoMetadata: RepoMetadata;
}

// IR v2: CapabilitySet
interface CapabilitySet {
  required: Capability[];
  recommended: Capability[];
  contextual: Capability[];
}

// IR v3: ModuleSet
interface ModuleSet {
  modules: ResolvedModule[];
  transitiveCount: number;
  filteredOut: string[];
}

// IR v4: AtomSet
interface AtomSet {
  atoms: KnowledgeAtom[];
  totalTokens: number;
}

// IR v5: DeduplicatedAtomSet extends AtomSet
// IR v6: CompressedAtomSet extends AtomSet
// IR v7: OrderedContext
// IR v8: ValidatedContext

// Final Output
interface ExecutionContext {
  stablePrefix: string;
  dynamicContent: string;
  fullContext: string;
  tokenCount: number;
  budgetUsed: number;  // percentage
  cacheBreakpoints: number[];
  compilationMetadata: CompilationMetadata;
}
```

### 4.3 Compilation Rules

Each pass is governed by explicit, declarative rules stored in a configuration file:

```jsonc
// state/compiler-rules.json
{
  "tokenBudgets": {
    "builder": 3000,
    "reviewer": 2000,
    "analyst": 1500,
    "docs-writer": 2000,
    "security-auditor": 2000,
    "orchestrator": 2500
  },
  "capabilityInference": {
    "keywordMap": {
      "api": ["API_DESIGN", "API_VALIDATION", "AUTHENTICATION"],
      "database": ["DATABASE_SCHEMA", "DATABASE_MIGRATIONS"],
      "ui": ["FRONTEND_COMPONENT", "FRONTEND_STATE"],
      "auth": ["AUTHENTICATION", "AUTHORIZATION"],
      "test": ["TESTING_UNIT", "TESTING_INTEGRATION"],
      "deploy": ["DEPLOYMENT", "CI_CD"],
      "security": ["SECURITY_AUDIT", "SECRET_MANAGEMENT"],
      "performance": ["PERFORMANCE_OPTIMIZATION"],
      "error": ["ERROR_HANDLING"],
      "refactor": ["REFACTORING_PATTERNS"],
      "migration": ["DATABASE_MIGRATIONS"],
      "component": ["FRONTEND_COMPONENT"]
    },
    "agentBaseline": {
      "builder": ["PLATFORM_STACK", "PROJECT_STRUCTURE", "TESTING_UNIT"],
      "reviewer": ["CODE_REVIEW_CHECKLIST"],
      "analyst": [],
      "docs-writer": ["DOCUMENTATION_STANDARDS"],
      "security-auditor": ["SECURITY_AUDIT"]
    }
  },
  "deduplication": {
    "strategy": "hash-based",
    "similarityThreshold": 0.85,
    "supersedesRules": {
      "eng-api-design:api-validation": ["eng-platform:api-validation"],
      "eng-backend:error-handling": ["eng-error-handling:general"],
      "eng-security:auth-implementation": ["eng-platform:auth-patterns"]
    }
  },
  "compression": {
    "elideExamples": true,
    "replaceFullPathsWithRefs": true,
    "collapseRepeatedHeaders": true,
    "minAtomTokensToInclude": 50
  }
}
```

---

## 5. Capability Resolution System

### 5.1 Capability Taxonomy

Engineering capabilities are organized hierarchically:

```
ENGINEERING
├── ARCHITECTURE_AND_DESIGN
│   ├── ARCHITECTURE_PATTERNS          # Layered, modular monolith, microservices
│   ├── PROJECT_STRUCTURE              # Directory layout, naming conventions
│   ├── LAYERED_DESIGN                 # Routes → Services → Repositories
│   ├── SERVICE_EXTRACTION             # When to split services
│   ├── API_DESIGN                     # REST conventions, envelopes, status codes
│   └── API_VALIDATION                 # Zod schemas, input boundaries
│
├── IMPLEMENTATION
│   ├── BACKEND_SERVICE                # Service layer patterns
│   ├── BACKEND_MIDDLEWARE             # Auth, logging, error handling middleware
│   ├── BACKEND_REPOSITORY             # Repository/DAO patterns
│   ├── FRONTEND_COMPONENT             # Component design, composition
│   ├── FRONTEND_STATE                 # State management, hooks, stores
│   ├── FRONTEND_ROUTING               # Page routing, layouts
│   └── FRONTEND_FORMS                 # Form validation, submission
│
├── DATA
│   ├── DATABASE_SCHEMA                # Table design, types, constraints
│   ├── DATABASE_QUERIES               # Query patterns, parameterization
│   ├── DATABASE_MIGRATIONS            # Drizzle Kit, forward-only
│   └── DATABASE_TRANSACTIONS          # Transaction boundaries
│
├── SECURITY
│   ├── AUTHENTICATION                 # JWT, tokens, password hashing
│   ├── AUTHORIZATION                  # RBAC, middleware enforcement
│   ├── INPUT_VALIDATION               # Defense layers
│   ├── SECRET_MANAGEMENT              # Environment variables, secrets
│   ├── SECURITY_HEADERS               # CSP, CORS, HSTS
│   └── SECURITY_AUDIT                 # Dependency scanning, vulnerability review
│
├── QUALITY
│   ├── TESTING_UNIT                   # Vitest patterns, coverage
│   ├── TESTING_INTEGRATION            # API testing, Supertest
│   ├── TESTING_E2E                    # Playwright, user flows
│   ├── TESTING_COMPONENT              # Testing Library, render states
│   ├── CODE_REVIEW_CHECKLIST          # Review standards
│   ├── LINTING                        # ESLint, Prettier
│   └── TYPE_CHECKING                  # TypeScript strict mode
│
├── RELIABILITY
│   ├── ERROR_HANDLING                 # Error taxonomy, recovery
│   ├── OBSERVABILITY                  # Logging, metrics, health checks
│   ├── PERFORMANCE_OPTIMIZATION       # Profiling, caching, budgets
│   └── PRODUCTION_READINESS           # Deployment checklist
│
├── OPERATIONS
│   ├── DEPLOYMENT                     # Docker, env strategy
│   ├── CI_CD                          # GitHub Actions pipelines
│   ├── BRANCH_STRATEGY                # Git workflow
│   └── MONITORING                     # Metrics, alerting
│
├── AI_ENGINEERING
│   ├── AI_CONTEXT_ENGINEERING         # Context budgets, caching
│   ├── AI_PROMPT_ENGINEERING          # Prompt writing standards
│   ├── AI_MCP_INTEGRATION             # MCP selection and gating
│   └── AI_DELEGATION                  # Subagent dispatch patterns
│
└── DOCUMENTATION
    ├── DOCUMENTATION_STANDARDS        # JSDoc, README, API docs
    ├── DECISION_LOGGING               # ADR format
    └── REFACTORING_PATTERNS           # Safe refactoring rules
```

### 5.2 Resolution Algorithm

```
function resolveCapabilities(request: ParsedRequest): CapabilitySet {
  let capabilities = new Set<Capability>()

  // 1. Agent baseline capabilities (always needed)
  capabilities.addAll(getAgentBaseline(request.targetAgent))

  // 2. Task type inference
  capabilities.addAll(inferFromTaskType(request.taskType))

  // 3. Keyword matching
  for (keyword of request.keywords) {
    capabilities.addAll(lookupKeywordMap(keyword))
  }

  // 4. Contract section analysis
  if (request.contract) {
    capabilities.addAll(inferFromContract(request.contract))
  }

  // 5. Repo metadata signals
  if (request.repoMetadata.hasDatabase) {
    capabilities.add("DATABASE_QUERIES")
    capabilities.add("DATABASE_SCHEMA")
  }
  if (request.repoMetadata.hasFrontend) {
    capabilities.add("FRONTEND_COMPONENT")
  }

  // 6. Remove contextual if over budget (apply later in pipeline)
  // 7. Rank by priority
  return rankCapabilities(capabilities)
}
```

### 5.3 Inference from Execution Contract

The contract explicitly lists affected modules, pattern references, and knowledge modules. This is the strongest signal:

```markdown
# Contract section analysis:
- "Affected: src/api/routes/*" → API_DESIGN, API_VALIDATION, AUTHENTICATION
- "Pattern reference: src/api/routes/users.ts" → infer capabilities from reference
- "Knowledge modules: eng-security, eng-api-design" → explicit capability mapping
- "Dependencies: bcrypt, jsonwebtoken" → SECRET_MANAGEMENT, AUTHENTICATION
```

---

## 6. Knowledge Dependency Graph

### 6.1 Module Dependencies

```
                    eng-platform (foundation)
                    /    |    \    \
                   /     |     \    \
          eng-arch   eng-api  eng-sec  eng-testing
          /    \        |       |        |
    eng-backend  eng-frontend   |   eng-performance
          |          |          |
    eng-database  eng-refactor  eng-production
                              |
                         eng-deployment
                              |
                         eng-observability

Independent: eng-documentation, eng-code-review, eng-error-handling,
             eng-ai-prompt, eng-ai-context, eng-ai-mcp
```

### 6.2 Dependency Resolution Algorithm

```
function resolveModules(capabilities: CapabilitySet): ModuleSet {
  let direct = lookupModulesForCapabilities(capabilities)
  let resolved = resolveTransitiveDependencies(direct)

  // Topological sort by dependency order
  let ordered = topologicalSort(resolved)

  // Filter by agent audience
  let filtered = ordered.filter(m => m.audience.includes(targetAgent))

  return { modules: filtered, transitiveCount: filtered.length - direct.length }
}
```

### 6.3 Knowledge Atom Overlap Map

Identifies which atoms appear in multiple modules for deduplication:

```
Atom: "API validation with Zod"
  - eng-platform:api:zod-validation (general, 85 tokens)
  - eng-api-design:zod-validation (API-specific, 120 tokens)
  - eng-backend:route-validation (backend-specific, 110 tokens)
  Resolution: eng-api-design supersedes eng-platform.
              eng-backend is complementary (adds context-specific rules).

Atom: "JWT authentication header pattern"
  - eng-platform:auth:jwt-header (general, 60 tokens)
  - eng-security:auth:jwt-implementation (detailed, 150 tokens)
  Resolution: eng-security supersedes eng-platform for implementation tasks.

Atom: "Service layer must not import HTTP types"
  - eng-platform:structural:service-purity (in platform spec)
  - eng-architecture:layered:service-boundaries (in architecture)
  Resolution: deduplicate — identical rule, keep eng-architecture version (more authoritative).
```

### 6.4 Overlap Resolution Rules

```
1. Specific module atom supersedes general module atom
2. Higher priority module atom supersedes lower priority
3. Same content + same capability → hash match → keep one
4. Same content + different capability → keep both (different contexts)
5. Near-duplicate (>85% similarity) → keep the more specific version
```

---

## 7. Stable vs Dynamic Context Separation

### 7.1 Why This Matters

Anthropic and OpenAI offer prompt caching that can reduce token costs by up to 90% for cached content. The cache key is based on the prompt prefix. If the first N tokens of every request are identical, those tokens are cached and don't incur input costs.

The Context Compiler is designed to maximize this cache hit ratio while minimizing what changes between invocations.

### 7.2 Stable Prefix Design

The stable prefix is identical across all invocations for a given agent type:

```
┌─────────────────────────────────────────────┐
│ STABLE PREFIX (cached by provider)           │
│                                              │
│ 1. FRAMEWORK HEADER          (~40 tokens)   │
│    "OpenCode Engineering Framework v1.0.     │
│     Context compiled for: {agent_type}"      │
│                                              │
│ 2. AGENT ROLE DEFINITION    (~100 tokens)   │
│    What this agent does, its capabilities,   │
│    its constraints, and its output format.   │
│    (Extracted from .opencode/agents/*.md)    │
│                                              │
│ 3. CORE ARCHITECTURAL RULES (~200 tokens)   │
│    Structural rules that apply to ALL work:  │
│    - routes/ never contains business logic   │
│    - services/ never imports HTTP types      │
│    - repositories/ contain all SQL           │
│    - shared/ is pure                         │
│    - components/ui/ has no business logic    │
│    These are the five non-negotiable rules    │
│    that every agent must follow.             │
│                                              │
│ 4. TOOL & PERMISSION SUMMARY (~150 tokens)  │
│    Available tools and their capabilities    │
│    (generated from agent config)             │
│                                              │
│ 5. PROJECT IDENTITY         (~100 tokens)   │
│    Project name, primary language,           │
│    build command, test command.              │
│    (Extracted from package.json + AGENTS.md) │
│                                              │
│ TOTAL STABLE PREFIX:        ~590 tokens      │
└─────────────────────────────────────────────┘
┌─────────────────────────────────────────────┐
│ DYNAMIC CONTENT (varies per task)            │
│                                              │
│ 6. TASK DESCRIPTION         (~100 tokens)   │
│    Specific task, objectives, constraints    │
│                                              │
│ 7. CONTRACT SECTIONS        (variable)      │
│    Relevant sections of the execution        │
│    contract for this specific task           │
│                                              │
│ 8. KNOWLEDGE ATOMS          (variable)      │
│    Task-specific knowledge rules,            │
│    patterns, and conventions                 │
│                                              │
│ 9. REPOSITORY CONTEXT       (variable)      │
│    Specific file paths, pattern references,  │
│    line ranges to modify                     │
│                                              │
│ 10. VERIFICATION            (~100 tokens)   │
│     Specific verification commands,           │
│     acceptance criteria                      │
└─────────────────────────────────────────────┘
```

### 7.3 Cache Strategy

```
Session 1, Task A:
  [STABLE PREFIX] ← CACHED (first invocation)
  [DYNAMIC A]     ← Not cached (unique)

Session 1, Task B:
  [STABLE PREFIX] ← CACHE HIT (saved 590 tokens)
  [DYNAMIC B]     ← Not cached (unique)

Session 2, Task C:
  [STABLE PREFIX] ← CACHE HIT (saved 590 tokens)
  [DYNAMIC C]     ← Not cached (unique)
```

The stable prefix changes only when:
- The framework version changes
- The agent's role definition changes
- The core architectural rules are updated
- The project's identity changes (new language, new build tool)

These are rare events, giving a very high cache hit ratio across sessions.

### 7.4 Cache Breakpoint Optimization

The compiler explicitly marks where the cache breakpoint occurs:

```typescript
interface CacheMetadata {
  stablePrefixHash: string;    // SHA-256 of stable prefix
  cacheBreakpointIndex: number; // Token position where content diverges
  estimatedCacheSavings: number; // Tokens saved per invocation
  cacheInvalidationTriggers: string[]; // What would invalidate this cache
}
```

---

## 8. Context Merging & Deduplication

### 8.1 Merging Strategy

When multiple sources contribute to the same context area, they are merged structurally:

```
Merging knowledge from:
  - eng-platform (foundational rules)
  - eng-api-design (API-specific rules)
  - eng-security (security rules)

Produces:
  - Platform rules (if not overridden by specific rules)
  - API rules (overrides general API rules from platform)
  - Security rules (complementary, no overlap with API rules)
```

### 8.2 Deduplication Algorithm

```
function deduplicate(atoms: KnowledgeAtom[]): DeduplicatedAtomSet {
  let seen = new Map<string, KnowledgeAtom>()
  let removed = []

  for (atom of atoms) {
    let hash = contentHash(atom.content)

    if (seen.has(hash)) {
      // Exact duplicate → keep the one with higher priority or more specific module
      let existing = seen.get(hash)
      if (atom.priority > existing.priority ||
          isMoreSpecific(atom.module, existing.module)) {
        seen.set(hash, atom)
      }
      removed.push({ atom, reason: "exact-duplicate", kept: seen.get(hash).id })
      continue
    }

    // Check near-duplicates
    let nearMatch = findNearDuplicate(atom, seen, 0.85)
    if (nearMatch) {
      let merged = mergeAtoms(nearMatch, atom)
      seen.set(contentHash(merged.content), merged)
      removed.push({ atom, reason: "near-duplicate-merged" })
      continue
    }

    // Check supersede relationships
    if (atom.supersededBy && seen.has(atom.supersededBy)) {
      removed.push({ atom, reason: "superseded" })
      continue
    }

    seen.set(hash, atom)
  }

  return { atoms: [...seen.values()], removed, totalTokens: sumTokens(seen) }
}
```

### 8.3 Conflict Resolution

When two atoms contain contradictory rules:

```
Rule conflict detected:
  Atom A (eng-platform): "Use Express.js for backend"
  Atom B (eng-backend):  "Use Hono for new backends, Express for existing"

Resolution: eng-backend supersedes eng-platform.
             A more specific module takes precedence.
             If both are same specificity → keep neither, log error, ask human.
```

The compiler maintains an explicit supersedes map:

```json
{
  "supersedes": {
    "eng-backend:framework-choice": ["eng-platform:framework-choice"],
    "eng-backend-hono:middleware": ["eng-backend:middleware"],
    "eng-frontend-react:state": ["eng-frontend:state"]
  }
}
```

---

## 9. Compression Strategy

### 9.1 Compression Techniques

| Technique | Description | Token Savings | Risk |
|---|---|---|---|
| **Template extraction** | Move parameterized parts to stable prefix | 10-20% | Low |
| **Reference replacement** | `@file:line` instead of content | Variable | Medium |
| **Example elision** | Remove code examples when pattern is clear | 15-30% | High |
| **Header collapse** | Merge repeated structural headers | 5-10% | Low |
| **Implicit trust** | Omit "remember to follow X" type statements | 5-10% | Low |
| **Elided defaults** | Omit rules that match default behavior | 3-5% | Low |

### 9.2 Template Extraction

Before compression:
```
"When creating an API route, validate input using Zod schemas.
Import schemas from src/shared/validation/{resource}.ts.
Return 400 for validation errors with details array.
Return 422 for business rule violations."
```

After compression:
```
"Validate input with Zod from src/shared/validation/{resource}.ts (400=validation, 422=business)."
```

### 9.3 Reference Replacement

Before compression:
```
The file src/api/routes/users.ts contains the pattern to follow.
Read lines 10-45 for the JWT verification pattern.
Read lines 50-80 for the service call pattern.
```

After compression:
```
Pattern reference: @src/api/routes/users.ts (lines 10-45: JWT verify, 50-80: service call)
```

### 9.4 Example Elision

Before compression (with example):
```
Route handler pattern (max 20 lines):
```typescript
router.get('/:id', auth, async (req, res) => {
  const input = getUserParamsSchema.parse(req.params)
  const user = await userService.getById(input.id)
  if (!user) throw new NotFoundError('User not found')
  res.json({ data: user })
})
```
```

After compression (no example):
```
Route handler: Zod parse → service call → envelope response. Max 20 lines.
Model: @src/api/routes/users.ts.
```

The model knows TypeScript and Zod syntax. It doesn't need the example.

### 9.5 Header Collapse

Before compression:
```
## Security
### Authentication
- Use JWT access tokens (15 min)
### Authorization
- Use RBAC with admin, user roles
### Input Validation
- Zod at boundary → 400
```

After compression:
```
Security: JWT access (15min), RBAC (admin/user), Zod validation at boundary → 400.
```

### 9.6 Budget-Aware Compression

The compressor is budget-aware. It applies more aggressive compression when approaching the token budget:

```
if (estimatedTokens > budget * 0.7) → apply light compression
if (estimatedTokens > budget * 0.85) → apply medium compression
if (estimatedTokens > budget * 0.95) → apply aggressive compression
if (estimatedTokens > budget) → drop contextual atoms, compress recommended
```

---

## 10. Prompt Ordering

### 10.1 Ordering Rules

The compiled context follows a strict ordering optimized for:
1. **Cache hit ratio** — Stable content first
2. **Model attention** — Most important content early
3. **Logical flow** — General → specific, background → instruction

```
ORDERED OUTPUT STRUCTURE:

[BLOCK 1: IDENTITY] ← CACHED
  1.1 Framework header
  1.2 Agent role
  1.3 Project identity

[BLOCK 2: ARCHITECTURAL RULES] ← CACHED
  2.1 Non-negotiable structural rules
  2.2 Tool and permission summary

[BLOCK 3: TASK] ← DYNAMIC
  3.1 Task objective
  3.2 Scope and boundaries
  3.3 Constraints

[BLOCK 4: CONTRACT] ← DYNAMIC
  4.1 Affected files and line ranges
  4.2 Pattern references
  4.3 Implementation tasks (relevant subset)
  4.4 Dependencies

[BLOCK 5: KNOWLEDGE] ← DYNAMIC
  5.1 Platform fundamentals (if needed by capabilities)
  5.2 Domain-specific rules (API, DB, auth, etc.)
  5.3 Quality requirements (testing, review)
  5.4 Operational requirements (deployment, monitoring)

[BLOCK 6: REPOSITORY CONTEXT] ← DYNAMIC
  6.1 Specific file paths
  6.2 Relevant imports and dependencies
  6.3 Existing patterns to follow

[BLOCK 7: VERIFICATION] ← DYNAMIC
  7.1 Verification commands
  7.2 Acceptance criteria
  7.3 Success definition
```

### 10.2 Attention Budget Allocation

The model's attention is not uniform across context. Research shows:
- First 10-20%: highest attention
- Last 5-10%: recency bias
- Middle: lower attention

Therefore:

| Position | Content Type | Rationale |
|---|---|---|
| **First 15%** | Task + contract | Model must know WHAT to do |
| **Next 15%** | Key knowledge rules | Model must know HOW to do it |
| **Middle 50%** | Supporting knowledge, repo context | Nice to have, can be skimmed |
| **Last 20%** | Verification, acceptance criteria | Recency bias for what "done" means |

---

## 11. Context Validation

### 11.1 Validation Checks

The compiled context must pass all validators before being emitted:

```typescript
interface ValidationResult {
  passed: boolean;
  checks: ValidationCheck[];
}

interface ValidationCheck {
  name: string;
  passed: boolean;
  severity: "error" | "warning" | "info";
  message: string;
}

const validators: Validator[] = [
  {
    name: "token-budget",
    check: (ctx) => ctx.tokenCount <= ctx.budget,
    severity: "error",
    message: "Context exceeds token budget"
  },
  {
    name: "capability-coverage",
    check: (ctx) => allRequiredCapabilitiesCovered(ctx),
    severity: "error",
    message: "Not all required capabilities are covered"
  },
  {
    name: "no-contradictions",
    check: (ctx) => !hasContradictoryRules(ctx),
    severity: "error",
    message: "Context contains contradictory rules"
  },
  {
    name: "no-deprecated-knowledge",
    check: (ctx) => !containsDeprecatedAtoms(ctx),
    severity: "warning",
    message: "Context includes deprecated knowledge"
  },
  {
    name: "no-secrets",
    check: (ctx) => !containsSecrets(ctx),
    severity: "error",
    message: "Context may contain secrets or credentials"
  },
  {
    name: "stable-prefix-static",
    check: (ctx) => stablePrefixHashMatches(ctx),
    severity: "warning",
    message: "Stable prefix changed unexpectedly"
  },
  {
    name: "minimum-variety",
    check: (ctx) => ctx.atomCount >= 1,
    severity: "error",
    message: "Context is empty"
  },
  {
    name: "maximum-density",
    check: (ctx) => ctx.atomCount <= 50,
    severity: "warning",
    message: "Context has too many atoms — may overwhelm model"
  }
];
```

### 11.2 Contradiction Detection

```typescript
function hasContradictoryRules(ctx: ValidatedContext): boolean {
  for (let i = 0; i < ctx.atoms.length; i++) {
    for (let j = i + 1; j < ctx.atoms.length; j++) {
      if (ctx.atoms[i].conflictsWith.includes(ctx.atoms[j].id)) {
        logWarning(`Contradiction: ${ctx.atoms[i].id} vs ${ctx.atoms[j].id}`)
        return true
      }
    }
  }
  return false
}
```

### 11.3 Validation Failure Behavior

| Severity | Behavior |
|---|---|
| **error** | Compilation fails. Fallback to default context. Log the error. |
| **warning** | Context emitted with warning annotation. Continuation allowed. |
| **info** | No action. Logged for telemetry. |

---

## 12. Context Scoring

### 12.1 Scoring Model

Each atom receives a composite relevance score:

```
score(atom) = w1 * capabilityMatch + w2 * specificity + w3 * recency + w4 * frequency

Where:
  capabilityMatch: 1.0 if directly requested, 0.5 if transitive dependency, 0.2 if contextual
  specificity: 1.0 for module-specific, 0.5 for platform-general
  recency: 1.0 if updated in last 30 days, 0.8 otherwise
  frequency: 1.0 if commonly used (>10 compilations), 0.7 otherwise

Weights: w1=0.5, w2=0.2, w3=0.1, w4=0.2
```

### 12.2 Score Application

Scores are used for:

1. **Budget trimming**: When over budget, remove lowest-scoring atoms first
2. **Ordering**: Higher-scoring atoms appear earlier in context
3. **Warning generation**: Low-scoring atoms that made the cut are flagged for review
4. **Quality metrics**: Average atom score per compilation is tracked

### 12.3 Compilation Quality Score

Overall compilation quality is measured by:

```typescript
interface CompilationQuality {
  capabilityCoverage: number;    // 0.0-1.0: what fraction of required capabilities are covered
  density: number;               // tokens per capability (lower is better)
  cacheUtilization: number;      // 0.0-1.0: fraction of context that could be cached
  budgetUtilization: number;     // 0.0-1.0: fraction of budget used (0.4-0.8 is ideal)
  averageAtomScore: number;      // average relevance score of included atoms
}
```

---

## 13. Cache-Aware Prompt Generation

### 13.1 Provider Caching Model

Anthropic's prompt caching:
- Cache key is based on the prompt prefix up to a breakpoint
- Any content before the breakpoint that's identical to a previous request → cached
- Cached tokens cost 10% of uncached (90% savings)
- Minimum cacheable prefix: 1024 tokens (Claude Sonnet), 2048 tokens (Claude Opus)
- Cache TTL: ~5 minutes (resets on each hit)

OpenAI's prompt caching:
- Automatic for prompts > 1024 tokens
- Cache key is based on the longest prefix match
- 50% discount on cached tokens
- Points anywhere in the prompt can be cached

### 13.2 Stable Prefix Optimization

The compiler generates the stable prefix to:

1. **Hit minimum cacheable length**: Minimum 1024 tokens for Anthropic
2. **Maintain byte-perfect identity**: No variable data in the prefix
3. **Group cacheable content**: All stable content in one contiguous block
4. **Explicit breakpoint marking**: The compiler outputs metadata showing where the breakpoint is

### 13.3 Multi-Level Caching

```
LEVEL 1: Framework Cache (permanent)
  - Framework identity header
  - Engineering constitution (rules that never change)
  Cache lifetime: Months (only changes with framework version)

LEVEL 2: Project Cache (long-lived)
  - Project identity (stack, structure, build commands)
  - Core architectural rules
  Cache lifetime: Weeks (changes with package.json, platform-spec)

LEVEL 3: Agent Cache (medium-lived)
  - Agent role definition
  - Tool and permission summary
  Cache lifetime: Days (changes with agent config)

LEVEL 4: Task Cache (short-lived)
  - Task-specific knowledge
  - Contract sections
  Cache lifetime: Minutes (changes per task within a session)
```

### 13.4 Cache Key Computation

```typescript
function computeCacheKeys(ctx: StablePrefix): CacheKeys {
  return {
    frameworkKey: hash("sha256", ctx.frameworkHeader),
    projectKey: hash("sha256", ctx.frameworkHeader + ctx.projectIdentity + ctx.architecturalRules),
    agentKey: hash("sha256", ctx.frameworkHeader + ctx.projectIdentity +
                           ctx.architecturalRules + ctx.agentRole + ctx.toolSummary),
    fullPrefixKey: hash("sha256", serialize(ctx))
  }
}
```

These keys are emitted with the context so the Orchestrator can track cache hit/miss rates.

### 13.5 Cache Invalidation Triggers

The compiler tracks what would invalidate each cache level:

| Cache Level | Invalidation Trigger |
|---|---|
| Framework | `AGENTS.md` framework section changes, `opencode.jsonc` instructions changes |
| Project | `package.json` changes, `docs/platform-specification.md` changes, build command changes |
| Agent | `opencode.jsonc` agent config changes, `prompts/*.txt` changes |
| Task | Every new task (intentionally short-lived) |

---

## 14. Failure Recovery

### 14.1 Failure Modes

| Failure | Detection | Recovery |
|---|---|---|
| **Compiler timeout** | 500ms watchdog | Fallback to default context |
| **Invalid inputs** | Validation at Pass 1 | Return error with diagnostics |
| **Token budget exceeded** | Post-compilation validation | Aggressive compression, then drop contextual atoms |
| **Capability coverage gap** | Post-compilation validation | Log warning, proceed with partial coverage |
| **Knowledge registry missing** | File system check | Fallback to hardcoded defaults |
| **Atom file corruption** | JSON parse error | Skip corrupted module, log error |
| **Contradictory rules detected** | Contradiction check | Resolve by priority, log both versions |
| **Cache key mismatch** | Hash comparison | Rebuild stable prefix, clear cache |
| **Disk I/O failure** | Try/catch on all reads | Use in-memory fallback registry |

### 14.2 Fallback Strategy

```typescript
function compileWithFallback(request: ParsedRequest): ExecutionContext {
  try {
    return compile(request)
  } catch (error) {
    logCompilationFailure(error, request)

    // Level 1: Try with pre-computed defaults
    try {
      return compile(request, { mode: "defaults-only" })
    } catch {
      // Level 2: Return hardcoded minimal context
      return getEmergencyContext(request)
    }
  }
}
```

### 14.3 Emergency Context

The emergency context is a hardcoded, minimal, always-safe context:

```
EMERGENCY CONTEXT (for {agent_type}):

You are the {agent_type} agent in the OpenCode Engineering Framework.

Core rules:
- routes/ never contains business logic
- services/ never imports HTTP types
- repositories/ contain all SQL
- shared/ is pure TypeScript + Zod
- Every endpoint auth-gated unless explicitly public
- Write tests before or alongside implementation
- Run lint and typecheck after changes
- Never commit secrets or .env files

Project: TypeScript strict, Bun, React 18+, Hono/Express, PostgreSQL, Drizzle, Zod, JWT.

For detailed standards, check:
- docs/engineering-handbook.md
- docs/platform-specification.md
- state/contract.md (if applicable)
```

### 14.4 Circuit Breaker

If compilations fail repeatedly (>3 failures in a session), the circuit breaker trips and all subsequent requests use the fallback context directly — bypassing the compiler entirely. This prevents cascading failures.

---

## 15. Extensibility

### 15.1 Extension Points

| Extension Point | Type | Use Case |
|---|---|---|
| **Custom capabilities** | Add to capability taxonomy | New engineering domains |
| **Custom knowledge modules** | Add to `.opencode/skills/` | Project-specific standards |
| **Custom compression rules** | Add to `compiler-rules.json` | Project-specific compression preferences |
| **Custom validators** | Plug into validation pipeline | Project-specific checks |
| **Custom audience filters** | Add to agent config | New agent types |
| **Plugin hooks** | Pre/post compilation callbacks | Metrics, logging, caching |

### 15.2 Adding a New Knowledge Module

```markdown
1. Create `.opencode/skills/eng-graphql/SKILL.md`
2. Register in `state/knowledge-registry.json`:
   {
     "eng-graphql": {
       "path": ".opencode/skills/eng-graphql/SKILL.md",
       "provides": ["GRAPHQL_SCHEMA", "GRAPHQL_RESOLVERS", "GRAPHQL_AUTH"],
       "depends_on": ["eng-platform"],
       "priority": "domain",
       "audience": ["builder", "reviewer"],
       "atoms": [...],
       "estimated_tokens": 400
     }
   }
3. Define atoms for each rule in the module
4. Update supersedes/conflicts maps if overlapping with existing modules
5. The compiler automatically resolves project-specific modules when their capabilities are requested
```

### 15.3 Adding a New Capability

```typescript
// In capability-taxonomy.ts:
const CUSTOM_CAPABILITIES = {
  GRAPHQL_SCHEMA: {
    parent: "API_DESIGN",
    description: "GraphQL schema design patterns",
    modules: ["eng-graphql"],
    keywords: ["graphql", "schema", "resolver", "subscription"]
  }
}
```

### 15.4 Plugin Architecture

The compiler exposes hooks for plugins:

```typescript
interface CompilerPlugin {
  // Called before compilation begins
  onCompileStart?(request: ParsedRequest): void;

  // Called after each pass
  onPassComplete?(pass: PassName, ir: IR): IR; // can transform IR

  // Called before context is emitted
  onContextReady?(ctx: ValidatedContext): ValidatedContext;

  // Called when compilation fails
  onCompileError?(error: Error, request: ParsedRequest): void;
}
```

Plugin example — injecting project-specific rules:

```typescript
// .opencode/plugins/compiler-extensions.ts
const ProjectCompilerPlugin: CompilerPlugin = {
  onPassComplete(pass, ir) {
    if (pass === "CAPABILITY_RESOLVE") {
      // Always include our custom capability when touching payment code
      if (ir.keywords.includes("payment")) {
        ir.capabilities.required.push("PAYMENT_PCI_COMPLIANCE");
      }
    }
    return ir;
  }
};
```

### 15.5 Versioning

The compiler and knowledge registry are versioned:

```
Framework v1.0.0:
  - Compiler v1.0.0
  - Knowledge Registry v1.0.0
  - Atom Schema v1.0.0

Version bumps:
  MAJOR: Breaking changes to atom format, IR schema, or compilation contract
  MINOR: New passes, new capabilities, new compression techniques
  PATCH: Bug fixes, optimizations, validator updates
```

---

## 16. Implementation Plan

### 16.1 File Structure

```
.opencode/
├── compiler/
│   ├── types.ts                        # All type definitions
│   ├── pipeline.ts                     # Main compilation orchestrator
│   ├── passes/
│   │   ├── 01-parse.ts                 # Input parsing
│   │   ├── 02-capability-resolve.ts    # Capability resolution
│   │   ├── 03-dependency-resolve.ts    # Module dependency resolution
│   │   ├── 04-atom-expand.ts           # Atom expansion
│   │   ├── 05-deduplicate.ts           # Deduplication
│   │   ├── 06-compress.ts              # Compression
│   │   ├── 07-assemble.ts              # Context assembly
│   │   ├── 08-validate.ts              # Validation
│   │   └── 09-output.ts                # Output generation
│   ├── registry.ts                     # Knowledge registry loader
│   ├── capability-taxonomy.ts          # Capability definitions
│   ├── dependency-graph.ts             # Dependency resolution
│   ├── deduplication.ts                # Dedup algorithms
│   ├── compression.ts                  # Compression strategies
│   ├── scoring.ts                      # Relevance scoring
│   ├── cache.ts                        # Cache key management
│   ├── validation.ts                   # Validation checks
│   └── compiler-rules.json             # Compilation rules config
│
├── tools/
│   └── context-compiler.ts             # Custom tool — LLM-callable compiler
│
├── commands/
│   └── compile-context.md              # Command to manually trigger compilation
│
├── state/
│   └── knowledge-registry.json         # Machine-readable knowledge registry
│
└── docs/
    └── context-compiler-architecture.md # This document
```

### 16.2 Implementation Order

| Phase | Scope | Deliverable |
|---|---|---|
| **Phase 1: Foundation** | Types, IR, basic pipeline (passes 1-3), knowledge registry | Working compiler that can resolve modules for a task |
| **Phase 2: Selectivity** | Atom expansion, deduplication (passes 4-5) | Compiler that returns only relevant atoms, no duplicates |
| **Phase 3: Optimization** | Compression, ordering, scoring (passes 6-7) | Compiler that produces minimal, well-ordered context |
| **Phase 4: Production** | Validation, cache management, failure recovery (passes 8-9) | Production-ready compiler |
| **Phase 5: Integration** | Custom tool, command, plugin integration, Orchestrator integration | Fully integrated into the framework |
| **Phase 6: Extensions** | Plugins, metrics, observability | Extensible compiler with monitoring |

### 16.3 Success Metrics

| Metric | Current | Target |
|---|---|---|
| **Average context tokens per Builder invocation** | ~3,000-5,000 | < 2,500 |
| **Average context tokens per Analyst invocation** | ~1,500-2,500 | < 1,000 |
| **Provider cache hit ratio** | ~0% (no stable prefix) | > 70% |
| **Knowledge module inclusion accuracy** | Manual (LLM decides) | > 95% (deterministic) |
| **Compilation time** | N/A | < 50ms |
| **Token waste (duplicate + irrelevant content)** | ~20-40% | < 5% |

---

## 17. Integration with Existing Framework

### 17.1 Orchestrator Integration

The Orchestrator's workflow changes from:
```
Current: Orchestrator reads all docs → dispatches subagent with full context
New:     Orchestrator reads contract + state → calls context-compiler → dispatches with compiled context
```

The Orchestrator agent markdown is updated:

```markdown
## Context Compilation

Before dispatching any subagent, compile the context:

1. Use the `context-compiler` tool:
   ```
   context-compiler({
     task: "<task description>",
     agentType: "builder|reviewer|analyst|docs-writer|security-auditor",
     contractPath: "state/contract.md",
     relevantFiles: ["src/api/routes/users.ts", "src/api/services/auth.ts"]
   })
   ```
2. The compiler returns a compiled execution context
3. Pass this context as the subagent's briefing (NOT the full contract or raw docs)
4. The compiled context is all the subagent needs — no additional exploration required
```

### 17.2 Instructions Field Optimization

The current `instructions` field in `opencode.jsonc` is replaced:

```jsonc
// BEFORE: Always loads every document
"instructions": [
  "AGENTS.md",
  "docs/engineering-handbook.md",
  "docs/platform-specification.md",
  "state/decisions.md",
  "state/phase.json",
  "state/analysis.json",
  "state/cache/repo-structure.json"
]

// AFTER: Loads only project identity + framework rules (stable prefix)
"instructions": [
  "AGENTS.md",
  "state/phase.json",
  "state/cache/compiler-stable-prefix.md"  // Generated by context compiler
]
```

### 17.3 Agent Prompt Updates

Each agent's prompt is split:
- **Stable part**: Role definition, core rules → in prompt file (always loaded)
- **Dynamic part**: Task-specific knowledge → provided by compiler at invocation time

### 17.4 Contract Integration

The execution contract gains a new optional section:

```markdown
## Context Compilation Directive

**Required capabilities:** API_DESIGN, AUTHENTICATION, DATABASE_SCHEMA, TESTING_UNIT
**Excluded capabilities:** FRONTEND_COMPONENT, DEPLOYMENT (not needed for this task)
**Referenced files:** src/api/routes/users.ts (pattern), src/shared/validation/auth.ts (schema)
**Knowledge modules specified:** eng-security, eng-api-design, eng-testing
**Context budget:** 3,000 tokens
```

This directive bypasses the inference pass — the contract explicitly declares what's needed. When present, the compiler skips Pass 2 (Capability Resolution) and uses the directive directly.

### 17.5 Command Updates

New command: `/compile-context`
```
/compile-context <task description>

Aggress: analyst (subagent)
Description: Compile optimal context for a task using the Context Compiler

Purpose:
- Pre-compile context for known upcoming tasks
- Verify that the compiler produces correct context for a complex task
- Debug knowledge coverage gaps
```

---

## 18. Testing Strategy

### 18.1 Unit Tests (per pass)

Each pipeline pass is a pure function with deterministic output:

```typescript
describe("Pass 2: Capability Resolution", () => {
  it("should resolve API_DESIGN and AUTHENTICATION for auth endpoint task")
  it("should resolve DATABASE_SCHEMA for migration task")
  it("should resolve FRONTEND_COMPONENT for UI component task")
  it("should include agent baseline capabilities")
  it("should infer capabilities from contract sections")
  it("should handle empty input gracefully")
  it("should be deterministic (same input → same output)")
})
```

### 18.2 Integration Tests (full pipeline)

```typescript
describe("Context Compiler: Full Pipeline", () => {
  it("should compile context for Builder implementing auth routes")
  it("should compile context for Reviewer reviewing database migration")
  it("should compile context for Analyst exploring frontend components")
  it("should produce deterministic output for same inputs")
  it("should respect token budgets per agent type")
  it("should not include duplicate atoms")
  it("should not exceed budget even with many capabilities")
  it("should fallback to emergency context on failure")
})
```

### 18.3 Regression Tests (known scenarios)

A suite of known task scenarios with expected output assertions:

```
scenarios/
├── auth-endpoint.yaml         # Expect: eng-security, eng-api-design, eng-testing
├── database-migration.yaml    # Expect: eng-database, eng-platform, no frontend
├── react-component.yaml       # Expect: eng-frontend, eng-testing, no backend
├── docker-deploy.yaml         # Expect: eng-deployment, eng-production
├── security-audit.yaml        # Expect: eng-security, eng-production
└── trivial-fix.yaml           # Expect: minimal context, no full modules
```

### 18.4 Quality Metrics Tests

```typescript
describe("Compilation Quality", () => {
  it("should maintain >95% capability coverage for standard tasks")
  it("should produce <2500 tokens for Builder tasks")
  it("should produce <1000 tokens for Analyst tasks")
  it("should achieve >70% cache hit rate with stable prefix")
  it("should complete compilation in <50ms")
  it("should have <5% token waste (duplicates + irrelevant)")
})
```

---

## 19. Appendix: Capability Registry

### 19.1 Complete Capability → Module Mapping

| Capability | Primary Module | Implied Modules (transitive) |
|---|---|---|
| `ARCHITECTURE_PATTERNS` | `eng-architecture` | `eng-platform` |
| `PROJECT_STRUCTURE` | `eng-platform` | — |
| `LAYERED_DESIGN` | `eng-architecture` | `eng-platform` |
| `API_DESIGN` | `eng-api-design` | `eng-platform`, `eng-security` |
| `API_VALIDATION` | `eng-api-design` | `eng-platform` |
| `BACKEND_SERVICE` | `eng-backend` | `eng-platform`, `eng-architecture` |
| `BACKEND_MIDDLEWARE` | `eng-backend` | `eng-platform`, `eng-security` |
| `BACKEND_REPOSITORY` | `eng-backend` | `eng-platform`, `eng-database` |
| `FRONTEND_COMPONENT` | `eng-frontend` | `eng-platform` |
| `FRONTEND_STATE` | `eng-frontend` | `eng-platform` |
| `FRONTEND_ROUTING` | `eng-frontend` | `eng-platform` |
| `DATABASE_SCHEMA` | `eng-database` | `eng-platform` |
| `DATABASE_QUERIES` | `eng-database` | `eng-platform` |
| `DATABASE_MIGRATIONS` | `eng-database` | `eng-platform` |
| `AUTHENTICATION` | `eng-security` | `eng-platform` |
| `AUTHORIZATION` | `eng-security` | `eng-platform` |
| `SECRET_MANAGEMENT` | `eng-security` | `eng-platform` |
| `SECURITY_HEADERS` | `eng-security` | `eng-platform` |
| `SECURITY_AUDIT` | `eng-security` | `eng-platform`, `eng-production` |
| `TESTING_UNIT` | `eng-testing` | `eng-platform` |
| `TESTING_INTEGRATION` | `eng-testing` | `eng-platform` |
| `TESTING_E2E` | `eng-testing` | `eng-platform` |
| `TESTING_COMPONENT` | `eng-testing` | `eng-platform`, `eng-frontend` |
| `CODE_REVIEW_CHECKLIST` | `eng-code-review` | `eng-platform` |
| `ERROR_HANDLING` | `eng-error-handling` | `eng-platform` |
| `OBSERVABILITY` | `eng-observability` | `eng-platform` |
| `PERFORMANCE_OPTIMIZATION` | `eng-performance` | `eng-platform` |
| `PRODUCTION_READINESS` | `eng-production` | `eng-platform`, `eng-security` |
| `DEPLOYMENT` | `eng-deployment` | `eng-platform`, `eng-production` |
| `CI_CD` | `eng-deployment` | `eng-platform` |
| `AI_CONTEXT_ENGINEERING` | `eng-ai-context` | `eng-platform` |
| `AI_PROMPT_ENGINEERING` | `eng-ai-prompt` | `eng-platform` |
| `AI_MCP_INTEGRATION` | `eng-ai-mcp` | `eng-platform` |
| `DOCUMENTATION_STANDARDS` | `eng-documentation` | `eng-platform` |
| `DECISION_LOGGING` | `eng-documentation` | `eng-platform` |
| `REFACTORING_PATTERNS` | `eng-refactoring` | `eng-platform`, `eng-testing` |
| `INPUT_VALIDATION` | `eng-security` | `eng-platform` |

### 19.2 Agent Baseline Capabilities

| Agent | Always-Included Capabilities |
|---|---|
| **Orchestrator** | `PROJECT_STRUCTURE`, `ARCHITECTURE_PATTERNS`, `AI_CONTEXT_ENGINEERING` |
| **Builder** | `PLATFORM_STACK`, `PROJECT_STRUCTURE`, `TESTING_UNIT`, `ERROR_HANDLING` |
| **Reviewer** | `CODE_REVIEW_CHECKLIST`, `PROJECT_STRUCTURE` |
| **Analyst** | (none — analyst only explores) |
| **Docs-writer** | `DOCUMENTATION_STANDARDS`, `PROJECT_STRUCTURE` |
| **Security-auditor** | `SECURITY_AUDIT`, `SECRET_MANAGEMENT`, `PROJECT_STRUCTURE` |

---

## Appendix B: Token Budget Calculator

```
function calculateBudget(agentType: AgentType, scope: Scope): number {
  let base = AGENT_BUDGETS[agentType];

  let taskTypeMultiplier = 1.0;
  if (scope === "trivial") taskTypeMultiplier = 0.5;
  if (scope === "small") taskTypeMultiplier = 0.7;
  if (scope === "medium") taskTypeMultiplier = 1.0;
  if (scope === "large") taskTypeMultiplier = 1.3;
  if (scope === "major") taskTypeMultiplier = 1.5;

  return Math.round(base * taskTypeMultiplier);
}
```

---

## Appendix C: Compilation Audit Log

Every compilation produces a machine-readable audit log:

```json
{
  "compilationId": "uuid",
  "timestamp": "ISO 8601",
  "input": {
    "taskType": "feature",
    "agentType": "builder",
    "scope": "medium",
    "keywords": ["auth", "jwt", "login"]
  },
  "passes": {
    "capabilityResolve": {
      "duration": 2,
      "capabilities": {
        "required": ["AUTHENTICATION", "API_DESIGN", "DATABASE_QUERIES"],
        "recommended": ["INPUT_VALIDATION"],
        "contextual": ["OBSERVABILITY", "DEPLOYMENT"]
      }
    },
    "dependencyResolve": {
      "duration": 1,
      "modules": ["eng-platform", "eng-security", "eng-api-design", "eng-database"],
      "excluded": ["eng-frontend", "eng-deployment"]
    },
    "atomExpand": {
      "duration": 3,
      "atomsFound": 42,
      "atomsSelected": 18
    },
    "deduplicate": {
      "duration": 1,
      "atomsRemoved": 3,
      "reasons": { "exact-duplicate": 2, "superseded": 1 }
    },
    "compress": {
      "duration": 2,
      "tokensBefore": 1800,
      "tokensAfter": 1350,
      "techniques": ["elide-examples", "collapse-headers"]
    },
    "assemble": {
      "duration": 1,
      "orderedAtoms": 15
    },
    "validate": {
      "duration": 1,
      "allChecksPassed": true,
      "warnings": []
    }
  },
  "output": {
    "totalTokens": 1350,
    "budgetUsed": 0.54,
    "stablePrefixTokens": 590,
    "dynamicContentTokens": 760,
    "cacheHitExpected": true,
    "capabilityCoverage": 1.0
  }
}
```

---

*End of Architecture Design. Ready for Phase 1 Implementation.*
