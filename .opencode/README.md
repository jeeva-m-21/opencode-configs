# .opencode/ — Framework Extensions

This directory contains all OpenCode extensions that make up the engineering framework.

## Directory Map

```
.opencode/
├── agents/          Agent definitions (markdown with YAML frontmatter)
│   ├── orchestrator.md   Primary — decision engine, workflow management
│   ├── analyst.md        Subagent — cache-first code exploration
│   ├── builder.md        Subagent — code implementation
│   ├── reviewer.md       Subagent — code review against standards
│   ├── docs-writer.md    Subagent — documentation
│   └── security-auditor.md Subagent — vulnerability scanning
│
├── commands/        Slash command templates
│   ├── analyze.md        Lightweight task triage
│   ├── plan-feature.md   Planning phase
│   ├── build-feature.md  Implementation phase
│   ├── review-feature.md Review phase
│   ├── test-feature.md   Testing phase
│   ├── commit-feature.md Commit and PR phase
│   ├── fix-bug.md        Quick bug fix (3-path decision)
│   ├── generate-context.md Repository caching
│   └── release.md        Release workflow
│
├── skills/          Lazy-loaded capability definitions
│   ├── workflow-skills/  Execution workflows
│   │   ├── workflow-selector/  Decision framework
│   │   ├── git-release/        Release procedures
│   │   ├── security-audit/     Audit workflow
│   │   ├── performance-profile/ Profiling workflow
│   │   ├── error-handling/     Error handling patterns
│   │   └── testing-patterns/   Test organization patterns
│   │
│   └── knowledge-modules/  Engineering standards (eng-*)
│       ├── eng-architecture/    Architecture principles & patterns
│       ├── eng-api-design/      API design standards
│       ├── eng-backend/         Backend service design
│       ├── eng-frontend/        Frontend component design
│       ├── eng-database/        Database schema & queries
│       ├── eng-security/        Security & auth standards
│       ├── eng-testing/         Testing strategy & coverage
│       ├── eng-performance/     Performance optimization
│       ├── eng-observability/   Logging, metrics, tracing
│       ├── eng-deployment/      CI/CD & deployment
│       ├── eng-error-handling/  Error taxonomy & recovery
│       ├── eng-refactoring/     Safe refactoring patterns
│       ├── eng-documentation/   Documentation standards
│       ├── eng-code-review/     Code review checklist
│       ├── eng-production/      Production readiness
│       ├── eng-ai-prompt/       Prompt engineering
│       ├── eng-ai-context/      Context & token optimization
│       └── eng-ai-mcp/          MCP integration
│
├── tools/           Custom TypeScript tools
│   ├── state-reader.ts      Read framework state files
│   ├── repo-analyzer.ts     Generate repo structure summary
│   └── env-validator.ts     Validate environment variables
│
└── plugins/         Event hook plugins
    ├── state-manager.ts     State synchronization
    ├── policy-enforcer.ts   Safety policies
    └── context-optimizer.ts Compaction optimization
```

## Knowledge System

The framework centralizes engineering standards into a knowledge system:

- **Engineering Handbook** (`docs/engineering-handbook.md`) — always loaded via `instructions`. Contains engineering principles, knowledge module index, and loading strategy.
- **Knowledge Modules** (`eng-*` skills) — loaded on-demand by agents via the `skill` tool. Contain domain-specific engineering standards.
- **Workflow Skills** — existing skills that provide execution workflows and reference knowledge modules for standards.

Agents load only the modules relevant to their current task. The engineering handbook is always in context.

## Conventions

1. **One file per entity** — each agent, command, tool, or plugin in its own file
2. **Frontmatter for config** — YAML frontmatter for agent, command, and skill metadata
3. **Knowledge in modules, not prompts** — engineering standards live in `eng-*` skills, not in agent prompts
4. **Skills are lazy** — loaded on-demand, never preemptively
5. **Tools from @opencode-ai/plugin** — use the `tool()` helper for type-safe custom tools
6. **Plugins are project-specific** — move to `~/.config/opencode/plugins/` for global use
