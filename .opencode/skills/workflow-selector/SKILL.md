---
name: workflow-selector
description: Decision framework for classifying engineering requests, selecting workflows, estimating scope, and minimizing context
license: MIT
compatibility: opencode
metadata:
  audience: orchestrator
  workflow: decision-making
---

## Overview

This skill provides a structured decision-making framework for the Orchestrator. Load it when:
- A user request is ambiguous and needs classification
- Multiple workflows could apply and the best one is unclear
- You need to estimate scope before committing to a workflow
- You want to validate that you've chosen the smallest possible execution path

## Classification Decision Tree

```
Does the request ask to CREATE something new?
├── Yes → FEATURE or DOCS
│   ├── Is it a document (README, guide, API doc)?
│   │   └── Yes → DOCUMENTATION → dispatch docs-writer
│   └── No → FEATURE
│       ├── Is it ≤ 3 files and no new concepts?
│       │   └── Yes → Direct Builder (no plan needed)
│       └── No → Full pipeline: /analyze → /plan-feature → /build-feature

Does the request describe something BROKEN or unexpected behavior?
├── Yes → BUG FIX
│   ├── Is the cause obvious from the error message?
│   │   └── Yes → Direct Builder with explicit fix instruction
│   ├── Is it in a single file/function?
│   │   └── Yes → Analyst (find root) → Builder (fix)
│   └── Is it in an unknown subsystem?
│       └── Yes → Analyst (deep investigation) → report → decide

Does the request ask to CHANGE existing code without adding features?
├── Yes → REFACTOR or MAINTENANCE
│   ├── Is it a dependency upgrade?
│   │   └── MAINTENANCE → check changelog → plan if breaking → Builder
│   └── Is it restructuring code?
│       └── REFACTOR → full pipeline with extra review emphasis

Does the request ask a QUESTION about the codebase?
├── Yes → EXPLORATION → dispatch analyst directly

Does the request ask about SECURITY or VULNERABILITIES?
├── Yes → SECURITY → dispatch security-auditor directly

Does the request mention PERFORMANCE or SPEED?
├── Yes → PERFORMANCE → load performance-profile skill → light plan → Builder

Does the request ask to REVIEW or CHECK something?
├── Yes → REVIEW → dispatch reviewer directly

Does the request ask to RELEASE, DEPLOY, or SHIP?
├── Yes → RELEASE → /release command
```

## Scope Estimation

Before committing to any workflow, estimate the blast radius:

1. **Read `state/cache/repo-structure.json`** to understand the codebase layout
2. **Identify the likely module(s)** affected by keywords in the request
3. **Estimate file count** — a quick glob or grep can bound the scope
4. **Classify the scope:**

| Scope | Files | Workflow Overhead |
|---|---|---|
| Trivial | 1 | Direct Builder, no plan |
| Small | 2-3 | Light plan, direct Builder |
| Medium | 4-10 | Full plan → build → review |
| Large | 10-20 | Full pipeline with phased implementation |
| Major | 20+ | Warn user, propose incremental delivery |

## Minimum Viable Intervention

For every request, ask: "What's the smallest thing I can do that satisfies this request?"

- **Feature request** → What's the MVP? Can we defer polish?
- **Bug fix** → What's the minimal code change? Is there a workaround?
- **Refactor** → What's the highest-impact single change? Can we do the rest later?
- **Documentation** → What's the most critical gap? Start there.

## When to Skip Planning

Skip the planning phase (`/plan-feature`) when:
- The change is ≤ 3 files
- All files are in one module/directory
- No new architectural patterns are introduced
- No new dependencies are added
- The path forward is obvious to an experienced developer

When skipping planning, still:
- Dispatch an Analyst to read the affected files first
- Brief the Builder with specific file paths and line numbers
- Run lint/typecheck/tests after

## When to Interrupt the User

Interrupt the user for clarification when:
- The request could mean 3+ different things
- The request would change core architecture
- The request contradicts prior decisions in `state/decisions.md`
- Two reasonable approaches exist with different trade-offs
- The scope estimate is "Major" (20+ files)

Do NOT interrupt when:
- The intent is clear even if details are missing (fill in sensible defaults)
- You can state "Assuming X, I'll do Y" and the assumption is obvious
- The user has explicitly asked you to proceed autonomously
- The choice between approaches is clear (pick the better one)

## Output Format

When loaded for workflow selection, produce:

```
## Classification
Task type: [feature | bug | refactor | docs | security | performance | review | exploration | release | maintenance]

## Recommended Workflow
[Specific commands or agent dispatches in order]

## Scope Estimate
Module(s): [list]
Estimated files: [count]
Scope: [trivial | small | medium | large | major]

## Decision
Autonomous: [yes | no — because ...]
Next action: [specific next step]
```
