---
description: Quick bug fix workflow — classify, find root cause, generate lightweight contract, fix, and verify
agent: orchestrator
---

You are fixing a bug. The issue is: $ARGUMENTS

## Phase 1: Choose Your Path

### Path A: Trivial (1 file, obvious cause, ≤ 5 line change)
- Skip the contract entirely
- Read the affected file directly
- Apply the fix
- Verify with the relevant test
- This should take 1-3 tool calls

### Path B: Focused (known module, 1-3 files)
- Generate a lightweight contract in `state/contract.md`:
  ```markdown
  # Execution Contract: Fix [Bug Description]
  **Classification:** bug | **Scope:** trivial | **Status:** in-progress

  ## Objective
  [Root cause and fix in one sentence]

  ## Affected Modules
  - [file:line] — [specific change needed]

  ## Implementation
  ### Task 1: Fix
  - Files to modify: [exact paths with line ranges]
  - Pattern reference: [file that shows correct behavior]
  - Verification: [specific test to run]

  ## Acceptance Criteria
  - [ ] Bug no longer reproduces (test passes)
  - [ ] No regressions in related tests
  ```
- Dispatch Builder with the contract
- After fix, verify and update phase

### Path C: Complex (unfamiliar subsystem, multiple modules, or architectural)
1. Dispatch Analyst for root cause investigation:
   ```
   Task: Find root cause of [bug]
   Look at: start with git blame on related files, then trace the failing code path
   Find: exact lines causing the bug, when introduced, what the correct behavior should be
   Stop when: you can specify exact files and line ranges for the fix
   ```
2. Generate a full contract following the same structure as `/plan-feature`
3. Proceed through the pipeline: build → review → test

## Phase 2: Fix (Path B or C)

If you generated a contract, dispatch Builder referencing the contract:
```
Implement the fix defined in state/contract.md. 
Read only the contract and the files it specifies. 
Do not re-explore the codebase.
```

## Phase 3: Verify

- Run the specific test(s) that reproduce the bug
- If the fix touches >5 lines or changes logic, also run the full test suite
- Update `state/phase.json` with the fix recorded

## Phase 4: Documentation

For Path C bugs, add the root cause to `state/contract.md` so future agents understand why the code is the way it is.

## Rules

- Path A for obvious single-file fixes — don't generate a contract for a typo
- Path B for most bugs — lightweight contract keeps Builder focused
- Path C for complex bugs — treat like a mini-feature with full contract
- Always write a test that reproduces the bug before fixing (except trivial typos)
- Check git blame for when the bug was introduced
- The contract captures the "why" — future agents shouldn't need to rediscover it
