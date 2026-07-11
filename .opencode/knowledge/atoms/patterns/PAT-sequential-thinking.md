---
id: PAT-sequential-thinking
type: pattern
title: Sequential Thinking — Decompose, Plan, Execute, Verify
description: Meta-cognitive pattern for approaching complex engineering tasks. Decompose the problem, plan the approach, execute in small verifiable steps, verify each step before moving on.
capabilities: [ai-context-engineering, ai-prompt-engineering]
tags: [thinking, reasoning, decomposition, planning, verification, meta-cognition]
domain: ai-engineering
status: active
version: 1.0.0
created: 2026-07-12
updated: 2026-07-12
author: platform-team
reviewers: []
dependencies:
  requires: []
  optional: [PAT-task-decomposition, PAT-verification-loop]
supersedes: []
superseded_by: null
conflicts_with: []
priority: recommended
token_estimate: 80
audience: [orchestrator, builder]
intent: do
applies_to: routes layer code
tradeoffs:
  -       pro: "Consistent structure across the codebase",       con: "May feel verbose for simple cases"
canonical_reference:
  file: src/api/routes/users.ts
  imports: 1-9
  structure: 10-48
  handler: 50-65
primary_binding:
  layer: route
verification:
  test_file: src/api/__tests__/routes/users.test.ts
  test_pattern: should return expected output when given valid input
platform_version: 1.0.0
---

# Sequential Thinking Pattern

## When to Apply

Apply this pattern when a task involves multiple steps, unknown code, or architectural decisions. Skip for trivial single-file changes.

## The Four Phases

### Phase 1: DECOMPOSE
Break the task into independent sub-problems. Ask:
- What are the inputs and outputs?
- What existing code does this touch?
- What knowledge do I need that I don't have?
- Can any sub-problems be solved independently?

### Phase 2: PLAN
For each sub-problem, determine:
- Which files need to change?
- What pattern should I follow?
- What's the simplest thing that works?
- What could go wrong?

Write the plan as a checklist. The todowrite tool is your friend.

### Phase 3: EXECUTE
Solve one sub-problem at a time:
- Read the relevant code first (use offset/limit, not whole files)
- Make the smallest change that solves the sub-problem
- Run lint/typecheck immediately after each change
- Commit working intermediate states

### Phase 4: VERIFY
Before marking any task complete:
- Does the code compile/typecheck?
- Do tests pass for the affected module?
- Did I follow the existing patterns in the codebase?
- Can I explain why this change is correct?

## Anti-Patterns

- Jumping to implementation without reading existing code
- Making multiple unrelated changes in one edit
- Skipping verification between sub-problems
- Assuming a pattern exists without finding a reference file