# OpenCode Engineering Framework

A reusable, opinionated engineering platform for AI-first full-stack projects. Drop these files into any project to get a complete agent hierarchy, workflow pipeline, knowledge system, execution contract system, MCP integration, and platform standards — all powered by OpenCode.

## Quick Start

```bash
# Clone the framework configs into your project
git clone https://github.com/jeeva-m-21/opencode-configs.git /tmp/opencode-configs
cp -r /tmp/opencode-configs/{AGENTS.md,opencode.jsonc,tui.jsonc,.opencode,state,prompts,docs} your-project/
cd your-project

# Customize for your project
# 1. Edit opencode.jsonc → update model/provider if needed
# 2. Edit AGENTS.md → update project-specific conventions
# 3. Delete state/contract.md content (framework will regenerate)

# Start OpenCode
opencode

# Generate context and begin
/generate-context
"Describe what you want to build"
```

## What You Get

| Component | Count | Description |
|---|---|---|
| **Agents** | 6 | Orchestrator, Analyst, Builder, Reviewer, Docs-writer, Security-auditor |
| **Commands** | 10 | `/analyze`, `/plan-feature`, `/build-feature`, `/review-feature`, `/test-feature`, `/commit-feature`, `/fix-bug`, `/generate-context`, `/compile-context`, `/release` |
| **Skills** | 27 | 19 knowledge modules (`eng-*`) + 6 workflow skills + 2 infrastructure skills |
| **Tools** | 4 | `state-reader`, `repo-analyzer`, `env-validator`, `context-compiler` |
| **Plugins** | 3 | `state-manager`, `policy-enforcer`, `context-optimizer` |
| **MCP Servers** | 14 | `context7`, `sequential-thinking`, `memory`, `fetch`, `github`, `git`, `brave-search`, `postgres`, `sqlite`, `docker`, `redis`, `sentry`, `playwright`, `puppeteer` |

## Core Infrastructure

The framework has three infrastructure components that work together:

| Component | Document | Role |
|---|---|---|
| **Context Compiler** | `docs/context-compiler-architecture.md` | Deterministic context optimization — resolves minimal knowledge, maximizes prompt caching, token budgets |
| **Knowledge Graph** | `docs/knowledge-graph-architecture.md` | Atom-centric knowledge — decisions, patterns, rules as composable graph nodes (not documents) |
| **Reflection Engine** | `docs/reflection-engine-architecture.md` | Continuous learning — observes every execution, accumulates evidence, proposes improvements |

```
User Request → Orchestrator → Context Compiler → Knowledge Graph Atoms → Model
                                    ↑                      ↑
                                    │                      │
                                    └──── Reflection Engine (feedback loop)
```

## MCP Server Architecture

14 MCP servers configured with tiered access — globally disabled, per-agent opt-in to prevent token bloat:

| Tier | Servers | Agents |
|---|---|---|
| **0 — Always** | `context7` | orchestrator, analyst, docs-writer, security-auditor |
| **1 — Specialized** | `sequential-thinking`, `memory`, `fetch` | orchestrator (all), analyst (fetch), builder (seq-thinking), security-auditor (seq-thinking, fetch) |
| **2 — On-demand** | `github`, `git`, `brave-search`, `postgres`, `sqlite`, `docker`, `redis`, `sentry`, `playwright`, `puppeteer` | builder (github, git, postgres, sqlite, redis, docker, brave-search), reviewer (git), security-auditor (github, brave-search) |
| **3 — Restricted** | `filesystem` | None (built-in tools already cover this) |

## How It Works

```
You: "Add user authentication with JWT"
  │
  ▼
Orchestrator → classifies as "feature" → loads workflow-selector skill
  │
  ▼
/plan-feature → minimal Analyst exploration → produces execution contract
  │
  ▼
state/contract.md ← THE single source of truth
  │
  ├──► Context Compiler resolves minimal knowledge atoms
  ├──► /build-feature → Builder receives compiled context (no re-exploration)
  ├──► /review-feature → Reviewer validates against contract
  ├──► /test-feature → Builder verifies acceptance criteria
  ├──► /commit-feature → Builder commits with contract reference
  └──► Reflection Engine records structured observations for future improvement
```

## Platform Standards

- **Stack:** TypeScript strict / Bun / React 18+ / Hono or Express / PostgreSQL 16+ / Drizzle ORM / Redis / Zod / JWT / Vitest / Docker / GitHub Actions
- **Architecture:** `src/api/` (routes → services → repositories), `src/web/` (pages → components), `src/shared/` (types, validation)
- **API:** REST with JSON envelopes, auth-gated by default
- **Auth:** JWT access tokens (15min) + rotating refresh tokens (7 days) + RBAC
- **Testing:** 90%+ branch coverage on services, all route response codes tested
- **CI/CD:** GitHub Actions from commit to production

Full spec: `docs/platform-specification.md`

## Execution Contract System

Every task produces a structured contract (`state/contract.md`) that eliminates repeated reasoning:

- Builder never re-explores (contract specifies files + line ranges + pattern reference)
- Reviewer never re-interprets (contract IS the requirements)
- Knowledge modules loaded deterministically (contract + Context Compiler resolve what's needed)

## Customizing for Your Project

1. **Provider/Model**: Edit `opencode.jsonc` → `model` and `provider` fields
2. **Project conventions**: Edit `AGENTS.md` → add project-specific rules at the bottom
3. **Tech stack**: Edit `docs/platform-specification.md` if you use a different stack
4. **Permissions**: Edit `opencode.jsonc` → `permission` section for stricter/looser controls
5. **MCP servers**: Edit `opencode.jsonc` → `mcp` section. Add or remove servers. All disabled globally, opt-in per agent under `agent.*.tools`
6. **Knowledge atoms**: Add to `.opencode/knowledge/atoms/` and rebuild the registry

## Directory Structure

```
project-root/
├── AGENTS.md                        ← Framework instructions + project rules
├── opencode.jsonc                   ← Agents, permissions, MCP (14 servers), model config
├── tui.jsonc                        ← Terminal UI preferences
├── .opencode/
│   ├── agents/                      ← 6 agent definitions (markdown)
│   ├── commands/                    ← 10 workflow commands
│   ├── skills/                      ← 27 skills (21 knowledge + 6 workflow)
│   │   ├── eng-*/                   ← 21 domain knowledge modules
│   │   └── workflow-*/              ← 6 workflow decision skills
│   ├── tools/                       ← 4 custom TypeScript tools (incl. context-compiler)
│   ├── plugins/                     ← 3 event hook plugins
│   └── knowledge/                   ← Atom-centric knowledge system
│       ├── atoms/decisions/         ← Architecture decision atoms (DEC-*)
│       ├── atoms/patterns/          ← Implementation pattern atoms (PAT-*)
│       ├── atoms/rules/             ← Non-negotiable rule atoms (RUL-*)
│       ├── atoms/capabilities/      ← Capability definition atoms (CAP-*)
│       ├── atoms/examples/          ← Reference code examples (EXM-*)
│       ├── views/                   ← Compiled documents (auto-generated from atoms)
│       ├── schemas/                 ← Atom and reflection JSON schemas
│       └── history/                 ← Deprecated atom archive
├── prompts/                         ← Agent system prompt files
├── state/                           ← Framework state + evolution data
│   ├── contract.md                  ← Execution contract (source of truth)
│   ├── phase.json                   ← Current workflow phase
│   ├── decisions.md                 ← Architecture decisions log
│   ├── knowledge-registry.json      ← Machine-readable capability→atom mapping
│   ├── cache/                       ← Generated caches (repo structure, deps)
│   ├── reflections/                 ← Reflection engine data
│   │   ├── registry.json
│   │   ├── data/                    ← Structured reflections (REFL-*)
│   │   └── clusters/                ← Synthesis clusters
│   ├── candidates/                  ← Improvement candidates (CAND-*)
│   ├── experiments/                 ← Experiment designs and results
│   ├── evolution/                   ← Compiler parameters, promotion log, metrics
│   └── synthesis/                   ← Synthesis schedule and state
└── docs/                            ← Architecture and specification
    ├── platform-specification.md    ← Platform standards
    ├── engineering-handbook.md      ← Principles + knowledge index
    ├── context-compiler-architecture.md   ← Compiler design (9-pass pipeline)
    ├── knowledge-graph-architecture.md    ← Atom-centric knowledge design
    ├── reflection-engine-architecture.md  ← Continuous learning design
    └── architecture-decisions.md    ← Framework ADRs
```

## Design Principles

1. **OpenCode native first** — Uses OpenCode's built-in extension points. No wrappers.
2. **Convention over configuration** — Sensible defaults. Exceptions are explicit.
3. **Filesystem state** — State lives in `state/` directory. No database. No services.
4. **Model-cost awareness** — Premium for orchestrator/builder, cheap for analyst/reviewer.
5. **Least privilege** — Agents get only the permissions and MCP tools they need.
6. **The contract is the standard** — Created once, consumed by all downstream agents.
7. **Knowledge is atomic** — Engineering standards as composable graph nodes, not monolithic documents.
8. **Context is compiled** — Deterministic, cache-optimized context assembly for every model invocation.
9. **The framework learns** — Every execution produces structured reflections that accumulate into evidence-backed improvements.

## License

MIT — use freely in any project.
