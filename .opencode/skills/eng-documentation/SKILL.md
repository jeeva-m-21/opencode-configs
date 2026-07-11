---
name: eng-documentation
description: Documentation standards, types, structure, maintenance strategy, and writing guidelines
license: MIT
compatibility: opencode
metadata:
  domain: documentation
  audience: docs-writer
  priority: medium
---

## Documentation Principles

1. **Document WHY, not WHAT.** Code tells you WHAT it does. Documentation tells you WHY it exists, WHY decisions were made, and HOW to use it.
2. **Keep it close to the code.** Documentation that lives far from the code it describes goes stale. README in the project, JSDoc on the function, architecture docs in `docs/`.
3. **Every public API is documented.** If it's exported, it has a JSDoc comment describing purpose, parameters, return value, and example.
4. **Remove outdated documentation.** Stale docs are worse than no docs. When changing code, update its documentation.

## Documentation Types

| Type | Location | Audience | Content |
|---|---|---|---|
| **README** | Project root | New developers | Quick start, setup, architecture overview, links to deeper docs |
| **API Reference** | JSDoc / doc comments | Consumers of code | Function signatures, parameters, returns, exceptions, examples |
| **Architecture Guide** | `docs/architecture.md` | Team members | System design, data flow, component responsibilities, decisions |
| **Setup Guide** | `docs/setup.md` or README | New developers | Prerequisites, installation, environment config, running locally |
| **Contributing Guide** | `CONTRIBUTING.md` | Contributors | Code standards, PR process, testing requirements, commit conventions |
| **Runbook** | `docs/runbooks/` | On-call engineers | Alert response procedures, common issues, escalation paths |
| **Decision Log** | `state/decisions.md` | Team members | Architectural decisions with context, rationale, consequences |

## README Structure
```
# Project Name
Short description (1-2 sentences)

## Quick Start
## Features
## Architecture (diagram or overview)
## Setup / Installation
## Usage / Examples
## API (link or summary)
## Testing
## Deployment
## Contributing
## License
```

## JSDoc / TSDoc Standards
```
/**
 * Brief description of what the function does.
 *
 * Detailed description if needed. When to use, edge cases, performance characteristics.
 *
 * @param userId — The unique identifier of the user (UUID v4)
 * @param options — Optional configuration
 * @param options.includeDeleted — Whether to include soft-deleted records (default: false)
 * @returns The user object, or null if not found
 * @throws {NotFoundError} When the user does not exist and throwOnMissing is true
 *
 * @example
 * const user = await getUser('abc-123', { includeDeleted: true })
 */
```

## Writing Guidelines
- Use active voice: "The function returns" not "The function will return"
- Be specific: "Install Node.js 20+" not "Install Node.js"
- Use present tense: "Click the button" not "You will click the button"
- Use the second person: "You need to configure..." or imperative "Configure the..."
- Code examples are complete and runnable (include imports, not just snippets)
- Keep line length reasonable (80-100 chars for readability in editors)
- Use proper Markdown: headings, lists, code blocks, tables

## Maintenance
- Documentation is reviewed in PR alongside code changes
- Broken documentation is a bug, not a nice-to-have
- Archive outdated docs; don't leave them to confuse future readers
- The README is the front door — keep it current
- Every significant PR that changes behavior should include doc updates
