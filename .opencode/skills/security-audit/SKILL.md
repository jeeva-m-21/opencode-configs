---
name: security-audit
description: Structured security audit workflow — load with eng-security for comprehensive standards
license: MIT
compatibility: opencode
metadata:
  audience: security
  workflow: security-audit
  requires: eng-security
---

## Overview

This skill provides a structured workflow for conducting security audits. For detailed security standards (vulnerability prevention, auth patterns, secrets management), load `eng-security`.

## Audit Workflow

### 1. Surface Scan
Search codebase for high-signal patterns:
- `eval(`, `dangerouslySetInnerHTML`, `innerHTML =`, `document.write(`
- `exec(`, `spawn(`, `child_process`
- String concatenation with SQL keywords (`'SELECT`, `'INSERT`, `'UPDATE`)
- `password`, `secret`, `token`, `apiKey` in source (not .env references)
- `http://` URLs (should be `https://`)

### 2. Dependency Audit
Run: `npm audit --production` or `bun pm audit`
Flag critical and high vulnerabilities. Recommend version bumps.

### 3. Auth Flow Review
Trace every route:
- Is auth middleware applied? (Check for unprotected routes)
- Are authorization checks present? (User can't access others' data)
- Is session/token management secure? (HttpOnly, Secure, SameSite)
- Are rate limits on auth endpoints?

### 4. Data Flow Review
- Where does user input enter the system?
- Is it validated and sanitized at the boundary?
- Where does data leave the system?
- Is output properly encoded for its context?

### 5. Configuration Review
- Are secrets in environment variables, not source code?
- Are `.env` files in `.gitignore`?
- Are security headers configured?
- Are CORS settings appropriate?

## Severity Classification

| Level | Criteria |
|---|---|
| **Critical** | Exploitable remotely, exposes user data, bypasses auth |
| **High** | Potential exploit with moderate effort, data leak risk |
| **Medium** | Best practice violation with security implications |
| **Low** | Minor improvements, defense in depth |

## Output

Produce a structured report with:
1. Executive summary (overall posture)
2. Findings grouped by severity with file:line references
3. Dependency audit results
4. Recommended improvements with specific remediation steps

Always load `eng-security` for the current vulnerability prevention standards before starting.
