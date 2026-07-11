---
name: git-release
description: Create consistent releases with conventional commits, semantic versioning, changelogs, and GitHub releases
license: MIT
compatibility: opencode
metadata:
  audience: maintainers
  workflow: release
---

## Overview

This skill provides a structured release workflow for projects using git and GitHub. It produces tagged releases, generated changelogs, and GitHub release entries.

## Version Bump Decision

Determine the version bump based on conventional commits since the last tag:

| Commit Type | Version Bump |
|---|---|
| `feat:` present | Minor |
| Only `fix:`, `docs:`, `chore:`, `refactor:`, `test:`, `style:`, `perf:`, `ci:` | Patch |
| `BREAKING CHANGE:` in footer or `!` after type | Major |

If no conventional commits are used, review the actual changes and ask the user.

## Changelog Generation

Group commits into standard categories:
- **Features** — `feat:` commits
- **Bug Fixes** — `fix:` commits
- **Performance** — `perf:` commits
- **Documentation** — `docs:` commits
- **Internal** — `chore:`, `ci:`, `refactor:`, `style:`, `test:` commits

For each entry, include the PR number if available:
`- Description of change (#123)`

## Release Process

1. Verify the working tree is clean: `git status`
2. Determine the new version tag
3. Run pre-release checks (tests, lint, build)
4. Create the tag: `git tag -a vX.Y.Z -m "vX.Y.Z"`
5. Push the tag: `git push origin vX.Y.Z`
6. Create GitHub release: `gh release create vX.Y.Z --title "vX.Y.Z" --notes-file release-notes.md`

## Pre-release Checklist

- [ ] All tests pass
- [ ] Lint passes
- [ ] Typecheck passes
- [ ] Build succeeds
- [ ] Working tree is clean (no uncommitted changes)
- [ ] Release notes are drafted
- [ ] Version bump is confirmed with user

## Asking Clarifying Questions

Ask the user if:
- The versioning scheme is unclear (semver vs calver vs custom)
- There are breaking changes that need special attention
- The release should be marked as pre-release/beta
- There are deployment steps beyond tagging
