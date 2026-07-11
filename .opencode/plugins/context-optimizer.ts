import type { Plugin } from "@opencode-ai/plugin"
import * as fs from "fs"
import * as path from "path"

export const ContextOptimizer: Plugin = async ({ worktree }) => {
  return {
    "experimental.session.compacting": async (_input, output) => {
      // Inject critical framework context into every compaction
      output.context.push(`## Framework Context (autoinjected)

This is the OpenCode Engineering Framework. The framework provides:
- An Orchestrator agent that manages the engineering workflow
- Specialized subagents: Analyst (read-only exploration), Builder (implementation), 
  Reviewer (code review), Docs-writer (documentation), Security-auditor (vulnerability scanning)
- A workflow pipeline: plan → build → review → test → commit
- State files in state/ directory that persist across sessions
- Commands: /plan-feature, /build-feature, /review-feature, /test-feature, /commit-feature,
  /fix-bug, /generate-context, /release
- Skills: git-release, security-audit, performance-profile, error-handling, testing-patterns
- Custom tools: state-reader, repo-analyzer, env-validator

Always check state/phase.json and state/plan.md when resuming work.
Follow the workflow pipeline. Use subagents for specialized tasks.
Never commit secrets. Follow AGENTS.md conventions.`)

      // Inject current state if available
      try {
        const statePath = path.join(worktree, "state", "phase.json")
        if (fs.existsSync(statePath)) {
          const state = JSON.parse(fs.readFileSync(statePath, "utf-8"))
          output.context.push(`## Current Framework State
Phase: ${state.phase || "unknown"}
Active task: ${state.activeTask || "none"}
Completed steps: ${(state.completedSteps || []).length}
Last updated: ${state.lastUpdated || "unknown"}
Branch: ${state.branch || "unknown"}`)
        }
      } catch {
        // state file not available, skip
      }
    },
  }
}
