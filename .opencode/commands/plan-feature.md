---
description: Plan a feature or refactor — classify the request, explore minimally, and produce a structured execution contract
agent: orchestrator
---

You are creating an execution contract for: $ARGUMENTS

An execution contract is the single source of truth for all implementation work. It captures everything downstream agents need to know so they never re-analyze, re-explore, or re-infer.

## Phase 1: Triage (use existing analysis if available)

Check if `state/analysis.json` already covers this request. If not, do a quick triage:

1. Load the `workflow-selector` skill for the decision framework
2. Read `state/cache/repo-structure.json` for project layout
3. Read `state/cache/dependency-graph.json` for dependencies
4. Run ONE targeted grep to identify likely affected files
5. Classify: task type, scope estimate, autonomous vs ask

## Phase 2: Targeted Exploration (minimal, only if needed)

If the triage doesn't give you enough detail about affected files:

1. Dispatch Analyst with a laser-focused briefing:
   ```
   Task: Find exactly which files need to change for [specific objective]
   Look at: [specific directories from triage]
   Find: file paths and approximate line ranges that will change
   Also find: one existing file that demonstrates the pattern to follow
   Stop when: you have the complete list of affected files
   Limit: read at most 5 files, grep at most 3 patterns
   ```

2. Do NOT explore broadly. Do NOT ask the analyst "what should we do?" — just "what files are involved?"

Skip Phase 2 entirely if the triage identified all affected files.

## Phase 3: Generate the Execution Contract

Write `state/contract.md` following the exact template from the contract file. Every section must be filled:

### Required Sections
- **Classification** — type + scope
- **Objective** — 1-3 sentences
- **Scope** — in-scope deliverables, explicit out-of-scope items
- **Affected Modules** — specific file paths with notes on what changes
- **Implementation Tasks** — each task specifies:
  - Files to create (exact paths)
  - Files to modify (paths + approximate line ranges)
  - Pattern reference (one existing file that demonstrates the pattern to follow)
  - Knowledge modules to load (`eng-*` skills the Builder needs)
  - Verification command (specific test or lint command)
- **Constraints** — technical and business constraints
- **Dependencies** — new packages, new env vars, prerequisite work
- **Testing Requirements** — specific test scenarios with expected outcomes
- **Acceptance Criteria** — measurable, binary (pass/fail) criteria
- **Review Strategy** — what to focus on, what to skip, which modules to review against

### Contract Quality Standards

A good contract eliminates ambiguity. Compare:
- **Weak**: "Add authentication to the API" 
- **Strong**: "Add POST /auth/login, POST /auth/register, POST /auth/refresh, POST /auth/logout routes following the pattern in src/api/routes/users.ts with JWT access tokens (15min) and rotating refresh tokens (7 days). Test all response codes per eng-testing module."

A good contract eliminates re-exploration. The Builder should never need to:
- Discover which files to modify (the contract lists them)
- Find pattern references (the contract specifies one)
- Decide which knowledge to load (the contract lists modules)
- Guess at test coverage (the contract specifies test scenarios)

## Phase 4: Validate and Save

Before saving:
1. Read the contract back — is every task specific enough that a Builder needs zero clarification?
2. Check that every "File to modify" includes approximate line ranges
3. Check that every task has a verification command
4. Check that acceptance criteria are measurable (binary pass/fail)

Write `state/contract.md` with the contract.
Update `state/phase.json`:
- Set `phase` to "contract-ready"
- Set `activeTask` to the first implementation task title

## Phase 5: Present

Present a 3-bullet summary:
1. What will be built
2. Files affected (count of create + modify)
3. Recommended next command (`/build-feature`)

If the scope is trivial (1 file), suggest skipping the contract and going directly to Builder. The user can approve or request the contract anyway.
