---
name: eng-ai-mcp
description: MCP integration standards — server selection, token impact analysis, permission model, and configuration patterns
license: MIT
compatibility: opencode
metadata:
  domain: ai-engineering
  audience: orchestrator, builder
  priority: medium
---

## MCP Integration Principles

1. **MCP is for external data, not internal operations.** Use bash for git, grep for code search, read/write for files. Use MCP only when the tool needs capabilities beyond what's built-in (external API access, specialized services).
2. **Every MCP server costs tokens.** Each server adds tool descriptions to the context window. A server with 20 tools costs ~500-800 tokens per message, per agent.
3. **Default off, opt-in per agent.** MCP servers are globally disabled. Enable them only on agents that need them for specific tasks.
4. **Prefer bash-based alternatives.** `gh pr create` costs zero extra context tokens. A GitHub MCP server costs 1000+ tokens per message.
5. **One MCP per specialized agent.** Don't enable 5 MCPs on one agent. Create specialized agents for specific MCP needs.

## MCP Selection Matrix

| Need | Built-in Alternative | MCP Only When |
|---|---|---|
| Code search | grep (ripgrep) | N/A — grep is always better |
| File operations | read/write/edit/glob | N/A — built-ins are always better |
| Git operations | bash (`git`, `gh` CLI) | Only for complex GitHub API needs |
| Documentation lookup | Context7 MCP | Context7 is low-token, good default |
| Error monitoring | Sentry MCP | Only on debugger agent |
| Database access | bash (`psql`, `mysql`) | Only for complex multi-step DB ops |
| Browser automation | N/A | Only on e2e-test agent |
| Containerization | bash (`docker`, `kubectl`) | Only for complex orchestration |
| Cloud resources | bash (aws/gcloud CLI) | Only for complex infrastructure |
| External code search | Grep by Vercel MCP | For cross-repo GitHub search |

## Configuration Pattern

```jsonc
{
  "mcp": {
    "server-name": {
      "type": "remote",
      "url": "https://mcp.example.com",
      "oauth": {},                              // or "oauth": false for API keys
      "headers": {"Authorization": "Bearer {env:TOKEN}"}
    }
  },
  // Global disable — forces per-agent opt-in
  "tools": { "server-name_*": false },
  "agent": {
    "specialized-agent": {
      "tools": { "server-name_*": true }        // Only this agent gets MCP tools
    }
  }
}
```

## Authentication

- **OAuth**: Preferred for services with user accounts. Run `opencode mcp auth <name>` once. Tokens stored in `~/.local/share/opencode/mcp-auth.json`.
- **API Keys**: Preferred for service accounts and CI/CD. Use `{env:TOKEN_NAME}` substitution.
- **Pre-registered OAuth**: For services you have pre-existing client credentials with: `"oauth": { "clientId": "{env:ID}", "clientSecret": "{env:SECRET}" }`.

## Recommended MCP Servers

| Server | Token Impact | When to Enable |
|---|---|---|
| **Context7** | Low (~50 tokens, 1-3 tools) | Orchestrator, Analyst, Docs-writer, Security-auditor |
| **Sentry** | Medium (~300 tokens, 10-15 tools) | Debugger agent only |
| **Grep by Vercel** | Low (~40 tokens, 1-2 tools) | Analyst (external code reference) |
| **GitHub** | High (~800 tokens, 30-50 tools) | Only if gh CLI is insufficient |
| **Docker/K8s** | Varies | Only on infra-specific agents |

## Anti-Patterns

- Enabling a server on all agents "just in case" → token bloat
- Using MCP for operations that bash does better → unnecessary complexity
- Loading high-token servers on the Orchestrator → context pollution
- Not setting timeouts (`"timeout": 10000`) → hung sessions
- Using OAuth for CI/CD → use API keys instead
