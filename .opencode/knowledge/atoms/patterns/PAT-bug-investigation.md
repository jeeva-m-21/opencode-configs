---
id: PAT-bug-investigation
type: pattern
title: Bug Investigation — Reproduce, Isolate, Fix, Prevent
description: Systematic debugging pattern. Reproduce the bug first, isolate to the minimum reproduction, fix the root cause (not the symptom), then add a test to prevent regression.
capabilities: [error-handling, testing-unit]
tags: [debugging, bug, fix, investigation, root-cause]
domain: ai-engineering
status: active
version: 1.0.0
created: 2026-07-12
updated: 2026-07-12
author: platform-team
reviewers: []
dependencies:
  requires: [PAT-sequential-thinking, RUL-test-required]
  optional: []
supersedes: []
superseded_by: null
conflicts_with: []
priority: recommended
token_estimate: 60
audience: [builder, analyst, orchestrator]
platform_version: 1.0.0
---

# Bug Investigation Pattern

## The Four Steps

### 1. REPRODUCE
Before touching any code, confirm you understand the bug:
- Read the error message / stack trace completely
- Find the exact file and line mentioned
- Understand what the code EXPECTED vs what ACTUALLY happened
- If you can't reproduce it, dispatch an Analyst to gather more information

### 2. ISOLATE
Find the minimum reproduction:
- What's the smallest input that triggers the bug?
- Is it a specific value, a race condition, a missing null check?
- Use grep to find all callers of the broken function
- Check if the function's contract (JSDoc, types) matches its implementation

### 3. FIX
Fix the ROOT CAUSE, not the symptom:
- Bad: adding a null check where the value should never be null
- Good: fixing the function that incorrectly returns null
- Bad: catching an error and returning a default value
- Good: fixing the condition that causes the error
- If unsure, fix the symptom AND leave a TODO to fix the root cause

### 4. PREVENT
Add a test that would have caught this bug:
- Write the test FIRST (watch it fail with the bug)
- Apply the fix (watch the test pass)
- This proves the fix works AND prevents regression
