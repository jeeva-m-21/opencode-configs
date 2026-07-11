---
description: Run the test suite, verify against contract acceptance criteria, fix any failures
subtask: true
agent: builder
---

You are running tests and verifying the implementation against the execution contract.

## Phase 1: Load Context

Read only:
1. `state/contract.md` — especially the Testing Requirements and Acceptance Criteria sections

## Phase 2: Run Tests

1. Discover test commands from the contract or project conventions
2. Run the full test suite with coverage if available
3. Run any contract-specific verification commands

## Phase 3: Analyze Results

**If all tests pass and all acceptance criteria are met:**
- Update `state/phase.json` with phase "testing-complete"
- Report passing status with coverage numbers

**If tests fail:**
1. Categorize each failure:
   - **Regression** — previously passing test now fails → fix now
   - **Contract test** — test written for this feature that fails → fix now
   - **Pre-existing** — was failing before this feature → flag, do not fix

2. Fix in priority order: regressions → contract tests → flaky
3. After each fix, re-run the affected tests
4. Do NOT fix pre-existing failures unless explicitly asked

## Phase 4: Verify Acceptance Criteria

Check every acceptance criterion from the contract:
- [ ] Run through each criterion manually or via test
- [ ] Mark pass/fail for each

## Before Returning

- All tests pass (excluding documented pre-existing failures)
- All contract acceptance criteria verified
- Coverage for new code meets standards
- `state/phase.json` updated to "testing-complete"
