import type { Plugin } from "@opencode-ai/plugin"
import fs from "fs"
import path from "path"
import crypto from "crypto"

interface ReflectionData {
  id: string
  type: "reflection"
  reflection_type: string
  task_id: string | null
  task_type: string
  session_id: string
  agent_type: string
  model_id: string
  lifecycle: "raw"
  category: "knowledge" | "compiler" | "policy" | "process" | "testing" | "review"
  subject: { type: string; id: string }
  observation: { expected: string; actual: string; delta: string }
  evidence: Record<string, any>
  confidence: "high" | "medium" | "low"
  severity: "critical" | "major" | "minor" | "info"
  frequency: number
  relationships: {
    knowledge_atoms: string[]
    compiler_passes: string[]
    policies: string[]
    capabilities: string[]
  }
  generated_at: string
  generated_by: string
  environment: { framework_version: string; compiler_version: string }
}

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

function loadState(worktree: string): { phase: string; contractId: string | null; activeTask: string | null } {
  try {
    const p = path.join(worktree, "state", "phase.json")
    return JSON.parse(fs.readFileSync(p, "utf-8"))
  } catch {
    return { phase: "unknown", contractId: null, activeTask: null }
  }
}

function existingReflections(worktree: string): string[] {
  const dir = path.join(worktree, "state", "reflections", "data")
  if (!fs.existsSync(dir)) return []
  return fs.readdirSync(dir).filter((f) => f.endsWith(".yaml"))
}

function writeReflection(worktree: string, reflection: ReflectionData) {
  const dir = path.join(worktree, "state", "reflections", "data")
  ensureDir(dir)

  const yaml = [
    `---`,
    `id: ${reflection.id}`,
    `type: reflection`,
    `reflection_type: ${reflection.reflection_type}`,
    `task_id: ${reflection.task_id || "unknown"}`,
    `task_type: ${reflection.task_type}`,
    `session_id: ${reflection.session_id}`,
    `agent_type: ${reflection.agent_type}`,
    `model_id: ${reflection.model_id || "unknown"}`,
    `lifecycle: raw`,
    `category: ${reflection.category}`,
    `subject:`,
    `  type: ${reflection.subject.type}`,
    `  id: ${reflection.subject.id}`,
    `observation:`,
    `  expected: "${reflection.observation.expected.replace(/"/g, '\\"')}"`,
    `  actual: "${reflection.observation.actual.replace(/"/g, '\\"')}"`,
    `  delta: "${reflection.observation.delta.replace(/"/g, '\\"')}"`,
    `confidence: ${reflection.confidence}`,
    `severity: ${reflection.severity}`,
    `frequency: ${reflection.frequency}`,
    `relationships:`,
    `  knowledge_atoms: [${reflection.relationships.knowledge_atoms.join(", ")}]`,
    `  compiler_passes: [${reflection.relationships.compiler_passes.join(", ")}]`,
    `  policies: [${reflection.relationships.policies.join(", ")}]`,
    `  capabilities: [${reflection.relationships.capabilities.join(", ")}]`,
    `generated_at: ${reflection.generated_at}`,
    `generated_by: reflection-engine:v1.0.0`,
    `environment:`,
    `  framework_version: ${reflection.environment.framework_version}`,
    `  compiler_version: ${reflection.environment.compiler_version}`,
    `---`,
    ``,
    `# ${reflection.reflection_type.replace(/_/g, " ")}`,
    ``,
    `## Expected`,
    reflection.observation.expected,
    ``,
    `## Actual`,
    reflection.observation.actual,
    ``,
    `## Delta`,
    reflection.observation.delta,
  ].join("\n")

  fs.writeFileSync(path.join(dir, `${reflection.id}.yaml`), yaml)
}

const HASH = (s: string) => crypto.createHash("sha256").update(s).digest("hex").slice(0, 8)

export const ReflectionEngine: Plugin = async ({ worktree, sessionId }) => {
  let editCount = 0
  let testFailures = 0
  let atomLoads: string[] = []

  return {
    "tool.execute.after": async (input, output) => {
      // Track edit operations
      if (input.tool === "edit" || input.tool === "write") {
        editCount++
      }

      // Track test results (parse bash output for vitest/jest results)
      if (input.tool === "bash") {
        const cmd = (output.args?.command as string) || ""
        if (/test|vitest|jest/.test(cmd)) {
          const result = output.result as string || ""
          const failMatch = result.match(/(\d+)\s+failed/)
          if (failMatch) {
            testFailures += parseInt(failMatch[1])
          }
        }
      }

      // Track atom/skill loads
      if (input.tool === "skill") {
        const skillName = output.args?.name as string || ""
        if (skillName.startsWith("eng-")) {
          atomLoads.push(skillName)
        }
      }
    },

    "session.compacted": async () => {
      // Generate a session-level reflection on compaction
      const state = loadState(worktree)

      const reflection: ReflectionData = {
        id: `REFL-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${HASH(sessionId)}`,
        type: "reflection",
        reflection_type: editCount > 0 ? "knowledge_sufficient" : "insight",
        task_id: state.contractId,
        task_type: "feature",
        session_id: sessionId,
        agent_type: "orchestrator",
        model_id: "",
        lifecycle: "raw",
        category: "process",
        subject: { type: "workflow", id: "session" },
        observation: {
          expected: "Session should produce file modifications and pass all checks",
          actual: `Session completed with ${editCount} file edits and ${atomLoads.length} knowledge modules loaded`,
          delta: `${editCount} edits made. ${testFailures > 0 ? `${testFailures} test failures occurred.` : "No test failures recorded."} ${atomLoads.length ? `Knowledge modules: ${atomLoads.join(", ")}` : "No knowledge modules loaded via skill tool."}`,
        },
        evidence: {
          edit_count: editCount,
          atom_loads: atomLoads,
          test_failures: testFailures,
        },
        confidence: "low",
        severity: "info",
        frequency: existingReflections(worktree).length,
        relationships: {
          knowledge_atoms: [],
          compiler_passes: [],
          policies: [],
          capabilities: [],
        },
        generated_at: new Date().toISOString(),
        generated_by: "reflection-engine:v1.0.0",
        environment: { framework_version: "1.0.0", compiler_version: "1.0.0" },
      }

      writeReflection(worktree, reflection)
    },

    "tool.execute.before": async (input, output) => {
      // Detect when compiler output is being used — track atom loads for reflection
      if (input.tool === "task") {
        // A subagent is being dispatched — could capture the context for reflection
        // For now, we record that a subagent was dispatched
      }
    },
  }
}
