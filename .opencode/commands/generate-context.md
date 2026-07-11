---
description: Generate and cache repository structure and dependency graph for faster future context loading
subtask: true
agent: analyst
---

You are generating a cached summary of the repository structure.

## Generate Repository Structure

1. List the top-level directory structure
2. Identify source directories (src/, lib/, packages/, etc.)
3. For each source directory, list the file tree (use glob `**/*` with a limit of 200)
4. Categorize files by type (component, utility, test, config, type definition, etc.)
5. Note key entry points and configuration files

Write to `state/cache/repo-structure.json`:

```json
{
  "generatedAt": "ISO date",
  "rootDirectories": ["src/", "docs/", "tests/"],
  "sourceTree": {
    "src/": ["src/index.ts", "src/components/Button.tsx", "..."],
    "src/components/": ["..."],
    "src/utils/": ["..."]
  },
  "entryPoints": ["src/index.ts", "src/App.tsx"],
  "configFiles": ["package.json", "tsconfig.json", "vite.config.ts"],
  "testDirectories": ["src/__tests__/", "tests/"],
  "documentationFiles": ["README.md", "docs/"]
}
```

## Generate Dependency Graph

1. Parse `package.json` for dependencies
2. Check for monorepo workspaces
3. Note build tools, test frameworks, and linters

Write to `state/cache/dependency-graph.json`:

```json
{
  "generatedAt": "ISO date",
  "runtime": {
    "react": "^18.0.0",
    "...": "..."
  },
  "dev": {
    "typescript": "^5.0.0",
    "vite": "^5.0.0",
    "...": "..."
  },
  "testFramework": "vitest",
  "buildTool": "vite",
  "linter": "eslint",
  "formatter": "prettier",
  "typeChecker": "typescript",
  "packageManager": "bun"
}
```

## Update State

Update `state/phase.json` to record that context was generated.

## Rules

- Don't list files in node_modules, dist, build, .git, or .cache directories
- Don't include file contents — just paths and categorization
- Keep the output structured and machine-readable (valid JSON)
- Limit to ~200 most relevant files if the project is very large
