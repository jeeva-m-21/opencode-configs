# Deterministic Implementation Runtime

**Status:** Design Phase
**Version:** 1.0
**Date:** 2026-07-12
**Depends on:** `docs/engineering-ontology.md`, `docs/context-compiler-architecture.md`, `docs/knowledge-graph-architecture.md`
**Completes:** The Builder-as-compiler-backend transformation — eliminates every engineering decision from the model's responsibility

---

## Table of Contents

1. [First Principles: What Decisions Remain?](#1-first-principles-what-decisions-remain)
2. [The Implementation Intermediate Representation](#2-the-implementation-intermediate-representation)
3. [Implementation Intent Resolver](#3-implementation-intent-resolver)
4. [Pattern Binding Engine](#4-pattern-binding-engine)
5. [Canonical Reference Resolver](#5-canonical-reference-resolver)
6. [File Ownership Resolver](#6-file-ownership-resolver)
7. [Modification Scope Resolver](#7-modification-scope-resolver)
8. [Implementation Skeleton Generator](#8-implementation-skeleton-generator)
9. [Verification Contract Generator](#9-verification-contract-generator)
10. [Context Serializer](#10-context-serializer)
11. [Builder Runtime](#11-builder-runtime)
12. [Deterministic Verification Pipeline](#12-deterministic-verification-pipeline)
13. [Reflection Integration](#13-reflection-integration)
14. [Metrics](#14-metrics)
15. [Evolution](#15-evolution)

---

## 1. First Principles: What Decisions Remain?

### 1.1 The Inventory

Every time the Builder runs today, it makes these decisions. Let me audit each one:

| Decision | Made By | Can Be Pre-Resolved? | Resolver |
|---|---|---|---|
| What architecture layer? (route/service/repo) | Builder infers from task | **Yes** — determined by capability | File Ownership Resolver |
| Which pattern to follow? | Builder picks from loaded PAT atoms | **Yes** — exactly one PAT per task type | Pattern Binding Engine |
| Which file to use as reference? | Builder explores repo to find | **Yes** — pre-registered canonical reference | Canonical Reference Resolver |
| What to import? | Builder reads reference, copies imports | **Yes** — extracted from reference file | Canonical Reference Resolver |
| What to name the file? | Builder invents | **Yes** — determined by ownership rules | File Ownership Resolver |
| What function signature? | Builder designs interface | **Yes** — generated from contract + pattern | Skeleton Generator |
| What validation to use? | Builder picks Zod schema | **Yes** — specified in CAP atoms as requirement | Intent Resolver |
| What error handling? | Builder reads pattern for errors | **Yes** — specified in PAT and CON atoms | Intent Resolver |
| What to test? | Builder decides test coverage | **Yes** — specified in Verification Contract | Verification Contract Generator |
| How to mock? | Builder reads test pattern | **Yes** — from reference test file | Canonical Reference Resolver |
| What dependencies to add? | Builder reads contract | **Yes** — specified in contract dependencies | Intent Resolver |
| Implementation order? | Builder sequences work | **Yes** — skeleton defines order | Skeleton Generator |
| Where does this code go? | Builder chooses directory | **Yes** — architectural rules are deterministic | File Ownership Resolver |
| Is this file allowed to change? | Builder checks contract | **Yes** — Modification Scope is explicit | Scope Resolver |
| What existing interfaces must I preserve? | Builder reads code | **Yes** — scope resolver identifies interfaces | Scope Resolver |

**Conclusion: Every engineering decision the Builder makes can be pre-resolved deterministically.**

### 1.2 What the Builder Still Does

After all decisions are pre-resolved, the Builder's responsibilities are:

| Responsibility | Nature |
|---|---|
| Read canonical reference files | Follow exact instructions (file + line range) |
| Fill implementation skeletons with business logic | Translation — the only creative act remaining |
| Run verification commands | Execute exact commands from verification contract |
| Fix verification failures | Only fix generated code bugs, never change the plan |
| Report completion | Structured output per verification contract |

### 1.3 The Compiler Backend Analogy

```
TRADITIONAL COMPILER:               DETERMINISTIC RUNTIME:
─────────────────────               ──────────────────────
Frontend: parse source → AST        Contract + Compiler → IIR
Optimizer: transform IR → IR        (all decisions resolved)
Backend: IR → machine code          Builder: IIR → source code

The backend doesn't decide:
- What IR to use                   The Builder doesn't decide:
- What registers to allocate        - What architecture to use
- What instructions to emit          - What pattern to follow
It receives a complete IR            - Where to put the code
and translates it.                   - What to name things
                                     - What to import
                                     It receives a complete IIR
                                     and translates it.
```

---

## 2. The Implementation Intermediate Representation

### 2.1 Purpose

The IIR is the single artifact that bridges deterministic infrastructure and model-based code generation. Everything the model needs to know — and nothing it doesn't — is captured in the IIR. The model receives the IIR and produces code. Nothing else.

### 2.2 Complete Schema

```typescript
interface ImplementationIR {
  // ── Identity ───────────────────────────────────────────
  iir_version: "1.0.0"
  generated_at: string          // ISO 8601
  compilation_id: string        // From the context compiler
  contract_ref: string          // state/contract.md or task ID

  // ── Intent ─────────────────────────────────────────────
  intent: {
    task_description: string    // What to build (1-3 sentences)
    task_type: string           // feature | bug | refactor
    capabilities: string[]      // Resolved capabilities
    architecture: {
      primary_layer: "route" | "service" | "repository" | "middleware" | "component" | "hook" | "utility"
      module: string            // e.g., "auth", "users", "payments"
      submodule: string | null  // e.g., "oauth" within "auth"
    }
    decisions: {                // Bound DEC atoms
      id: string
      title: string
      summary: string           // 1-sentence summary for model context
    }[]
    constraints: {              // Applicable CON atoms
      id: string
      title: string
      text: string              // The constraint text (always loaded)
    }[]
  }

  // ── Patterns ───────────────────────────────────────────
  patterns: {
    primary: {
      atom_id: string           // PAT-{id}
      version: string
      title: string
      intent: "do" | "avoid"
      summary: string           // 2-3 sentence pattern summary
      structure: string         // The structural template description
    }
    secondary: {
      atom_id: string
      purpose: string           // "error handling", "validation", "testing"
      summary: string
    }[]
    strategy: {                 // STR atom for approach
      atom_id: string | null
      title: string | null
      cognitive_steps: { step: string; purpose: string }[] | null
    } | null
  }

  // ── References ─────────────────────────────────────────
  references: {
    primary: {
      file: string              // Exact path: "src/api/routes/users.ts"
      type: "route" | "service" | "repository" | "component" | "test"
      structure_at: string      // "lines 10-48" — the pattern structure to imitate
      imports_at: string        // "lines 1-9" — the import block to copy
      handler_at: string | null // "lines 50-65" — the specific handler/function to imitate
      tests: {
        file: string            // Exact test file path
        structure_at: string    // "lines 15-60" — test structure to imitate
        mock_at: string | null  // "lines 1-14" — mock setup to copy
      } | null
    }
    secondary: {                // Additional references for specific aspects
      file: string
      purpose: string           // "middleware usage", "error formatting"
      lines: string
    }[]
  }

  // ── Ownership ──────────────────────────────────────────
  ownership: {
    create: {
      path: string              // Exact path relative to project root
      type: string              // "route" | "service" | "repository" | "middleware" | "test" | "validation" | "type"
      skeleton_id: string       // Links to skeleton entry (below)
      reason: string            // Why this file must exist
    }[]
    modify: {
      path: string
      at_lines: string | null   // Specific lines to modify, null = whole file scope
      reason: string
      preserve: string[]        // Interfaces/functions that must not change
    }[]
    forbidden: {
      path: string
      reason: string
    }[]
  }

  // ── Skeleton ───────────────────────────────────────────
  skeletons: {
    id: string                  // Referenced by ownership.create
    file: string                // The file this skeleton is for
    imports: string[]           // Exact import statements, copy-paste ready
    exports: {
      name: string
      kind: "function" | "class" | "const" | "type" | "interface" | "router" | "component" | "hook"
      signature: string         // Complete type signature
      is_default: boolean
    }[]
    structure: {
      prelude: string[]         // Code BEFORE business logic (validation, auth, setup)
      placeholder: string       // "// IMPLEMENT: {description of business logic to write}"
      postlude: string[]        // Code AFTER business logic (response formatting, cleanup)
    }
    tests: {
      file: string              // Test file path
      imports: string[]         // Test imports
      describe_block: string    // "describe('{function}', () => {"
      test_cases: {
        name: string            // "should return 200 when authenticated"
        arrange: string         // Setup code
        act: string             // The action to test
        assert: string[]        // Assertions
      }[]
    }[] | null
  }[]

  // ── Verification ───────────────────────────────────────
  verification: {
    commands: {
      lint: string              // Exact command: "npm run lint"
      typecheck: string         // Exact command: "npm run typecheck"
      test: string              // Exact command: "npm test -- src/api/routes/__tests__/auth.test.ts"
      test_all: string | null   // If needed: "npm test"
    }
    acceptance: string[]        // Binary pass/fail: "POST /auth/login returns 200 with valid credentials"
    compliance: {
      pattern_id: string        // PAT atom to check against
      check: string             // What to verify: "All route handlers ≤ 20 lines"
    }[]
    coverage: {
      metric_id: string | null  // MET atom ID
      threshold: number | null  // Minimum required
    } | null
  }

  // ── Constraints ────────────────────────────────────────
  constraints: {
    forbidden_imports: string[]     // "express.Request from src/api/services/"
    preserved_interfaces: string[]  // "UserService.getById signature must not change"
    naming: {
      files: string             // Convention: "kebab-case.ts"
      functions: string         // Convention: "camelCase"
      types: string             // Convention: "PascalCase"
      tests: string             // Convention: "*.test.ts co-located in __tests__/"
    }
    style: {
      max_function_lines: number
      max_route_lines: number
    }
  }

  // ── Metadata ───────────────────────────────────────────
  metadata: {
    generated_by: string        // "implementation-intent-resolver:v1.0.0"
    compiler_version: string
    ontology_version: string
    knowledge_graph_hash: string
    estimated_tokens: number
    stable_prefix_tokens: number
    dynamic_tokens: number
    cache_breakpoint: number    // Token position where dynamic content begins
  }
}
```

### 2.3 Why an IR Instead of Markdown

```
MARKDOWN PROMPT (current):
  The model receives prose describing what to do.
  It must parse prose → extract intent → infer decisions → explore code → implement.
  Every step introduces variance and token waste.

IMPLEMENTATION IR:
  The model receives a structured specification.
  It reads exact files at exact lines → fills exact skeletons → runs exact commands.
  Zero inference. Zero exploration. Zero decision-making.
```

The IIR is the source of truth. Markdown is a serialization format generated from the IIR. Optimization (dedup, compression, ordering) happens on the IIR, not on the serialized text.

---

## 3. Implementation Intent Resolver

### 3.1 Purpose

The Intent Resolver takes the execution contract and capability resolution from the compiler and produces the `intent` block of the IIR. It resolves every "what should this be?" question deterministically.

### 3.2 Resolution Rules

```typescript
function resolveIntent(contract: Contract, capabilities: Set<string>, atoms: Atom[]): Intent {
  return {
    task_description: contract.objective,
    task_type: contract.classification,
    capabilities: [...capabilities],
    architecture: resolveArchitecture(capabilities, contract),
    decisions: resolveDecisions(capabilities, atoms),
    constraints: resolveConstraints(atoms),
  }
}

function resolveArchitecture(capabilities: Set<string>, contract: Contract): Architecture {
  // Deterministic mapping from capability → layer
  if (capabilities.has('api-design') || capabilities.has('api-validation')) {
    return { primary_layer: 'route', module: contract.module, submodule: contract.submodule }
  }
  if (capabilities.has('backend-service')) {
    return { primary_layer: 'service', module: contract.module, submodule: contract.submodule }
  }
  if (capabilities.has('backend-repository') || capabilities.has('database-queries')) {
    return { primary_layer: 'repository', module: contract.module, submodule: null }
  }
  if (capabilities.has('frontend-component')) {
    return { primary_layer: 'component', module: contract.module, submodule: contract.submodule }
  }
  // Default: the contract specifies the layer explicitly
  return { primary_layer: contract.primary_layer, module: contract.module, submodule: null }
}
```

This is pure lookup logic. No ambiguity. No inference. The capability tells you the layer. The contract tells you the module.

---

## 4. Pattern Binding Engine

### 4.1 Purpose

Every implementation task MUST be bound to exactly one primary PAT atom. The Builder never chooses between patterns. The Pattern Binding Engine resolves the single canonical pattern for each capability.

### 4.2 Binding Algorithm

```typescript
function bindPattern(
  capabilities: Set<string>,
  agentType: AgentType,
  atoms: Atom[]
): PatternBinding {
  // Query: active PAT atoms matching these capabilities + audience
  const candidates = atoms.filter(a =>
    a.type === 'pattern' &&
    a.status === 'active' &&
    a.intent === 'do' &&
    a.capabilities.some(c => capabilities.has(c)) &&
    a.audience.includes(agentType)
  )

  if (candidates.length === 0) {
    throw new Error(`No pattern found for capabilities: ${[...capabilities]}`)
  }

  if (candidates.length === 1) {
    return { atom_id: candidates[0].id, version: candidates[0].version, confidence: 'high' }
  }

  // Multiple candidates: select by priority then specificity
  candidates.sort((a, b) => {
    // Required > recommended > contextual
    const priorityOrder = { required: 0, recommended: 1, contextual: 2 }
    const pDiff = priorityOrder[a.priority] - priorityOrder[b.priority]
    if (pDiff !== 0) return pDiff

    // More specific (more capabilities matched) wins
    const aMatches = a.capabilities.filter(c => capabilities.has(c)).length
    const bMatches = b.capabilities.filter(c => capabilities.has(c)).length
    return bMatches - aMatches
  })

  const primary = candidates[0]
  const secondary = candidates.slice(1, 4).map(a => ({
    atom_id: a.id,
    purpose: a.capabilities.filter(c => capabilities.has(c)).join(', '),
    summary: a.description
  }))

  return {
    primary: { atom_id: primary.id, version: primary.version, title: primary.title, intent: 'do', summary: primary.description, structure: primary.content.split('\n').slice(0, 10).join('\n') },
    secondary,
    strategy: resolveStrategy(capabilities, atoms),
  }
}
```

### 4.3 Binding Registry

Each PAT atom should declare its binding rules:

```yaml
binding:
  primary_for: [authentication, token-management]  # This is THE pattern for these capabilities
  not_for: [frontend-component]                     # Never bind this for frontend work
  confidence: high                                   # This binding is well-established
  supersedes_binding: [PAT-old-auth]                # Replaces previous bindings
```

---

## 5. Canonical Reference Resolver

### 5.1 Purpose

Every pattern must have at least one canonical reference implementation. The Builder never searches the codebase for examples — the IIR provides exact file paths and line ranges.

### 5.2 Reference Registry

```yaml
# Each PAT atom declares its canonical reference
canonical_reference:
  file: src/api/routes/users.ts
  structure: "10-48"           # The pattern structure
  imports: "1-9"               # The import block
  handler: "50-65"             # The specific handler function
  tests:
    file: src/api/routes/__tests__/users.test.ts
    structure: "15-60"         # Test structure
    mocks: "1-14"              # Mock setup
  alternatives:                # Different variants of the same pattern
    - file: src/api/routes/products.ts
      variant: "with pagination"
      structure: "10-55"
    - file: src/api/routes/admin/users.ts
      variant: "with RBAC authorization"
      structure: "10-52"
```

### 5.3 Resolution

```typescript
function resolveReference(pattern: Atom, intent: Intent): CanonicalReference {
  const ref = pattern.canonical_reference

  // Select variant based on additional capabilities
  if (intent.capabilities.includes('pagination') && ref.alternatives) {
    const paginated = ref.alternatives.find(a => a.variant.includes('pagination'))
    if (paginated) return { file: paginated.file, structure_at: paginated.structure, ... }
  }

  if (intent.capabilities.includes('authorization') && ref.alternatives) {
    const rbac = ref.alternatives.find(a => a.variant.includes('RBAC'))
    if (rbac) return { file: rbac.file, structure_at: rbac.structure, ... }
  }

  // Default: primary reference
  return {
    file: ref.file,
    type: inferReferenceType(ref.file),
    structure_at: ref.structure,
    imports_at: ref.imports,
    handler_at: ref.handler || null,
    tests: ref.tests ? {
      file: ref.tests.file,
      structure_at: ref.tests.structure,
      mock_at: ref.tests.mocks || null
    } : null,
    secondary: []
  }
}
```

---

## 6. File Ownership Resolver

### 6.1 Purpose

Determines exactly which files to create, modify, or forbid. Answers "where does this code go?" before the Builder ever runs.

### 6.2 Ownership Rules

```typescript
const OWNERSHIP_RULES: Record<string, OwnershipRule> = {
  route: {
    directory: 'src/api/routes/',
    naming: '{resource}.ts',
    co_located_tests: 'src/api/routes/__tests__/{resource}.test.ts',
    max_lines: 80,
    owns: ['HTTP request/response', 'input validation', 'response formatting'],
    never_owns: ['business logic', 'database queries', 'domain types'],
  },
  service: {
    directory: 'src/api/services/',
    naming: '{resource}.ts',
    co_located_tests: 'src/api/services/__tests__/{resource}.test.ts',
    max_lines: 200,
    owns: ['business logic', 'orchestration', 'domain rules'],
    never_owns: ['HTTP types', 'SQL queries', 'response formatting'],
  },
  repository: {
    directory: 'src/api/repositories/',
    naming: '{resource}.ts',
    co_located_tests: 'src/api/repositories/__tests__/{resource}.test.ts',
    owns: ['database queries', 'data access', 'query composition'],
    never_owns: ['business logic', 'HTTP types', 'validation'],
  },
  middleware: {
    directory: 'src/api/middleware/',
    naming: '{purpose}.ts',
    co_located_tests: 'src/api/middleware/__tests__/{purpose}.test.ts',
    owns: ['cross-cutting concerns', 'auth', 'logging', 'rate limiting'],
    never_owns: ['business logic', 'route-specific logic'],
  },
  validation: {
    directory: 'src/shared/validation/',
    naming: '{resource}.ts',
    owns: ['Zod schemas', 'input validation rules'],
    never_owns: ['business logic', 'HTTP types', 'domain types'],
  },
  type: {
    directory: 'src/shared/types/',
    naming: '{resource}.ts',
    owns: ['TypeScript interfaces', 'type guards', 'enums'],
    never_owns: ['implementations', 'validation logic'],
  },
  component: {
    directory: 'src/web/components/',
    naming: '{name}.tsx',
    co_located_tests: 'src/web/components/__tests__/{name}.test.tsx',
    owns: ['rendering', 'user interaction'],
    never_owns: ['data fetching', 'business logic', 'global state'],
  },
  hook: {
    directory: 'src/web/hooks/',
    naming: 'use{Name}.ts',
    co_located_tests: 'src/web/hooks/__tests__/use{Name}.test.ts',
    owns: ['state management', 'side effects', 'data fetching'],
    never_owns: ['rendering', 'routing'],
  },
  test: {
    directory: '__tests__/',  // Co-located with source
    naming: '{source_file}.test.ts',
    owns: ['test cases', 'assertions', 'mocks'],
    never_owns: ['implementation', 'business logic'],
  },
}
```

### 6.3 Resolution

```typescript
function resolveOwnership(intent: Intent, contract: Contract): Ownership {
  const primary = OWNERSHIP_RULES[intent.architecture.primary_layer]
  const moduleName = intent.architecture.module

  const create: FileEntry[] = []
  const modify: FileEntry[] = []
  const forbidden: FileEntry[] = []

  // Primary file
  if (contract.affected_files?.create) {
    for (const file of contract.affected_files.create) {
      create.push({ path: file, type: intent.architecture.primary_layer, skeleton_id: generateSkeletonId(file), reason: 'Contract specified' })
    }
  } else {
    // Auto-generate file paths from ownership rules
    const filePath = path.join(primary.directory, primary.naming.replace('{resource}', moduleName))
    create.push({ path: filePath, type: intent.architecture.primary_layer, skeleton_id: generateSkeletonId(filePath), reason: `Primary ${intent.architecture.primary_layer} for ${moduleName}` })

    // Co-located test file
    if (primary.co_located_tests) {
      const testPath = primary.co_located_tests.replace('{resource}', moduleName).replace('{purpose}', moduleName).replace('{name}', moduleName)
      create.push({ path: testPath, type: 'test', skeleton_id: generateSkeletonId(testPath), reason: 'Tests required by CON-test-required' })
    }

    // Shared validation if needed
    if (capabilities.has('api-validation')) {
      const valPath = OWNERSHIP_RULES.validation.directory + OWNERSHIP_RULES.validation.naming.replace('{resource}', moduleName)
      create.push({ path: valPath, type: 'validation', skeleton_id: generateSkeletonId(valPath), reason: 'Zod schemas per CON-route-purity' })
    }
  }

  // Files to modify (from contract)
  for (const file of (contract.affected_files?.modify || [])) {
    modify.push({ path: file.path, at_lines: file.lines, reason: file.reason, preserve: file.preserve || [] })
  }

  // Forbidden files
  for (const file of (contract.affected_files?.forbidden || [])) {
    forbidden.push({ path: file, reason: 'Out of scope for this task' })
  }

  return { create, modify, forbidden }
}
```

---

## 7. Modification Scope Resolver

### 7.1 Purpose

Defines the exact boundary of allowed changes. The Builder cannot touch files outside this boundary. If the model attempts to modify a forbidden file, the verification pipeline blocks it.

### 7.2 Scope Definition

```typescript
interface ModificationScope {
  // EXPLICITLY ALLOWED
  allowed_create: string[]      // File paths that CAN be created
  allowed_modify: {
    path: string
    lines: string | null        // null = whole file, "10-45" = specific range
  }[]

  // EXPLICITLY FORBIDDEN
  forbidden_modify: string[]    // Files that CANNOT be modified at all
  forbidden_delete: string[]    // Files that CANNOT be deleted

  // INTERFACES
  preserved_interfaces: {
    file: string
    exports: string[]          // Function/class names that must keep their signature
  }[]

  // DEPENDENCIES
  allowed_new_dependencies: string[]  // Packages that CAN be added
  forbidden_new_dependencies: string[] // Packages that CANNOT be added
}
```

### 7.3 Enforcement

The scope is enforced at two levels:
1. **Pre-execution**: The IIR's constraints block tells the model what's off-limits
2. **Post-execution**: The verification pipeline checks the diff; any change outside the scope is a blocking failure

---

## 8. Implementation Skeleton Generator

### 8.1 Purpose

Generates function signatures, import blocks, validation structure, and test structure BEFORE the Builder writes any business logic. The Builder fills in the business logic — nothing else.

### 8.2 Skeleton Generation

```typescript
function generateSkeleton(
  intent: Intent,
  pattern: PatternBinding,
  reference: CanonicalReference,
  ownership: Ownership,
): Skeleton[] {
  const skeletons: Skeleton[] = []

  for (const file of ownership.create) {
    const skeleton: Skeleton = {
      id: file.skeleton_id,
      file: file.path,
      imports: [],
      exports: [],
      structure: { prelude: [], placeholder: '', postlude: [] },
      tests: null,
    }

    if (file.type === 'route') {
      skeleton.imports = extractImportsFromReference(reference, 'imports_at')
      skeleton.exports = [{
        name: 'router',
        kind: 'router',
        signature: 'const router = Router()',
        is_default: true,
      }]
      skeleton.structure.prelude = [
        "// Validate input using Zod schema",
        reference.imports_at ? `// Import pattern: see ${reference.file}:${reference.imports_at}` : '',
      ]
      skeleton.structure.placeholder = `// IMPLEMENT: Route handlers for ${intent.task_description}`
      skeleton.structure.postlude = [
        'export default router',
      ]
    }

    if (file.type === 'service') {
      skeleton.imports = [
        `import { ${intent.architecture.module}Repo } from '../repositories/${intent.architecture.module}'`,
        `import { NotFoundError, ValidationError } from '../models/errors'`,
      ]
      skeleton.exports = intent.contract?.functions?.map(fn => ({
        name: fn.name,
        kind: 'function' as const,
        signature: fn.signature,
        is_default: false,
      })) || [{
        name: `${intent.architecture.module}Service`,
        kind: 'const' as const,
        signature: `export const ${intent.architecture.module}Service = {`,
        is_default: false,
      }]
      skeleton.structure.placeholder = `// IMPLEMENT: Business logic for ${intent.task_description}`
      skeleton.structure.postlude = ['}']
    }

    if (file.type === 'repository') {
      skeleton.imports = extractImportsFromReference(reference, 'imports_at')
      skeleton.exports = [{
        name: `${intent.architecture.module}Repo`,
        kind: 'const',
        signature: `export const ${intent.architecture.module}Repo = {`,
        is_default: false,
      }]
      skeleton.structure.placeholder = `// IMPLEMENT: Database queries for ${intent.architecture.module}`
      skeleton.structure.postlude = ['}']
    }

    // Generate test skeleton
    if (file.type !== 'test' && ownership.create.some(f => f.type === 'test')) {
      skeleton.tests = generateTestSkeleton(intent, pattern, reference, file)
    }

    skeletons.push(skeleton)
  }

  return skeletons
}

function extractImportsFromReference(ref: CanonicalReference, field: string): string[] {
  // In production: read the reference file and extract the specified lines
  // For the IIR: include the exact import lines as strings
  return [
    `// Copy imports from ${ref.file}:${(ref as any)[field]}`,
  ]
}

function generateTestSkeleton(
  intent: Intent,
  pattern: PatternBinding,
  reference: CanonicalReference,
  sourceFile: FileEntry,
): TestSkeleton {
  return {
    file: sourceFile.path.replace('.ts', '.test.ts').replace('src/', 'src/__tests__/'),
    imports: [
      `import { describe, it, expect, vi, beforeEach } from 'vitest'`,
      `// Copy mock setup from ${reference.tests?.file}:${reference.tests?.mock_at}`,
    ],
    describe_block: `describe('${path.basename(sourceFile.path, '.ts')}', () => {`,
    test_cases: [
      {
        name: 'should handle success case',
        arrange: '// Arrange: set up test data and mocks',
        act: '// Act: call the function under test',
        assert: ['// Assert: verify the expected outcome'],
      },
      {
        name: 'should handle error case',
        arrange: '// Arrange: set up failure conditions',
        act: '// Act: call the function under test',
        assert: ['// Assert: verify error handling'],
      },
    ],
  }
}
```

### 8.3 Example Skeleton Output

```typescript
// src/api/routes/auth.ts — GENERATED SKELETON
// DO NOT modify structure. Fill only the IMPLEMENT placeholder.

import { Router } from 'express'
import { authService } from '../services/auth'
import { loginSchema, registerSchema } from '../../shared/validation/auth'
import { auth, validate } from '../middleware'
// Copy imports from src/api/routes/users.ts:1-9

const router = Router()

// Validate input using Zod schema
// Import pattern: see src/api/routes/users.ts:1-9

// IMPLEMENT: Route handlers for user authentication with JWT tokens

// POST /auth/login — validate credentials, return tokens
// POST /auth/register — create user, return tokens
// POST /auth/refresh — rotate refresh token
// POST /auth/logout — invalidate refresh token

export default router
```

---

## 9. Verification Contract Generator

### 9.1 Purpose

Generates the exact verification commands and acceptance criteria. The Builder runs these commands in order. If any fail, the Builder must fix the code (not the contract).

### 9.2 Generation

```typescript
function generateVerification(intent: Intent, ownership: Ownership, constraints: Constraint[]): Verification {
  const testFiles = ownership.create
    .filter(f => f.type === 'test')
    .map(f => f.path)
    .join(' ')

  const affectedTestFiles = ownership.modify
    .map(f => f.path.replace('.ts', '.test.ts'))
    .filter(f => fs.existsSync(f))
    .join(' ')

  return {
    commands: {
      lint: 'npm run lint',
      typecheck: 'npm run typecheck',
      test: testFiles ? `npm test -- ${testFiles}` : 'npm test',
      test_all: ownership.modify.length > 3 ? 'npm test' : null,
    },
    acceptance: generateAcceptanceCriteria(intent),
    compliance: constraints.map(c => ({
      pattern_id: c.id,
      check: c.title,
    })),
    coverage: resolveCoverage(intent),
  }
}

function generateAcceptanceCriteria(intent: Intent): string[] {
  // Convert the contract's acceptance criteria into verifiable statements
  // Each criterion must be binary: it passes or it doesn't
  return intent.contract?.acceptance_criteria || [
    'All new code compiles without type errors',
    'All tests pass',
    'Lint has zero errors',
    'New routes are auth-gated unless explicitly public',
    'New services have no HTTP framework imports',
    'New repositories contain all SQL queries',
  ]
}
```

---

## 10. Context Serializer

### 10.1 Purpose

Converts the Implementation IR into the optimal prompt format for the model. This is where cache optimization happens — the serialization format maximizes stable prefix reuse.

### 10.2 Serialization Strategy

```
STABLE PREFIX (identical across all Builders):
  - Builder role definition (always the same)
  - Constraints (CON atoms, always loaded)
  - Project identity (rarely changes)
  
  CACHE BREAKPOINT ← Provider caching boundary

DYNAMIC CONTENT (varies per task):
  - Task description (from intent)
  - Pattern summary (from binding)
  - Reference file and line ranges (from resolver)
  - File ownership (from resolver)
  - Implementation skeletons (from generator)
  - Verification contract (from generator)
```

### 10.3 Output Format

The serialized output is structured text, not prose:

```markdown
## Task
Implement JWT-based authentication routes (login, register, refresh, logout).

## Pattern
Follow PAT-jwt-rotation v1.1.0 for token lifecycle.
Use PAT-route-handler for route structure.
Use PAT-error-handling for error responses.

## Reference
Read src/api/routes/users.ts:10-48 for the route handler structure.
Read src/api/routes/__tests__/users.test.ts:1-14 for mock setup.
Read src/api/middleware/auth.ts:1-40 for auth middleware usage.

## Files

### CREATE src/api/routes/auth.ts
```
[SKELETON — imports, structure, placeholder for business logic]
```

### CREATE src/api/routes/__tests__/auth.test.ts
```
[TEST SKELETON — imports, describe block, test case templates]
```

### CREATE src/shared/validation/auth.ts
```
[VALIDATION SKELETON — Zod schemas for login, register]
```

### MODIFY src/api/index.ts
Add `app.use('/api/v1/auth', authRoutes)` after line 42.
PRESERVE: Existing route registrations.

### FORBIDDEN
- src/api/services/users.ts (out of scope)
- src/api/middleware/auth.ts (modify only if contract specifies)

## Verification
1. npm run lint
2. npm run typecheck
3. npm test -- src/api/routes/__tests__/auth.test.ts

## Acceptance
- POST /auth/login returns 200 with access_token and refresh_token
- POST /auth/login returns 401 with invalid credentials
- POST /auth/register returns 201 with user data
- POST /auth/refresh returns 200 with new tokens
- Reused refresh token returns 401 with TOKEN_REPLAY
```

This is the entire prompt the Builder receives. Nothing more. The Builder does exactly what it says — no exploration, no inference, no decision-making.

---

## 11. Builder Runtime

### 11.1 Reduced Responsibility Contract

```
BUILDER MUST:
  ✓ Read the files specified in References (exact paths, exact line ranges)
  ✓ Fill the implementation skeletons with business logic
  ✓ Run verification commands in order
  ✓ Fix code if verification fails (only the generated code, not the plan)
  ✓ Report completion with verification results

BUILDER MUST NOT:
  ✗ Choose which pattern to follow
  ✗ Choose where to put files
  ✗ Choose what to import
  ✗ Choose what to name things
  ✗ Explore the codebase to find patterns
  ✗ Modify files outside the modification scope
  ✗ Change the verification contract
  ✗ Add dependencies not in the allowed list
  ✗ Redesign the architecture
  ✗ Interpret requirements — they are already resolved
```

### 11.2 Execution Flow

```
1. RECEIVE IIR (serialized as prompt)
   ↓
2. READ REFERENCES
   - Read {file} at {line_range} for each reference
   - Never read beyond specified lines
   - Never read files not in references
   ↓
3. FILL SKELETONS
   - For each skeleton: replace IMPLEMENT placeholder with business logic
   - Match the reference structure exactly (same error handling, same validation, same response format)
   - Copy imports from reference where specified
   ↓
4. VERIFY
   - Run lint → fix if fails
   - Run typecheck → fix if fails
   - Run tests → fix if fails
   - Check acceptance criteria
   - If any fail: fix code only, return to step 4
   ↓
5. REPORT
   - All verification commands passed: true/false
   - Files created: [list]
   - Files modified: [list]
   - Test results: { passed: N, failed: 0 }
   - Any deviations from IIR: [list or "none"]
```

### 11.3 Error Handling Within the Builder

If the Builder encounters a situation not covered by the IIR:
1. Implement the closest reasonable approach following the reference pattern
2. Flag it as a deviation in the report
3. Do NOT stop and ask for guidance (that introduces latency)

The Reflection Engine will catch recurring deviations and propose IIR improvements.

---

## 12. Deterministic Verification Pipeline

### 12.1 Pipeline Stages

```
VERIFICATION PIPELINE (runs after every Builder completion):

STAGE 1: SCOPE CHECK (deterministic)
  Verify: git diff shows changes ONLY in allowed_modify + allowed_create files
  Failure: BLOCKING — Builder must revert disallowed changes

STAGE 2: LINT (deterministic)
  Run: verification.commands.lint
  Failure: BLOCKING — Builder must fix lint errors

STAGE 3: TYPECHECK (deterministic)
  Run: verification.commands.typecheck
  Failure: BLOCKING — Builder must fix type errors

STAGE 4: TESTS (deterministic)
  Run: verification.commands.test
  Failure: BLOCKING — Builder must fix test failures

STAGE 5: ACCEPTANCE (semi-deterministic)
  Check: Each acceptance criterion is met
  Failure: BLOCKING — Builder must implement missing criteria

STAGE 6: COMPLIANCE (deterministic)
  Check: constraints preserved (no forbidden imports, preserved interfaces intact)
  Failure: BLOCKING — Builder must fix compliance violations

STAGE 7: COVERAGE (deterministic)
  Check: coverage threshold met (if specified)
  Failure: ADVISORY — Builder should add tests but may proceed
```

### 12.2 Pipeline as Code

```typescript
interface VerificationResult {
  stage: string
  passed: boolean
  command: string | null
  output: string | null
  duration_ms: number
}

async function verify(builderOutput: BuilderOutput, iir: ImplementationIR): Promise<VerificationReport> {
  const results: VerificationResult[] = []

  // Stage 1: Scope
  const diff = await bash('git diff --name-only')
  const changedFiles = diff.split('\n').filter(Boolean)
  const allowed = [...iir.ownership.create.map(f => f.path), ...iir.ownership.modify.map(f => f.path)]
  const violations = changedFiles.filter(f => !allowed.includes(f))
  results.push({
    stage: 'scope',
    passed: violations.length === 0,
    command: null,
    output: violations.length > 0 ? `Forbidden changes: ${violations.join(', ')}` : null,
    duration_ms: 0,
  })

  if (!results[results.length - 1].passed) {
    return { passed: false, results, message: 'Scope violation: Builder changed forbidden files' }
  }

  // Stages 2-7 execute sequentially, each blocking on failure
  const stages = [
    { name: 'lint', cmd: iir.verification.commands.lint },
    { name: 'typecheck', cmd: iir.verification.commands.typecheck },
    { name: 'test', cmd: iir.verification.commands.test },
  ]

  for (const stage of stages) {
    const start = Date.now()
    try {
      const output = await bash(stage.cmd)
      results.push({ stage: stage.name, passed: true, command: stage.cmd, output, duration_ms: Date.now() - start })
    } catch (err) {
      results.push({ stage: stage.name, passed: false, command: stage.cmd, output: String(err), duration_ms: Date.now() - start })
      return { passed: false, results, message: `${stage.name} failed` }
    }
  }

  return { passed: true, results, message: 'All verification stages passed' }
}
```

---

## 13. Reflection Integration

### 13.1 What to Observe

With the Builder no longer making decisions, reflections shift from "did the model make good choices?" to "was the IIR correct and complete?"

| Reflection Type | Trigger | Data |
|---|---|---|
| `iir_sufficient` | Builder completed with zero deviations | IIR + verification results |
| `iir_insufficient` | Builder reported deviations | Deviations list + IIR |
| `pattern_bound_incorrectly` | Pattern compliance check failed | Bound PAT vs actual implementation |
| `reference_outdated` | Reference file structure changed but atom not updated | Reference file hash vs atom version |
| `skeleton_incomplete` | Builder needed to add structure beyond skeleton | Skeleton diff vs implementation |
| `verification_too_strict` | Acceptance criteria failed but implementation was correct | Criteria + implementation |
| `scope_too_narrow` | Builder needed to modify files outside scope for correctness | Changed files + justification |

### 13.2 Reflection-Driven IIR Improvement

When reflections accumulate indicating IIR issues:
1. Clustering identifies the specific resolver at fault
2. Candidates propose resolver rule changes
3. Experiments validate improved rules
4. Promoted changes update the resolver logic

The IIR itself evolves through the same reflection → candidate → experiment → promotion pipeline as knowledge atoms.

---

## 14. Metrics

### 14.1 Builder Performance

| Metric | Current (undeterministic) | Target (deterministic) |
|---|---|---|
| First-pass success rate | ~60% | >85% |
| Average review iterations | 1.4 | <0.5 |
| Files explored per task | 5-15 | ≤3 (exactly the references) |
| Human edits after Builder | ~15% of lines | <5% |
| Token usage per task | ~4,000 | <1,500 |
| Cache hit ratio | ~20% | >70% |
| Pattern compliance | ~80% | >95% |
| Architecture violations | ~12% | <2% |
| Time to completion | Variable | Predictable (under 5 min) |

### 14.2 IIR Quality

| Metric | Description |
|---|---|
| IIR completeness rate | % of tasks where Builder reported zero deviations |
| Skeleton fill rate | % of skeleton placeholders filled without additional structure |
| Reference validity | % of references where the file and line ranges were correct |
| Ownership accuracy | % of tasks where no files needed to be created outside ownership |

---

## 15. Evolution

### 15.1 What Evolves

| Component | Evolves Through | Trigger |
|---|---|---|
| Intent Resolver rules | Candidate pipeline | Capability→layer mappings proven wrong by reflections |
| Pattern bindings | Candidate pipeline | Bound pattern consistently causes compliance failures |
| Canonical references | Automated update | Reference file changes detected by git |
| Ownership rules | Candidate pipeline | Repeated scope violations indicating ownership too narrow |
| Skeleton templates | Candidate pipeline | Repeated skeleton incompleteness |
| Verification criteria | Candidate pipeline | Repeated false-positive acceptance failures |
| Builder prompt format | Compiler evolution | Cache hit ratio trends |

### 15.2 Self-Tuning Loop

```
Builder execution → Verification results → Reflection Engine →
  Pattern detection → Candidate generation → Experiment validation →
  IIR resolver update → Next Builder execution (improved)
```

The longer the system runs, the fewer deviations the Builder reports, and the closer the framework gets to 100% deterministic implementation.

---

*End of Deterministic Implementation Runtime Architecture.*
