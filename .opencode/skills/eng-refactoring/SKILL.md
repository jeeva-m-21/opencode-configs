---
name: eng-refactoring
description: Safe refactoring patterns, when to refactor, how to approach restructuring, and avoiding regressions
license: MIT
compatibility: opencode
metadata:
  domain: refactoring
  audience: builder
  priority: medium
---

## Refactoring Principles

1. **Refactor under test.** Never refactor without tests covering the behavior you're preserving.
2. **Small steps, verified continuously.** Refactor in the smallest possible increments. Run tests after each step.
3. **Separate structural from behavioral changes.** Don't refactor AND add features in the same change.
4. **Leave it better than you found it.** Boy Scout rule: every edit is an opportunity for small improvement.

## When to Refactor

| Signal | Action |
|---|---|
| Same pattern copy-pasted 3+ times | Extract to shared function/component |
| Function/class exceeds 200 lines | Split into smaller units with clear responsibilities |
| Naming no longer matches behavior | Rename to reflect current purpose |
| Deep nested conditionals (>3 levels) | Extract conditions, use early returns, apply strategy pattern |
| Module has 10+ imports from unrelated domains | Split module along responsibility boundaries |
| Comments explain WHAT code does | Make the code clear enough that comments aren't needed |
| Changing one thing requires changing 5+ files | Reduce coupling, introduce abstraction |

## When NOT to Refactor
- Code that works, is tested, and isn't changing frequently
- Code that will be replaced soon
- Without test coverage to validate the refactor
- "Because I prefer it differently" (personal style doesn't justify refactoring)
- During a feature freeze or just before a release

## Safe Refactoring Patterns

### Extract Function
```
Before: 50-line function doing three things
After:  Three 15-line functions called by the original
```
Sign: A block of code with a comment describing what it does.

### Extract Module/Component
```
Before: Single file with multiple responsibilities
After:  Multiple files, each with one responsibility
```
Sign: Import list includes unrelated domains.

### Replace Conditional with Polymorphism
```
Before: if (type === 'A') ... else if (type === 'B') ...
After:  class A extends Base, class B extends Base
```
Sign: Same conditional structure appears in multiple places.

### Simplify Conditional
```
Before: if (!(a && b) || (c && !d)) { ... }
After:  const isValid = a && b; const isSpecialCase = c && !d; if (!isValid || isSpecialCase) { ... }
```
Sign: Condition takes more than 5 seconds to understand.

### Rename for Clarity
```
Before: processData(x, y)
After:  calculateMonthlyRevenue(transactions, startDate)
```
Sign: You need to read the implementation to understand what it does.

## Regression Prevention
- Run full test suite before and after
- Use IDE automated refactoring tools when available
- Make one refactoring change per commit
- If a refactoring breaks something, revert immediately and try a smaller step
- Use git diff to review exactly what changed (no unintended edits)

## Anti-Patterns
- **Big bang refactor**: rewriting everything at once (→ incremental refactoring)
- **Refactoring without tests**: hoping nothing breaks (→ add tests first)
- **Refactoring + features**: mixing behavior and structure changes (→ separate PRs)
- **Perfect code syndrome**: never shipping because "it could be cleaner" (→ ship, then iterate)
