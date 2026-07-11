---
id: PAT-code-exploration
type: pattern
title: Codebase Exploration — Read Before Writing, Cache Before Reading
description: Systematic approach to understanding unfamiliar code. Check caches first, then read targeted line ranges, then grep for patterns. Never read entire files or directories blindly.
capabilities: [ai-context-engineering]
tags: [exploration, read, grep, glob, context, efficiency]
domain: ai-engineering
status: active
version: 1.0.0
created: 2026-07-12
updated: 2026-07-12
author: platform-team
reviewers: []
dependencies:
  requires: []
  optional: [PAT-sequential-thinking]
supersedes: []
superseded_by: null
conflicts_with: []
priority: recommended
token_estimate: 55
audience: [analyst, orchestrator, builder]
platform_version: 1.0.0
---

# Codebase Exploration Pattern

## Efficiency Order (Cheapest → Most Expensive)

1. **Check caches** — `state/cache/repo-structure.json`, `state/cache/dependency-graph.json`
2. **Glob for file patterns** — `glob pattern="src/api/routes/**/*.ts"` — find files by name
3. **Grep for patterns** — `grep pattern="functionName"` — find where things are used
4. **Read targeted sections** — `read filePath="x.ts" offset=50 limit=30` — read specific line ranges
5. **Read full files** — only when you need the complete implementation

## Anti-Patterns

- `read filePath="src/"` — reading a directory to "see what's there" (use glob)
- `read filePath="x.ts"` without offset/limit — reading 500 lines when you need lines 10-40
- `grep pattern="." include="*.ts"` — searching for everything (filter by keyword)
- Reading every file in a directory — "just to understand it" (that's what AGENTS.md is for)

## Before Writing Any Code

1. Find a reference implementation — an existing file that does something similar
2. Read it with targeted line ranges — understand the pattern, not the entire file
3. Follow the pattern exactly — same imports, same structure, same error handling style
4. If no reference exists, that's a signal to ask the Orchestrator for guidance
