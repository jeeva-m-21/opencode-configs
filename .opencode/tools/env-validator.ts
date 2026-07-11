import { tool } from "@opencode-ai/plugin"

export default tool({
  description: "Validate that required environment variables are set for the project",
  args: {
    envList: tool.schema
      .array(tool.schema.string())
      .describe("List of required environment variable names to check"),
  },
  async execute(args) {
    const missing: string[] = []
    const present: string[] = []

    for (const envVar of args.envList) {
      if (Bun.env[envVar]) {
        present.push(envVar)
      } else {
        missing.push(envVar)
      }
    }

    if (missing.length === 0) {
      return "All required environment variables are set."
    }

    return [
      `Missing ${missing.length} environment variable(s):`,
      ...missing.map((v) => `  ❌ ${v}`),
      present.length > 0 ? `\nPresent (${present.length}):` : "",
      ...present.map((v) => `  ✅ ${v}`),
    ]
      .filter(Boolean)
      .join("\n")
  },
})
