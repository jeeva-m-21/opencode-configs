---
id: PAT-refactoring
type: pattern
title: Safe Refactoring — Small Steps, Always Green, Reference Comparison
description: Refactor in the smallest possible steps. Keep tests passing between steps. Use existing patterns as references. Never mix refactoring with feature changes.
capabilities: [refactoring-patterns, testing-unit]
tags: [refactor, restructure, safe, incremental]
domain: architecture
status: active
version: 1.0.0
created: 2026-07-12
updated: 2026-07-12
author: platform-team
reviewers: []
dependencies:
  requires: [RUL-test-required, PAT-verification-loop]
  optional: [PAT-sequential-thinking]
supersedes: []
superseded_by: null
conflicts_with: []
priority: recommended
token_estimate: 55
audience: [builder, reviewer, orchestrator]
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

# Safe Refactoring Pattern

## Golden Rule

Refactoring changes structure, not behavior. If tests fail after a refactoring step, the refactoring is wrong — not the tests.

## Process

1. **Identify the reference pattern** — find an existing file in the codebase that uses the target pattern
2. **Write characterization tests** — tests that capture current behavior before you change anything
3. **Make the smallest possible change** — rename one function, extract one module, move one file
4. **Verify** — tests pass, lint passes, typecheck passes
5. **Commit** — each refactoring step is its own commit
6. **Repeat** — next smallest step, same verification

## What to Refactor

- Duplicated code (extract shared function/module)
- Functions that do too much (extract smaller functions)
- Mixed concerns (separate business logic from I/O)
- Inconsistent patterns (align with existing codebase conventions)
- Dead code (remove unused exports, functions, dependencies)

## What NOT to Refactor

- Code you don't understand — characterize with tests first
- "Ugly but working" code — unless it's causing real problems
- Third-party library internals — you don't own it
- During a feature implementation — separate PR, separate review
- Without tests — this is just breaking things

## Anti-Patterns

- "Big bang" refactors (rewrite entire module at once)
- Refactoring + adding features in the same change
- Changing patterns without a reference implementation
- Deleting "unused" code without checking if it's imported dynamically