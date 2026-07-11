# OpenCode Engineering Framework

A reusable, opinionated engineering platform for AI-first full-stack projects. Drop these files into any project to get a complete agent hierarchy, workflow pipeline, knowledge system, execution contract system, and platform standards — all powered by OpenCode.

## Quick Start (Use in Any Project)

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
| **Commands** | 9 | `/analyze`, `/plan-feature`, `/build-feature`, `/review-feature`, `/test-feature`, `/commit-feature`, `/fix-bug`, `/generate-context`, `/release` |
| **Skills** | 25 | 19 knowledge modules (`eng-*`) + 6 workflow skills |
| **Tools** | 3 | `state-reader`, `repo-analyzer`, `env-validator` |
| **Plugins** | 3 | `state-manager`, `policy-enforcer`, `context-optimizer` |
| **Standards docs** | 2 | Platform Specification + Engineering Handbook (always loaded in agent context) |

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
  ├──► /build-feature → Builder consumes contract (no re-exploration)
  ├──► /review-feature → Reviewer validates against contract
  ├──► /test-feature → Builder verifies acceptance criteria
  └──► /commit-feature → Builder commits with contract reference
```

## Platform Standards (Always Enforced)

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
- Knowledge modules loaded deterministically (contract specifies which ones)

## Customizing for Your Project

1. **Provider/Model**: Edit `opencode.jsonc` → `model` and `provider` fields
2. **Project conventions**: Edit `AGENTS.md` → add project-specific rules at the bottom
3. **Tech stack**: Edit `docs/platform-specification.md` if you use a different stack
4. **Permissions**: Edit `opencode.jsonc` → `permission` section for stricter/looser controls
5. **MCP servers**: Add under `mcp` in `opencode.jsonc`, opt-in per agent under `tools`

## Directory Structure

```
project-root/
├── AGENTS.md                    ← Framework instructions + project rules
├── opencode.jsonc               ← Agents, permissions, MCP, model config
├── tui.jsonc                    ← Terminal UI preferences
├── .opencode/
│   ├── agents/                  ← 6 agent definitions (markdown)
│   ├── commands/                ← 9 workflow commands
│   ├── skills/                  ← 25 skills (19 knowledge + 6 workflow)
│   ├── tools/                   ← 3 custom TypeScript tools
│   └── plugins/                 ← 3 event hook plugins
├── prompts/                     ← Agent system prompt files
├── state/                       ← Workflow state (contract.md is source of truth)
│   ├── contract.md
│   ├── phase.json
│   ├── decisions.md
│   └── cache/
└── docs/                        ← Platform spec + handbook
```

## Design Principles

1. **OpenCode native first** — Uses OpenCode's built-in extension points. No wrappers.
2. **Convention over configuration** — Sensible defaults. Exceptions are explicit.
3. **Filesystem state** — State lives in `state/` directory. No database. No services.
4. **Model-cost awareness** — Premium for orchestrator/builder, cheap for analyst/reviewer.
5. **Least privilege** — Agents get only the permissions they need.
6. **The contract is the standard** — Created once, consumed by all downstream agents.
7. **Knowledge is centralized** — Engineering standards in `eng-*` skills, not scattered in prompts.

## License

MIT — use freely in any project.
