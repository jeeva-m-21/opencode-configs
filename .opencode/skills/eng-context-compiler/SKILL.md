---
name: eng-context-compiler
description: Context Compiler architecture — deterministic context optimization engine for minimizing tokens, maximizing prompt caching, and resolving only required knowledge for each model invocation
license: MIT
compatibility: opencode
metadata:
  domain: ai-engineering
  audience: orchestrator
  priority: foundational
  extends: eng-ai-context
---

## Context Compiler

The Context Compiler is the framework's context optimization engine. It is NOT another agent or workflow — it is an infrastructure component that sits between the Orchestrator and every model invocation.

### Core Responsibility

Construct the smallest, highest-quality, most cache-friendly execution context possible for each specific task.

### Design Properties

- **Deterministic** — same inputs always produce identical output (zero LLM calls, zero randomness)
- **Capability-driven** — knowledge selected by required engineering capabilities, not topics
- **Cache-aware** — stable prefix design maximizes provider-side prompt caching
- **Budget-aware** — respects per-agent token budgets, compresses when over budget
- **Atomic** — knowledge decomposed into independently selectable atoms

### Compilation Pipeline

```
Parse → Capability Resolve → Dependency Resolve → Atom Expand →
Deduplicate → Compress → Assemble → Validate → Output
```

### Knowledge Registry

The `state/knowledge-registry.json` maps capabilities to knowledge modules and atoms. This is the compiler's single source of truth for all knowledge selection.

### Key Inputs

- Task description and keywords
- Execution contract (if available)
- Target agent type (builder, reviewer, analyst, etc.)
- Project state (phase, decisions, cache)
- Repository metadata (stack, structure, dependencies)

### Key Outputs

- Stable prefix (identical across invocations for cache hits)
- Dynamic content (task-specific knowledge atoms)
- Compilation metadata (audit log, token counts, cache info)

### Usage

The Orchestrator calls the `context-compiler` custom tool before dispatching any subagent. The compiled context replaces the raw contract + documents bundle as the subagent's briefing.

Full architecture: `docs/context-compiler-architecture.md`
Knowledge registry: `state/knowledge-registry.json`

### Extending

To register a new knowledge module:
1. Add to `state/knowledge-registry.json` under `modules`
2. Map its atoms to capabilities under `provides`
3. Declare dependencies under `depends_on`
4. Set audience filter
5. The compiler automatically resolves it when capabilities match
