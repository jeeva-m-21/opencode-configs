---
description: Implement work from the execution contract — consume the contract, do not re-explore or re-analyze
subtask: true
agent: builder
---

You are implementing work defined in the execution contract. DO NOT re-analyze, re-explore, or re-infer anything already captured there.

## Phase 1: Load the Contract

Read `state/contract.md`. This is your only source of truth. Everything you need is in there.

Do NOT read:
- `state/phase.json` (contract contains status)
- `AGENTS.md` (contract specifies standards via knowledge modules)
- Repository cache files (contract specifies affected files)

## Phase 2: Load Required Knowledge

For each task in the contract, load the knowledge modules listed under "Knowledge modules":
```
skill({ name: "eng-security" })
skill({ name: "eng-api-design" })
```
Load only what the contract specifies. Do not preemptively load modules.

## Phase 3: Implement Tasks Sequentially

For each task in the contract:

1. **Read the pattern reference** — The contract specifies one existing file that demonstrates the pattern. Read it first. Follow its conventions exactly.

2. **Create/modify files** — The contract specifies exact file paths and line ranges. Read only those lines of existing files, not the whole file.

3. **Implement** — Write code following the pattern reference.

4. **Verify** — Run the verification command specified in the task. Fix until it passes.

5. **Mark complete** — Update todowrite. Proceed to next task.

## Phase 4: Run Full Verification

After all tasks complete:
1. Run the full lint: `bun run lint` (or equivalent)
2. Run the full typecheck: `bun run typecheck`
3. Run all tests: `bun test` (or equivalent)
4. Verify all acceptance criteria from the contract pass

## Before Returning

- All implementation tasks marked complete in todowrite
- All verification commands passed
- All acceptance criteria satisfied
- Lint passes
- Typecheck passes
- Tests pass
- `state/phase.json` updated to phase "implementation-complete"

## Contract Deviations

If you discover a deviation from the contract during implementation:
1. Document exactly what differs
2. Implement what makes sense (don't blindly follow a flawed contract)
3. Flag the deviation clearly in your response so the Orchestrator can update the contract
4. Do NOT stop implementation for minor deviations (wrong line range, missing edge case you can handle)

## Context Efficiency

- Read only the specific line ranges specified in the contract, not entire files
- Trust the pattern reference — don't explore multiple files "to compare patterns"
- Trust the knowledge modules — don't re-read the same knowledge twice
- Your entire context should be: contract + pattern reference file + knowledge modules + files you're editing
- Nothing else is needed
