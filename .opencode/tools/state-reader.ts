import { tool } from "@opencode-ai/plugin"
import fs from "fs"
import path from "path"

export default tool({
  description:
    "Read the current framework state from state/phase.json, state/plan.md, and state/decisions.md. Use this to understand current workflow phase and progress.",
  args: {
    file: tool.schema
      .enum(["phase", "plan", "decisions", "all"])
      .describe("Which state file to read: phase, plan, decisions, or all"),
  },
  async execute(args, context) {
    const root = context.worktree || context.directory
    const files: Record<string, string> = {
      phase: path.join(root, "state/phase.json"),
      plan: path.join(root, "state/plan.md"),
      decisions: path.join(root, "state/decisions.md"),
    }

    if (args.file === "all") {
      const results: Record<string, string> = {}
      for (const [key, filePath] of Object.entries(files)) {
        try {
          results[key] = fs.readFileSync(filePath, "utf-8")
        } catch {
          results[key] = `[not found]`
        }
      }
      return JSON.stringify(results, null, 2)
    }

    const filePath = files[args.file]
    try {
      return fs.readFileSync(filePath, "utf-8")
    } catch {
      return `State file '${args.file}' not found at ${filePath}. Run /plan-feature or /generate-context first.`
    }
  },
})
