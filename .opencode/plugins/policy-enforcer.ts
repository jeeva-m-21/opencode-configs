import type { Plugin } from "@opencode-ai/plugin"

const DANGEROUS_PATTERNS = [
  { pattern: "rm -rf /", message: "Attempted recursive root deletion" },
  { pattern: "rm -rf ~", message: "Attempted home directory deletion" },
  { pattern: "rm -rf .", message: "Attempted current directory deletion" },
  { pattern: "curl", message: "Piping curl to shell is dangerous" },
  { pattern: "> /dev/sda", message: "Attempted raw device write" },
  { pattern: "mkfs.", message: "Attempted filesystem format" },
  { pattern: "dd if=", message: "Attempted raw device access" },
  { pattern: "chmod 777 /", message: "Attempted world-writable system directory" },
  { pattern: "git push --force origin main", message: "Attempted force push to main" },
  { pattern: "git push --force origin master", message: "Attempted force push to master" },
  { pattern: "eval(", message: "Dynamic eval may indicate unsafe code generation" },
]

const ENV_FILES = [".env", ".env.local", ".env.production", ".env.development"]

export const PolicyEnforcer: Plugin = async () => {
  return {
    "tool.execute.before": async (input, output) => {
      if (input.tool === "bash") {
        const command: string = output.args?.command || ""

        for (const danger of DANGEROUS_PATTERNS) {
          if (
            (danger.pattern.includes("|") &&
              command.includes("curl") &&
              (command.includes("| sh") || command.includes("| bash"))) ||
            command.includes(danger.pattern)
          ) {
            if (
              danger.pattern === "curl" &&
              !(command.includes("| sh") || command.includes("| bash"))
            ) {
              continue
            }
            throw new Error(`BLOCKED by policy-enforcer: ${danger.message}`)
          }
        }
      }

      if (input.tool === "read") {
        const filePath: string = output.args?.filePath || ""
        for (const envFile of ENV_FILES) {
          if (filePath.endsWith(envFile)) {
            throw new Error(
              `BLOCKED by policy-enforcer: Do not read ${envFile} files. They may contain secrets.`
            )
          }
        }
      }
    },
  }
}
