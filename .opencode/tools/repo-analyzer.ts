import { tool } from "@opencode-ai/plugin"
import path from "path"
import fs from "fs"

export default tool({
  description:
    "Analyze the repository structure and generate a summary of source files, entry points, and configuration. Useful for initializing context before other agents explore.",
  args: {
    directory: tool.schema
      .string()
      .optional()
      .describe(
        "Directory to analyze. Defaults to the worktree root. Use '.' or 'src' to limit scope."
      ),
    limit: tool.schema
      .number()
      .optional()
      .describe("Maximum files to include in the output. Default 100."),
  },
  async execute(args, context) {
    const root = args.directory
      ? path.resolve(context.worktree, args.directory)
      : context.worktree
    const maxFiles = args.limit ?? 100
    const ignorePatterns = [
      "node_modules",
      ".git",
      "dist",
      "build",
      ".next",
      ".cache",
      "__pycache__",
      ".turbo",
    ]

    function shouldIgnore(p: string): boolean {
      return ignorePatterns.some((pat) => p.includes(`/${pat}/`) || p.startsWith(`${pat}/`))
    }

    function walkDir(dir: string, prefix = ""): string[] {
      const entries: string[] = []
      try {
        const items = fs.readdirSync(dir, { withFileTypes: true })
        for (const item of items) {
          const fullPath = path.join(dir, item.name)
          const relativePath = path.relative(root, fullPath)
          if (shouldIgnore(`/${relativePath}`)) continue
          if (item.isDirectory()) {
            entries.push(...walkDir(fullPath, `${prefix}${item.name}/`))
          } else {
            entries.push(`${prefix}${item.name}`)
          }
          if (entries.length >= maxFiles) break
        }
      } catch {
        // skip unreadable dirs
      }
      return entries.slice(0, maxFiles)
    }

    const files = walkDir(root)

    const configFiles = files.filter(
      (f) =>
        f === "package.json" ||
        f === "tsconfig.json" ||
        f === "vite.config.ts" ||
        f === "next.config.js" ||
        f === "webpack.config.js" ||
        f.includes(".config.")
    )

    const result = {
      root: path.relative(context.worktree, root) || ".",
      totalFiles: files.length,
      truncated: files.length >= maxFiles,
      configFiles,
      files,
    }

    return JSON.stringify(result, null, 2)
  },
})
