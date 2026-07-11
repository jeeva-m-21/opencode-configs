---
id: PAT-react-component
type: pattern
title: React Component Pattern — Pure UI, Separated Logic
description: UI components render only. Business logic lives in hooks and services. Feature components compose UI components with data from hooks.
capabilities: [frontend-component, frontend-state]
tags: [react, component, jsx, hooks, typescript]
domain: frontend
status: active
version: 1.0.0
created: 2026-07-12
updated: 2026-07-12
author: platform-team
reviewers: []
dependencies:
  requires: [RUL-component-purity]
  optional: []
supersedes: []
superseded_by: null
conflicts_with: []
priority: required
token_estimate: 70
audience: [builder]
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

# React Component Pattern

## Component Categories

### UI Components (`src/web/components/ui/`)
Pure rendering. Props in, JSX out. No hooks except local state (useState, useRef).

```typescript
// Button.tsx — pure UI component
interface ButtonProps {
  variant: 'primary' | 'secondary'
  onClick: () => void
  disabled?: boolean
  children: React.ReactNode
}

export function Button({ variant, onClick, disabled, children }: ButtonProps) {
  return (
    <button className={variant} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  )
}
```

### Feature Components (`src/web/components/features/`)
Compose UI components with business logic from hooks.

```typescript
// UserProfile.tsx — feature component
import { useUser } from '../../hooks/useUser'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'

export function UserProfile({ userId }: { userId: string }) {
  const { user, isLoading, error, updateUser } = useUser(userId)

  if (isLoading) return <Card><Skeleton /></Card>
  if (error) return <Card><ErrorBanner message={error.message} /></Card>
  if (!user) return <Card><NotFound message="User not found" /></Card>

  return (
    <Card>
      <h2>{user.name}</h2>
      <p>{user.email}</p>
      <Button variant="primary" onClick={() => updateUser({ name: 'Updated' })}>
        Update
      </Button>
    </Card>
  )
}
```

## Render State Coverage

Every data-displaying component must handle ALL states:
- **Loading** — spinner, skeleton, or placeholder
- **Error** — error banner with actionable message
- **Empty** — "no results" message with appropriate CTA
- **Populated** — the actual data display