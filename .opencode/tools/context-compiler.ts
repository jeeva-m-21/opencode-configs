import { tool } from "@opencode-ai/plugin"
import fs from "fs"
import path from "path"
import crypto from "crypto"

function loadKnowledgeRegistry(worktree: string) {
  const registryPath = path.join(worktree, "state", "knowledge-registry.json")
  try {
    return JSON.parse(fs.readFileSync(registryPath, "utf-8"))
  } catch {
    return null
  }
}

function loadProjectMeta(worktree: string) {
  const meta: Record<string, string> = { name: "unknown", stack: "TypeScript strict", build: "", lint: "", test: "" }
  try {
    const pkgPath = path.join(worktree, "package.json")
    if (fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"))
      meta.name = pkg.name || "unknown"
      const scripts = pkg.scripts || {}
      if (scripts.build) meta.build = "npm run build"
      if (scripts.lint) meta.lint = "npm run lint"
      if (scripts.test) meta.test = "npm run test"
    }
  } catch { /* use defaults */ }
  return meta
}

function extractKeywords(task: string): string[] {
  const pattern = /\b(api|auth|jwt|token|login|database|sql|migration|schema|component|ui|react|frontend|backend|route|endpoint|service|repository|middleware|test|deploy|docker|ci|error|bug|fix|refactor|performance|security|audit|password|encrypt|hash|validation|zod|pagination|rate-limiting|health-check|log|monitor|env|secret|config|type|interface)\b/gi
  const matches = task.match(pattern) || []
  return [...new Set(matches.map((m) => m.toLowerCase()))]
}

function inferTaskType(keywords: string[]): string {
  const patterns: Record<string, string[]> = {
    feature: ["api", "endpoint", "route", "component", "page", "feature", "add", "create", "implement"],
    bug: ["bug", "fix", "broken", "error", "crash"],
    refactor: ["refactor", "restructure", "extract", "rename", "clean"],
    docs: ["doc", "documentation", "jsdoc", "readme"],
    security: ["security", "audit", "vulnerability", "cve"],
    performance: ["performance", "optimize", "slow", "profile"],
    maintenance: ["update", "upgrade", "dependency", "dep"],
  }
  let best = "feature"
  let bestScore = 0
  for (const [type, typeKeywords] of Object.entries(patterns)) {
    const score = typeKeywords.filter((k) => keywords.includes(k)).length
    if (score > bestScore) { bestScore = score; best = type }
  }
  return best
}

function resolveCapabilities(keywords: string[], agentType: string, taskType: string, registry: any): string[] {
  const caps = new Set<string>()
  const agentBaselines = registry?.agentBaselines?.[agentType]?.alwaysInclude || []
  for (const cap of agentBaselines) caps.add(cap)

  const capDefs = registry?.capabilities || {}
  for (const [capName, capDef] of Object.entries(capDefs) as [string, any][]) {
    const requiredBy = capDef.requiredBy || []
    if (requiredBy.includes(taskType)) caps.add(capName)
    const capKeywords = capDef.keywords || []
    if (capKeywords.some((k: string) => keywords.includes(k))) caps.add(capName)
  }

  return [...caps]
}

function resolveModules(capabilities: string[], registry: any): string[] {
  const modules = new Set<string>()
  const moduleDefs = registry?.modules || {}

  for (const [moduleName, moduleDef] of Object.entries(moduleDefs) as [string, any][]) {
    const provides = moduleDef.provides || []
    if (provides.some((p: string) => capabilities.includes(p))) {
      modules.add(moduleName)
      for (const dep of moduleDef.depends_on || []) modules.add(dep)
    }
  }

  return [...modules]
}

function buildStablePrefix(agentType: string, registry: any, projectMeta: Record<string, string>): string {
  const lines: string[] = []
  lines.push(`OpenCode Engineering Framework v1.0. Context compiled for: ${agentType}.`)
  lines.push("")
  const rules = registry?.stablePrefixComponents?.architecturalRules || []
  if (rules.length > 0) {
    lines.push("Non-negotiable architectural rules:")
    for (const rule of rules) lines.push(`- ${rule}`)
    lines.push("")
  }
  if (projectMeta.name || projectMeta.build) {
    const parts: string[] = []
    if (projectMeta.name) parts.push(`Project: ${projectMeta.name}`)
    if (projectMeta.stack) parts.push(`Stack: ${projectMeta.stack}`)
    const cmds = [projectMeta.build, projectMeta.lint, projectMeta.test].filter(Boolean)
    if (cmds.length) parts.push(`Commands: ${cmds.join(", ")}`)
    lines.push(parts.join(". ") + ".")
    lines.push("")
  }
  return lines.join("\n")
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}

export default tool({
  description:
    "Deterministically compile the minimal, cache-optimized context for a specific task and agent type. Resolves required engineering capabilities, selects relevant knowledge modules, removes duplicates, and generates a stable prefix to maximize provider prompt caching. Call this before dispatching any subagent.",
  args: {
    task: tool.schema
      .string()
      .describe("Description of the engineering task to compile context for"),
    agentType: tool.schema
      .enum(["builder", "reviewer", "analyst", "docs-writer", "security-auditor", "orchestrator"])
      .describe("The type of agent that will receive this context"),
    contractPath: tool.schema
      .string()
      .optional()
      .describe("Path to the execution contract, e.g. 'state/contract.md'"),
    relevantFiles: tool.schema
      .array(tool.schema.string())
      .optional()
      .describe("List of files relevant to this task"),
    scope: tool.schema
      .enum(["trivial", "small", "medium", "large", "major"])
      .optional()
      .describe("Estimated scope of the task. Defaults to 'medium'"),
  },
  async execute(args, context) {
    const worktree = context.worktree || context.directory || process.cwd()
    const startTime = Date.now()

    const registry = loadKnowledgeRegistry(worktree)
    if (!registry) {
      return "Knowledge registry not found at state/knowledge-registry.json. The Context Compiler requires the knowledge registry to resolve capabilities. Run /generate-context or ensure the framework is properly initialized."
    }

    const projectMeta = loadProjectMeta(worktree)
    const taskType = inferTaskType(extractKeywords(args.task))
    const scope = args.scope || "medium"
    const keywords = extractKeywords(args.task)

    const capabilities = resolveCapabilities(keywords, args.agentType, taskType, registry)
    const modules = resolveModules(capabilities, registry)

    const budget = registry?.compilerRules?.tokenBudgets?.[args.agentType] || 3000
    const stablePrefix = buildStablePrefix(args.agentType, registry, projectMeta)

    const dynamicLines: string[] = []

    dynamicLines.push("## Task")
    dynamicLines.push(`**Task:** ${args.task}`)
    dynamicLines.push(`**Classification:** ${taskType} | scope: ${scope}`)
    dynamicLines.push("")

    dynamicLines.push("## Required Knowledge")
    dynamicLines.push(`**Capabilities:** ${capabilities.join(", ")}`)
    dynamicLines.push(`**Modules to load (via skill tool):** ${modules.join(", ") || "none — task does not require domain-specific modules"}`)
    dynamicLines.push("Load only the modules listed. Do not load additional knowledge preemptively.")
    dynamicLines.push("")

    if (args.relevantFiles && args.relevantFiles.length > 0) {
      dynamicLines.push("## Relevant Files")
      for (const file of args.relevantFiles) dynamicLines.push(`- ${file}`)
      dynamicLines.push("")
    }

    dynamicLines.push("## Instructions")
    dynamicLines.push("1. Load the knowledge modules listed above using the skill tool (ignore modules already in handbook context)")
    dynamicLines.push("2. Follow all applicable engineering standards from loaded modules")
    dynamicLines.push("3. After implementing: run lint, typecheck, and tests")
    dynamicLines.push("4. Update state files if this task changes the project state")

    const dynamicContent = dynamicLines.join("\n")
    const fullContext = stablePrefix + "\n" + dynamicContent
    const totalTokens = estimateTokens(fullContext)
    const budgetUsed = Math.round((totalTokens / budget) * 100)
    const compilationId = crypto.randomUUID()
    const elapsed = Date.now() - startTime

    const output = [
      `## Context Compilation Report`,
      ``,
      `**Compilation:** ${compilationId} (${elapsed}ms)`,
      `**Agent:** ${args.agentType} | **Tokens:** ${totalTokens} (${budgetUsed}% of ${budget})`,
      `**Task type:** ${taskType} | **Scope:** ${scope}`,
      `**Capabilities resolved:** ${capabilities.length} | **Modules:** ${modules.length}`,
      ``,
      `### Stable Prefix (provider-cacheable)`,
      `\`\`\``,
      stablePrefix.trim(),
      `\`\`\``,
      ``,
      `### Dynamic Content (task-specific)`,
      `\`\`\``,
      dynamicContent.trim(),
      `\`\`\``,
      ``,
      `### Usage`,
      `Pass the compiled context to the subagent as its briefing. The subagent should load the listed knowledge modules via the skill tool and follow the instructions.`,
      ``,
      `Cache info: the stable prefix above is identical across all compilations for ${args.agentType} agents. When using Anthropic or OpenAI with prompt caching enabled, these tokens will be cached (up to 90% savings on the prefix).`,
    ].join("\n")

    return output
  },
})
