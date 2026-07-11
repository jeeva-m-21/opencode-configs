import type { Plugin } from "@opencode-ai/plugin"
import * as fs from "fs"
import * as path from "path"

interface PhaseState {
  phase: string
  tasks: { id: string; title: string; status: "pending" | "in_progress" | "completed" }[]
  branch: string | null
  prUrl: string | null
  activeTask: string | null
  completedSteps: string[]
  lastUpdated: string
}

const DEFAULT_STATE: PhaseState = {
  phase: "idle",
  tasks: [],
  branch: null,
  prUrl: null,
  activeTask: null,
  completedSteps: [],
  lastUpdated: new Date().toISOString(),
}

function readState(worktree: string): PhaseState {
  const statePath = path.join(worktree, "state", "phase.json")
  try {
    const raw = fs.readFileSync(statePath, "utf-8")
    return { ...DEFAULT_STATE, ...JSON.parse(raw) }
  } catch {
    return { ...DEFAULT_STATE }
  }
}

function writeState(worktree: string, state: PhaseState): void {
  const stateDir = path.join(worktree, "state")
  if (!fs.existsSync(stateDir)) {
    fs.mkdirSync(stateDir, { recursive: true })
  }
  const statePath = path.join(stateDir, "phase.json")
  state.lastUpdated = new Date().toISOString()
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2) + "\n")
}

export const StateManager: Plugin = async ({ worktree }) => {
  return {
    "session.created": async () => {
      const existing = readState(worktree)
      if (existing.phase === "idle") {
        // Ensure state directory exists on first session
        const stateDir = path.join(worktree, "state")
        if (!fs.existsSync(stateDir)) {
          fs.mkdirSync(stateDir, { recursive: true })
        }
        if (!fs.existsSync(path.join(stateDir, "phase.json"))) {
          writeState(worktree, DEFAULT_STATE)
        }
      }
    },

    "tool.execute.after": async (input, output) => {
      // Track file modifications
      if (input.tool === "edit" || input.tool === "write" || input.tool === "apply_patch") {
        const state = readState(worktree)
        const filePath = "filePath" in output.args ? output.args.filePath : "unknown"
        const description = `${input.tool}: ${filePath}`
        if (!state.completedSteps.includes(description)) {
          state.completedSteps.push(description)
          writeState(worktree, state)
        }
      }
    },

    "session.compacted": async () => {
      const state = readState(worktree)
      // Ensure state is fresh after compaction
      writeState(worktree, state)
    },

    "experimental.session.compacting": async (_input, output) => {
      // Inject framework state into compaction so it survives
      const state = readState(worktree)
      output.context.push(`## Framework State
Current phase: ${state.phase}
Active task: ${state.activeTask || "none"}
Tasks completed: ${state.tasks.filter((t) => t.status === "completed").length}
Tasks in progress: ${state.tasks.filter((t) => t.status === "in_progress").length}
Tasks pending: ${state.tasks.filter((t) => t.status === "pending").length}
Last updated: ${state.lastUpdated}
Branch: ${state.branch || "unknown"}`)
    },
  }
}
