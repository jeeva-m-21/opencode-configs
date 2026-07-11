---
id: RUL-test-required
type: rule
title: Write tests before or alongside every implementation
description: Every new feature, bug fix, or refactor must include tests. Tests are not optional. The Reviewer rejects work without adequate test coverage.
capabilities: [testing-unit, testing-integration]
tags: [test, testing, non-negotiable, quality]
domain: testing
status: active
version: 1.0.0
created: 2026-01-01
updated: 2026-01-01
author: platform-team
reviewers: [qa-lead]
dependencies:
  requires: []
  optional: []
supersedes: []
superseded_by: null
conflicts_with: []
priority: required
token_estimate: 20
audience: [builder, reviewer, orchestrator]
platform_version: 1.0.0
---

# Tests Required

## Rule

Tests are not optional. Every implementation change must include passing tests. The Reviewer rejects work without adequate tests.

## Minimum Requirements

- Services: 90%+ branch coverage (blocking)
- Routes: all response codes + auth paths tested
- Shared utils: 90%+ branch coverage (blocking)
- Components: all render states tested (warning on gaps)
- Hooks: all state transitions tested (warning on gaps)
