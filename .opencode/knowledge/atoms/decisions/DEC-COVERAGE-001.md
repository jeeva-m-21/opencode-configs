---
id: DEC-COVERAGE-001
type: decision
title: Enforced Branch Coverage Thresholds
description: Services require 90%+ branch coverage (blocking). Routes require all response codes tested. Shared utils require 90%+. Components and hooks require all states tested (non-blocking warning).
capabilities: [testing-unit, testing-integration]
tags: [coverage, testing, quality, enforcement]
domain: testing
status: active
version: 1.0.0
created: 2026-01-15
updated: 2026-01-15
author: platform-team
reviewers: [qa-lead]
dependencies:
  requires: [RUL-test-required]
  optional: []
supersedes: []
superseded_by: null
conflicts_with: []
confidence: high
evidence:
  - Google testing blog: 90% branch coverage correlates with 40% fewer production defects
priority: required
token_estimate: 45
audience: [builder, reviewer, orchestrator]
alternatives:
  -       option: "See body",       why_rejected: "See body"
rationale: Enforced Branch Coverage Thresholds   Decision
platform_version: 1.0.0
---

# Enforced Branch Coverage Thresholds

## Decision

Branch coverage requirements are enforced at different levels depending on the criticality of the code. Services are the highest priority because they contain business logic where correctness matters most.

## Thresholds

| Module | Branch Coverage | Enforcement |
|---|---|---|
| `services/` | 90%+ | Blocking — CI fails if unmet |
| `shared/utils/` | 90%+ | Blocking |
| `routes/` | All response codes + auth paths | Blocking |
| `repositories/` | All query methods | Blocking |
| `components/` | All render states (loading, error, empty, populated) | Warning only |
| `hooks/` | All state transitions | Warning only |

Overall branch coverage threshold in vitest config: 80%.

## Rationale

Business logic correctness is the highest priority. UI rendering states are important but easier to catch in manual review and E2E tests. The blocking/non-blocking distinction prevents CI friction while maintaining quality pressure.