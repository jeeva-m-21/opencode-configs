---
name: eng-code-review
description: Code review standards, checklist, feedback guidelines, and quality expectations for all code changes
license: MIT
compatibility: opencode
metadata:
  domain: code-review
  audience: reviewer, builder
  priority: high
---

## Review Principles

1. **Review the code, not the author.** Feedback is about the code, always constructive.
2. **Distinguish blocking from non-blocking.** Critical issues block merge. Suggestions are optional.
3. **Explain why, not just what.** "Extract this to a function because it will be reused in the upcoming payment feature" beats "Extract this to a function."
4. **Review against standards, not preference.** If the code follows project conventions, personal style differences are not defects.

## Review Checklist

### Correctness
- [ ] Does the code do what it claims to do?
- [ ] Are edge cases handled (null, empty, boundary values)?
- [ ] Are error states handled (network failure, invalid input, timeout)?
- [ ] Does it handle concurrent access correctly?

### Design
- [ ] Are responsibilities clearly separated?
- [ ] Is there unnecessary coupling between modules?
- [ ] Are abstractions at the right level (not too high, not too low)?
- [ ] Could this be simpler without losing clarity?

### Code Quality
- [ ] Are names clear and descriptive?
- [ ] Are functions/classes reasonably sized?
- [ ] Is there duplicated code that should be extracted?
- [ ] Are comments explaining WHY, not WHAT?
- [ ] Are TODO comments linked to issues/tickets?

### Security
- [ ] Is user input validated and sanitized?
- [ ] Are SQL/NoSQL queries parameterized?
- [ ] Are authentication and authorization checks present?
- [ ] Are secrets exposed (hardcoded, logged, returned in responses)?
- [ ] Is output properly encoded for its context (HTML, JSON, URL)?

### Performance
- [ ] Are there N+1 query patterns?
- [ ] Is large data being loaded unnecessarily?
- [ ] Are expensive operations properly cached or deferred?
- [ ] Are database queries using appropriate indexes?

### Testing
- [ ] Do tests exist for the changed behavior?
- [ ] Do tests cover edge cases, not just happy paths?
- [ ] Are test descriptions clear about what's being tested?
- [ ] Do existing tests still pass?

### Documentation
- [ ] Is the public API documented?
- [ ] Are complex algorithms explained?
- [ ] Is the README updated if setup changed?

## Feedback Severity

| Level | Meaning | Example |
|---|---|---|
| **Critical** | Must fix before merge | Security vulnerability, data loss, broken build |
| **Important** | Should fix | Missing error handling, untested edge case |
| **Suggestion** | Nice to have | Alternative approach, naming improvement |
| **Question** | Seeking understanding | "Why did you choose this approach over X?" |

## Code Style
- Follow the project's established conventions
- Respect the linter and formatter configuration
- If a style rule isn't automated, either automate it or don't enforce it
