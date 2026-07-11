---
description: Compile minimal, cache-optimized context for a task using the Context Compiler
subtask: false
agent: orchestrator
---

Compile context for the following task: $ARGUMENTS

## Instructions

1. Call the `context-compiler` tool with:
   - `task`: the user's request or task description
   - `agentType`: the agent that will execute (builder, reviewer, analyst, etc.)
   - `contractPath`: "state/contract.md" (if applicable)
   - `relevantFiles`: any files you know are relevant
   - `scope`: your estimate (trivial, small, medium, large, major)

2. The compiler returns a compiled execution context containing:
   - A stable prefix (identical across invocations for prompt caching)
   - Resolved engineering capabilities
   - Required knowledge modules (specific skills to load)
   - Token budget report

3. Review the compiled context. Verify:
   - All required capabilities are covered
   - No irrelevant modules were resolved
   - The token budget is appropriate for the task scope

4. Present a summary:
   - Task classification and scope
   - Required capabilities and knowledge modules
   - Token count and budget usage
   - Whether the compiled context is sufficient or needs augmentation

5. If the compiled context is sufficient, use it to brief the subagent. If not, supplement with additional context from the contract or state files.

## Important

- The compiler is deterministic — it does not call an LLM
- The stable prefix is designed for provider prompt caching (Anthropic/OpenAI)
- Knowledge modules are resolved by capability matching, not by topic
- The compiler resolves transitive module dependencies automatically
