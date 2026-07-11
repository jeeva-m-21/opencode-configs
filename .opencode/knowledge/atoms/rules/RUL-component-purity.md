---
id: RUL-component-purity
type: rule
title: UI components must not contain business logic
description: Components in src/web/components/ui/ render only. All data fetching, state management, and business logic belongs in hooks and services. Feature components compose UI components with logic.
capabilities: [frontend-component, architecture]
tags: [component, ui, frontend, non-negotiable]
domain: architecture
status: active
version: 1.0.0
created: 2026-01-01
updated: 2026-01-01
author: platform-team
reviewers: [architecture-lead]
dependencies:
  requires: []
  optional: []
supersedes: []
superseded_by: null
conflicts_with: []
priority: required
token_estimate: 28
audience: [builder, reviewer, orchestrator]
platform_version: 1.0.0
---

# Component Purity

## Rule

UI components (`src/web/components/ui/`) are pure rendering units. They receive props and return JSX. They do not fetch data, manage global state, contain business rules, or directly call APIs.

## Correct Separation

- `components/ui/Button.tsx` — renders a button, accepts onClick, className, children
- `components/features/UserProfile.tsx` — uses hooks for data, composes UI components
- `hooks/useAuth.ts` — manages auth state
- `services/api-client.ts` — makes API calls
