---
id: RUL-no-empty-catch
type: rule
title: Never swallow errors with empty catch blocks
description: Every caught error must be handled (logged, wrapped, recovered from, or re-thrown with context). Empty catch blocks hide failures and make debugging impossible.
capabilities: [error-handling]
tags: [error, catch, anti-pattern, non-negotiable]
domain: error-handling
status: active
version: 1.0.0
created: 2026-01-01
updated: 2026-01-01
author: platform-team
reviewers: [backend-lead]
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

# No Empty Catch Blocks

## Rule

Never write `catch (e) {}` or `catch { }`. Every caught error must be handled. At minimum, log the error. Preferably, log it with context and either recover or re-throw with additional information.

## Examples of Correct Handling

- Log and re-throw with context: `throw new Error('user lookup failed', { cause: e })`
- Log and return fallback: `logger.warn({ err: e }, 'cache miss'); return null`
- Log and escalate: `logger.error({ err: e }, 'db connection lost'); process.exit(1)`

## Anti-Patterns

- `catch (e) {}` — error is completely lost
- `catch { return null }` — hides the failure from callers
- `catch (e) { throw new Error('failed') }` — loses original error and stack trace
