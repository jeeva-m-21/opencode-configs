import { tool } from "@opencode-ai/plugin"
import fs from "fs"
import path from "path"

interface AtomSummary {
  id: string
  type: string
  title: string
  description: string
  capabilities: string[]
  domain: string
  status: string
  priority: string
  audience: string[]
  dependencies: string[]
  file: string
}

function parseAtomSummary(filePath: string): AtomSummary | null {
  try {
    const raw = fs.readFileSync(filePath, "utf-8")
    const lines = raw.split("\n")
    if (lines[0]?.trim() !== "---") return null

    let i = 1
    const meta: Record<string, any> = {}
    let currentKey = ""
    let inList = false
    let list: string[] = []

    while (i < lines.length && lines[i].trim() !== "---") {
      const trimmed = lines[i].trim()
      if (!trimmed || trimmed.startsWith("#")) { i++; continue }

      if (inList && trimmed.startsWith("- ")) {
        list.push(trimmed.slice(2).trim().replace(/^["']|["']$/g, ""))
        i++
        continue
      }
      if (inList) {
        meta[currentKey] = [...list]
        list = []
        inList = false
      }

      const match = trimmed.match(/^(\w+):\s*(.*)$/)
      if (match) {
        currentKey = match[1]
        const val = match[2].trim()
        if (val === "") continue
        if (val.startsWith("[")) {
          inList = true
          list = val.replace(/^\[|\]$/g, "").split(",").map((s) => s.trim().replace(/^["']|["']$/g, "")).filter(Boolean)
        } else {
          meta[currentKey] = val.replace(/^["']|["']$/g, "")
        }
      }
      i++
    }

    if (!meta.id || !meta.title) return null

    return {
      id: meta.id,
      type: meta.type || "unknown",
      title: meta.title,
      description: meta.description || "",
      capabilities: meta.capabilities || [],
      domain: meta.domain || "",
      status: meta.status || "unknown",
      priority: meta.priority || "recommended",
      audience: meta.audience || [],
      dependencies: meta.dependencies?.requires || (meta.requires || []),
      file: path.basename(filePath),
    }
  } catch {
    return null
  }
}

function scanAllAtoms(worktree: string): AtomSummary[] {
  const atomsDir = path.join(worktree, ".opencode", "knowledge", "atoms")
  if (!fs.existsSync(atomsDir)) return []

  const atoms: AtomSummary[] = []
  const dirs = ["decisions", "patterns", "rules", "capabilities", "examples"]

  for (const dir of dirs) {
    const dirPath = path.join(atomsDir, dir)
    if (!fs.existsSync(dirPath)) continue
    const files = fs.readdirSync(dirPath).filter((f) => f.endsWith(".md"))
    for (const file of files) {
      const summary = parseAtomSummary(path.join(dirPath, file))
      if (summary) atoms.push(summary)
    }
  }

  return atoms
}

export default tool({
  description: "Browse and search the Knowledge Graph. List all atoms, filter by type or capability, search by keyword, or view atom details. Use this to discover what engineering knowledge exists before compiling context.",
  args: {
    action: tool.schema
      .enum(["list", "search", "stats", "detail"])
      .describe("What to do: list all atoms, search by keyword/capability, show statistics, or view atom details"),
    filter: tool.schema
      .string()
      .optional()
      .describe("Filter: 'type:rule' 'type:pattern' 'type:decision' 'capability:authentication' 'domain:security' 'status:draft' or a free-text keyword search"),
    id: tool.schema
      .string()
      .optional()
      .describe("Atom ID to view details for (use with action=detail)"),
  },
  async execute(args, context) {
    const worktree = context.worktree || context.directory || process.cwd()
    const allAtoms = scanAllAtoms(worktree)

    if (allAtoms.length === 0) {
      return "No knowledge atoms found in .opencode/knowledge/atoms/. Create atoms in decisions/, patterns/, rules/, or examples/ subdirectories."
    }

    // Action: stats
    if (args.action === "stats") {
      const byType: Record<string, number> = {}
      const byDomain: Record<string, number> = {}
      const byStatus: Record<string, number> = {}
      let totalCap = 0

      for (const a of allAtoms) {
        byType[a.type] = (byType[a.type] || 0) + 1
        byDomain[a.domain] = (byDomain[a.domain] || 0) + 1
        byStatus[a.status] = (byStatus[a.status] || 0) + 1
        totalCap += a.capabilities.length
      }

      const lines = [
        `## Knowledge Graph Statistics`,
        ``,
        `**Total atoms:** ${allAtoms.length}`,
        ``,
        `**By type:** ${Object.entries(byType).map(([t, c]) => `${t}: ${c}`).join(", ")}`,
        `**By domain:** ${Object.entries(byDomain).map(([d, c]) => `${d}: ${c}`).join(", ")}`,
        `**By status:** ${Object.entries(byStatus).map(([s, c]) => `${s}: ${c}`).join(", ")}`,
        `**Total capability references:** ${totalCap}`,
        ``,
        `**Core rules:** ${allAtoms.filter((a) => a.type === "rule" && a.priority === "required").length}`,
        `**Decisions:** ${allAtoms.filter((a) => a.type === "decision").length}`,
        `**Patterns:** ${allAtoms.filter((a) => a.type === "pattern").length}`,
      ]
      return lines.join("\n")
    }

    // Filter atoms
    let filtered = allAtoms
    if (args.filter) {
      const f = args.filter.toLowerCase()

      if (f.startsWith("type:")) {
        const t = f.slice(5).trim()
        filtered = allAtoms.filter((a) => a.type === t)
      } else if (f.startsWith("capability:")) {
        const c = f.slice(11).trim()
        filtered = allAtoms.filter((a) => a.capabilities.some((cap) => cap.toLowerCase().includes(c)))
      } else if (f.startsWith("domain:")) {
        const d = f.slice(7).trim()
        filtered = allAtoms.filter((a) => a.domain.toLowerCase().includes(d))
      } else if (f.startsWith("status:")) {
        const s = f.slice(7).trim()
        filtered = allAtoms.filter((a) => a.status === s)
      } else if (f.startsWith("audience:")) {
        const au = f.slice(9).trim()
        filtered = allAtoms.filter((a) => a.audience.some((a2) => a2.includes(au)))
      } else {
        // Free-text search across title, description, capabilities, tags
        filtered = allAtoms.filter(
          (a) =>
            a.title.toLowerCase().includes(f) ||
            a.description.toLowerCase().includes(f) ||
            a.capabilities.some((c) => c.toLowerCase().includes(f)) ||
            a.id.toLowerCase().includes(f),
        )
      }
    }

    // Action: detail
    if (args.action === "detail" && args.id) {
      const atom = allAtoms.find((a) => a.id === args.id)
      if (!atom) return `Atom '${args.id}' not found.`

      // Read full content
      const atomPath = path.join(worktree, ".opencode", "knowledge", "atoms", `${atom.type}s`, `${atom.id}.md`)
      let content = "Content not found"
      try {
        const raw = fs.readFileSync(atomPath, "utf-8")
        const parts = raw.split("---\n")
        content = parts.slice(2).join("---\n").trim() || raw
      } catch { /* use summary only */ }

      return [
        `## ${atom.id}: ${atom.title}`,
        ``,
        `**Type:** ${atom.type} | **Domain:** ${atom.domain} | **Status:** ${atom.status} | **Priority:** ${atom.priority}`,
        `**Capabilities:** ${atom.capabilities.join(", ")}`,
        `**Audience:** ${atom.audience.join(", ")}`,
        `**Dependencies:** ${atom.dependencies.length ? atom.dependencies.join(", ") : "none"}`,
        ``,
        `---`,
        ``,
        content,
      ].join("\n")
    }

    // Action: list or search
    if (filtered.length === 0) {
      return `No atoms match the filter '${args.filter}'. Try a broader search or use \`list\` to see all atoms.`
    }

    const lines = [
      filtered.length === allAtoms.length
        ? `## All Knowledge Atoms (${filtered.length})`
        : `## Search Results: "${args.filter}" (${filtered.length} atoms)`,
      ``,
    ]

    // Group by type
    for (const type of ["rule", "decision", "pattern", "example", "capability"]) {
      const ofType = filtered.filter((a) => a.type === type)
      if (ofType.length === 0) continue

      lines.push(`### ${type.charAt(0).toUpperCase() + type.slice(1)}s (${ofType.length})`)
      for (const a of ofType) {
        const deps = a.dependencies.length ? ` [deps: ${a.dependencies.length}]` : ""
        lines.push(`- **${a.id}** — ${a.title} (${a.status}, ${a.priority})${deps}`)
        if (a.capabilities.length) {
          lines.push(`  Capabilities: ${a.capabilities.join(", ")}`)
        }
      }
      lines.push("")
    }

    lines.push(`Use \`atom-viewer action=detail id=<ID>\` to view the full content of any atom.`)
    return lines.join("\n")
  },
})
