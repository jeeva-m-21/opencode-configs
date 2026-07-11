---
id: RUL-secret-management
type: rule
title: Never commit secrets, credentials, or .env files
description: All credentials, API keys, tokens, and secrets must be stored in environment variables. .env files must be in .gitignore. Never hardcode secrets in source code.
capabilities: [secret-management, security]
tags: [secret, env, security, non-negotiable]
domain: security
status: active
version: 1.0.0
created: 2026-01-01
updated: 2026-01-01
author: platform-team
reviewers: [security-lead]
dependencies:
  requires: []
  optional: []
supersedes: []
superseded_by: null
conflicts_with: []
priority: required
token_estimate: 25
audience: [builder, reviewer, security-auditor, orchestrator]
platform_version: 1.0.0
---

# Secret Management

## Rule

Never commit credentials to source control. Environment variables are the only acceptable place for secrets.

## Requirements

- All secrets in `{env:VAR}` syntax or `process.env.VAR`
- `.env` in `.gitignore` (verified by CI)
- `.env.example` committed with placeholder values showing structure
- GitHub Secrets configured for CI/CD
- Policy-enforcer blocks reading `.env` files via the `read` tool
