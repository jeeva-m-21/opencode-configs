---
name: eng-frontend
description: Frontend component design, state management, routing, and accessibility standards for this platform
license: MIT
compatibility: opencode
metadata:
  domain: frontend
  audience: builder
  priority: high
  extends: eng-platform
---

## Platform Frontend Architecture

This platform uses React with TypeScript. Component architecture follows a strict separation:

```
pages/           Route-level — compose features, handle routing
components/
  features/      Feature-specific — wire data to presentation
  ui/            Primitive — render only, no business logic
hooks/           Custom hooks — reusable behavior
services/        API client, data fetching
stores/          Global state (Context, Zustand)
lib/             Frontend-specific utilities
```

### Component Design Rules

1. **UI components (`components/ui/`)** — Render only. Props in, JSX out. No data fetching, no business logic, no API calls, no global state access.
2. **Feature components (`components/features/`)** — Compose UI components with data and behavior. Connect to hooks, services, and stores. This is where business logic meets presentation.
3. **Pages (`pages/`)** — Route-level components. Compose feature components. Handle route params, metadata, and layout.

### State Management Decision Tree

```
Where does this state live?

1. One component? → useState
2. Passed to children? → props
3. Passed to siblings? → lift to common parent
4. Server data? → React Query / TanStack Query (never manual cache)
5. Global UI state? → React Context
6. Complex global state? → Zustand
7. URL state? → search params (filters, pagination, current tab)
```

**Never**: Redux for new projects. React Query + Context + Zustand covers all use cases with less boilerplate.

### Component Template

```typescript
// src/web/components/ui/Button.tsx
import { type ButtonHTMLAttributes } from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'danger'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  loading?: boolean
}

export function Button({ variant = 'primary', loading, disabled, children, ...props }: ButtonProps) {
  return (
    <button
      className={cn(styles.base, styles[variant], loading && styles.loading)}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <Spinner /> : children}
    </button>
  )
}
```

### Data Fetching Pattern

```typescript
// Always handle three states: loading, error, empty
function UserProfile({ userId }: { userId: string }) {
  const { data: user, isLoading, error } = useQuery({
    queryKey: ['users', userId],
    queryFn: () => apiClient.getUser(userId),
  })

  if (isLoading) return <Skeleton />
  if (error) return <ErrorState error={error} />
  if (!user) return <EmptyState message="User not found" />
  return <UserCard user={user} />
}
```

### Accessibility Requirements

- Every interactive element is keyboard accessible
- Every image has meaningful `alt` text
- Every form input has an associated `<label>`
- Color is never the only indicator
- Focus order is logical and visible
- Use semantic HTML: `<button>` not `<div onclick>`
- ARIA is a last resort — prefer semantic HTML

### Performance Standards

- Lazy load routes (React.lazy + Suspense)
- Memoize expensive computations (useMemo, useCallback)
- Virtualize long lists (>100 items)
- Optimize images: correct size, WebP/AVIF format, lazy loading
- No single chunk over 200KB uncompressed
- Debounce rapid input (search, resize, scroll)

### Styling

- **Approach**: Tailwind CSS (utility-first) or CSS Modules (component-scoped)
- **Never**: CSS-in-JS libraries with runtime cost (styled-components, emotion)
- **Design tokens**: Define colors, spacing, typography in a shared config
- **Responsive**: Mobile-first. Break at `sm` (640px), `md` (768px), `lg` (1024px)
