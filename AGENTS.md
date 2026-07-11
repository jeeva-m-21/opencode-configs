# OpenCode Engineering Framework

This project uses the OpenCode Engineering Framework — an autonomous, contract-driven AI engineering platform. The framework provides agents, commands, skills, knowledge modules, and conventions that adapt to any project.

## How the Framework Adapts

The framework uses a **layered rules approach**:

1. **Framework rules** (this file) — Agent hierarchy, workflow pipeline, execution contracts, knowledge system. These apply to every project.
2. **Project rules** (add below) — Your project's specific conventions, tech stack, commands, and standards. Add these when you adopt the framework.

## Framework Architecture

```
User (objective) → Orchestrator → Analyst  (explore codebase)
                                  → Builder  (implement changes)
                                  → Reviewer (validate changes)
                                  → Docs     (documentation)
                                  → Security (vulnerability scanning)
```

| Agent | Type | Purpose |
|---|---|---|
| **Orchestrator** | Primary | Classify requests, produce execution contracts, dispatch subagents |
| **Analyst** | Subagent | Read-only codebase exploration, search, summarization |
| **Builder** | Subagent | Code implementation, refactoring, test writing |
| **Reviewer** | Subagent | Validates changes against execution contracts |
| **Docs-writer** | Subagent | Documentation generation and maintenance |
| **Security-auditor** | Subagent | Vulnerability scanning, security review |

## Execution Contract System

Every task flows through a structured contract (`state/contract.md`) — the single source of truth:

```
User request → Orchestrator → produces contract → Builder consumes → Reviewer validates
```

**The contract eliminates repeated reasoning:**
- Builder never re-explores (contract specifies files + line ranges + pattern reference)
- Reviewer never re-interprets (contract IS the requirements)  
- Knowledge modules loaded deterministically (contract specifies which ones)

## Workflow Pipeline

```
/plan-feature    → Orchestrator produces execution contract → state/contract.md
/build-feature   → Builder implements from contract (no re-exploration)
/review-feature  → Reviewer validates against contract
/test-feature    → Builder verifies acceptance criteria
/commit-feature  → Builder commits, contract referenced in commit
```

For bugs: `/fix-bug` (Path A: direct, B: lightweight contract, C: full contract)
For triage: `/analyze` (classify request, estimate scope, select workflow)
For context: `/generate-context` (caches repo structure and dependencies)
For releases: `/release` (uses git-release skill)

## Knowledge System

Engineering standards are centralized in the knowledge system:

```
Engineering Handbook (docs/engineering-handbook.md)
  └── Always loaded — platform principles, knowledge index, loading strategy

Knowledge Modules (.opencode/skills/eng-*/)
  └── Lazy-loaded via skill tool — domain-specific implementation guidance
```

Agents load only the modules relevant to their task. Never preemptively.

## State Management

Framework state persists across sessions:

```
state/
├── contract.md      ← Execution contract — THE source of truth
├── phase.json       ← Current workflow phase and task progress
├── decisions.md     ← Architecture decision log
└── cache/
    ├── repo-structure.json   ← Generated file tree summary
    └── dependency-graph.json ← Module dependency graph
```

## Key Conventions

1. **Classify before executing** — The Orchestrator determines what type of work is needed
2. **The contract is the standard** — Created once, consumed by all downstream agents
3. **Smallest scope always wins** — Trivial changes don't need contracts or pipelines
4. **Subagents for specialized work** — Don't have the Orchestrator do everything
5. **Skills load on demand** — Knowledge modules loaded only when needed
6. **Custom tools extend capabilities** — `repo-analyzer`, `state-reader`, `env-validator`
7. **Plugins enforce policies** — State-manager, policy-enforcer, context-optimizer
8. **Never commit secrets** — .env files, credentials, tokens

# Project-Specific Rules

_Add your project's conventions below. The framework will enforce these alongside its own rules._

## Project Overview
<!-- Brief description of what this project does -->

## Tech Stack
<!-- e.g., TypeScript, React, Express, PostgreSQL, etc. -->

## Project Structure
<!-- Directory layout, key modules, architecture decisions -->

## Commands
<!-- Build, lint, test, typecheck commands -->
```
# Example:
# Build: npm run build
# Lint: npm run lint
# Test: npm test -- --coverage
# Typecheck: npm run typecheck
```

## Conventions
<!-- Code style, naming, patterns specific to this project -->

## External Documentation
<!-- Links to API docs, design specs, relevant references -->
