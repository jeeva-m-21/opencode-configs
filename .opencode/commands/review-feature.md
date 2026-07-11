---
description: Review code changes against the execution contract — validate compliance, not re-interpret requirements
subtask: true
agent: reviewer
---

You are reviewing code changes against the execution contract. The contract is the standard. Validate compliance, do not re-interpret.

## Phase 1: Load Review Context

Read only these files:
1. `state/contract.md` — the execution contract (your review standard)
2. Load knowledge modules specified in the contract's "Review Strategy" section:
   ```
   skill({ name: "eng-code-review" })
   skill({ name: "eng-security" })
   ```

Do NOT read:
- `state/plan.md` (contract is authoritative)
- `state/phase.json` (not needed for review)
- `AGENTS.md` (contract specifies standards)

## Phase 2: Review the Changes

Run `git diff` to see all changes.

Review each change against three layers:

### Layer 1: Contract Compliance
- Does every task in the contract have corresponding changes?
- Are there changes NOT in the contract? (flag as out-of-scope)
- Does the implementation satisfy every acceptance criterion?

### Layer 2: Pattern Adherence
- Does the code follow the pattern reference specified in the contract?
- Does it follow the conventions in the loaded knowledge modules?

### Layer 3: Quality
- Are errors handled per `eng-error-handling`?
- Are edge cases covered?
- Is there unnecessary complexity or duplication?
- Are security concerns addressed per `eng-security`?

## Phase 3: Run Automated Checks

1. `bun run lint` (or equivalent)
2. `bun run typecheck` (or equivalent)

## Output Format

```
## Review: [Contract Title]

### Contract Compliance
✅ / ❌ Task 1: [title] — [pass/fail, brief note]
✅ / ❌ Task 2: [title] — [pass/fail, brief note]

### Acceptance Criteria
✅ / ❌ [criterion 1]
✅ / ❌ [criterion 2]

### Issues Found
#### Critical (must fix before merge)
- file:line — issue [contract section reference]

#### Important (should fix)
- file:line — issue

#### Suggestions
- file:line — suggestion

### Out of Scope
- [any changes found that are not in the contract]

### Automated Checks
- Lint: pass / fail
- Typecheck: pass / fail

### Verdict
APPROVED / CHANGES REQUESTED / BLOCKED
```

## After Review

Update `state/phase.json` with phase "review-complete" and the verdict.

## Rules

- The contract is the standard. Review against it, not your personal preference.
- If a change matches the contract but violates a pattern, flag it but note "contract-compliant"
- If the contract itself has issues (missing edge case, wrong pattern), flag for the Orchestrator
- Never modify code
- Be specific: file paths and line numbers for every finding
