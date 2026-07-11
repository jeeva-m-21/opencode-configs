---
id: PAT-meta-learning
type: pattern
title: Meta-Learning — Extract Lessons From Every Execution
description: After completing any task, record what worked, what didn't, and what surprised you. These observations feed the Reflection Engine and continuously improve the framework.
capabilities: [ai-context-engineering, ai-prompt-engineering]
tags: [meta-cognition, learning, improvement, reflection, feedback]
domain: ai-engineering
status: active
version: 1.0.0
created: 2026-07-12
updated: 2026-07-12
author: platform-team
reviewers: []
dependencies:
  requires: [PAT-sequential-thinking]
  optional: []
supersedes: []
superseded_by: null
conflicts_with: []
priority: recommended
token_estimate: 65
audience: [orchestrator]
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

# Meta-Learning Pattern

## The Question After Every Task

After completing any engineering task, ask: "What did the framework learn from this?"

## What to Observe

| Category | Questions |
|---|---|
| **Knowledge** | Were the right atoms loaded? Did any knowledge prove wrong or incomplete? Did I need knowledge that wasn't available? |
| **Process** | Did the workflow work? Were there unnecessary steps? Did I re-explore something already known? |
| **Patterns** | Which patterns worked perfectly? Which patterns caused issues? Did I follow a pattern and it failed? |
| **Efficiency** | Were tokens wasted? Did I read files I didn't need? Did I load modules I never used? |
| **Surprise** | What happened that I didn't expect? What assumption was wrong? What would I do differently next time? |

## How It Feeds the Framework

1. The Reflection Engine plugin auto-generates structured observations after session compaction
2. These observations accumulate in `state/reflections/data/`
3. The Synthesis Engine periodically clusters similar observations
4. Clusters that reach significance thresholds become Improvement Candidates
5. Candidates go through validation → experiment → approval → promotion
6. Promoted candidates become new or updated knowledge atoms

## Your Role

You don't need to manually trigger any of this. Just be aware that your work produces reflections. When you notice a recurring problem, mention it — the Orchestrator can create a targeted reflection that gets higher priority in synthesis.