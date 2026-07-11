---
name: eng-ai-context
description: Context engineering standards for AI agents — window management, caching strategies, compaction, and token efficiency
license: MIT
compatibility: opencode
metadata:
  domain: ai-engineering
  audience: orchestrator
  priority: high
---

## Context Engineering Principles

1. **Context is the scarcest resource.** Every token in the context window costs money and reduces model attention. Treat context like memory on an embedded device.
2. **Cache before reading, read before exploring.** Check cache files → read specific files → grep for patterns → glob for discovery. Progress from cheapest to most expensive.
3. **Load only what's needed for the current task.** Knowledge modules, MCP tools, context files — enable only what this specific task requires.
4. **Compaction is your safety net.** Trust that compaction will preserve critical context. Don't hoard information "just in case."
5. **Subagents isolate context.** Heavy exploration should happen in subagents where the context doesn't pollute the main session.

## Context Budget Targets

| Session Type | Target Prompt Tokens | Strategy |
|---|---|---|
| Orchestrator (triage) | < 2000 | Load handbook, read phase.json, classify |
| Orchestrator (planning) | < 4000 | Handbook + analysis + one Analyst exploration |
| Analyst exploration | < 1500 | Question + cache files + limited source |
| Builder implementation | < 3000 | Plan section + reference file + specific instructions |
| Reviewer session | < 2000 | Diff scope + review checklist |
| Full feature pipeline | < 15,000 total | Sum of all phases |

## Caching Strategy

### What to Cache (in `state/cache/`)
| Cache | Content | Invalidation | Token Savings |
|---|---|---|---|
| `repo-structure.json` | Directory tree, file types, entry points | On git branch change | ~500-1500 per session |
| `dependency-graph.json` | Dependencies, frameworks, tools | On package.json change | ~300-800 per session |
| Cached state files | phase.json, decisions.md (in instructions) | N/A (always loaded) | Eliminated reads |

### What NOT to Cache
- Tool execution outputs (write/edit/bash — side effects)
- We fetch results (may be dynamic)
- User responses to questions
- Anything containing secrets or PII

## Compaction Strategy

- **Auto-compaction**: enabled (`compaction.auto: true`)
- **Pruning**: enabled (`compaction.prune: true`) — removes old tool outputs
- **Reserved buffer**: 10,000 tokens (`compaction.reserved: 10000`)
- **Custom compaction hook**: injects framework state (phase, tasks, decisions) so it survives compaction

After compaction, the remaining context should contain:
1. Engineering handbook (principles, always relevant)
2. Current framework state (phase, active task)
3. Most recent messages and their outputs (the active context)
4. Agent role and capabilities

## Token Efficiency Checklist

Before every tool call, ask:
- [ ] Have I read this file already this session? → Don't re-read
- [ ] Is this information in a cache file? → Read cache instead
- [ ] Can I read a line range instead of the whole file? → Use offset/limit
- [ ] Does this subagent need the full conversation? → Give focused briefing
- [ ] Is this knowledge module already loaded? → Don't re-load
- [ ] Can I use grep instead of reading files? → Grep is cheaper than read
- [ ] Am I about to read a config file that's in the cache? → Skip
- [ ] Is this exploration better done in a subagent? → Isolate context

## MCP Context Awareness

MCP servers inject tool descriptions into context. Each server costs 50-1500+ tokens per message.
- Disable globally (`"tools": { "mcp_*": false }`)
- Enable per-agent only on agents that use them
- Context7: enabled on Orchestrator, Analyst, Docs-writer, Security-auditor only
- Never enable an MCP "just in case" — the token cost is per-message, per-session
