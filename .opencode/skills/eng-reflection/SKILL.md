---
name: eng-reflection
description: Engineering Reflection & Knowledge Evolution System — deterministic learning from execution experience, structured observations, pattern detection, improvement candidates, and gated knowledge evolution
license: MIT
compatibility: opencode
metadata:
  domain: ai-engineering
  audience: orchestrator
  priority: foundational
  extends: eng-context-compiler
---

## Reflection Engine

The Reflection Engine closes the final feedback loop in the framework. It observes every completed engineering task, produces structured observations (reflections), accumulates evidence over time, and proposes evidence-backed improvements to the knowledge graph, compiler, and policies.

### Core Principle

Knowledge describes what SHOULD happen.
Reflections describe what ACTUALLY happened.
Together, they enable continuous evolution through evidence.

### What It's NOT

- NOT chat memory
- NOT conversation history
- NOT an RL system
- NOT model fine-tuning
- NOT auto-modification of knowledge

### What It IS

A deterministic observation system that:
1. Collects execution metadata after every task
2. Compares expectations vs. reality
3. Produces structured reflections (YAML, machine-queryable)
4. Accumulates evidence (hundreds to thousands of reflections)
5. Detects recurring patterns (via periodic synthesis)
6. Generates improvement candidates (hypotheses with evidence)
7. Routes candidates through governance gates to promotion

### Reflection Types

| Type | When |
|---|---|
| `success` | Task passes all checks first attempt |
| `failure` | Task fails review, tests, or build |
| `gap` | Missing knowledge atom discovered |
| `insight` | Unexpected pattern observed |
| `inefficiency` | Token waste, unnecessary tool calls |
| `pattern_confirmed` | Pattern applied N times without issues |
| `pattern_refuted` | Pattern consistently fails in practice |
| `knowledge_insufficient` | Model needed knowledge not in compiled context |
| `compiler_wasteful` | Compiler loaded unused atoms |

### Evolution Pipeline

```
Reflection → Cluster → Candidate → Validate → Experiment → Approve → Promote → Monitor
```

Nothing changes automatically. Every promotion goes through gates with human review for impactful changes.

### Safety Boundaries

**Immutable (can never be auto-modified):**
- Engineering Constitution
- Platform Specification
- Core rules (the 8 RUL-* non-negotiables)
- Security policies
- The Reflection Engine itself

**Mutable (with gates):**
- Pattern atoms, decision atoms, examples
- Compiler parameters (budgets, thresholds)
- Agent tool assignments
- Atom priority and audience

Full architecture: `docs/reflection-engine-architecture.md`
Reflection schema: `.opencode/knowledge/schemas/reflection.schema.json`
