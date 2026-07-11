import { tool } from "@opencode-ai/plugin"
import fs from "fs"
import path from "path"

interface AtomMetadata {
  id: string
  type: string
  title: string
  description: string
  capabilities: string[]
  domain: string
  status: string
  version: string
  priority: string
  token_estimate: number
  audience: string[]
  dependencies: { requires: string[]; optional: string[] }
  supersedes: string[]
  superseded_by: string | null
  conflicts_with: string[]
  related_to: string[]
  file_path: string
}

function parseFrontmatter(raw: string): Record<string, any> {
  const lines = raw.split("\n")
  if (lines[0]?.trim() !== "---") return {}

  let i = 1
  const yamlLines: string[] = []
  while (i < lines.length && lines[i].trim() !== "---") {
    yamlLines.push(lines[i])
    i++
  }

  const metadata: Record<string, any> = {}
  let currentKey = ""
  let inList = false
  let currentList: string[] = []
  let inObject = false
  let currentObject: Record<string, any> = {}

  for (const line of yamlLines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue

    if (inObject) {
      const nestedMatch = trimmed.match(/^(\w[\w\s]*?):\s*(.*)$/)
      if (nestedMatch) {
        currentObject[nestedMatch[1]] = parseVal(nestedMatch[2])
        continue
      }
      if (!trimmed.startsWith("  ") && !trimmed.startsWith("\t")) {
        metadata[currentKey] = { ...currentObject }
        currentObject = {}
        inObject = false
        const topMatch = trimmed.match(/^(\w[\w\s]*?):\s*(.*)$/)
        if (topMatch) {
          currentKey = topMatch[1]
          const val = topMatch[2].trim()
          if (val === "") { inObject = true; currentObject = {} }
          else if (val === "[]") metadata[currentKey] = []
          else if (val.startsWith("[")) { inList = true; currentList = parseList(val) }
          else metadata[currentKey] = parseVal(val)
        }
        continue
      }
    }

    if (inList && trimmed.startsWith("- ")) {
      currentList.push(parseVal(trimmed.slice(2).trim()))
      continue
    }
    if (inList) {
      metadata[currentKey] = [...currentList]
      currentList = []
      inList = false
    }

    const match = trimmed.match(/^(\w[\w\s]*?):\s*(.*)$/)
    if (!match) continue

    metadata[currentKey] = currentObject ? { ...currentObject } : metadata[currentKey]
    if (currentKey && currentObject && Object.keys(currentObject).length > 0) {
      inObject = false
      currentObject = {}
    }

    currentKey = match[1]
    const val = match[2].trim()

    if (val === "") {
      inObject = true
      currentObject = {}
    } else if (val === "[]") {
      metadata[currentKey] = []
    } else if (val.startsWith("[")) {
      metadata[currentKey] = parseList(val)
    } else {
      metadata[currentKey] = parseVal(val)
    }
  }

  if (inList) metadata[currentKey] = [...currentList]
  if (inObject && currentKey) metadata[currentKey] = { ...currentObject }

  return metadata
}

function parseVal(v: string): any {
  const t = v.trim().replace(/^["']|["']$/g, "")
  if (t === "true") return true
  if (t === "false") return false
  if (t === "null" || t === "~") return null
  if (/^-?\d+$/.test(t)) return parseInt(t)
  if (/^-?\d+\.\d+$/.test(t)) return parseFloat(t)
  return t
}

function parseList(v: string): string[] {
  return v.replace(/^\[|\]$/g, "").split(",").map((s) => s.trim().replace(/^["']|["']$/g, "")).filter(Boolean)
}

export default tool({
  description:
    "Scan .opencode/knowledge/atoms/ directory and rebuild state/knowledge-registry.json from atom file frontmatter. Run this after adding, removing, or modifying knowledge atoms. The registry is auto-generated; never edit it manually.",
  args: {},
  async execute(_args, context) {
    const worktree = context.worktree || context.directory || process.cwd()
    const atomsDir = path.join(worktree, ".opencode", "knowledge", "atoms")

    if (!fs.existsSync(atomsDir)) {
      return `No atoms directory found at .opencode/knowledge/atoms/. Create atom files first.`
    }

    const atoms: AtomMetadata[] = []
    const typeDirs = ["decisions", "patterns", "rules", "capabilities", "examples"]
    let scanErrors = 0

    for (const dir of typeDirs) {
      const dirPath = path.join(atomsDir, dir)
      if (!fs.existsSync(dirPath)) continue

      const files = fs.readdirSync(dirPath).filter((f) => f.endsWith(".md"))
      for (const file of files) {
        const filePath = path.join(dirPath, file)
        try {
          const raw = fs.readFileSync(filePath, "utf-8")
          const meta = parseFrontmatter(raw)
          if (!meta.id) { scanErrors++; continue }

          atoms.push({
            id: meta.id,
            type: meta.type || dir.slice(0, -1),
            title: meta.title || "",
            description: meta.description || "",
            capabilities: meta.capabilities || [],
            domain: meta.domain || "",
            status: meta.status || "draft",
            version: meta.version || "1.0.0",
            priority: meta.priority || "recommended",
            token_estimate: meta.token_estimate || 100,
            audience: meta.audience || [],
            dependencies: meta.dependencies || { requires: [], optional: [] },
            supersedes: meta.supersedes || [],
            superseded_by: meta.superseded_by || null,
            conflicts_with: meta.conflicts_with || [],
            related_to: meta.related_to || [],
            file_path: path.relative(worktree, filePath),
          })
        } catch {
          scanErrors++
        }
      }
    }

    // Build indices
    const byType: Record<string, string[]> = {}
    const byCapability: Record<string, string[]> = {}
    const byDomain: Record<string, string[]> = {}
    const byStatus: Record<string, string[]> = {}
    const byAudience: Record<string, string[]> = {}

    for (const atom of atoms) {
      if (!byType[atom.type]) byType[atom.type] = []
      byType[atom.type].push(atom.id)

      if (byStatus[atom.status]) byStatus[atom.status].push(atom.id)
      else byStatus[atom.status] = [atom.id]

      if (atom.domain) {
        if (!byDomain[atom.domain]) byDomain[atom.domain] = []
        byDomain[atom.domain].push(atom.id)
      }

      for (const cap of atom.capabilities) {
        if (!byCapability[cap]) byCapability[cap] = []
        byCapability[cap].push(atom.id)
      }

      for (const a of atom.audience) {
        if (!byAudience[a]) byAudience[a] = []
        byAudience[a].push(atom.id)
      }
    }

    const activeAtoms = atoms.filter((a) => a.status === "active")
    const ruleAtoms = activeAtoms.filter((a) => a.type === "rule")

    const registry = {
      "$schema": "context-compiler/knowledge-registry-schema.json",
      "version": "2.0.0",
      "generated_at": new Date().toISOString(),
      "generated_by": "registry-builder:v1.0.0",
      "atom_count": atoms.length,
      "active_atom_count": activeAtoms.length,
      "indices": {
        by_type: byType,
        by_capability: byCapability,
        by_domain: byDomain,
        by_status: byStatus,
        by_audience: byAudience,
      },
      "atoms": atoms.reduce((acc, atom) => {
        acc[atom.id] = atom
        return acc
      }, {} as Record<string, AtomMetadata>),
      "core_rules": ruleAtoms.map((a) => a.id),
      "coverage": {
        capabilities_with_atoms: Object.keys(byCapability).length,
        total_atoms: atoms.length,
        rule_atoms: ruleAtoms.length,
        decision_atoms: activeAtoms.filter((a) => a.type === "decision").length,
        pattern_atoms: activeAtoms.filter((a) => a.type === "pattern").length,
      },
    }

    const registryPath = path.join(worktree, "state", "knowledge-registry.json")
    const stateDir = path.join(worktree, "state")
    if (!fs.existsSync(stateDir)) fs.mkdirSync(stateDir, { recursive: true })

    fs.writeFileSync(registryPath, JSON.stringify(registry, null, 2) + "\n")

    const errors = scanErrors > 0 ? ` (${scanErrors} files skipped due to parse errors)` : ""

    return [
      `## Registry Rebuilt`,
      ``,
      `**Atoms scanned:** ${atoms.length} active, ${atoms.filter((a) => a.status !== "active").length} non-active${errors}`,
      `**Types:** ${Object.entries(byType).map(([t, ids]) => `${t}: ${ids.length}`).join(", ")}`,
      `**Capabilities:** ${Object.keys(byCapability).length}`,
      `**Core rules:** ${ruleAtoms.length}`,
      ``,
      `Registry written to \`state/knowledge-registry.json\`.`,
      `This file is auto-generated. Do not edit it manually. To modify knowledge, edit the atom files in \`.opencode/knowledge/atoms/\` and rebuild.`,
    ].join("\n")
  },
})
