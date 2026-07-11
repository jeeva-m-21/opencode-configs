---
description: Lightweight task triage — classify the request, estimate scope, and recommend a workflow without full planning
agent: orchestrator
---

You are triaging a new engineering request. Your goal is classification and routing, NOT implementation.

Request: $ARGUMENTS

## Quick Triage Process

Complete all of these. Be fast — this is triage, not deep analysis.

### 1. Classify the Task

Load the `workflow-selector` skill for the decision framework, then classify:

Based on the request, what type of work is this?

Possible types: feature, bug, refactor, documentation, security, performance, review, exploration, release, maintenance

### 2. Estimate Scope

Check existing caches first:
- Read `state/cache/repo-structure.json` if it exists
- Read `state/cache/dependency-graph.json` if it exists
- Do ONE targeted grep or glob to identify likely affected files

Estimate the number of files that will need to change, and classify the scope:
- trivial (1 file), small (2-3), medium (4-10), large (10-20), major (20+)

### 3. Select Workflow

Based on task type and scope, choose the recommended workflow:

| Task Type + Scope | Workflow |
|---|---|
| Feature + trivial/small | Direct Builder dispatch |
| Feature + medium+ | /plan-feature → /build-feature → /review-feature → /test-feature → /commit-feature |
| Bug + obvious cause | Direct Builder dispatch with specific fix instruction |
| Bug + unknown cause | Analyst → Builder |
| Documentation + any | Docs-writer dispatch |
| Security + any | Security-auditor dispatch |
| Exploration + any | Analyst dispatch |
| Performance + any | performance-profile skill → Analyst → Builder |
| Release + any | /release |
| Refactor + any | /plan-feature → /build-feature → /review-feature → /test-feature |

### 4. Decide Autonomous vs Ask

Can you proceed without user confirmation?
- YES if: scope ≤ 3 files AND task type is clear AND no architectural changes
- ASK if: scope > 5 files OR core architecture affected OR new dependency needed
- WARN then proceed if: everything in between

## Output

```
## Triage Result

**Classification:** [type]

**Likely affected:**
- module/directory (N files)

**Scope:** [trivial | small | medium | large | major]

**Recommended workflow:**
1. [first step]
2. [second step]
...

**Decision:** [autonomous | ask first | warn then proceed]

**Next:** [specific next instruction]
```

## After Triage

Write a summary to `state/analysis.json`:

```json
{
  "generatedAt": "ISO date",
  "request": "$1",
  "classification": "...",
  "scope": "...",
  "affectedModules": ["..."],
  "workflow": ["step1", "step2"],
  "autonomous": true,
  "nextAction": "..."
}
```

If autonomous, proceed with the recommended workflow immediately. If ask-first, present the triage result to the user and wait for confirmation.
