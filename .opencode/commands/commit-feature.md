---
description: Format code, verify contract completion, draft commit from contract, and open PR
subtask: true
agent: builder
---

You are preparing the final commit. Verify against the contract, not against the plan.

## Phase 1: Load and Verify

Read only:
1. `state/contract.md` — the execution contract

Verify:
- [ ] Every task in the contract is implemented
- [ ] Every acceptance criterion passes
- [ ] `state/phase.json` shows testing-complete

## Phase 2: Final Checks

1. Run linter: `bun run lint`
2. Run typechecker: `bun run typecheck`
3. Run formatter if configured
4. `git status` to see all changed files
5. Confirm no unintended files are modified (compare against contract's affected modules)

## Phase 3: Draft Commit

From the contract, draft a conventional commit:

```
type(scope): brief description from contract objective

- Task 1 summary from contract
- Task 2 summary from contract

Contract: state/contract.md
```

Valid types: feat, fix, refactor, docs, test, chore, perf, ci, style

## Phase 4: Commit

1. Stage only the files listed in the contract's affected modules
2. Commit with the drafted message
3. Verify: `git log -1 --stat`

## Phase 5: Create PR (if requested)

PR title: from commit subject line
PR body:
```markdown
## Summary
[Contract objective]

## Changes
[Summary from contract tasks]

## Testing
[Testing requirements from contract with results]

## Contract
See `state/contract.md` for complete specification.
```

## After Commit

Update `state/phase.json`:
- Set `phase` to "complete"
- Add commit hash
- Add PR URL if created
