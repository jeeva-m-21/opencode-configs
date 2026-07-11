import { tool } from "@opencode-ai/plugin"
import fs from "fs"
import path from "path"
import crypto from "crypto"

// ── Types ────────────────────────────────────────────────────────────────────

interface IIR {
  iir_version: string
  generated_at: string
  compilation_id: string
  contract_ref: string
  intent: IIRIntent
  patterns: IIRPatterns
  references: IIRReferences
  ownership: IIROwnership
  skeletons: IIRSkeleton[]
  verification: IIRVerification
  constraints: IIRConstraints
  metadata: IIRMetadata
}

interface IIRIntent {
  task_description: string
  task_type: string
  capabilities: string[]
  architecture: { primary_layer: string; module: string; submodule: string | null }
  decisions: { id: string; title: string; summary: string }[]
  constraints: { id: string; title: string; text: string }[]
}

interface IIRPatterns {
  primary: { atom_id: string; version: string; title: string; intent: string; summary: string } | null
  secondary: { atom_id: string; purpose: string; summary: string }[]
}

interface IIRReferences {
  primary: { file: string; type: string; imports_at: string; structure_at: string; handler_at: string } | null
  secondary: { file: string; purpose: string; lines: string }[]
}

interface IIROwnership {
  create: { path: string; type: string; reason: string }[]
  modify: { path: string; at_lines: string | null; reason: string; preserve: string[] }[]
  forbidden: { path: string; reason: string }[]
}

interface IIRSkeleton {
  id: string
  file: string
  imports: string[]
  exports: { name: string; kind: string; signature: string; is_default: boolean }[]
  structure: { prelude: string[]; placeholder: string; postlude: string[] }
}

interface IIRVerification {
  commands: { lint: string; typecheck: string; test: string }
  acceptance: string[]
  compliance: { pattern_id: string; check: string }[]
}

interface IIRConstraints {
  forbidden_imports: string[]
  preserved_interfaces: string[]
  naming: { files: string; functions: string; types: string; tests: string }
  style: { max_function_lines: number; max_route_lines: number }
}

interface IIRMetadata {
  generated_by: string
  estimated_tokens: number
  stable_prefix_tokens: number
  dynamic_tokens: number
}

// ── Atom Scanner ─────────────────────────────────────────────────────────────

function scanAtoms(worktree: string): any[] {
  const atomsDir = path.join(worktree, ".opencode", "knowledge", "atoms")
  if (!fs.existsSync(atomsDir)) return []
  const atoms: any[] = []
  const dirs = ["decisions", "patterns", "rules", "strategies", "guidance", "procedures", "checklists", "examples", "capabilities", "metrics"]
  for (const dir of dirs) {
    const dirPath = path.join(atomsDir, dir)
    if (!fs.existsSync(dirPath)) continue
    for (const file of fs.readdirSync(dirPath).filter((f: string) => f.endsWith(".md"))) {
      const raw = fs.readFileSync(path.join(dirPath, file), "utf-8")
      const lines = raw.split("\n")
      if (lines[0]?.trim() !== "---") continue
      let i = 1
      const meta: Record<string, any> = {}
      let currentKey = ""
      let inList = false
      let list: string[] = []
      let inObject = false
      let nested: Record<string, any> = {}
      let nestedKey = ""

      while (i < lines.length && lines[i].trim() !== "---") {
        const trimmed = lines[i].trim()
        if (!trimmed || trimmed.startsWith("#")) { i++; continue }

        // Nested object line
        if (inObject && trimmed.match(/^\w/)) {
          const nm = trimmed.match(/^(\w[\w_]*):\s*(.*)$/)
          if (nm) {
            nested[nm[1]] = nm[2].trim().replace(/^["']|["']$/g, "")
            i++; continue
          }
          // End of nested object
          meta[currentKey] = { ...nested }
          nested = {}
          inObject = false
          continue
        }

        // List items
        if (inList && trimmed.startsWith("- ")) {
          const item = trimmed.slice(2).trim()
          // Nested list item with fields
          if (item.startsWith("pro:") || item.startsWith("con:") || item.startsWith("step:") || item.startsWith("purpose:") || item.startsWith("order:") || item.startsWith("action:") || item.startsWith("verification:") || item.startsWith("description:") || item.startsWith("severity:")) {
            list.push(item)
          } else {
            list.push(item.replace(/^["']|["']$/g, ""))
          }
          i++; continue
        }
        if (inList && !trimmed.startsWith("- ")) {
          meta[currentKey] = [...list]
          list = []
          inList = false
        }

        const match = trimmed.match(/^(\w[\w_]*):\s*(.*)$/)
        if (!match) { i++; continue }

        currentKey = match[1]
        const val = match[2].trim()

        if (val === "") { inObject = true; nested = {}; i++; continue }
        if (val === "[]") { meta[currentKey] = []; i++; continue }
        if (val === "null") { meta[currentKey] = null; i++; continue }
        if (val.startsWith("[")) {
          if (val.includes("{") || val.includes("}")) {
            meta[currentKey] = val
            i++; continue
          }
          inList = true
          list = val.replace(/^\[|\]$/g, "").split(",").map((s: string) => s.trim().replace(/^["']|["']$/g, "")).filter(Boolean)
          i++; continue
        }
        meta[currentKey] = val.replace(/^["']|["']$/g, "")
        i++
      }

      if (inList) meta[currentKey] = [...list]
      if (inObject && currentKey) meta[currentKey] = { ...nested }

      if (meta.id && meta.type) {
        atoms.push({ ...meta, body: lines.slice(i + 1).join("\n"), filePath: path.join(dir, file) })
      }
    }
  }
  return atoms
}

// ── Contract Parser ──────────────────────────────────────────────────────────

function loadContract(worktree: string, contractPath: string | null): any {
  const p = contractPath || "state/contract.md"
  const fullPath = path.join(worktree, p)
  if (!fs.existsSync(fullPath)) return null
  const raw = fs.readFileSync(fullPath, "utf-8")

  return {
    objective: extractSection(raw, "Objective"),
    classification: extractField(raw, "Classification"),
    scope: extractSection(raw, "Scope"),
    tasks: extractTasks(raw),
    dependencies: extractSection(raw, "Dependencies"),
    testing: extractSection(raw, "Testing Requirements"),
    acceptance: extractSection(raw, "Acceptance Criteria"),
  }
}

function extractSection(raw: string, heading: string): string {
  const re = new RegExp(`##\\s+${heading}\\s*\\n([\\s\\S]*?)(?=\\n##\\s|\\n#\\s|$)`, "i")
  return (raw.match(re)?.[1] || "").trim()
}

function extractField(raw: string, field: string): string {
  const re = new RegExp(`\\*\\*${field}:\\*\\*\\s*(.+)`, "i")
  return (raw.match(re)?.[1] || "").trim()
}

function extractTasks(raw: string): any[] {
  const section = extractSection(raw, "Implementation Tasks")
  if (!section) return []
  const tasks: any[] = []
  const taskRe = /###\s+Task\s+\d+:\s*(.+)/g
  let match
  while ((match = taskRe.exec(section)) !== null) {
    tasks.push({ title: match[1] })
  }
  return tasks
}

// ── IIR Generator ────────────────────────────────────────────────────────────

function generateIIR(
  task: string,
  contract: any,
  atoms: any[],
  agentType: string,
  projectMeta: Record<string, string>,
): IIR {
  const compilationId = crypto.randomUUID()
  const keywords = extractKeywords(task)
  const capabilities = resolveCapabilities(keywords, atoms)
  const layer = resolveLayer(capabilities, contract)
  const moduleName = resolveModuleName(task, contract)

  // Find bound atoms
  const constraints = atoms.filter((a: any) => a.type === "rule" && a.status === "active")
  const decisions = atoms.filter((a: any) => a.type === "decision" && a.status === "active" && a.capabilities.some((c: string) => capabilities.has(c)))
  const primaryPattern = atoms.find((a: any) => a.type === "pattern" && a.status === "active" && a.priority === "required" && a.capabilities.some((c: string) => capabilities.has(c)))
  const secondaryPatterns = atoms.filter((a: any) => a.type === "pattern" && a.status === "active" && a.id !== primaryPattern?.id && a.capabilities.some((c: string) => capabilities.has(c)))

  // Build IIR
  const iir: IIR = {
    iir_version: "1.0.0",
    generated_at: new Date().toISOString(),
    compilation_id: compilationId,
    contract_ref: "state/contract.md",

    intent: {
      task_description: task,
      task_type: inferTaskType(task),
      capabilities: [...capabilities],
      architecture: {
        primary_layer: layer,
        module: moduleName,
        submodule: null,
      },
      decisions: decisions.map((d: any) => ({ id: d.id, title: d.title, summary: d.description })),
      constraints: constraints.map((c: any) => ({ id: c.id, title: c.title, text: c.body.split("\n").slice(0, 3).join(" ") })),
    },

    patterns: {
      primary: primaryPattern ? {
        atom_id: primaryPattern.id,
        version: primaryPattern.version,
        title: primaryPattern.title,
        intent: primaryPattern.intent || "do",
        summary: primaryPattern.description,
      } : null,
      secondary: secondaryPatterns.slice(0, 3).map((p: any) => ({
        atom_id: p.id,
        purpose: p.capabilities.filter((c: string) => capabilities.has(c)).join(", "),
        summary: p.description,
      })),
    },

    references: {
      primary: primaryPattern?.canonical_reference ? {
        file: typeof primaryPattern.canonical_reference === "string"
          ? primaryPattern.canonical_reference
          : primaryPattern.canonical_reference.file || "src/api/routes/users.ts",
        type: layer,
        imports_at: typeof primaryPattern.canonical_reference === "object" ? (primaryPattern.canonical_reference.imports || "1-9") : "1-9",
        structure_at: typeof primaryPattern.canonical_reference === "object" ? (primaryPattern.canonical_reference.structure || "10-48") : "10-48",
        handler_at: typeof primaryPattern.canonical_reference === "object" ? (primaryPattern.canonical_reference.handler || "50-65") : "50-65",
      } : null,
      secondary: [],
    },

    ownership: {
      create: generateCreateFiles(layer, moduleName, capabilities),
      modify: (contract?.tasks || []).map((t: any) => ({
        path: `src/api/${layer}s/${moduleName}.ts`,
        at_lines: null,
        reason: t.title || "Contract task",
        preserve: [],
      })),
      forbidden: [
        { path: "src/api/index.ts", reason: "Modify only if routing registration needed" },
        { path: "*.env*", reason: "Never modify environment files" },
      ],
    },

    skeletons: generateSkeletons(layer, moduleName, capabilities, primaryPattern),

    verification: {
      commands: {
        lint: projectMeta.lint || "npm run lint",
        typecheck: projectMeta.typecheck || "npm run typecheck",
        test: `npm test -- src/api/${layer}s/__tests__/${moduleName}.test.ts`,
      },
      acceptance: (contract?.acceptance || "")
        .split("\n")
        .filter((l: string) => l.trim().startsWith("-"))
        .map((l: string) => l.replace(/^-\s*\[.\]\s*/, "").trim())
        .filter(Boolean)
        .slice(0, 5),
      compliance: constraints.map((c: any) => ({ pattern_id: c.id, check: c.title })),
    },

    constraints: {
      forbidden_imports: layer === "service" ? ["express.Request", "express.Response", "Router"] : [],
      preserved_interfaces: [],
      naming: { files: "kebab-case.ts", functions: "camelCase", types: "PascalCase", tests: "*.test.ts co-located in __tests__/" },
      style: layer === "route" ? { max_function_lines: 60, max_route_lines: 20 } : { max_function_lines: 40, max_route_lines: 20 },
    },

    metadata: {
      generated_by: "iir-generator:v1.0.0",
      estimated_tokens: 1200,
      stable_prefix_tokens: 600,
      dynamic_tokens: 600,
    },
  }

  return iir
}

function generateCreateFiles(layer: string, module: string, capabilities: Set<string>): { path: string; type: string; reason: string }[] {
  const files: { path: string; type: string; reason: string }[] = []

  const layerDirs: Record<string, string> = {
    route: "src/api/routes/",
    service: "src/api/services/",
    repository: "src/api/repositories/",
    middleware: "src/api/middleware/",
    component: "src/web/components/",
    hook: "src/web/hooks/",
  }

  const dir = layerDirs[layer] || `src/api/${layer}s/`
  files.push({ path: `${dir}${module}.ts`, type: layer, reason: `Primary ${layer} for ${module}` })

  // Test file
  files.push({ path: `${dir}__tests__/${module}.test.ts`, type: "test", reason: "Tests required" })

  // Validation if API-related
  if (capabilities.has("api-validation") || capabilities.has("api-design")) {
    files.push({ path: `src/shared/validation/${module}.ts`, type: "validation", reason: "Zod schemas required" })
  }

  return files
}

function generateSkeletons(layer: string, module: string, capabilities: Set<string>, pattern: any): IIRSkeleton[] {
  const skeletons: IIRSkeleton[] = []
  const dirs: Record<string, string> = {
    route: "src/api/routes/",
    service: "src/api/services/",
    repository: "src/api/repositories/",
    middleware: "src/api/middleware/",
    component: "src/web/components/",
    hook: "src/web/hooks/",
  }

  const dir = dirs[layer] || `src/api/${layer}s/`

  // Primary implementation skeleton
  if (layer === "route") {
    skeletons.push({
      id: "skel-route",
      file: `${dir}${module}.ts`,
      imports: [
        `import { Router } from 'express'`,
        `import { ${module}Service } from '../services/${module}'`,
        `import { create${capitalize(module)}Schema } from '../../shared/validation/${module}'`,
        `import { auth, validate } from '../middleware'`,
      ],
      exports: [{ name: "router", kind: "router", signature: "const router = Router()", is_default: true }],
      structure: {
        prelude: [
          "// Validate input using Zod schema from src/shared/validation/",
          "// Follow pattern: src/api/routes/users.ts",
        ],
        placeholder: `// IMPLEMENT: Route handlers for ${module}`,
        postlude: ["export default router"],
      },
    })
  } else if (layer === "service") {
    skeletons.push({
      id: "skel-service",
      file: `${dir}${module}.ts`,
      imports: [
        `import { ${module}Repo } from '../repositories/${module}'`,
        `import { NotFoundError, ValidationError } from '../models/errors'`,
      ],
      exports: [{ name: `${module}Service`, kind: "const", signature: `export const ${module}Service = {`, is_default: false }],
      structure: {
        prelude: [
          "// Business logic functions below",
          "// Never import HTTP types (express.Request etc.)",
        ],
        placeholder: `// IMPLEMENT: Business logic for ${module}`,
        postlude: ["}"],
      },
    })
  } else if (layer === "repository") {
    skeletons.push({
      id: "skel-repo",
      file: `${dir}${module}.ts`,
      imports: [
        `import { db } from '../db'`,
        `import { ${module}, type New${capitalize(module)} } from '../db/schema/${module}'`,
        `import { eq, and, isNull, count } from 'drizzle-orm'`,
      ],
      exports: [{ name: `${module}Repo`, kind: "const", signature: `export const ${module}Repo = {`, is_default: false }],
      structure: {
        prelude: ["// Database queries — all SQL lives here"],
        placeholder: `// IMPLEMENT: Database queries for ${module}`,
        postlude: ["}"],
      },
    })
  } else {
    skeletons.push({
      id: `skel-${layer}`,
      file: `${dir}${module}.ts`,
      imports: [],
      exports: [{ name: module, kind: "const", signature: `export const ${module} = {`, is_default: false }],
      structure: {
        prelude: [],
        placeholder: `// IMPLEMENT: ${module}`,
        postlude: ["}"],
      },
    })
  }

  // Test skeleton
  skeletons.push({
    id: "skel-test",
    file: `${dir}__tests__/${module}.test.ts`,
    imports: [
      `import { describe, it, expect, vi, beforeEach } from 'vitest'`,
      skeletonImports(layer, module),
    ],
    exports: [],
    structure: {
      prelude: [
        `vi.mock('../repositories/${module}')`,
        `describe('${module}', () => {`,
        `  beforeEach(() => { vi.clearAllMocks() })`,
      ],
      placeholder: `  // IMPLEMENT: Test cases`,
      postlude: ["})"],
    },
  })

  return skeletons
}

function skeletonImports(layer: string, module: string): string {
  if (layer === "service") return `import { ${module}Service } from '../${module}'`
  if (layer === "route") return `import request from 'supertest'\nimport { app } from '../../api'`
  return `import { ${module} } from '../${module}'`
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function extractKeywords(task: string): string[] {
  const pattern = /\b(api|auth|jwt|token|login|database|sql|migration|schema|component|ui|react|frontend|backend|route|endpoint|service|repository|middleware|test|deploy|docker|ci|error|bug|fix|refactor|performance|security|audit|password|encrypt|hash|validation|zod|pagination|rate.?limit|health.?check|log|monitor|env|secret|config|type|interface)\b/gi
  return [...new Set((task.match(pattern) || []).map((m: string) => m.toLowerCase()))]
}

function resolveCapabilities(keywords: string[], atoms: any[]): Set<string> {
  const caps = new Set<string>()
  for (const atom of atoms) {
    if (atom.status !== "active") continue
    const atomCaps = atom.capabilities || []
    for (const cap of atomCaps) {
      const capLower = cap.toLowerCase()
      for (const kw of keywords) {
        if (capLower.includes(kw) || kw.includes(capLower)) {
          caps.add(cap)
          break
        }
      }
    }
  }
  return caps
}

function resolveLayer(capabilities: Set<string>, contract: any): string {
  if (contract?.classification === "bug") return "service"
  if (capabilities.has("api-design") || capabilities.has("api-validation")) return "route"
  if (capabilities.has("backend-repository") || capabilities.has("database-queries")) return "repository"
  if (capabilities.has("frontend-component")) return "component"
  return "service"
}

function resolveModuleName(task: string, contract: any): string {
  if (contract?.objective) {
    const match = contract.objective.match(/\b(auth|user|product|order|payment|post|comment|admin|profile|dashboard|setting|notification|upload|search|report)\b/i)
    if (match) return match[1].toLowerCase()
  }
  const taskMatch = task.match(/\b(auth|user|product|order|payment|post|comment|admin|profile|dashboard|setting|notification|upload|search|report)\b/i)
  return taskMatch ? taskMatch[1].toLowerCase() : "resource"
}

function inferTaskType(task: string): string {
  const lower = task.toLowerCase()
  if (/fix|bug|broken|issue|crash/.test(lower)) return "bug"
  if (/refactor|restructure|extract|rename/.test(lower)) return "refactor"
  if (/doc|documentation|jsdoc|readme/.test(lower)) return "docs"
  if (/security|audit|vulnerability/.test(lower)) return "security"
  if (/deploy|release|publish/.test(lower)) return "maintenance"
  return "feature"
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function loadProjectMeta(worktree: string): Record<string, string> {
  const meta: Record<string, string> = { lint: "npm run lint", typecheck: "npm run typecheck", test: "npm test" }
  try {
    const pkgPath = path.join(worktree, "package.json")
    if (fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"))
      const scripts = pkg.scripts || {}
      if (scripts.lint) meta.lint = "npm run lint"
      if (scripts.typecheck) meta.typecheck = "npm run typecheck"
      if (scripts.test) meta.test = "npm test"
    }
  } catch { /* defaults */ }
  return meta
}

// ── Tool ─────────────────────────────────────────────────────────────────────

export default tool({
  description:
    "Generate a deterministic Implementation IR from an execution contract and knowledge atoms. The IIR is the complete executable specification — it tells the Builder exactly what files to create, modify, or avoid, which patterns to follow, which reference files to imitate, and what verification to run. Zero LLM calls. Zero nondeterminism.",
  args: {
    task: tool.schema.string().describe("Task description or user request"),
    contractPath: tool.schema.string().optional().describe("Path to contract, e.g. 'state/contract.md'"),
    agentType: tool.schema.enum(["builder", "reviewer", "analyst", "docs-writer", "security-auditor", "orchestrator"]).optional().describe("Target agent. Defaults to builder."),
  },
  async execute(args, context) {
    const worktree = context.worktree || context.directory || process.cwd()
    const atoms = scanAtoms(worktree)
    if (atoms.length === 0) return "No atoms found. Run the atom migration first."

    const contract = loadContract(worktree, args.contractPath || null)
    const projectMeta = loadProjectMeta(worktree)
    const agentType = args.agentType || "builder"

    const iir = generateIIR(args.task, contract, atoms, agentType, projectMeta)

    const json = JSON.stringify(iir, null, 2)
    const lines = [
      `## Implementation IR`,
      ``,
      `**IIR Version:** ${iir.iir_version} | **Compilation:** ${iir.compilation_id}`,
      `**Layer:** ${iir.intent.architecture.primary_layer} | **Module:** ${iir.intent.architecture.module}`,
      `**Capabilities:** ${iir.intent.capabilities.join(", ")}`,
      `**Pattern:** ${iir.patterns.primary?.atom_id || "none bound"}`,
      `**Reference:** ${iir.references.primary?.file || "none"}`,
      `**Files to create:** ${iir.ownership.create.length} | **Skeletons:** ${iir.skeletons.length}`,
      ``,
      `### Builder Briefing`,
      `Pass this entire IIR to the Builder. The Builder must:`,
      `1. Read the reference file at the specified line ranges`,
      `2. Fill the implementation skeletons with business logic`,
      `3. Create/modify only the files listed in ownership`,
      `4. Run verification commands in order after generating code`,
      `5. Report which acceptance criteria passed/failed`,
      ``,
      `The Builder MUST NOT explore the codebase beyond the reference files.`,
      `The Builder MUST NOT choose architecture, patterns, file placement, or naming.`,
      `Everything is resolved in this IIR.`,
      ``,
      `---`,
      ``,
      `### Full IIR (JSON)`,
      `\`\`\`json`,
      json,
      `\`\`\``,
    ].join("\n")

    return lines
  },
})
