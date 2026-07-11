import type { Plugin } from "@opencode-ai/plugin"
import fs from "fs"
import path from "path"

interface IIRScope {
  allowed_create: string[]
  allowed_modify: { path: string; lines: string | null }[]
  forbidden: string[]
  preserved_interfaces: string[]
}

function extractScopeFromIIR(worktree: string): IIRScope | null {
  // Try to load the IIR from state/
  const iirPaths = [
    path.join(worktree, "state", "iir.json"),
    path.join(worktree, "state", "implementation-ir.json"),
  ]
  for (const p of iirPaths) {
    if (fs.existsSync(p)) {
      const iir = JSON.parse(fs.readFileSync(p, "utf-8"))
      return {
        allowed_create: (iir.ownership?.create || []).map((f: any) => f.path),
        allowed_modify: (iir.ownership?.modify || []).map((f: any) => ({
          path: f.path,
          lines: f.at_lines,
        })),
        forbidden: (iir.ownership?.forbidden || []).map((f: any) => f.path),
        preserved_interfaces: iir.constraints?.preserved_interfaces || [],
      }
    }
  }
  return null
}

function getChangedFiles(worktree: string): string[] {
  try {
    const { execSync } = require("child_process")
    const diff = execSync("git diff --name-only", { cwd: worktree, encoding: "utf-8" })
    return diff.split("\n").filter(Boolean)
  } catch {
    return []
  }
}

function getUntrackedFiles(worktree: string): string[] {
  try {
    const { execSync } = require("child_process")
    const status = execSync("git status --porcelain", { cwd: worktree, encoding: "utf-8" })
    return status.split("\n")
      .filter((l: string) => l.startsWith("??"))
      .map((l: string) => l.slice(3).trim())
  } catch {
    return []
  }
}

export const ScopeValidator: Plugin = async ({ worktree }) => {
  return {
    "tool.execute.after": async (input, output) => {
      // Check after edits and writes
      if (input.tool !== "edit" && input.tool !== "write") return

      const scope = extractScopeFromIIR(worktree)
      if (!scope) return // No IIR, no scope enforcement

      const filePath = "filePath" in (output.args || {}) ? output.args.filePath : null
      if (!filePath) return

      // Normalize path relative to worktree
      const relative = path.relative(worktree, filePath)

      // Check if this file is forbidden
      const isForbidden = scope.forbidden.some((f: string) => {
        if (f.includes("*")) {
          const pattern = new RegExp(f.replace(/\*/g, ".*"))
          return pattern.test(relative)
        }
        return relative === f || relative.endsWith(f)
      })

      if (isForbidden) {
        throw new Error(
          `SCOPE VIOLATION: ${relative} is in the forbidden list for this task.\n` +
          `Reason: This file is outside the modification scope defined by the IIR.\n` +
          `Allowed modifications: ${scope.allowed_modify.map((f: any) => f.path).join(", ") || "none"}\n` +
          `Allowed creations: ${scope.allowed_create.join(", ") || "none"}`
        )
      }

      // Check if this is a new file not in allowed_create
      const isNew = !fs.existsSync(filePath) || getUntrackedFiles(worktree).includes(relative)
      if (isNew && !scope.allowed_create.includes(relative) && !scope.allowed_modify.some((f: any) => f.path === relative)) {
        throw new Error(
          `SCOPE VIOLATION: Creating ${relative} is not allowed.\n` +
          `Allowed creations: ${scope.allowed_create.join(", ") || "none"}`
        )
      }
    },

    "session.compacted": async () => {
      // Final scope check on compaction
      const scope = extractScopeFromIIR(worktree)
      if (!scope) return

      const changed = getChangedFiles(worktree)
      const untracked = getUntrackedFiles(worktree)
      const allChanges = [...changed, ...untracked]

      const violations: string[] = []
      for (const file of allChanges) {
        const isForbidden = scope.forbidden.some((f: string) => {
          if (f.includes("*")) {
            const pattern = new RegExp(f.replace(/\*/g, ".*"))
            return pattern.test(file)
          }
          return file.includes(f)
        })
        if (isForbidden) violations.push(`Forbidden: ${file}`)
      }

      if (violations.length > 0) {
        console.error(`SCOPE VALIDATION FAILED:\n${violations.join("\n")}`)
      }
    },
  }
}

export default ScopeValidator
