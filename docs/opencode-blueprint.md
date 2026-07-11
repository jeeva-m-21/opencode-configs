# OpenCode Engineering Blueprint
## Autonomous Software Engineering Framework Design Document

**Date:** 2026-07-11
**Version:** 1.0
**Status:** Research Complete / Ready for Phase 1 Implementation

---

## Table of Contents

1. [Capability Matrix](#1-capability-matrix)
2. [Agent System Architecture](#2-agent-system-architecture)
3. [Command Pipeline Architecture](#3-command-pipeline-architecture)
4. [Skills Architecture](#4-skills-architecture)
5. [MCP Architecture](#5-mcp-architecture)
6. [Plugin Architecture](#6-plugin-architecture)
7. [Rules & Instructions Architecture](#7-rules--instructions-architecture)
8. [Context Management Strategy](#8-context-management-strategy)
9. [Memory Strategy](#9-memory-strategy)
10. [Task Management Strategy](#10-task-management-strategy)
11. [State Management Strategy](#11-state-management-strategy)
12. [Caching Strategy](#12-caching-strategy)
13. [Token & Cost Optimization](#13-token--cost-optimization)
14. [Engineering Workflow Design](#14-engineering-workflow-design)
15. [Repository Understanding Strategy](#15-repository-understanding-strategy)
16. [Limitations & Risk Register](#16-limitations--risk-register)
17. [Recommended Project Structure](#17-recommended-project-structure)
18. [Open Questions & Required Experiments](#18-open-questions--required-experiments)

---

## 1. Capability Matrix

| Capability | Status | Mechanism | Notes |
|---|---|---|---|
| **File I/O** | Built-in | `read`, `write`, `edit`, `apply_patch` tools | edit uses exact string replacement; write overwrites |
| **Shell execution** | Built-in | `bash` tool | Permission-gated per command pattern |
| **Code search** | Built-in | `grep` (ripgrep), `glob` | Respects `.gitignore`; use `.ignore` to override |
| **Web fetch** | Built-in | `webfetch` tool | URL-based content retrieval |
| **Web search** | Opt-in | `websearch` tool | Requires `OPENCODE_ENABLE_EXA=true` or OpenCode provider |
| **LSP integration** | Experimental | `lsp` tool | Requires `OPENCODE_EXPERIMENTAL_LSP_TOOL=true` |
| **Task tracking** | Built-in | `todowrite` tool | States: pending/in_progress/completed/cancelled |
| **User interaction** | Built-in | `question` tool | Multi-question forms with options |
| **Skill loading** | Built-in | `skill` tool | Lazy-loads SKILL.md files |
| **Agent delegation** | Built-in | `task` tool | Primary agent invokes subagents |
| **External tools** | Via MCP | MCP servers (local/remote) | Adds tools to LLM context; token impact |
| **Event hooks** | Via plugins | Plugin event system | 20+ event types for interception |
| **Custom tools** | Built-in | `.opencode/tools/*.ts` | Zod-typed, any language backend |
| **Custom commands** | Built-in | `.opencode/commands/*.md` or JSON | Parameterized prompt templates |
| **Structured output** | SDK only | `session.prompt({ format: { type: "json_schema" } })` | Not available in TUI prompt |
| **Undo/Redo** | Built-in | `/undo`, `/redo` commands | Git-based snapshot; requires git repo |
| **Session sharing** | Built-in | `/share` command | Creates web link |
| **Session management** | Built-in | `/sessions`, `opencode session` | List, delete, continue, fork |
| **Cost tracking** | Built-in | `opencode stats --models` | Per-session token/cost breakdown |
| **Compaction** | Built-in | Automatic context compaction | Reserved buffer, optional pruning |
| **mDNS discovery** | Built-in | `server.mdns` | Multi-device access |
| **ACP protocol** | Built-in | `opencode acp` | Zed, JetBrains, Neovim integration |
| **SDK** | Built-in | `@opencode-ai/sdk` | Server control, session management, events |

### Capability Gaps

| Gap | Severity | Workaround |
|---|---|---|
| No native persistent memory across sessions | High | Plugin-based (supermemory), AGENTS.md updates, manually managed files |
| No inter-agent communication protocol | High | State files + rules; parent orchestrates via task tool result parsing |
| No built-in workflow engine | High | Compose commands + agents + state files |
| No prompt caching API | Medium | Helicone plugin, provider-specific caching |
| No native result memoization | Medium | Custom tools can cache; plugins can intercept |
| No parallel subagent execution | Medium | Scout subagent + experimental background subagents flag |
| MCP tools always in context (even when not used) | Medium | Disable globally, opt-in per agent |
| Structured output only via SDK | Low | Mostly useful for programmatic automation, not TUI |
| todowrite disabled for subagents by default | Low | Can be manually enabled per agent config |

---

## 2. Agent System Architecture

### 2.1 Agent Taxonomy

```
┌─────────────────────────────────────────────────────────┐
│                    PRIMARY AGENTS                         │
│  (User-facing, interactive, full conversation context)   │
├───────────────┬───────────────────┬─────────────────────┤
│    Build      │      Plan         │     Custom           │
│  (all tools)  │  (read-only)       │  (permissions vary) │
│  default      │  Tab toggle        │                     │
└───────┬───────┴───────┬───────────┴──────┬──────────────┘
        │               │                  │
        │  invokes via  │  invokes via     │  invokes via
        │  task tool    │  task tool       │  task tool
        ▼               ▼                  ▼
┌─────────────────────────────────────────────────────────┐
│                    SUBAGENTS                              │
│  (Invoked by primary agents or @mention by user)         │
├──────────┬──────────┬──────────┬─────────────────────────┤
│ General  │ Explore  │  Scout   │     Custom              │
│ (all     │ (fast,   │ (ext.    │  (specialized roles)    │
│  tools)  │ read-only│  deps)   │                         │
└──────────┴──────────┴──────────┴─────────────────────────┘
```

### 2.2 Agent Lifecycle

```
1. SESSION CREATION → model selection → system prompt assembly
2. RULES LOADING → AGENTS.md + instructions field files
3. TOOL REGISTRATION → built-in + MCP (filtered by permissions) + custom + plugin tools
4. SKILL DISCOVERY → available_skills injected into skill tool description
5. USER/AGENT PROMPT → tool execution loop → response
6. COMPACTION (auto) → when context near limit
7. SESSION IDLE/CLOSE
```

### 2.3 Practical Limits

| Dimension | Recommendation | Rationale |
|---|---|---|
| Max primary agents | 3-5 | Tab cycling becomes unwieldy beyond ~5 |
| Max subagents | 8-12 | Task tool description length explodes; hidden agents dont count |
| Nesting depth | 1 level (primary → subagent) | Subagents cannot easily invoke other subagents; chain manually |
| Concurrent subagents | Sequential only (per parent session) | Multiple task tool calls in one response = parallel launch, but context accumulates |
| Agent model overrides | Per-agent `model` field | Subagents inherit parent model if not specified |

### 2.4 Recommended Agent Hierarchy

```
┌──────────────────────────────────────────────────────────────────┐
│                     ORCHESTRATOR (primary)                        │
│  model: premium (Claude Sonnet 4.5 / GPT 5.2)                    │
│  permission: all tools ask (explicit approval)                   │
│  prompt: work orchestration, plan interpretation, decision making │
└──┬───────────────┬───────────────┬──────────────┬────────────────┘
   │               │               │              │
   ▼               ▼               ▼              ▼
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐
│ ANALYST  │ │BUILDER   │ │ REVIEWER │ │ UTILITY POOL      │
│ (explore │ │(general  │ │(custom   │ │                   │
│  subagent│ │ subagent)│ │ subagent)│ │ • docs-writer     │
│  variant)│ │          │ │          │ │ • test-runner     │
│ read-only│ │ edit +   │ │ read-only│ │ • git-manager     │
│ fast     │ │ bash     │ │ + report │ │ • dependency-mgr  │
│ cheap    │ │ premium  │ │ cheap    │ │ • linter          │
└──────────┘ └──────────┘ └──────────┘ └──────────────────┘
```

**Model Routing Strategy:**
- **Orchestrator** → premium model (reasoning, planning, complex decisions)
- **Analyst** → cheap model (code reading, searching, summarizing)
- **Builder** → premium model (code generation, refactoring, complex changes)
- **Reviewer** → cheap model (linting, pattern checking, diff review)
- **Utility pool** → cheapest available (single-purpose tasks)

### 2.5 Anti-Patterns Identified

1. **Over-nesting agents** — Subagents that invoke subagents lose context linearity and state tracking
2. **All tools on all agents** — Defeats purpose of specialization; increases token usage
3. **Undifferentiated subagents** — If two subagents have the same permissions and model, combine them
4. **Ignoring the Plan agent** — Skipping read-only planning phase leads to wasted edits and rework
5. **Overloading agent prompts** — Long system prompts consume tokens and reduce model attention on the actual task
6. **MCP on all agents** — MCP tools add tokens even when never used; gate with `"tools"` + per-agent override

### 2.6 Task Permission Patterns

```
Orchestrator permission.task:
  "*": "deny"               ← deny all by default
  "analyst": "allow"        ← explicitly allow known subagents
  "builder": "allow"
  "reviewer": "allow"
  "orchestrator-*": "allow" ← allow future orchestration subagents
```

---

## 3. Command Pipeline Architecture

### 3.1 Command Capabilities

Commands are **prompt templates** that can contain:
- `$ARGUMENTS` → all arguments as single string
- `$1, $2, $3...` → positional argument substitution
- `` !`shell-command` `` → inject shell command output at command resolution time
- `@path/to/file` → inject file content into prompt before LLM sees it

### 3.2 Lifecycle

```
User types /command-name arg1 arg2
  → Command template resolved (shell output injected, args substituted)
  → If agent specified → force-switch to that agent
  → If subtask=true → launch as subagent (isolated context)
  → If subtask=false (default) → inject into current session context
  → LLM processes and responds with tool calls
```

### 3.3 Pipeline Design Pattern

Commands should be composed into sequential engineering pipeline stages:

```
/plan-feature $ARGUMENTS    → produces plan (saved to state file)
/build-feature              → reads plan from state, implements
/review-feature             → reads plan + diff, reviews
/test-feature               → runs test suite, verifies
/commit-feature             → formats, creates conventional commit
```

Each command reads/writes to shared state files (`state/current-plan.md`, `state/phase.json`).

**Command → Agent Mapping:**
| Command | Agent | Mode | subtask? |
|---|---|---|---|
| `/plan-*` | plan (primary) | current session | false |
| `/build-*` | build (primary) | current session | false |
| `/analyze-*` | analyst (subagent) | isolated | true |
| `/review-*` | reviewer (subagent) | isolated | true |
| `/release` | builder (subagent) | isolated | true |

### 3.4 Command Composability Limits

- Commands cannot call other commands natively
- No conditional branching in command templates
- No native output capture from one command to feed another
- **Workaround:** Commands read/write state files; the Orchestrator sequences them manually

---

## 4. Skills Architecture

### 4.1 Skill Discovery & Loading

Skills are **lazy-loaded** via the `skill` tool. The LLM sees:

```xml
<available_skills>
  <skill><name>git-release</name><description>Create releases and changelogs</description></skill>
</available_skills>
```

The LLM must explicitly call `skill({ name: "git-release" })` to load the content.

### 4.2 Recommended Skill Organization

Skills should represent **reusable engineering capabilities**, not technologies or workflows (those belong in Commands/Agents):

```
.opencode/skills/
├── git-release/SKILL.md        ← release automation instructions
├── security-audit/SKILL.md     ← OWASP checks, dependency scanning
├── performance-profile/SKILL.md ← profiling and optimization patterns
├── db-migration/SKILL.md       ← migration patterns for your stack
├── error-handling/SKILL.md      ← project error handling conventions
└── testing-patterns/SKILL.md    ← mocking, fixtures, test structure
```

**Architecture principle:** Skills = "how to do X correctly in this project"
- **Technologies** → References (external repos/docs)
- **Workflows** → Commands (sequential pipelines)
- **Patterns/Conventions** → Skills (loaded on-demand when relevant)
- **Specialization** → Agents (model + permission + prompt)
- **State** → Data files (phase tracking, decisions logged)

### 4.3 Skill Best Practices

1. Keep descriptions specific enough for the LLM to choose correctly (max 1024 chars)
2. Use frontmatter `metadata` for categorization: `audience`, `workflow`, `technology`
3. Skills load into conversation context — be concise (under 500 words when possible)
4. Validate names: `[a-z0-9]+(-[a-z0-9]+)*$`, match directory name
5. Use `compatibility: opencode` in frontmatter
6. Co-locate supporting files (templates, example configs) within the skill directory
7. Permission-gate skills with `permission.skill` glob patterns: `"internal-*": "deny"`

### 4.4 When NOT to use skills

- Simple factual information → put in AGENTS.md
- Sequential task orchestration → use Commands
- Tool access control → use Agents with permissions
- External service integration → use MCP
- Runtime hooks/callbacks → use Plugins

---

## 5. MCP Architecture

### 5.1 Token Impact Analysis

Every MCP server injects its tool descriptions into **every** agent context (unless disabled). This is the single largest source of avoidable token bloat.

**Estimated token cost per MCP server:**
| MCP Server | Approx. Tools | Est. Token Cost/Message |
|---|---|---|
| GitHub MCP | 30-50 | ~800-1500 tokens |
| Filesystem MCP | 5-10 | ~150-300 tokens |
| Sentry MCP | 10-15 | ~300-500 tokens |
| Database MCP | 5-15 | ~200-500 tokens |
| Context7 | 1-3 | ~50-100 tokens |
| Grep by Vercel | 1-2 | ~40-80 tokens |

### 5.2 Recommended MCP Architecture

```
┌───────────────────────────────────────────────────────────────┐
│                    TIER 0: ALWAYS ENABLED                       │
│  (Low token impact, high utility across all agents)            │
│  • Context7 (documentation search)                             │
│  • Grep by Vercel (code pattern search)                        │
├───────────────────────────────────────────────────────────────┤
│                    TIER 1: PER-AGENT ENABLED                    │
│  (Higher token impact, specialized utility)                    │
│  • Sentry → enabled only on "debugger" & "monitor" agents      │
│  • GitHub → enabled only on "release" & "pr-review" agents     │
│  • Database → enabled only on "db-migration" agent             │
│  • Browser → enabled only on "e2e-test" agent                  │
├───────────────────────────────────────────────────────────────┤
│                    TIER 2: ON-DEMAND                            │
│  (High token impact, infrequent use)                           │
│  • Docker → load only when containerization tasks active       │
│  • Kubernetes → load only when deployment tasks active        │
│  • Cloud providers → load only when infra tasks active         │
├───────────────────────────────────────────────────────────────┤
│                    TIER 3: AVOID                                │
│  (Extreme token impact, rarely needed in agent context)        │
│  • Filesystem MCP (built-in tools already cover this)          │
│  • Full GitHub API (use gh CLI in bash instead)                │
└───────────────────────────────────────────────────────────────┘
```

### 5.3 MCP Configuration Pattern

```jsonc
{
  "mcp": {
    "sentry": {
      "type": "remote",
      "url": "https://mcp.sentry.dev/mcp",
      "oauth": {}
    },
    "context7": {
      "type": "remote",
      "url": "https://mcp.context7.com/mcp"
    }
  },
  // Disable all MCP globally — forces opt-in per agent
  "tools": {
    "sentry_*": false,
    "context7_*": false
  },
  "agent": {
    "debugger": {
      "tools": {
        "sentry_*": true,
        "context7_*": true
      }
    },
    "builder": {
      "tools": {
        "context7_*": true
      }
    }
  }
}
```

### 5.4 MCP Limitations

1. **No dynamic loading/unloading at runtime** — Must be configured and enables at session start
2. **Remote MCP startup latency** — HTTP roundtrip + tool discovery on connect
3. **No per-call filtering** — All tools from a server appear or none do
4. **No tool-level enable/disable** — All or nothing per MCP server name
5. **OAuth flow user interruption** — `opencode mcp auth` requires explicit user action
6. **Debugging friction** — `opencode mcp debug` available but requires CLI access

### 5.5 MCP OAuth Strategy

- Pre-register OAuth credentials in config when possible (avoids browser popup)
- Store tokens in `~/.local/share/opencode/mcp-auth.json`
- For CI/CD: use API keys instead of OAuth
- Set `"oauth": false` + headers for API-key-based MCP servers

---

## 6. Plugin Architecture

### 6.1 Available Hook Points

| Hook | Type | Use Case |
|---|---|---|
| `tool.execute.before` | Intercept | Validate/modify/block tool calls |
| `tool.execute.after` | Intercept | Log, cache results, trigger side effects |
| `session.created` | Lifecycle | Initialize state files |
| `session.compacted` | Lifecycle | Save compacted summary |
| `session.idle` | Lifecycle | Trigger next workflow step |
| `session.error` | Lifecycle | Alert, recovery |
| `session.diff` | Change tracking | Log changes, update state |
| `shell.env` | Injection | Inject env vars, API keys |
| `file.edited` | Change tracking | Update file index/cache |
| `message.part.updated` | Streaming | Stream monitoring |
| `permission.asked` | Auth | Auto-approve known patterns |
| `todo.updated` | State | Sync with external task manager |
| `tui.toast.show` | UI | Custom notifications |
| `experimental.session.compacting` | Context | Inject custom context into compaction |

### 6.2 Recommended Plugin Responsibilities

```
┌──────────────────────────────────────────────────┐
│              CORE FRAMEWORK PLUGINS                │
├──────────────────────────────────────────────────┤
│ state-manager    │ Session lifecycle → state file │
│                  │ Read/write phase tracking       │
│                  │ tool.execute.after: log actions │
├──────────────────┼────────────────────────────────┤
│ policy-enforcer  │ tool.execute.before: block     │
│                  │ dangerous patterns             │
│                  │ Enforce .env protection        │
│                  │ Block secrets in prompts       │
├──────────────────┼────────────────────────────────┤
│ metrics-collector│ session.* events → metrics DB  │
│                  │ Token counting, cost tracking  │
│                  │ tool.execute.after: timing     │
├──────────────────┼────────────────────────────────┤
│ cache-manager    │ tool.execute.before: check     │
│                  │ cache for file reads, grep     │
│                  │ tool.execute.after: cache      │
│                  │ Many built-in tools return     │
│                  │ idempotent results             │
├──────────────────┼────────────────────────────────┤
│ context-optimizer│ compaction hooks: inject       │
│                  │ relevant state, prune noise    │
│                  │ message.part.updated: monitor  │
└──────────────────┴────────────────────────────────┘
```

### 6.3 Plugin Load Order Considerations

```
1. Global config plugins (npm)
2. Project config plugins (npm)
3. ~/.config/opencode/plugins/ (local files)
4. .opencode/plugins/ (local files)
```

Place state-manager and policy-enforcer in **global config** (should run everywhere).
Place project-specific cache and metric plugins in **project `.opencode/plugins/`**.

---

## 7. Rules & Instructions Architecture

### 7.1 Precedence (Highest → Lowest)

```
1. Managed config (enterprise MDM/.mobileconfig)    ← not user-overridable
2. Inline config (OPENCODE_CONFIG_CONTENT)
3. Project .opencode/ directories (agents, commands, plugins)
4. Project opencode.json + AGENTS.md
5. Custom config path (OPENCODE_CONFIG)
6. Global ~/.config/opencode/opencode.json + AGENTS.md
7. Remote config (.well-known/opencode)
8. Claude Code compat (~/.claude/CLAUDE.md)
```

### 7.2 AGENTS.md Best Practices

```
# PROJECT_NAME
Brief one-liner about the project.

## Project Structure
- Only document what's NOT obvious from file names
- Include architectural decisions

## Commands
- Build: `npm run build`
- Lint: `npm run lint`
- Test: `npm test -- --coverage`
- Typecheck: `npm run typecheck`

## Conventions
- Import order: built-ins → third-party → local
- Error handling: never throw in async handlers
- Naming: PascalCase components, camelCase functions

## References
- @docs/architecture.md → when designing new features
- @docs/api-standards.md → when creating new endpoints
- @CONTRIBUTING.md → general contribution guidelines
```

### 7.3 Instruction File Strategy

```jsonc
"instructions": [
  "AGENTS.md",                    // auto-loaded by convention
  "CONTRIBUTING.md",              // shared dev guidelines
  "docs/standards/*.md",          // modular standard files
  ".cursor/rules/*.md",           // reuse existing Cursor rules
  "packages/*/AGENTS.md"          // monorepo package-level rules
]
```

**Principle:** Keep AGENTS.md lean (project overview, build commands, key conventions). Use `instructions` field for modular, team-wide standards. Use References for external repos/doc sites.

### 7.4 Global Rules (Personal)

`~/.config/opencode/AGENTS.md` — for personal preferences:
- Never committed to git
- Communication style preferences
- Personal tooling paths
- Local environment quirks

---

## 8. Context Management Strategy

### 8.1 What Goes Into Context (Per Message)

```
1. System prompt (agent-specific + base instructions)
2. AGENTS.md + instruction files (merged)
3. Available tool descriptions (built-in + MCP + custom + plugin + skill)
4. Available skills list (names + descriptions only)
5. Available subagents list (for task tool + @mention)
6. Conversation history (messages + tool calls + tool outputs)
7. References with descriptions (if any)
8. Current working directory info
```

### 8.2 Optimization Strategies

| Strategy | Mechanism | Impact |
|---|---|---|
| **Skill lazy-loading** | Loaded only when LLM calls skill tool | Saves skill content tokens from every message |
| **MCP per-agent gating** | Disable globally, enable per-agent | Saves MCP tool descriptions from irrelevant agents |
| **Subagent isolation** | Use `subtask: true` for commands | Keeps subtask output out of parent context |
| **Compaction** | Auto-enabled, configurable buffer | Compresses old messages when near limit |
| **Pruning** | `compaction.prune: true` | Removes old tool outputs |
| **Reserved buffer** | `compaction.reserved: N` | Leaves headroom to avoid overflow during compaction |
| **Reference descriptions** | Only references with descriptions appear in context | Control context injection via description field |
| **Shell-only commands** | Use `!` prefix for pure shell commands | Avoids LLM processing overhead |

### 8.3 Compaction Configuration

```jsonc
"compaction": {
  "auto": true,       // auto-compact when context fills
  "prune": true,      // remove old tool outputs (aggressive token saving)
  "reserved": 10000   // token buffer for compaction process itself
}
```

### 8.4 Custom Compaction Hook Strategy

Plugins can inject domain-specific context during compaction:

```typescript
// .opencode/plugins/state-compaction.ts
"experimental.session.compacting": async (input, output) => {
  output.context.push(`## Framework State
Phase: ${readStateFile('phase.json').phase}
Completed: ${readStateFile('phase.json').completed}
Active task: ${readStateFile('phase.json').activeTask}
Architecture decisions: ${readStateFile('decisions.md')}`)
}
```

This ensures framework state **survives compaction** and remains in the regenerated context.

---

## 9. Memory Strategy

### 9.1 Memory Mechanisms Available

| Mechanism | Scope | Persistence | Token Cost |
|---|---|---|---|
| **Conversation history** | Session | Lost on session end | Highest (grows indefinitely) |
| **AGENTS.md** | Project/Global | Permanent (file on disk) | Low (loaded once at session start) |
| **Instruction files** | Project/Global | Permanent | Low (loaded once) |
| **Skills (SKILL.md)** | Project/Global | Permanent | None until loaded; then message-level |
| **State files** (manual) | Project | Permanent | None until read tool called |
| **Session compaction** | Session | Survives compaction | Low (summary replaces history) |
| **Plugin state** (in-memory) | Session | Lost on session end | None |
| **External DB** (via MCP) | Cross-session | Permanent | Per-call MCP tool overhead |
| **opencode-supermemory** plugin | Cross-session | Permanent | Plugin overhead |

### 9.2 What Should Be Remembered

| Data | Mechanism | Rationale |
|---|---|---|
| **Project architecture** | AGENTS.md + instruction files | Stable, shared across team |
| **Current workflow phase** | State file (`state/phase.json`) | Lightweight, cross-session |
| **Completed tasks** | State file | Avoids re-work |
| **Architecture decisions** | State file (`state/decisions.md`) | Decision log pattern |
| **Known constraints** | AGENTS.md | Static, infrequently changing |
| **Active branch/PR** | State file | Cross-session continuity |
| **Test results (latest)** | State file (cached) | Avoids re-running expensive tests |
| **Codebase index** | State file (generated) | Speeds up repository understanding |

### 9.3 What Should NOT Be Remembered

| Data | Reason |
|---|---|
| **Full conversation history** | Token explosion; compact instead |
| **Tool output logs** | Use pruning to remove |
| **Exploratory search results** | Transient; re-search if needed |
| **Temporary file paths** | Invalid after session |
| **Intermediate build artifacts** | Rebuildable |
| **Conversational filler** | No engineering value |

### 9.4 State File Format (Recommended)

```
state/
├── phase.json          ← { "current": "planning", "completed": [], "activeTask": "..." }
├── decisions.md        ← architecture decision log (markdown)
├── plan.md             ← current plan (generated by /plan-feature)
├── cache/
│   ├── repo-structure.json   ← generated tree summary
│   ├── dependency-graph.json ← module dependencies
│   └── error-log.md          ← known failures
└── workspace/
    └── session-notes.md ← scratchpad
```

---

## 10. Task Management Strategy

### 10.1 Native Todo Tool Capabilities

```
States: pending → in_progress → completed / cancelled
Priority: high / medium / low
Constraints: exactly ONE in_progress at a time
Visibility: in conversation (LLM sees the list)
Subagents: disabled by default (must enable manually)
```

### 10.2 Assessment: Sufficient for Single-Session Work

The native `todowrite` tool is sufficient for tracking tasks within a single session. For cross-session tracking, it is NOT sufficient because:
1. Todo lists don't persist across sessions
2. No external observability (no API to read todo state)
3. Subagents can't update parent todos (disabled by default)

### 10.3 Recommendation: Hybrid Approach

```
Session scope:  todowrite tool (for LLM self-organization)
Cross-session:  state/phase.json + state/plan.md (for framework orchestration)
External:       GitHub Projects / Linear (via MCP or bash gh CLI)
```

The framework should maintain a state file that maps roughly to the todo structure:

```json
{
  "phase": "implementation",
  "tasks": [
    { "id": "1", "title": "Add auth middleware", "status": "completed" },
    { "id": "2", "title": "Create user model", "status": "in_progress" },
    { "id": "3", "title": "Write tests", "status": "pending" }
  ],
  "branch": "feature/user-auth",
  "pr_url": null
}
```

Update this file via a `tool.execute.after` plugin hook that watches for todowrite changes.

---

## 11. State Management Strategy

### 11.1 Storage Strategy

**Primary:** Filesystem (JSON + Markdown in `state/` directory)
**Rationale:** No external dependencies, trivially versionable in git, readable by agents, no MCP overhead, human-readable for debugging.

**Alternative for production:** SQLite database (accessed via custom tool or MCP) if state volume exceeds ~100KB or requires transactional updates.

### 11.2 Update Strategy

```
┌──────────────────────────────────────────────────────┐
│                 STATE UPDATE FLOW                     │
├──────────────────────────────────────────────────────┤
│  1. tool.execute.before                              │
│     └─ Check if operation modifies phase state       │
│  2. Agent completes action                           │
│  3. tool.execute.after                               │
│     └─ state-manager plugin:                         │
│        • Logs action to state/phase.json             │
│        • Updates completed task status               │
│        • Records decision if edit touched            │
│        •   state/decisions.md                        │
│  4. state/phase.json atomically written              │
│  5. (optional) git add state/ && git commit          │
│        "state: update after <action>"                │
└──────────────────────────────────────────────────────┘
```

### 11.3 Recovery Strategy

```
On session start:
  1. Check state/phase.json exists
  2. If exists → inject into AGENTS.md context via instruction
     "You are resuming work. Current phase: {phase}. 
      Completed: {completed}. Active task: {activeTask}."
  3. If not → initialize from AGENTS.md default workflow
  4. After compaction → re-inject via compaction hook
```

**Crash recovery:** State file is the source of truth. Last write wins. Idempotent writes via atomic file rename.

---

## 12. Caching Strategy

### 12.1 Cache Opportunities

| What | Mechanism | Invalidation | Savings |
|---|---|---|---|
| **Repository structure** | Generated JSON in `state/cache/` | On git branch change, on file watcher event | 500-2000 tokens/read |
| **Module dependency graph** | Generated JSON | On `package.json` / import changes | 300-1000 tokens/grep |
| **LSP symbol index** | LSP tool (experimental) | Via file watcher | Variable |
| **Grep results** (common patterns) | Plugin cache | On file changes in matching paths | 200-500 tokens/search |
| **MCP tool descriptions** | OpenCode internal | On MCP config change | 100-1500 tokens/message |
| **Documentation (Context7)** | External MCP results cache | TTL-based or on version change | 500-3000 tokens/lookup |
| **Model list** | OpenCode internal (models.dev) | `opencode models --refresh` | 1000+ tokens at startup |
| **Prompt cache (provider)** | Provider-specific (Anthropic/OpenAI) | Automatic breakpoints | 50-90% of prompt tokens |
| **Compaction summary** | Stored in session | On new messages exceeding buffer | Survives compaction |
| **Auth tokens (MCP)** | `~/.local/share/opencode/mcp-auth.json` | On token expiry | Avoids re-auth |

### 12.2 Cache Invalidation Triggers

| Trigger | Caches to invalidate |
|---|---|
| `git checkout/pull` | repo-structure, dependency-graph, grep-cache |
| `npm install / bun install` | dependency-graph |
| File write to `src/` | grep-cache for that directory, LSP symbols |
| File write to `*.json` config | dependency-graph, MCP tool list |
| New git tag | release notes cache |
| Time-based (hourly) | Context7 results, websearch results |

### 12.3 Implementation: File-Based Cache Plugin

```typescript
// .opencode/plugins/cache-manager.ts
// Intercepts read/grep/glob calls
// Checks filesystem cache directory before executing
// Stores results with content hash as cache key
// Invalidates on file.edited events for matching paths
```

**Cache keys:** `sha256(tool_name + JSON.stringify(args).sort_keys())`
**TTL:** Configurable per tool type (grep: 5min, read: 1min, glob: 10min)

### 12.4 What NOT to Cache

- `bash` command outputs (side effects are the point)
- `write` / `edit` operations (mutating)
- `webfetch` results (may be dynamic; cache with short TTL only)
- Permission-asked responses (security-sensitive)
- Any output containing env vars or secrets

---

## 13. Token & Cost Optimization

### 13.1 Model Routing Cost Matrix

```
Task Complexity     → Model Tier      → Approx. Cost/1K tokens
─────────────────────────────────────────────────────────
Simple search/read  → cheapest model  → $0.01-0.10
Code explanation    → cheap model     → $0.10-0.50
Code generation     → premium model   → $1.00-5.00
Architecture design → premium model   → $1.00-5.00
Bug investigation   → premium model   → $1.00-5.00
Documentation gen   → cheap model     → $0.10-0.50
Code review         → cheap model     → $0.10-0.50
Test generation     → premium model   → $1.00-3.00
```

### 13.2 Token Reduction Checklist

| # | Action | Est. Savings | Difficulty |
|---|---|---|---|
| 1 | Disable unused MCP servers globally | 500-2000 tokens/msg | Trivial |
| 2 | Use `subtask: true` for all subagent commands | Variable (isolated context) | Trivial |
| 3 | Keep AGENTS.md under 200 lines | 200-500 tokens/msg | Easy |
| 4 | Keep agent system prompts under 100 lines | 300-800 tokens/msg | Easy |
| 5 | Enable compaction pruning | 1000-5000 tokens (cumulative) | Trivial |
| 6 | Use small_model for title/summary generation | Per-session savings | Config only |
| 7 | Gate MCP servers per agent (not global) | 500-2000 tokens/msg | Config only |
| 8 | Use References instead of copy-pasting external docs | Lazy access vs. eager | Config only |
| 9 | Run `opencode stats` regularly to identify token hogs | Awareness → optimization | CLI command |
| 10 | Use Plan mode for analysis (prevents edit → undo cycles) | Avoids 2x work | Workflow |
| 11 | Batch tool calls in single message where possible | Reduces LLM roundtrips | Agent prompting |
| 12 | Cache repo structure/dependency graph | Prevents repeated scanning | Plugin |
| 13 | Use `noReply: true` for context injection via SDK | Avoids unnecessary generation | SDK only |
| 14 | Prefer bash commands over MCP for simple operations | MCP has per-call overhead | Design choice |
| 15 | Set `steps` limit on exploratory agents | Prevents runaway loops | Config only |

### 13.3 Expected Cumulative Savings

Applying all 15 optimizations for a typical engineering workflow:

```
Baseline (naive):                    100% tokens
After MCP gating (1,6):              -15%
After AGENTS.md trim (3):            -5%
After pruning + compaction (4,5):    -20%
After model routing (task-based):    -30%
After caching (12):                  -15%
After workflow optimization (10):    -10%
─────────────────────────────────────────
Final:                               ~25-35% of baseline
```

### 13.4 Small Model Routing

```jsonc
"small_model": "anthropic/claude-haiku-4-20250514"
// Used for: title generation, summary generation, compaction
// Override per agent: "model": "some/other-model"
```

**Router helper logic** (conceptual, would need plugin to implement):
```
if (task_is_read_only && task_complexity == "low")    → small_model
if (task_is_read_only && task_complexity == "medium") → cheap_model
if (task_writes_code || task_is_complex)              → premium_model
if (task_is_git_commit || task_is_lint)              → cheapest_available
```

---

## 14. Engineering Workflow Design

### 14.1 Workflow Matrix

| Workflow | Plan First? | Agent | Model | Key Difference |
|---|---|---|---|---|
| **Feature** | Yes (Plan mode) | Orchestrator → Builder | Premium | Multi-agent pipeline |
| **Bug fix** | Quick plan | Orchestrator → Analyst → Builder | Premium | Analyst first to find root cause |
| **Refactor** | Yes (Plan mode) | Orchestrator → Builder → Reviewer | Premium + Cheap | Reviewer validates no regressions |
| **Documentation** | No | Docs-writer subagent | Cheap | No code changes, read-only code access |
| **Security audit** | No | Security-auditor subagent | Cheap | Read-only, pattern-based scanning |
| **Performance** | Yes | Orchestrator → Analyst → Builder | Premium | Analyst profiles first |
| **Release** | Yes | git-release skill + builder | Cheap | Follows strict procedures |

### 14.2 Feature Workflow (Detailed)

```
PHASE 1: PLAN (Orchestrator in Plan mode)
  Session 1: /plan-feature "user authentication with OAuth"
    → Reads AGENTS.md + architecture docs
    → Uses explore subagent to find related code
    → Produces plan → writes to state/plan.md
    → Updates state/phase.json → phase: "planning", status: "done"

PHASE 2: IMPLEMENT (Orchestrator in Build mode)
  Session 2: /build-feature
    → Reads state/plan.md
    → Invokes builder subagent for each task in plan
    → Builder writes code, runs tests, fixes lint
    → Updates state/phase.json → phase: "implementation"

PHASE 3: REVIEW
  Session 2 (continued): /review-feature
    → Invokes reviewer subagent
    → Reviews diff, checks patterns, suggests improvements
    → Orchestrator applies fix suggestions (builder subagent)
    → Updates state/phase.json → phase: "review"

PHASE 4: TEST
  Session 3: /test-feature
    → Runs full test suite
    → Fixes failures
    → Runs coverage check

PHASE 5: COMMIT
  Session 3 (continued): /commit-feature
    → Formats code
    → Drafts conventional commit message
    → Creates PR (optional)
```

### 14.3 Workflow Isolation

Each phase can be a different session:
- **State file** bridges the gap
- **Session compaction** preserves critical context
- **Custom compaction hook** injects framework state into compacted context
- **Session fork** allows safe experimentation without losing original session

### 14.4 When Workflows Should Diverge

- **Bug fix** skips the full planning phase (just a quick analysis by analyst agent)
- **Documentation** goes directly to docs-writer (single subagent, no builder)
- **Security audit** is entirely read-only (security-auditor subagent produces report)
- **Release** uses the git-release skill for procedure adherence
- **Performance** adds a profiling step before implementation

---

## 15. Repository Understanding Strategy

### 15.1 Discovery Efficiency

```
Priority order (most → least efficient):

1. LSP (experimental)         ← goToDefinition, findReferences, workspaceSymbol
   Requires: OPENCODE_EXPERIMENTAL_LSP_TOOL=true
   Best for: understanding symbol relationships, call chains

2. AGENTS.md                  ← Pre-generated project summary
   Best for: project overview, conventions, build commands

3. grep                       ← Targeted search for specific patterns
   Best for: finding usage patterns, specific implementations

4. glob                       ← Finding files by name pattern
   Best for: locating files of a known type

5. read                       ← Reading specific files
   Best for: understanding implementation details

6. Tree walking (read dir)    ← Directory structure overview
   Best for: initial orientation in unknown repo

7. Git log (bash)             ← Understanding change history
   Best for: finding recent changes, blame-style investigation
```

### 15.2 Initialization Strategy (/init)

`/init` generates AGENTS.md by scanning the repo. For the framework, customize:

```jsonc
"instructions": [
  "AGENTS.md",
  "state/cache/repo-structure.json",  // auto-generated summary
  "state/cache/dependency-graph.json"  // auto-generated graph
]
```

Generate these caches via a custom tool or command:

```
/generate-context
  → Glob for source files → categorize by type
  → Parse package.json / build files for dependencies
  → Write to state/cache/
```

### 15.3 Context-Aware Discovery

When an agent needs to understand the repo:
1. First read `AGENTS.md` (already in context)
2. Check `state/cache/repo-structure.json` if available
3. Use `grep` for specific patterns
4. Use `glob` for file discovery
5. Use `read` for implementation details
6. Use LSP for symbol relationships (if enabled)

**Never:** Recursively read entire directories, read all files of a type, or perform exhaustive grep without a specific goal.

---

## 16. Limitations & Risk Register

### 16.1 Critical Limitations

| # | Limitation | Impact | Mitigation |
|---|---|---|---|
| L1 | No cross-session memory | State resets between sessions | State files + AGENTS.md updates + custom compaction hook |
| L2 | No native workflow engine | Manual orchestration required | Commands as pipeline stages + Orchestrator agent |
| L3 | No inter-agent IPC | Subagent output parsed from text | Structured output format (SDK only) or state files |
| L4 | Subagent todowrite disabled | Subagents can't self-organize | Enable manually per agent config |
| L5 | MCP tools always in context | Token bloat from unused MCPs | Global disable + per-agent opt-in |
| L6 | No native parallel execution | Sequential subagent calls only | Multiple task tool calls in single message (context accumulates) |
| L7 | No built-in result caching | Repeated identical tool calls | Plugin-based cache-manager |
| L8 | No cost tracking per workflow step | Hard to attribute costs | `opencode stats --models` gives aggregate only |
| L9 | Git-based undo only | Requires project to be git repo | Document as requirement |
| L10 | No skill auto-loading | LLM must decide to load skills | Strong descriptions + AGENTS.md hints |
| L11 | Session compaction is a black box | Hard to verify what was preserved | Custom compaction hook for observability |
| L12 | Plugin error handling unclear | Malformed plugin could crash session | Defensive coding, try/catch in all hooks |

### 16.2 Risk Matrix

| Risk | Likelihood | Severity | Mitigation |
|---|---|---|---|
| Token exhaustion (cost overrun) | Medium | High | Model routing + max steps limits + compaction pruning |
| Agent loop (tool calling itself) | Medium | Medium | `doom_loop` permission (auto-detect) + steps limit |
| State file corruption | Low | High | Atomic writes + validation on read + git versioning |
| MCP server unavailable | Medium | Medium | Timeout config + graceful fallback in commands |
| Context window exceeded | Medium | High | Auto-compaction + reserved buffer |
| Permission bypass via bash | Low | Critical | Strict bash permission patterns (deny `rm -rf *`, `curl * | sh`, etc.) |
| Secret leakage in shared sessions | Medium | High | Share: "manual" or "disabled" + pre-share sanitize |
| Skill name collision | Low | Low | Validate uniqueness at config load time |

### 16.3 Known Gaps Requiring Plugin/Framework Layer

1. **Workflow orchestration engine** — Not provided by OpenCode natively
2. **Cross-session state persistence** — Must be built on state files
3. **Result deduplication/memoization** — Must be built as plugin
4. **Agent communication bus** — Must use state files as intermediary
5. **Cost attribution per task** — Only aggregate via `opencode stats`
6. **Dynamic MCP loading** — Not possible; must be pre-configured
7. **SLA/health monitoring for MCP servers** — Not built-in
8. **Rollback to arbitrary point** — Only last action via `/undo`; state files for deeper rollback

---

## 17. Recommended Project Structure

```
project-root/
├── opencode.jsonc                   ← Framework config (agents, MCPs, commands, permissions)
├── tui.jsonc                        ← TUI configuration (theme, keybinds)
├── AGENTS.md                        ← Project overview + conventions + framework instructions
│
├── .opencode/                       ← Project-specific OpenCode extensions
│   ├── agents/                      ← Agent definitions (markdown)
│   │   ├── analyst.md               ← Read-only code analyst subagent
│   │   ├── builder.md               ← Code implementation subagent
│   │   ├── reviewer.md              ← Code review subagent
│   │   ├── docs-writer.md           ← Documentation subagent
│   │   └── security-auditor.md     ← Security scanning subagent
│   │
│   ├── commands/                    ← Workflow pipeline commands
│   │   ├── plan-feature.md          ← Planning phase
│   │   ├── build-feature.md         ← Implementation phase
│   │   ├── review-feature.md        ← Review phase
│   │   ├── test-feature.md          ← Testing phase
│   │   ├── commit-feature.md        ← Commit/PR phase
│   │   ├── fix-bug.md               ← Bug workflow
│   │   ├── generate-context.md      ← Repo caching command
│   │   └── release.md               ← Release workflow
│   │
│   ├── skills/                      ← Reusable engineering capabilities
│   │   ├── git-release/SKILL.md
│   │   ├── security-audit/SKILL.md
│   │   ├── performance-profile/SKILL.md
│   │   ├── error-handling/SKILL.md
│   │   └── testing-patterns/SKILL.md
│   │
│   ├── tools/                       ← Custom tools (TypeScript)
│   │   ├── state-reader.ts          ← Read/write state/phase.json
│   │   ├── cache-manager.ts         ← Cache read/grep/glob results
│   │   └── repo-analyzer.ts         ← Generate repo-structure.json
│   │
│   └── plugins/                     ← Framework plugins (TypeScript)
│       ├── state-manager.ts         ← Session lifecycle → state file sync
│       ├── policy-enforcer.ts       ← Block dangerous operations
│       ├── metrics-collector.ts     ← Token/cost tracking per step
│       └── context-optimizer.ts     ← Compaction hook: inject framework state
│
├── prompts/                         ← Agent system prompt files
│   ├── orchestrator.txt
│   ├── analyst.txt
│   ├── builder.txt
│   ├── reviewer.txt
│   └── docs-writer.txt
│
├── state/                           ← Framework state (git-tracked, auto-generated)
│   ├── phase.json                   ← Current workflow phase + task list
│   ├── decisions.md                 ← Architecture decision log
│   ├── plan.md                      ← Current feature plan
│   └── cache/                       ← Generated caches
│       ├── repo-structure.json      ← Repository file tree summary
│       └── dependency-graph.json    ← Module dependency graph
│
└── docs/                            ← Project documentation (References target)
    ├── architecture.md
    ├── api-standards.md
    └── development.md
```

### 17.1 Global Config (`~/.config/opencode/`)

```
~/.config/opencode/
├── opencode.jsonc                   ← Global config (providers, global plugins, personal defaults)
├── tui.jsonc                        ← Personal TUI preferences
├── AGENTS.md                        ← Personal coding preferences
├── agents/                          ← Personal agents (available across all projects)
│   └── ...
├── commands/                        ← Personal commands
│   └── ...
├── skills/                          ← Personal skills
│   └── ...
└── plugins/                         ← Global plugins (state-manager, policy-enforcer)
    ├── state-manager.ts
    └── policy-enforcer.ts
```

---

## 18. Open Questions & Required Experiments

### 18.1 Uncertainties from Documentation

| # | Question | Proposed Experiment |
|---|---|---|
| Q1 | **Token cost of compaction:** How many tokens does the compaction LLM call itself consume? Is it always net-positive? | Run identical long session with `compaction.auto: true` vs `false` (manual /compact). Compare total tokens via `opencode stats`. |
| Q2 | **Subagent context isolation:** When a subagent is invoked via `task` tool, does its entire conversation history count toward the parent's context? | Create subagent that does heavy work (many tool calls). Compare parent context size before/after via `opencode stats`. |
| Q3 | **Plugin performance overhead:** What is the latency added by plugins on `tool.execute.before` hooks for every tool call? | Create a no-op plugin. Time `opencode run "echo hello"` with and without the plugin. |
| Q4 | **MCP startup cost:** What is the actual latency of launching a local MCP server + tool discovery vs remote MCP? | Time from session start to first response with different MCP configs. |
| Q5 | **Parallel subagent execution:** Does invoking multiple `task` tool calls in one message actually run subagents in parallel, or sequentially within one response? | Create two slow subagents. Send message asking for both. Measure wall-clock time. |
| Q6 | **Compaction hook reliability:** Does `experimental.session.compacting` reliably fire on auto-compaction, or only manual? | Enable hook that writes a timestamp file. Run long session with auto-compaction. Check if file was written. |
| Q7 | **Skill load performance:** Is there measurable latency for the LLM to call the skill tool vs having the content always in context? | Compare: skill always in AGENTS.md vs loaded via skill tool. Measure response time to same prompt. |
| Q8 | **State file read overhead:** How many tokens does reading `state/phase.json` + `state/plan.md` add to each message? And is that worth the context benefit? | Measure prompt tokens with and without state file reads. |
| Q9 | **Model routing efficacy:** Do cheap models (Haiku, DeepSeek Flash) produce adequate results for code review and documentation tasks? | Run same review task through premium vs cheap model. Rate output quality. |
| Q10 | **Max practical subagent count:** At what point does the task tool description (listing all subagents) cause context pressure? | Add 1, 5, 10, 20 subagents. Measure base prompt token count at each level. |
| Q11 | **Scout subagent behavior:** How does the experimental scout agent differ from explore? Does it actually clone repos into cache? | Invoke scout agent for a known repo. Inspect `~/.cache/opencode/` for cloned content. |
| Q12 | **Timeout behavior:** What happens when an MCP server exceeds its 5s timeout? Does the session proceed without those tools, or block? | Configure an MCP to a non-existent endpoint. Observe error handling. |
| Q13 | **Environment variable injection latency via plugins:** Does `shell.env` hook add measurable overhead to every bash call? | Plugin that injects an env var. Time `opencode run "!echo $INJECTED_VAR"`. |
| Q14 | **Undo granularity:** Does `/undo` revert only one message, or all subsequent messages too? Supports chaining? | Send 3 messages with edits between each. Run `/undo` 3 times. Verify state at each step. |
| Q15 | **Fork vs Continue:** When forking a session, do state files from the forked session carry over? Or is it a purely conversational fork? | Create state file in session A. Fork to session B. Check if state file persists. |

### 18.2 Experiments Priority

**Must answer before Phase 1 implementation:**
- Q2 (subagent context isolation)
- Q5 (parallel subagent execution)
- Q10 (max subagent count)
- Q1 (compaction net token savings)

**Should answer during Phase 1:**
- Q4, Q6, Q8, Q9, Q12, Q14

**Nice to have:**
- Q3, Q7, Q11, Q13, Q15

### 18.3 Additional Unknowns

1. **Compaction model selection:** Which model does OpenCode use for compaction? The current agent's model? Small_model? Hardcoded? This affects cost.
2. **Snapshot disk usage:** How much disk does the internal git snapshot repository consume for large projects over long sessions?
3. **MCP OAuth token refresh:** Does OpenCode automatically refresh OAuth tokens for MCP servers, or do they expire?
4. **Race conditions in state files:** If two subagents attempt to write `state/phase.json` simultaneously (via plugin hooks), what happens?
5. **Custom tool error propagation:** When a custom tool throws, does the LLM see the error message and retry, or does the session error?

---

## Appendix A: Configuration References

### A.1 opencode.jsonc Schema (Abbreviated)

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "model": "provider/model-id",
  "small_model": "provider/model-id",
  "default_agent": "build",
  "autoupdate": true,
  "snapshot": true,
  "share": "manual",           // "auto" | "disabled" | "manual"
  "shell": "/bin/zsh",
  "formatter": { /* ... */ },
  "lsp": true,
  "provider": { /* ... */ },
  "permission": { /* ... */ },
  "mcp": { /* ... */ },
  "agent": { /* ... */ },
  "command": { /* ... */ },
  "instructions": ["..."],
  "plugin": ["..."],
  "server": { "port": 4096, "hostname": "0.0.0.0" },
  "compaction": { "auto": true, "prune": false, "reserved": 10000 },
  "references": { "alias": { "path": "...", "description": "..." } },
  "disabled_providers": ["..."],
  "enabled_providers": ["..."],
  "experimental": {}
}
```

### A.2 TUI Configuration (tui.jsonc)

```jsonc
{
  "$schema": "https://opencode.ai/tui.json",
  "theme": "opencode",
  "keybinds": { /* overrides */ },
  "leader_timeout": 2000,
  "scroll_speed": 3,
  "scroll_acceleration": { "enabled": false },
  "diff_style": "auto",
  "mouse": true,
  "attention": {
    "enabled": false,
    "notifications": true,
    "sound": true,
    "volume": 0.4
  }
}
```

### A.3 Agent Markdown Frontmatter

```markdown
---
description: Required - what the agent does
mode: subagent | primary | all
model: provider/model-id
temperature: 0.0-1.0
steps: max iterations before forced response
hidden: true | false
color: "#ff6b6b" | "accent" | "error" | etc.
top_p: 0.0-1.0
permission:
  edit: deny | allow | ask
  bash:
    "*": ask
    "git *": allow
  task:
    "*": deny
---
```

### A.4 Skill Frontmatter

```markdown
---
name: lowercase-hyphenated-name
description: 1-1024 chars, specific enough for agent to choose
license: MIT (optional)
compatibility: opencode (optional)
metadata: (optional string-to-string map)
  audience: maintainers
---
```

### A.5 Command Frontmatter

```markdown
---
description: Brief description shown in TUI
agent: build | plan | custom-agent-name
subtask: true | false
model: provider/model-id
---
Prompt template with $ARGUMENTS, $1, $2, `!shell command`, @file/path
```

---

## Appendix B: Key Environment Variables

| Variable | Purpose |
|---|---|
| `OPENCODE_CONFIG` | Custom config file path |
| `OPENCODE_TUI_CONFIG` | Custom TUI config path |
| `OPENCODE_CONFIG_DIR` | Custom config directory |
| `OPENCODE_CONFIG_CONTENT` | Inline JSON config |
| `OPENCODE_SERVER_PASSWORD` | Basic auth for serve/web |
| `OPENCODE_SERVER_USERNAME` | Auth username (default: opencode) |
| `OPENCODE_DISABLE_AUTOCOMPACT` | Disable auto-compaction |
| `OPENCODE_DISABLE_PRUNE` | Disable pruning |
| `OPENCODE_DISABLE_CLAUDE_CODE` | Disable Claude Code compat |
| `OPENCODE_DISABLE_CLAUDE_CODE_PROMPT` | Disable only CLAUDE.md |
| `OPENCODE_DISABLE_CLAUDE_CODE_SKILLS` | Disable only .claude/skills |
| `OPENCODE_ENABLE_EXA` | Enable web search tool |
| `OPENCODE_EXPERIMENTAL` | Enable all experimental features |
| `OPENCODE_EXPERIMENTAL_BACKGROUND_SUBAGENTS` | Background subagent tasks |
| `OPENCODE_EXPERIMENTAL_LSP_TOOL` | LSP tool |
| `OPENCODE_EXPERIMENTAL_SCOUT` | Scout subagent |
| `OPENCODE_EXPERIMENTAL_PARALLEL` | Parallel web search |

---

## Appendix C: Community Ecosystem (Relevant Projects)

| Project | Relevance to Framework |
|---|---|
| [opencode-conductor](https://github.com/derekbar90/opencode-conductor) | Protocol-driven workflow: Context → Spec → Plan → Implement |
| [oh-my-opencode](https://github.com/code-yeongyu/oh-my-opencode) | Background agents, pre-built LSP/AST/MCP tools |
| [opencode-background-agents](https://github.com/kdcokenny/opencode-background-agents) | Claude Code-style background agents |
| [opencode-supermemory](https://github.com/supermemoryai/opencode-supermemory) | Persistent cross-session memory |
| [opencode-dynamic-context-pruning](https://github.com/Tarquinen/opencode-dynamic-context-pruning) | Token optimization via pruning |
| [opencode-morph-fast-apply](https://github.com/JRedeker/opencode-morph-fast-apply) | 10x faster code editing |
| [@openspoon/subtask2](https://github.com/spoons-and-mirrors/subtask2) | Command orchestration with granular flow control |
| [opencode-goal-plugin](https://github.com/willytop8/OpenCode-goal-plugin) | Session-scoped goal tracking |

---

*End of Blueprint. Ready for Phase 1 Implementation.*
