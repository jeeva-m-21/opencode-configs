# Architecture Decisions

This log captures significant architectural decisions made during the project's development. Each entry includes the context, decision, rationale, and consequences.

## Template

```
### [YYYY-MM-DD] Decision Title

**Context:** What was the situation that required a decision?

**Decision:** What did we decide?

**Rationale:** Why did we make this choice over alternatives?

**Consequences:** What are the resulting constraints, benefits, or follow-up actions?
```

---

## Decisions

_— No decisions recorded yet. Entries are added as architecture decisions are made during feature development. —_

### [2026-07-11] Framework Foundation

**Context:** Initial framework setup for the OpenCode Engineering Framework.

**Decision:** Use OpenCode's native extension points exclusively — agents, commands, skills, tools, and plugins — without wrapping them in additional abstraction layers.

**Rationale:** OpenCode provides rich native extension capabilities (agent hierarchy, command pipelines, skill lazy-loading, plugin hooks, custom tools). Wrapping these in custom abstractions would duplicate functionality, increase maintenance burden, and make the framework harder to understand for new contributors. Native capabilities are well-documented and benefit from OpenCode updates.

**Consequences:**
- Framework structure mirrors OpenCode's native directory layout (`.opencode/agents/`, `.opencode/commands/`, etc.)
- No custom orchestration engine — uses OpenCode's agent model directly
- State management relies on filesystem files rather than a database
- Easy to extend by following OpenCode's established patterns

### [2026-07-11] Filesystem-Based State

**Context:** The framework needs state that persists across sessions to maintain workflow continuity.

**Decision:** Use JSON and Markdown files in a `state/` directory for all framework state.

**Rationale:** Alternatives considered: SQLite database (more structure but requires custom tooling), environment variables (not persistent), plugin in-memory state (lost on session end). Filesystem files are trivially readable by agents via the `read` tool, human-readable for debugging, version-controllable via git, and require zero infrastructure dependencies.

**Consequences:**
- State is always accessible to agents via `read` tool
- State survives session restarts and compaction
- State can be committed to git for team visibility
- No transactional guarantees (acceptable for workflow state)
- Must ensure state-reader tool handles missing/invalid state gracefully

### [2026-07-11] Agent Model Routing

**Context:** Different engineering tasks require different levels of model capability. Running every task through a premium model wastes tokens and cost.

**Decision:** Route tasks to models based on complexity: premium models (Claude Sonnet) for Orchestrator and Builder, cheap models (Claude Haiku) for Analyst, Reviewer, Docs-writer, and Security-auditor.

**Rationale:** Code generation and architectural decisions require strong reasoning (premium). Code reading, pattern matching, documentation generation, and security scanning can be performed adequately by cheaper models. This aligns with the blueprint's token optimization strategy (Section 13).

**Consequences:**
- ~35-40% cost reduction vs. all-premium routing
- Analyst and Reviewer output may occasionally need premium model follow-up
- Model selection is configurable per agent in `opencode.jsonc`
- Cheaper models may miss subtle issues; Reviewer catches what it can, Orchestrator makes final decisions

### [2026-07-11] MCP Global-Disable / Per-Agent Opt-In

**Context:** MCP servers inject their tool descriptions into every agent's context window, consuming tokens even when the tools are never used.

**Decision:** Disable all MCP tools globally (`"tools": { "context7_*": false }`) and explicitly enable them only on agents that need them.

**Rationale:** Each MCP server adds 50-1500+ tokens of tool descriptions to every message. Enabling them only where needed (Context7 on Analyst, Docs-writer, Security-auditor) eliminates this overhead for Builder and Reviewer agents.

**Consequences:**
- Token savings of 200-1500 tokens per message for agents without MCP access
- Must remember to enable relevant MCPs when creating new agents
- Clear separation: "tools for the job" philosophy
