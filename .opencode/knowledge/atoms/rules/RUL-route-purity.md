---
id: RUL-route-purity
type: rule
title: Route handlers must not contain business logic
description: Route handler functions must only validate input, call a service, and format the response. Maximum 20 lines per handler. All business logic belongs in the service layer.
capabilities: [api-design, backend-service, architecture]
tags: [route, handler, architecture, layering, non-negotiable]
domain: architecture
status: active
version: 1.0.0
created: 2026-01-01
updated: 2026-01-01
author: platform-team
reviewers: [architecture-lead]
dependencies:
  requires: [RUL-service-isolation]
  optional: []
supersedes: []
superseded_by: null
conflicts_with: []
related_to: [DEC-LAYERED-001]
priority: required
token_estimate: 40
audience: [builder, reviewer, orchestrator]
platform_version: 1.0.0
---

# Route Handler Purity

## Rule

Every route handler in `src/api/routes/` must:
1. Validate input using Zod schemas from `src/shared/validation/`
2. Call exactly ONE service method
3. Format the response using the standard JSON envelope
4. Be at most 20 lines long (excluding imports and blank lines)

## Rationale

Routes are the HTTP boundary. Making them thin ensures business logic is testable independent of the HTTP framework. The same service works behind REST, GraphQL, or CLI without modification.

## Example (Correct)

```typescript
router.get('/:id', auth, async (req, res) => {
  const params = getUserParamsSchema.parse(req.params)
  const user = await userService.getById(params.id)
  res.json({ data: user })
})
```

## Violation Indicators

- Route imports database utilities or ORM methods directly
- Route contains conditional business logic
- Route handler exceeds 20 lines
- Route calls multiple service methods

## Enforcement

This rule is checked in code review. The Reviewer agent checks that routes never contain business logic and never exceed 20 lines. Builders must extract any business logic found in routes into the service layer before submitting work.
