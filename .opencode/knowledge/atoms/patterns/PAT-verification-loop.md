---
id: PAT-verification-loop
type: pattern
title: Verify-Then-Proceed — Never Chain Unverified Changes
description: After every code change, verify it works before making the next change. Run lint, typecheck, and relevant tests. If verification fails, fix the current change before moving on.
capabilities: [testing-unit, ai-prompt-engineering]
tags: [verification, quality, testing, sequential]
domain: ai-engineering
status: active
version: 1.0.0
created: 2026-07-12
updated: 2026-07-12
author: platform-team
reviewers: []
dependencies:
  requires: [RUL-test-required]
  optional: [PAT-sequential-thinking]
supersedes: []
superseded_by: null
conflicts_with: []
priority: recommended
token_estimate: 50
audience: [builder, orchestrator]
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

# Verify-Then-Proceed Pattern

## Rule

Never chain multiple unverified code changes. After each change: verify → fix if needed → then proceed. A chain of 5 unverified changes that fails at step 5 wastes 4x the debugging time.

## Verification Sequence

1. **Save the file** (edit/write tool)
2. **Run lint:** `npm run lint` (or bun/pnpm equivalent)
3. **Run typecheck:** `npm run typecheck`
4. **Run affected tests:** `npm test -- --related` or `npx vitest --reporter=verbose path/to/test`
5. **If any fail:** fix the failures BEFORE making the next change
6. **If all pass:** proceed to the next sub-problem

## Why This Works

- Failures are localized — you know exactly which change broke things
- Debugging is O(1) not O(n) — one change to investigate, not five
- Intermediate states are always valid — you can stop at any point
- Reviewers see clean, logical commits rather than one massive changeset

## Exception

When a change truly requires two files to be valid (e.g., adding a function AND its import), make both changes and verify together. The rule is: minimize the blast radius of any verification failure.