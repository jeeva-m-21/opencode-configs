/**
 * Atom v2 Migration — adds structured machine-readable fields to all atoms.
 * Run once: node scripts/migrate-atoms.js
 */
const fs = require("fs")
const path = require("path")

const ATOMS_DIR = path.join(__dirname, "..", ".opencode", "knowledge", "atoms")

function parseFrontmatter(content) {
  const lines = content.split("\n")
  if (lines[0]?.trim() !== "---") return { metadata: {}, body: content, rawYaml: "" }

  let i = 1
  const yamlLines = []
  while (i < lines.length && lines[i].trim() !== "---") {
    yamlLines.push(lines[i])
    i++
  }
  return {
    metadata: {},
    body: lines.slice(i + 1).join("\n").trim(),
    rawYaml: yamlLines.join("\n"),
  }
}

function getV2Fields(type, body) {
  switch (type) {
    case "pattern": {
      // Infer canonical reference from body content
      const refMatch = body.match(/src\/api\/(routes|services|repositories|middleware)\/(\w+)\.ts/)
      const canonicalFile = refMatch ? refMatch[0] : "src/api/routes/users.ts"
      const canonicalLayer = refMatch ? refMatch[1] : "routes"

      return {
        intent: "do",
        applies_to: `${canonicalLayer} layer code`,
        tradeoffs: [
          { pro: "Consistent structure across the codebase", con: "May feel verbose for simple cases" },
        ],
        canonical_reference: {
          file: canonicalFile,
          imports: "1-9",
          structure: "10-48",
          handler: "50-65",
        },
        primary_binding: {
          layer: canonicalLayer === "routes" ? "route" :
                 canonicalLayer === "services" ? "service" :
                 canonicalLayer === "repositories" ? "repository" :
                 canonicalLayer === "middleware" ? "middleware" : "route",
        },
        verification: {
          test_file: canonicalFile.replace(".ts", ".test.ts").replace(/src\/api/, "src/api/__tests__"),
          test_pattern: "should return expected output when given valid input",
        },
      }
    }
    case "rule": {
      return {
        enforcement: "reviewer",
        violation_severity: "blocking",
        scope: "always",
      }
    }
    case "decision": {
      return {
        alternatives: [{ option: "See body", why_rejected: "See body" }],
        rationale: body.split("\n").slice(0, 3).join(" ").replace(/#/g, "").trim().slice(0, 200),
      }
    }
    case "strategy": {
      return {
        applies_when: "Complex multi-step tasks requiring decomposition",
        cognitive_steps: [
          { step: "Analyze the problem", purpose: "Understand scope and constraints" },
          { step: "Plan the approach", purpose: "Identify files, patterns, and verification steps" },
          { step: "Execute stepwise", purpose: "One verifiable change at a time" },
          { step: "Verify each step", purpose: "Localize failures to single changes" },
        ],
      }
    }
    case "guidance": {
      return {
        strength: "prefer",
        applies_when: "Choosing between multiple valid approaches",
        exceptions: "When constraints or performance requirements dictate otherwise",
      }
    }
    case "procedure": {
      return {
        trigger: "Task requires ordered workflow steps",
        steps: [{ order: 1, action: "Verify prerequisites", verification: "Pre-flight checks pass" }],
        checkpoints: [{ after_step: 1, criteria: ["All dependencies available", "Environment ready"] }],
        rollback: "Revert to previous state and notify operator",
      }
    }
    case "checklist": {
      return {
        trigger: "Before proceeding with next phase",
        items: [{ description: "Verify all prerequisites", severity: "blocking", verification: "Run pre-flight checks" }],
      }
    }
    case "metric": {
      return {
        unit: "percentage",
        thresholds: { warning: 60, failure: 40 },
        measured_by: "tool-specific",
        direction: "higher_is_better",
      }
    }
    case "example": {
      return {
        references: "PAT-repository",
        language: "typescript",
        framework: "Express",
      }
    }
    case "capability": {
      return {
        parent: null,
        subcapabilities: [],
        required_by: ["feature"],
      }
    }
    default: {
      return {}
    }
  }
}

function serializeV2Field(key, value, indent = 2) {
  const pad = " ".repeat(indent)
  if (value === null || value === undefined) return `${pad}${key}: null`
  if (typeof value === "string") return `${pad}${key}: ${value.includes(":") ? `"${value}"` : value}`
  if (typeof value === "number") return `${pad}${key}: ${value}`
  if (typeof value === "boolean") return `${pad}${key}: ${value}`
  if (Array.isArray(value)) {
    if (value.length === 0) return `${pad}${key}: []`
    if (typeof value[0] === "string") return `${pad}${key}: [${value.join(", ")}]`
    if (typeof value[0] === "object") {
      return `${pad}${key}:\n` + value.map((item) => {
        const entries = Object.entries(item).map(([k, v]) => `      ${k}: ${typeof v === "string" ? `"${v}"` : v}`)
        return `${pad}  - ${entries.join(", ")}`
      }).join("\n")
    }
  }
  if (typeof value === "object") {
    const entries = Object.entries(value).filter(([_, v]) => v !== null && v !== undefined)
    if (entries.length === 0) return `${pad}${key}: {}`
    return `${pad}${key}:\n` + entries.map(([k, v]) => {
      if (typeof v === "string") return `${pad}  ${k}: ${v.includes(":") ? `"${v}"` : v}`
      if (typeof v === "number") return `${pad}  ${k}: ${v}`
      if (Array.isArray(v)) return `${pad}  ${k}: [${v.map(s => `"${s}"`).join(", ")}]`
      if (typeof v === "object") {
        return `${pad}  ${k}:\n` + Object.entries(v).map(([k2, v2]) => {
          if (Array.isArray(v2)) return `${pad}    ${k2}: [${v2.map(s => `"${s}"`).join(", ")}]`
          return `${pad}    ${k2}: ${typeof v2 === "string" ? v2.includes(":") ? `"${v2}"` : v2 : v2}`
        }).join("\n")
      }
      return `${pad}  ${k}: ${v}`
    }).join("\n")
  }
  return `${pad}${key}: ${value}`
}

function migrateFile(filePath) {
  const content = fs.readFileSync(filePath, "utf-8")
  const { metadata, body, rawYaml } = parseFrontmatter(content)

  // Extract type from raw YAML (we don't parse structured, just find the type line)
  const typeMatch = rawYaml.match(/^type:\s*(\w+)/m)
  const type = typeMatch ? typeMatch[1].trim() : "pattern"

  // Only add fields if they don't already exist
  const v2Fields = getV2Fields(type, body)
  let updated = false

  for (const [key, value] of Object.entries(v2Fields)) {
    if (!rawYaml.includes(`${key}:`)) {
      updated = true
    }
  }

  if (!updated) {
    return { file: path.basename(filePath), status: "skipped (already has v2 fields)" }
  }

  // Add v2 fields after the `audience:` line (last common field before body)
  const yamlLines = rawYaml.split("\n")
  const audienceIdx = yamlLines.findIndex((l) => l.trim().startsWith("audience:"))
  const insertAt = audienceIdx >= 0 ? audienceIdx + 1 : yamlLines.length

  const newFields = []
  for (const [key, value] of Object.entries(v2Fields)) {
    if (!rawYaml.includes(`${key}:`)) {
      newFields.push(serializeV2Field(key, value, 0))
    }
  }

  if (newFields.length === 0) {
    return { file: path.basename(filePath), status: "no new fields" }
  }

  yamlLines.splice(insertAt, 0, ...newFields)
  const newFrontmatter = yamlLines.join("\n")
  const newContent = `---\n${newFrontmatter}\n---\n\n${body}`

  fs.writeFileSync(filePath, newContent)
  return { file: path.basename(filePath), status: `added ${newFields.length} fields` }
}

function migrateAll() {
  console.log("Migrating atoms to v2 ontology...\n")
  const dirs = ["decisions", "patterns", "rules", "strategies", "guidance", "procedures", "checklists", "examples", "capabilities", "metrics"]

  let total = 0
  let added = 0
  let skipped = 0

  for (const dir of dirs) {
    const dirPath = path.join(ATOMS_DIR, dir)
    if (!fs.existsSync(dirPath)) continue

    const files = fs.readdirSync(dirPath).filter((f) => f.endsWith(".md"))
    for (const file of files) {
      total++
      const result = migrateFile(path.join(dirPath, file))
      console.log(`  ${result.file}: ${result.status}`)
      if (result.status.includes("added")) added++
      else skipped++
    }
  }

  console.log(`\nTotal: ${total} atoms | Updated: ${added} | Skipped: ${skipped}`)
}

migrateAll()
