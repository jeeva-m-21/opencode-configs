# OpenCode Engineering Framework

This project defines an engineering framework built on OpenCode's native capabilities. It provides agents, commands, skills, tools, plugins, and conventions for autonomous software engineering.

## Framework Architecture

The framework is organized as an engineering organization:

```
User (objective) → Orchestrator (primary agent) → Specialized subagents
                                                     ├── Analyst (explore codebase)
                                                     ├── Builder (implement changes)
                                                     ├── Reviewer (validate changes)
                                                     ├── Docs-writer (documentation)
                                                     └── Security-auditor (vulnerability scanning)
```

## Agent Hierarchy

| Agent | Type | Model Tier | Purpose |
|---|---|---|---|
| **Orchestrator** | Primary | Premium | Workflow management, decision-making, dispatching |
| **Analyst** | Subagent | Cheap | Read-only codebase exploration, search, summarization |
| **Builder** | Subagent | Premium | Code implementation, refactoring, test writing |
| **Reviewer** | Subagent | Cheap | Code review, linting, pattern validation |
| **Docs-writer** | Subagent | Cheap | Documentation generation and maintenance |
| **Security-auditor** | Subagent | Cheap | Vulnerability scanning, security review |

## Decision-Making Framework

The Orchestrator uses a structured decision process for every request:

### 1. Triage First

Every request is classified before any action is taken. The Orchestrator determines: task type, scope, workflow, and whether to proceed autonomously or ask the user.

For complex or ambiguous requests, the Orchestrator can load the `workflow-selector` skill for detailed guidance, or use `/analyze` command for lightweight triage.

### 2. Task Classification Matrix

| Request Pattern | Task Type | Typical Workflow |
|---|---|---|
| "Add/create/implement/build" | Feature | Analyze → Plan → Build → Review → Test → Commit |
| "Fix/bug/error/broken" | Bug fix | Analyst (root cause) → Builder (fix) → Test |
| "Refactor/restructure/clean up" | Refactor | Plan → Build → Review → Test |
| "Document/readme/explain/docs" | Documentation | Docs-writer directly |
| "Review/check/look at" | Review | Reviewer directly |
| "How/where/what + codebase" | Exploration | Analyst directly |
| "Secure/vulnerability/audit" | Security | Security-auditor directly |
| "Release/deploy/publish/ship" | Release | /release command |
| "Slow/lag/performance/optimize" | Performance | Performance skill → Plan → Build |
| "Test/coverage/verify" | Testing | Builder for test work |

### 3. Scope-Based Routing

| Scope | Files | Overhead |
|---|---|---|
| Trivial | 1 | Direct dispatch, no plan |
| Small | 2-3 | Light plan, direct Builder |
| Medium | 4-10 | Full plan → build → review |
| Large | 10-20 | Full pipeline, phased |
| Major | 20+ | Warn user, propose incremental delivery |

### 4. Autonomous Decision Rules

| Situation | Action |
|---|---|
| Unambiguous, scope ≤ 3 files | Proceed without asking |
| Maps to single command/agent | Execute directly |
| 3+ possible interpretations | Ask ONE clarifying question |
| Multi-step pipeline needed | Confirm pipeline, then execute |
| Affects >5 files or core architecture | Warn but proceed if clear |
| New dependency required | Ask for confirmation |
| Bug in unfamiliar subsystem | Always dispatch Analyst first |

Always prefer the smallest possible execution scope. Never enter a full pipeline when a single subagent dispatch would suffice.

## Execution Contract System

Every engineering task is defined by an execution contract (`state/contract.md`). The contract is the single source of truth — created once during planning, consumed by every downstream agent.

```
User request → Orchestrator classifies → produces contract → Builder consumes → Reviewer validates against contract
```

**The contract eliminates repeated reasoning:**
- Builder never re-explores the codebase (contract specifies affected files)
- Builder never re-discovers patterns (contract specifies a pattern reference)
- Builder never re-decides what to load (contract specifies knowledge modules)
- Reviewer never re-interprets requirements (contract IS the requirements)

## Workflow Pipeline

Feature work follows a contract-driven phased pipeline:

```
/plan-feature    → Orchestrator produces execution contract → state/contract.md
/build-feature   → Builder implements from contract (no re-exploration)
/review-feature  → Reviewer validates against contract
/test-feature    → Builder verifies acceptance criteria
/commit-feature  → Builder commits, contract referenced in commit message
```

For bugs: `/fix-bug` (Path A: direct fix, B: lightweight contract, C: full contract)
For context: `/generate-context` (caches repo structure and dependencies)
For triage: `/analyze` (classify request, estimate scope, select workflow)
For releases: `/release` (uses git-release skill)

## State Management

Framework state persists across sessions in the `state/` directory:

```
state/
├── contract.md      ← Execution contract — THE source of truth for current work
├── phase.json       ← Current workflow phase and task progress
├── decisions.md     ← Architecture decision log
├── plan.md          ← Deprecated (use contract.md instead)
├── analysis.json    ← Latest triage result (generated by /analyze)
└── cache/
    ├── repo-structure.json   ← Generated file tree summary
    └── dependency-graph.json ← Module dependency graph
```

Agents read contract.md to understand what work is active. State files should be committed to git.

## Context Efficiency Rules

The framework minimizes token usage through strict rules:

1. **Cache before explore** — Read `state/cache/` files before reading source code
2. **Targeted exploration** — One precise grep before reading any file; read line ranges, not whole files
3. **Minimal subagent briefings** — Give subagents only the specific information they need, not full conversation history
4. **Trust memory** — Don't re-read files you've already read this session
5. **Direct over pipeline** — Use single agent dispatch when a full pipeline isn't needed
6. **Skill lazy-loading** — Skills load only when their guidance is needed
7. **MCP per-agent** — MCP servers enabled only on agents that use them
8. **Compaction with state injection** — Custom compaction hooks preserve framework state across context resets

## Platform Standards

This organization builds software on a defined platform. The authoritative specification is at `docs/platform-specification.md`. All agents and all projects follow these standards.

**Stack:** TypeScript (strict) / Bun / React 18+ / Next.js or Vite / Hono or Express / PostgreSQL 16+ / Drizzle ORM / Redis / Zod / JWT Auth / Vitest / Docker / GitHub Actions

**Architecture:** `src/api/` (routes → services → repositories), `src/web/` (pages → components), `src/shared/` (types, validation, utilities). Tests co-located in `__tests__/`.

**API:** REST with structured JSON envelopes. `/api/v1/{resource}`. Auth-gated by default.

**Every agent must comply with the platform specification.** If the spec says "use Drizzle ORM with repository pattern," that's what gets built. No exceptions without explicit user approval.

## Engineering Knowledge System

Engineering standards are centralized in the knowledge system, not scattered across agent prompts.

### Architecture

```
Engineering Handbook (docs/engineering-handbook.md)
  └── Always loaded via instructions — platform overview, principles, knowledge index

Platform Specification (docs/platform-specification.md)
  └── Always loaded via instructions — definitive stack, structure, and conventions

Knowledge Modules (.opencode/skills/eng-*/)
  └── Lazy-loaded via skill tool — domain-specific implementation guidance
```

### Knowledge Modules

| Module | Content | When to Load |
|---|---|---|
| `eng-architecture` | Architecture patterns, decisions, principles | Designing system structure |
| `eng-api-design` | REST/GraphQL standards, versioning, error responses | Creating/modifying APIs |
| `eng-backend` | Service design, middleware, async processing | Backend implementation |
| `eng-frontend` | Component design, state, routing, accessibility | Frontend implementation |
| `eng-database` | Schema design, queries, migrations | Database work |
| `eng-security` | Auth, OWASP, secrets, dependency security | Security reviews, auth work |
| `eng-testing` | Strategy, patterns, coverage, mocking | Writing/reviewing tests |
| `eng-performance` | Profiling, optimization, caching | Performance work |
| `eng-observability` | Logging, metrics, tracing, alerting | Adding observability |
| `eng-deployment` | CI/CD, deployment strategies, environments | Deployment work |
| `eng-error-handling` | Error taxonomy, recovery, logging standards | Error handling implementation |
| `eng-refactoring` | Safe refactoring patterns, when to refactor | Restructuring code |
| `eng-documentation` | Doc types, structure, JSDoc standards | Writing documentation |
| `eng-code-review` | Review checklist, feedback standards | Reviewing code |
| `eng-production` | Production readiness, SRE checklist | Pre-deployment review |
| `eng-ai-prompt` | Prompt structure, delegation patterns | Writing agent briefings |
| `eng-ai-context` | Context budgets, caching, compaction | Optimizing token usage |
| `eng-ai-mcp` | MCP selection, token impact, configuration | Configuring MCP servers |

### Loading Strategy

1. **Engineering handbook** — always in context (loaded via `instructions`)
2. **Domain knowledge** — loaded by agents via `skill({ name: "eng-<domain>" })` when task requires it
3. **Workflow skills** — existing skills (`git-release`, `security-audit`, etc.) provide execution workflows and reference knowledge modules
4. **Never preemptively load** — each knowledge module costs context tokens. Load only what the current task needs.

## Key Conventions

1. **Use the Orchestrator agent** as the default primary agent. Press Tab to cycle between Orchestrator (default) and Plan modes.

2. **Classify before executing.** The Orchestrator determines what type of work is needed before dispatching agents.

3. **Smallest scope always wins.** Trivial changes don't need planning. Bug fixes don't need the full pipeline.

4. **State files are the bridge between sessions.** When resuming work, the first thing the Orchestrator does is read `state/phase.json`.

5. **Subagents for specialized work.** Don't have the Orchestrator do everything. Dispatch to Analyst for code exploration, Builder for implementation, etc.

6. **Skills load on demand.** The framework provides skills for workflow execution and knowledge modules for engineering standards. The agent decides when to load them.

7. **Knowledge is centralized.** Engineering standards live in the knowledge system (`docs/engineering-handbook.md` + `eng-*` skills). Agent prompts contain role-specific execution instructions, not duplicated engineering rules.

8. **Custom tools extend capabilities.** Use `repo-analyzer` to cache repository structure, `state-reader` to manage framework state, and `env-validator` to check required environment variables.

9. **Plugins enforce policies.** The state-manager plugin tracks session lifecycle and syncs to state files. The policy-enforcer blocks dangerous operations. The context-optimizer injects framework state into compactions.

10. **MCP servers are disabled globally and opted in per agent.** This minimizes token usage. Enable specific MCPs only on the agents that need them.

## Commands Reference

| Command | Agent | Description |
|---|---|---|
| `/analyze <description>` | Orchestrator | Triage a request — classify, estimate scope, recommend workflow |
| `/plan-feature <description>` | Orchestrator | Plan a feature → writes state/plan.md |
| `/build-feature` | Builder | Implement from state/plan.md |
| `/review-feature` | Reviewer | Review current diff against plan |
| `/test-feature` | Builder | Run tests and fix failures |
| `/commit-feature` | Builder | Format, commit, create PR |
| `/fix-bug <description>` | Orchestrator | Quick bug fix workflow |
| `/generate-context` | Analyst | Cache repo structure and dependency graph |
| `/release` | Builder | Run release workflow via git-release skill |

## Quick Start

1. Run `/generate-context` to cache the repository structure.
2. Use `/analyze` to triage your objective and get a recommended workflow.
3. Follow the recommended workflow — the Orchestrator will guide you.

## Project Rules

- TypeScript strict mode unless the project configures otherwise.
- All agents must respect the permission boundaries defined in their config.
- Never commit secrets, .env files, or sensitive configuration.
- State files (`state/`) should be committed to git for team visibility.
- The Orchestrator is responsible for maintaining state file accuracy.
- When in doubt about a workflow step, ask the user before proceeding.
- Subagents should return actionable output, not just status reports.
- Tool outputs from subagents that are read-only explorations should be summarized before returning to the parent.
- Use the bash tool for git operations (prefer `git diff`, `git log`, `git status` over MCP).
- The framework may be extended with additional agents, commands, skills, or tools at any time — follow existing patterns.
