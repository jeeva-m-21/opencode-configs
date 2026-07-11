---
name: eng-ai-prompt
description: Prompt engineering standards for AI coding agents — structure, clarity, context management, and delegation patterns
license: MIT
compatibility: opencode
metadata:
  domain: ai-engineering
  audience: orchestrator
  priority: high
---

## Prompt Engineering Principles

1. **State the objective, not the solution.** Tell the agent WHAT to achieve, not HOW to achieve it. The agent is better at implementation than you are at specification.

2. **Provide context, not history.** Give the agent the relevant files, patterns, and constraints. Don't dump the full conversation.

3. **Be specific about scope.** "Refactor the auth module" is ambiguous. "Extract token validation from AuthService into a separate TokenValidator class in src/auth/token-validator.ts" is actionable.

4. **Set explicit stop conditions.** "Explore the codebase" leads to token waste. "Find where user sessions are created and validated. Stop when you've identified the relevant files and the validation logic."

5. **Prefer examples over descriptions.** Show a reference implementation. "Follow the pattern in src/users/create.ts when implementing the delete handler."

## Prompt Structure

### For Subagent Briefings (Orchestrator → Subagent)
```
Task: [One-sentence objective]
Context: [Only files/directories relevant to this task]
Pattern to follow: [Reference implementation if applicable]
Constraints: [What NOT to change, specific requirements]
Stop when: [Clear completion condition]
```

### For Builder Tasks
```
Implement: [Specific feature/change from plan]
Files to create: [explicit list]
Files to modify: [explicit list with line ranges]
Follow: [reference to existing code that demonstrates the pattern]
Tests: [test scenarios to cover]
Verify: [lint + typecheck + test command]
```

### For Analyst Explorations
```
Question: [Specific question to answer]
Search: [Directories or keywords to start with]
Find: [What patterns, files, or logic to identify]
Stop when: [You know enough to answer the question]
Skip: [Directories or files not relevant]
Limit: [Maximum files to read]
```

## Context Budgeting

| Message Type | Target Context Size | Strategy |
|---|---|---|
| Analyst briefing | < 200 words | Ask one question, specify one directory |
| Builder briefing | < 300 words | Give task + files + pattern reference |
| Reviewer briefing | < 200 words | Give diff scope + what to check |
| Orchestrator prompt | < 500 words | Full request context for classification |

## Anti-Patterns

- **"Explore the codebase and tell me what you find"** → Too broad. Specify what you're looking for.
- **"Fix this bug"** (without error message or reproduction steps) → Impossible to triage. Provide the error, steps, and expected behavior.
- **"Make it better"** → Vague. Specify: "better" = faster? cleaner? more testable? more secure?
- **Dumping full conversation history** into subagent prompts → Token waste. Extract only what's relevant.
- **Asking the agent to decide scope** → "Do what you think is best" without constraints. Give boundaries.

## Delegation Patterns

### Sequential (most common)
```
Orchestrator → Analyst (explore) → Orchestrator (review findings) 
  → Builder (implement) → Orchestrator (verify)
```

### Direct (for simple tasks)
```
Orchestrator → Builder (implement with explicit instructions)
```

### Parallel (for independent tasks)
```
Orchestrator → Builder (task A) + Builder (task B) simultaneously
```
Only when tasks operate on different files/modules with no dependencies.
