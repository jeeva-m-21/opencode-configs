---
description: Run the release workflow using the git-release skill to tag a version and draft release notes
subtask: true
agent: builder
---

You are preparing a release. Follow these steps:

## Preparation

1. Read `state/phase.json` to confirm all work is complete
2. Check `git status` — ensure the working tree is clean
3. Check `git log --oneline` since the last tag

## Load Release Skill

Load the `git-release` skill for release procedures and best practices.

## Determine Version

Based on the commits since the last release:
- **Major**: breaking changes
- **Minor**: new features (backward compatible)
- **Patch**: bug fixes and minor improvements

If unsure, ask the user which version bump is appropriate.

## Draft Release Notes

Review all commits since the last tag and draft release notes:

```
## vX.Y.Z (YYYY-MM-DD)

### Features
- Description (#PR)

### Bug Fixes
- Description (#PR)

### Internal
- Description (#PR)
```

## Create Release

1. Tag the release: `git tag vX.Y.Z`
2. Push the tag: `git push origin vX.Y.Z`
3. If using GitHub, create a release with `gh release create vX.Y.Z --notes "[release notes]"`

## Update State

Update `state/phase.json`:
- Add release info to completed tasks
- Note the new version tag
