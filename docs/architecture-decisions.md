# Framework Architecture Decisions

This document explains the architectural decisions behind the OpenCode Engineering Framework design. It supplements `state/decisions.md` which logs project-specific decisions.

## Decision: OpenCode-Native Extension Points Only

The framework uses OpenCode's native extension mechanisms (agents, commands, skills, tools, plugins) without wrapping them in additional abstraction layers.

**Why:**
- OpenCode's extension model is already well-designed and documented
- Wrapping would create a maintenance burden with each OpenCode update
- Native capabilities benefit from OpenCode's own improvements
- The framework's value is in the *composition* and *patterns*, not in novel abstractions

**Trade-off:** Less control over execution flow compared to a custom orchestration engine. Mitigated by state files bridging sessions and commands composing workflows.

## Decision: Agent Configuration in JSON, Prompts in Markdown

Agent configuration (model, temperature, permissions, color) lives in `opencode.jsonc`. Agent prompts live in `.opencode/agents/*.md` files.

**Why:**
- JSON handles structured configuration (permissions, model IDs) cleanly
- Markdown handles long-form natural language (system prompts) cleanly
- Split keeps `opencode.jsonc` readable and markdown files focused
- Agents defined in markdown are auto-discovered; JSON provides overrides

**Trade-off:** Two places to check when debugging agent behavior. Mitigated by clear documentation in `.opencode/README.md`.

## Decision: State as Files, Not Database

Framework state (phase, tasks, plans, decisions) is stored as JSON and Markdown files in the `state/` directory.

**Why:**
- Agents can read state using native `read` tool (zero token overhead for a database MCP)
- Human-readable and debuggable (open `state/phase.json` in any editor)
- Version-controllable (commit state to git for team visibility)
- Zero infrastructure dependencies (no database, no services)
- Survives sessions, compactions, and restarts naturally

**Trade-off:** No transactional guarantees, no concurrency control. Acceptable because only one agent writes state at a time (Orchestrator serializes work).

## Decision: MCP Opt-In, Not Opt-Out

MCP servers are globally disabled and enabled only on the agents that need them.

**Why:**
- Each MCP server adds 50-1,500+ tokens to every agent message
- Most agents don't need most MCP servers
- Context window is the scarcest resource in LLM interactions
- Opt-in makes token cost explicit and intentional

**Trade-off:** Must remember to enable relevant MCP when creating new agents. Mitigated by documentation and clear patterns in `opencode.jsonc`.

## Decision: All Subagents, One Orchestrator

The Orchestrator is the only primary agent with task delegation privileges. All specialized work is done by subagents.

**Why:**
- Single decision-maker avoids conflicting work
- Subagent output flows back to Orchestrator for synthesis
- Cheaper models can be used for subagents without affecting decision quality
- Clear chain of responsibility

**Trade-off:** Subagent work is sequential (Orchestrator dispatches, waits for result, dispatches again). Parallel dispatch is possible but context accumulates. Mitigated by keeping subagent tasks focused and self-contained.

## Decision: No Custom Prompt Template Engine

The framework uses OpenCode's native `$ARGUMENTS`, `$1`, `$2`, `!command`, and `@file` syntax in commands rather than building a custom template engine.

**Why:**
- Native syntax is sufficient for workflow templates
- Custom template engine would need to be maintained
- Native syntax is what the LLM sees — no translation layer

**Trade-off:** No conditional logic or loops in command templates. Mitigated by breaking complex workflows into smaller, composable commands.

## Future Considerations

These decisions may need revisiting as the framework evolves:

1. **State file scale** — If state files grow beyond ~100MB, consider SQLite via custom tool
2. **Subagent parallelism** — If task latency becomes an issue, explore experimental background subagents
3. **Plugin error handling** — A plugin error handler may be needed as plugins grow in complexity
4. **Cross-project state** — Currently state is project-scoped. Consider global state for multi-repo workflows
