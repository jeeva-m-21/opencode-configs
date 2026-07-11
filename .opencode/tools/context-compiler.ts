import { tool } from "@opencode-ai/plugin"
import fs from "fs"
import path from "path"
import crypto from "crypto"

// ── Atom Types ────────────────────────────────────────────────────────────────

type AtomType = "decision" | "pattern" | "rule" | "example" | "capability"
type AtomStatus = "draft" | "proposed" | "accepted" | "active" | "superseded" | "deprecated" | "rejected"
type AgentType = "builder" | "reviewer" | "analyst" | "docs-writer" | "security-auditor" | "orchestrator"

interface Atom {
  id: string
  type: AtomType
  title: string
  description: string
  capabilities: string[]
  tags: string[]
  domain: string
  status: AtomStatus
  version: string
  priority: "required" | "recommended" | "contextual"
  token_estimate: number
  audience: AgentType[]
  dependencies: { requires: string[]; optional: string[] }
  supersedes: string[]
  superseded_by: string | null
  conflicts_with: string[]
  related_to: string[]
  evidence?: string[]
  confidence?: "high" | "medium" | "low"
  content: string
  filePath: string
}

interface CompilationResult {
  atoms_loaded: string[]
  atoms_unused: string[]
  atoms_required_but_missing: string[]
  stable_prefix_tokens: number
  dynamic_tokens: number
  total_tokens: number
  budget: number
  budget_used_percent: number
  compilation_id: string
  elapsed_ms: number
}

// ── YAML Frontmatter Parser ──────────────────────────────────────────────────

function parseYamlFrontmatter(raw: string): { metadata: Record<string, any>; body: string } {
  const lines = raw.split("\n")
  if (lines[0]?.trim() !== "---") return { metadata: {}, body: raw }

  let i = 1
  const yamlLines: string[] = []
  while (i < lines.length && lines[i].trim() !== "---") {
    yamlLines.push(lines[i])
    i++
  }
  const body = lines.slice(i + 1).join("\n").trim()

  const metadata: Record<string, any> = {}

  // Parse YAML subset: key: value, key: [list], nested objects (shallow)
  let currentKey = ""
  let inList = false
  let currentList: string[] = []
  let inObject = false
  let currentObject: Record<string, any> = {}

  function flushList() {
    if (inList && currentKey) {
      metadata[currentKey] = [...currentList]
      currentList = []
      inList = false
    }
  }
  function flushObject() {
    if (inObject && currentKey) {
      metadata[currentKey] = { ...currentObject }
      currentObject = {}
      inObject = false
    }
  }

  for (const line of yamlLines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue

    // Nested key: value under an object
    if (inObject) {
      const nestedMatch = trimmed.match(/^(\w[\w\s]*?):\s*(.*)$/)
      if (nestedMatch) {
        currentObject[nestedMatch[1]] = parseYamlValue(nestedMatch[2])
        continue
      }
      // End of nested object (de-indented line)
      if (!trimmed.startsWith("  ") && !trimmed.startsWith("\t")) {
        flushObject()
        // Reprocess this line as a top-level key
        const topMatch = trimmed.match(/^(\w[\w\s]*?):\s*(.*)$/)
        if (topMatch) {
          currentKey = topMatch[1]
          const val = topMatch[2].trim()
          if (val === "") { inObject = true; currentObject = {} }
          else if (val === "[]") { metadata[currentKey] = [] }
          else if (val === "null" || val === "~") { metadata[currentKey] = null }
          else if (val.startsWith("[")) { inList = true; currentList = parseInlineList(val) }
          else { metadata[currentKey] = parseYamlValue(val) }
        }
        continue
      }
    }

    // List item
    if (inList && trimmed.startsWith("- ")) {
      currentList.push(parseYamlValue(trimmed.slice(2).trim()))
      continue
    }
    // End of list (de-indented or new top-level key)
    if (inList && !trimmed.startsWith("- ")) {
      flushList()
      // Reprocess
    }

    // Top-level key: value
    const match = trimmed.match(/^(\w[\w\s]*?):\s*(.*)$/)
    if (!match) continue

    flushList()
    flushObject()

    currentKey = match[1]
    const val = match[2].trim()

    if (val === "") {
      inObject = true
      currentObject = {}
    } else if (val === "[]") {
      metadata[currentKey] = []
    } else if (val === "null" || val === "~") {
      metadata[currentKey] = null
    } else if (val.startsWith("[")) {
      metadata[currentKey] = parseInlineList(val)
    } else {
      metadata[currentKey] = parseYamlValue(val)
    }
  }

  flushList()
  flushObject()

  return { metadata, body }
}

function parseYamlValue(val: string): any {
  const trimmed = val.trim().replace(/^["']|["']$/g, "")
  if (trimmed === "true") return true
  if (trimmed === "false") return false
  if (trimmed === "null" || trimmed === "~") return null
  if (/^-?\d+$/.test(trimmed)) return parseInt(trimmed)
  if (/^-?\d+\.\d+$/.test(trimmed)) return parseFloat(trimmed)
  return trimmed
}

function parseInlineList(val: string): string[] {
  return val
    .replace(/^\[|\]$/g, "")
    .split(",")
    .map((s) => s.trim().replace(/^["']|["']$/g, ""))
    .filter(Boolean)
}

// ── Atom Scanner ─────────────────────────────────────────────────────────────

function scanAtoms(worktree: string): Atom[] {
  const atomsDir = path.join(worktree, ".opencode", "knowledge", "atoms")
  if (!fs.existsSync(atomsDir)) return []

  const atoms: Atom[] = []
  const dirs = ["decisions", "patterns", "rules", "capabilities", "examples"]

  for (const dir of dirs) {
    const dirPath = path.join(atomsDir, dir)
    if (!fs.existsSync(dirPath)) continue

    const files = fs.readdirSync(dirPath).filter((f) => f.endsWith(".md"))
    for (const file of files) {
      const filePath = path.join(dirPath, file)
      const raw = fs.readFileSync(filePath, "utf-8")
      const { metadata, body } = parseYamlFrontmatter(raw)

      if (!metadata.id || metadata.status !== "active") continue

      atoms.push({
        id: metadata.id as string,
        type: (metadata.type as AtomType) || "decision",
        title: (metadata.title as string) || "",
        description: (metadata.description as string) || "",
        capabilities: (metadata.capabilities as string[]) || [],
        tags: (metadata.tags as string[]) || [],
        domain: (metadata.domain as string) || "",
        status: "active",
        version: (metadata.version as string) || "1.0.0",
        priority: (metadata.priority as "required" | "recommended" | "contextual") || "recommended",
        token_estimate: (metadata.token_estimate as number) || estimateTokens(body),
        audience: (metadata.audience as AgentType[]) || [],
        dependencies: metadata.dependencies || { requires: [], optional: [] },
        supersedes: (metadata.supersedes as string[]) || [],
        superseded_by: (metadata.superseded_by as string) || null,
        conflicts_with: (metadata.conflicts_with as string[]) || [],
        related_to: (metadata.related_to as string[]) || [],
        evidence: metadata.evidence,
        confidence: metadata.confidence,
        content: body,
        filePath: path.relative(worktree, filePath),
      })
    }
  }

  return atoms
}

// ── Keyword Matching ─────────────────────────────────────────────────────────

const KEYWORD_TO_CAPABILITY: Record<string, string[]> = {
  // API & Backend
  api: ["API_DESIGN", "API_VALIDATION"], endpoint: ["API_DESIGN"],
  route: ["API_DESIGN", "BACKEND_SERVICE"], rest: ["API_DESIGN"],
  envelope: ["API_DESIGN"], pagination: ["API_DESIGN"],
  "status code": ["API_DESIGN"], http: ["API_DESIGN"],
  middleware: ["BACKEND_MIDDLEWARE", "BACKEND_SERVICE"],
  service: ["BACKEND_SERVICE"], repository: ["BACKEND_REPOSITORY"],
  backend: ["BACKEND_SERVICE", "BACKEND_REPOSITORY", "BACKEND_MIDDLEWARE"],
  handler: ["BACKEND_SERVICE"],
  hono: ["BACKEND_SERVICE"], express: ["BACKEND_SERVICE"],

  // Auth
  auth: ["AUTHENTICATION", "AUTHORIZATION"],
  jwt: ["AUTHENTICATION"], token: ["AUTHENTICATION"],
  login: ["AUTHENTICATION"], logout: ["AUTHENTICATION"],
  register: ["AUTHENTICATION"], password: ["AUTHENTICATION"],
  bcrypt: ["AUTHENTICATION"], argon2: ["AUTHENTICATION"],
  encrypt: ["AUTHENTICATION"], hash: ["AUTHENTICATION"],
  rbac: ["AUTHORIZATION"], role: ["AUTHORIZATION"],
  permission: ["AUTHORIZATION"], "access control": ["AUTHORIZATION"],
  session: ["AUTHENTICATION"], oauth: ["AUTHENTICATION"],
  "refresh token": ["AUTHENTICATION"], "access token": ["AUTHENTICATION"],
  rotation: ["AUTHENTICATION"], replay: ["AUTHENTICATION"],
  credential: ["SECRET_MANAGEMENT"],

  // Database
  database: ["DATABASE_SCHEMA", "DATABASE_QUERIES"],
  sql: ["DATABASE_QUERIES"], drizzle: ["DATABASE_QUERIES", "DATABASE_MIGRATIONS"],
  postgresql: ["DATABASE_SCHEMA"], postgres: ["DATABASE_SCHEMA"],
  migration: ["DATABASE_MIGRATIONS"], schema: ["DATABASE_SCHEMA", "API_VALIDATION"],
  query: ["DATABASE_QUERIES"], "select *": ["DATABASE_QUERIES"],
  transaction: ["DATABASE_TRANSACTIONS"],
  index: ["DATABASE_SCHEMA"], "foreign key": ["DATABASE_SCHEMA"],
  uuid: ["DATABASE_SCHEMA"], timestamptz: ["DATABASE_SCHEMA"],
  "soft delete": ["DATABASE_SCHEMA"],

  // Frontend
  component: ["FRONTEND_COMPONENT"], ui: ["FRONTEND_COMPONENT"],
  react: ["FRONTEND_COMPONENT", "FRONTEND_STATE"],
  jsx: ["FRONTEND_COMPONENT"], tsx: ["FRONTEND_COMPONENT"],
  props: ["FRONTEND_COMPONENT"], render: ["FRONTEND_COMPONENT"],
  hook: ["FRONTEND_STATE"], state: ["FRONTEND_STATE"],
  "use state": ["FRONTEND_STATE"], "use effect": ["FRONTEND_STATE"],
  context: ["FRONTEND_STATE"], store: ["FRONTEND_STATE"],
  zustand: ["FRONTEND_STATE"], redux: ["FRONTEND_STATE"],
  router: ["FRONTEND_ROUTING"], page: ["FRONTEND_ROUTING"],
  navigation: ["FRONTEND_ROUTING"], layout: ["FRONTEND_ROUTING"],
  form: ["FRONTEND_FORMS", "API_VALIDATION"],
  tailwind: ["FRONTEND_COMPONENT"], css: ["FRONTEND_COMPONENT"],
  "server component": ["FRONTEND_COMPONENT"],
  nextjs: ["FRONTEND_COMPONENT", "FRONTEND_ROUTING"],
  vite: ["FRONTEND_COMPONENT"],

  // Testing
  test: ["TESTING_UNIT"], testing: ["TESTING_UNIT", "TESTING_INTEGRATION"],
  vitest: ["TESTING_UNIT"], jest: ["TESTING_UNIT"],
  coverage: ["TESTING_UNIT"], mock: ["TESTING_UNIT"],
  "integration test": ["TESTING_INTEGRATION"],
  supertest: ["TESTING_INTEGRATION"], "api test": ["TESTING_INTEGRATION"],
  e2e: ["TESTING_E2E"], playwright: ["TESTING_E2E"],
  "component test": ["TESTING_COMPONENT"],
  "testing library": ["TESTING_COMPONENT"],

  // Security
  security: ["SECURITY_AUDIT", "INPUT_VALIDATION"],
  vulnerability: ["SECURITY_AUDIT"], cve: ["SECURITY_AUDIT"],
  owasp: ["SECURITY_AUDIT"], scan: ["SECURITY_AUDIT"],
  audit: ["SECURITY_AUDIT"],
  validation: ["INPUT_VALIDATION", "API_VALIDATION"],
  zod: ["API_VALIDATION", "INPUT_VALIDATION"],
  sanitize: ["INPUT_VALIDATION"], xss: ["INPUT_VALIDATION"],
  injection: ["INPUT_VALIDATION"],
  cors: ["SECURITY_HEADERS"], csp: ["SECURITY_HEADERS"],
  hsts: ["SECURITY_HEADERS"], "security header": ["SECURITY_HEADERS"],
  csrf: ["SECURITY_HEADERS"],
  secret: ["SECRET_MANAGEMENT"], ".env": ["SECRET_MANAGEMENT"],
  "environment variable": ["SECRET_MANAGEMENT"],

  // Error & Observability
  error: ["ERROR_HANDLING"], exception: ["ERROR_HANDLING"],
  catch: ["ERROR_HANDLING"], recovery: ["ERROR_HANDLING"],
  correlation: ["ERROR_HANDLING"],
  log: ["OBSERVABILITY"], logging: ["OBSERVABILITY"],
  metric: ["OBSERVABILITY"], monitor: ["OBSERVABILITY"],
  alert: ["OBSERVABILITY"], health: ["OBSERVABILITY"],
  "health check": ["OBSERVABILITY"], telemetry: ["OBSERVABILITY"],
  opentelemetry: ["OBSERVABILITY"], tracing: ["OBSERVABILITY"],

  // Performance
  performance: ["PERFORMANCE_OPTIMIZATION"],
  optimize: ["PERFORMANCE_OPTIMIZATION"],
  profile: ["PERFORMANCE_OPTIMIZATION"],
  slow: ["PERFORMANCE_OPTIMIZATION"],
  cache: ["PERFORMANCE_OPTIMIZATION"],
  benchmark: ["PERFORMANCE_OPTIMIZATION"],
  latency: ["PERFORMANCE_OPTIMIZATION"],

  // Deployment & CI
  deploy: ["DEPLOYMENT", "CI_CD"], docker: ["DEPLOYMENT"],
  container: ["DEPLOYMENT"], dockerfile: ["DEPLOYMENT"],
  kubernetes: ["DEPLOYMENT"], k8s: ["DEPLOYMENT"],
  ci: ["CI_CD"], cd: ["CI_CD"],
  pipeline: ["CI_CD"], "github actions": ["CI_CD"],
  workflow: ["CI_CD"],
  staging: ["DEPLOYMENT"], production: ["DEPLOYMENT", "PRODUCTION_READINESS"],
  branch: ["BRANCH_STRATEGY"], commit: ["BRANCH_STRATEGY"],
  pr: ["BRANCH_STRATEGY"], merge: ["BRANCH_STRATEGY"],

  // Documentation
  doc: ["DOCUMENTATION_STANDARDS"], docs: ["DOCUMENTATION_STANDARDS"],
  documentation: ["DOCUMENTATION_STANDARDS"],
  jsdoc: ["DOCUMENTATION_STANDARDS"], readme: ["DOCUMENTATION_STANDARDS"],
  adr: ["DECISION_LOGGING"], "architecture decision": ["DECISION_LOGGING"],

  // Refactoring
  refactor: ["REFACTORING_PATTERNS"], restructure: ["REFACTORING_PATTERNS"],
  extract: ["REFACTORING_PATTERNS"], rename: ["REFACTORING_PATTERNS"],

  // Architecture
  architecture: ["ARCHITECTURE_PATTERNS", "LAYERED_DESIGN"],
  layer: ["LAYERED_DESIGN"], monolith: ["ARCHITECTURE_PATTERNS"],
  microservice: ["ARCHITECTURE_PATTERNS"],
  "design pattern": ["ARCHITECTURE_PATTERNS"],
  structure: ["PROJECT_STRUCTURE"], directory: ["PROJECT_STRUCTURE"],
  module: ["PROJECT_STRUCTURE"],

  // Real-time / messaging
  websocket: ["BACKEND_SERVICE", "ERROR_HANDLING"],
  "real-time": ["BACKEND_SERVICE"], socket: ["BACKEND_SERVICE"],
  sse: ["BACKEND_SERVICE"], "server-sent": ["BACKEND_SERVICE"],
  "event-driven": ["BACKEND_SERVICE"],
  message: ["BACKEND_SERVICE"], queue: ["BACKEND_SERVICE"],
  redis: ["PERFORMANCE_OPTIMIZATION"],
  pubsub: ["BACKEND_SERVICE"], publish: ["BACKEND_SERVICE"],
  subscribe: ["BACKEND_SERVICE"],

  // Data patterns
  saga: ["BACKEND_SERVICE", "DATABASE_TRANSACTIONS"],
  cqrs: ["BACKEND_SERVICE"], outbox: ["BACKEND_SERVICE", "DATABASE_TRANSACTIONS"],
  "event sourcing": ["BACKEND_SERVICE"],
  "circuit breaker": ["ERROR_HANDLING", "BACKEND_SERVICE"],
  retry: ["ERROR_HANDLING"], backoff: ["ERROR_HANDLING"],
  wal: ["DATABASE_TRANSACTIONS"],
}

function extractKeywords(task: string): string[] {
  const lower = task.toLowerCase()
  const found: string[] = []

  // Match multi-word phrases first (longer keys take priority)
  const sortedKeys = Object.keys(KEYWORD_TO_CAPABILITY).sort((a, b) => b.length - a.length)
  for (const key of sortedKeys) {
    if (lower.includes(key.toLowerCase())) {
      found.push(key)
    }
  }

  return found
}

function resolveCapabilitiesByKeywords(keywords: string[]): Set<string> {
  const caps = new Set<string>()
  for (const kw of keywords) {
    const mappings = KEYWORD_TO_CAPABILITY[kw]
    if (mappings) {
      for (const cap of mappings) caps.add(cap)
    }
  }
  return caps
}

// ── Fallback: infer capabilities from task semantics ─────────────────────────

function inferCapabilitiesFromTask(task: string, agentType: AgentType): string[] {
  const lower = task.toLowerCase()
  const inferred: string[] = []

  // Structural cues
  if (/create|add|build|implement|new/.test(lower)) {
    inferred.push("TESTING_UNIT")
  }
  if (/route|endpoint|api|rest|handler/.test(lower)) {
    inferred.push("API_DESIGN", "API_VALIDATION", "AUTHENTICATION")
  }
  if (/database|sql|migration|schema|table|query/.test(lower)) {
    inferred.push("DATABASE_SCHEMA", "DATABASE_QUERIES")
  }
  if (/component|ui|page|render|jsx|tsx/.test(lower)) {
    inferred.push("FRONTEND_COMPONENT", "FRONTEND_STATE", "TESTING_COMPONENT")
  }
  if (/deploy|docker|ci|pipeline|release/.test(lower)) {
    inferred.push("DEPLOYMENT", "CI_CD")
  }
  if (/log|metric|monitor|health|trace|observe/.test(lower)) {
    inferred.push("OBSERVABILITY")
  }
  if (/error|exception|catch|fail|retry/.test(lower)) {
    inferred.push("ERROR_HANDLING")
  }
  if (/fix|bug|broken|issue|not working/.test(lower)) {
    inferred.push("TESTING_UNIT", "ERROR_HANDLING")
  }
  if (/doc|readme|jsdoc|comment/.test(lower)) {
    inferred.push("DOCUMENTATION_STANDARDS")
  }
  if (/refactor|restructure|clean|improve/.test(lower)) {
    inferred.push("REFACTORING_PATTERNS", "TESTING_UNIT")
  }
  if (/auth|login|token|password|jwt/.test(lower)) {
    inferred.push("AUTHENTICATION", "AUTHORIZATION", "SECRET_MANAGEMENT")
  }
  if (/migrate|migration|upgrade|update dep/.test(lower)) {
    inferred.push("DATABASE_MIGRATIONS", "TESTING_UNIT")
  }
  if (/performance|optimize|speed|slow|profile|fast/.test(lower)) {
    inferred.push("PERFORMANCE_OPTIMIZATION")
  }
  if (/config|env|secret| setting/.test(lower)) {
    inferred.push("SECRET_MANAGEMENT")
  }

  // Always include structural foundation for builders and reviewers
  if (agentType === "builder" || agentType === "reviewer") {
    inferred.push("LAYERED_DESIGN", "PROJECT_STRUCTURE")
  }

  if (agentType === "builder") {
    inferred.push("ERROR_HANDLING")
  }

  return [...new Set(inferred)]
}

// ── Atom Resolution ──────────────────────────────────────────────────────────

function resolveAtoms(
  capabilities: Set<string>,
  agentType: AgentType,
  allAtoms: Atom[],
): Atom[] {
  const atomMap = new Map<string, Atom>()
  for (const atom of allAtoms) atomMap.set(atom.id, atom)

  const selected = new Map<string, Atom>()

  // Pass 1: Match by capability
  for (const atom of allAtoms) {
    if (atom.status !== "active") continue
    if (!atom.audience.includes(agentType)) continue

    const matchesCapability = atom.capabilities.some((c) => capabilities.has(c))
    if (!matchesCapability) continue

    selected.set(atom.id, atom)
  }

  // Pass 2: Always include required-priority rules (core architecture)
  for (const atom of allAtoms) {
    if (atom.type === "rule" && atom.priority === "required" && atom.status === "active" && atom.audience.includes(agentType)) {
      selected.set(atom.id, atom)
    }
  }

  // Pass 3: Resolve transitive requires (1 level deep)
  const toResolve = [...selected.values()]
  for (const atom of toResolve) {
    for (const depId of atom.dependencies.requires || []) {
      if (!selected.has(depId)) {
        const dep = atomMap.get(depId)
        if (dep && dep.status === "active") {
          selected.set(depId, dep)
        }
      }
    }
  }

  return [...selected.values()]
}

// ── Stable Prefix Builder ────────────────────────────────────────────────────

function buildStablePrefix(agentType: AgentType, atoms: Atom[], projectMeta: Record<string, string>): string {
  const lines: string[] = []

  // Header — identical for all compilations of same agent type
  lines.push(`You are the ${agentType} agent in the OpenCode Engineering Framework v1.0.`)
  lines.push("OpenCode is a deterministic engineering platform for TypeScript full-stack projects.")
  lines.push("All engineering work follows the platform specification and knowledge graph standards.")
  lines.push("")

  // Project identity
  if (projectMeta.name && projectMeta.name !== "unknown") {
    lines.push(`Project: ${projectMeta.name}. ${projectMeta.stack || "TypeScript strict"}.`)
    const cmds = [projectMeta.build, projectMeta.lint, projectMeta.test].filter(Boolean)
    if (cmds.length) lines.push(`Commands: ${cmds.join("; ")}.`)
    lines.push("")
  }

  // Core architectural rules (from RUL-* atoms with priority=required)
  const ruleAtoms = atoms.filter((a) => a.type === "rule" && a.priority === "required")
  if (ruleAtoms.length > 0) {
    lines.push("## Non-Negotiable Rules")
    lines.push("These rules apply to ALL engineering work. Violating any of them will cause the Reviewer to reject your output.")
    lines.push("")

    for (const rule of ruleAtoms) {
      lines.push(`### ${rule.title}`)
      // Include the atom content (the rule body) in the stable prefix
      // This is what pushes us past the 1024 token cache threshold
      const body = rule.content.split("\n")
      // Skip the title line (first # heading) since we already have the title
      let started = false
      for (const bline of body) {
        if (!started && bline.startsWith("#")) { started = true; continue }
        if (started) lines.push(bline)
      }
      lines.push("")
    }
  }

  return lines.join("\n")
}

// ── Dynamic Content Builder ──────────────────────────────────────────────────

function buildDynamicContent(
  atoms: Atom[],
  task: string,
  taskType: string,
  relevantFiles: string[],
): string {
  const lines: string[] = []

  lines.push("## Task")
  lines.push(task)
  lines.push("")
  lines.push(`Classification: ${taskType}`)
  lines.push("")

  const decisions = atoms.filter((a) => a.type === "decision")
  const patterns = atoms.filter((a) => a.type === "pattern")
  const nonCoreRules = atoms.filter((a) => a.type === "rule" && a.priority !== "required")

  if (decisions.length > 0) {
    lines.push("## Architectural Decisions")
    for (const atom of decisions) {
      lines.push(`### ${atom.title}`)
      const body = atom.content.split("\n")
      let started = false
      for (const bline of body) {
        if (!started && bline.startsWith("#")) { started = true; continue }
        if (started) lines.push(bline)
      }
      lines.push("")
    }
  }

  if (patterns.length > 0) {
    lines.push("## Implementation Patterns")
    for (const atom of patterns) {
      lines.push(`### ${atom.title}`)
      const body = atom.content.split("\n")
      let started = false
      for (const bline of body) {
        if (!started && bline.startsWith("#")) { started = true; continue }
        if (started) lines.push(bline)
      }
      lines.push("")
    }
  }

  if (nonCoreRules.length > 0) {
    lines.push("## Additional Rules")
    for (const atom of nonCoreRules) {
      lines.push(`- ${atom.title}: ${atom.description}`)
    }
    lines.push("")
  }

  if (relevantFiles && relevantFiles.length > 0) {
    lines.push("## Relevant Files")
    for (const file of relevantFiles) lines.push(`- ${file}`)
    lines.push("")
  }

  lines.push("## Verification")
  lines.push("After implementing, run: lint, typecheck, and the test suite for affected modules.")
  lines.push("Do not commit until all checks pass.")

  return lines.join("\n")
}

// ── Token Estimation ─────────────────────────────────────────────────────────

function estimateTokens(text: string): number {
  // Claude tokenizer approximation: ~3.5 chars per token for code/prose mix
  return Math.ceil(text.length / 3.5)
}

// ── Task Type Inference ──────────────────────────────────────────────────────

function inferTaskType(task: string): string {
  const lower = task.toLowerCase()
  if (/fix|bug|broken|issue|crash|not working/.test(lower)) return "bug"
  if (/refactor|restructure|extract|rename|clean|improve structure/.test(lower)) return "refactor"
  if (/doc|documentation|jsdoc|readme|comment/.test(lower)) return "docs"
  if (/security|audit|vulnerability|cve|scan/.test(lower)) return "security"
  if (/performance|optimize|speed|slow|profile|fast/.test(lower)) return "performance"
  if (/explore|investigate|understand|how does|what is|explain/.test(lower)) return "exploration"
  if (/upgrade|update dep|migrate|bump/.test(lower)) return "maintenance"
  return "feature"
}

// ── Main Compiler Tool ───────────────────────────────────────────────────────

export default tool({
  description:
    "Scan knowledge atoms, resolve capabilities by keyword matching + fallback inference, load matching atom content, and assemble a cache-optimized compiled context with a stable prefix designed to reach the 1024+ token Anthropic prompt caching threshold. Outputs both human-readable context and machine-parseable telemetry JSON.",
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
      .describe("Estimated scope. Defaults to medium."),
  },
  async execute(args, context) {
    const worktree = context.worktree || context.directory || process.cwd()
    const startTime = Date.now()

    // ── Scan atoms from files ──────────────────────────────────────────────
    const allAtoms = scanAtoms(worktree)
    if (allAtoms.length === 0) {
      return `No knowledge atoms found in .opencode/knowledge/atoms/. The Knowledge Graph has not been populated. Create atom files or load knowledge modules manually via the skill tool.`
    }

    // ── Parse request ──────────────────────────────────────────────────────
    const taskType = inferTaskType(args.task)
    const scope = args.scope || "medium"
    const keywords = extractKeywords(args.task)
    const relevantFiles = args.relevantFiles || []

    // ── Resolve capabilities ───────────────────────────────────────────────
    const keywordCaps = resolveCapabilitiesByKeywords(keywords)
    const inferredCaps = inferCapabilitiesFromTask(args.task, args.agentType as AgentType)
    const allCaps = new Set([...keywordCaps, ...inferredCaps])

    // ── Resolve atoms ──────────────────────────────────────────────────────
    const selectedAtoms = resolveAtoms(allCaps, args.agentType as AgentType, allAtoms)

    // ── Budget ─────────────────────────────────────────────────────────────
    const budgets: Record<string, number> = {
      builder: 3000, reviewer: 2000, analyst: 1500,
      "docs-writer": 2000, "security-auditor": 2000, orchestrator: 2500,
    }
    const budget = budgets[args.agentType] || 3000

    // ── Build stable prefix ────────────────────────────────────────────────
    const projectMeta = loadProjectMeta(worktree)
    const stablePrefix = buildStablePrefix(args.agentType as AgentType, selectedAtoms, projectMeta)
    const stableTokens = estimateTokens(stablePrefix)

    // ── Build dynamic content ──────────────────────────────────────────────
    const dynamicContent = buildDynamicContent(
      selectedAtoms.filter((a) => a.type !== "rule" || a.priority !== "required"),
      args.task, taskType, relevantFiles,
    )
    const dynamicTokens = estimateTokens(dynamicContent)

    const totalTokens = stableTokens + dynamicTokens
    const budgetUsed = Math.round((totalTokens / budget) * 100)
    const compilationId = crypto.randomUUID()
    const elapsed = Date.now() - startTime

    // ── Telemetry ──────────────────────────────────────────────────────────
    const telemetry: CompilationResult = {
      atoms_loaded: selectedAtoms.map((a) => a.id),
      atoms_unused: [], // Populated externally if model doesn't reference them
      atoms_required_but_missing: [...allCaps].filter(
        (cap) => !selectedAtoms.some((a) => a.capabilities.includes(cap)),
      ),
      stable_prefix_tokens: stableTokens,
      dynamic_tokens: dynamicTokens,
      total_tokens: totalTokens,
      budget: budget,
      budget_used_percent: budgetUsed,
      compilation_id: compilationId,
      elapsed_ms: elapsed,
    }

    // ── Assemble output ────────────────────────────────────────────────────
    const cacheStatus = stableTokens >= 1024
      ? `Cache threshold REACHED (${stableTokens} stable tokens >= 1024). Provider prompt caching ACTIVE.`
      : `Cache threshold NOT reached (${stableTokens} tokens < 1024). Add more rule atoms to stable prefix to enable provider caching.`

    const output = [
      `## Compiled Context (${args.agentType})`,
      ``,
      `**Atoms loaded:** ${selectedAtoms.length} | **Tokens:** ${totalTokens} (${budgetUsed}% of budget)`,
      `**Cache:** ${cacheStatus}`,
      `**Compilation:** ${compilationId} (${elapsed}ms)`,
      ``,
      `---`,
      ``,
      stablePrefix.trim(),
      ``,
      `---`,
      ``,
      dynamicContent.trim(),
      ``,
      `---`,
      ``,
      `## Telemetry (machine-parseable)`,
      `\`\`\`json`,
      JSON.stringify(telemetry, null, 2),
      `\`\`\``,
    ].join("\n")

    return output
  },
})

function loadProjectMeta(worktree: string): Record<string, string> {
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
