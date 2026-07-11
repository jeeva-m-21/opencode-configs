---
name: performance-profile
description: Systematic performance analysis workflow — load with eng-performance for optimization standards
license: MIT
compatibility: opencode
metadata:
  audience: developers
  workflow: performance
  requires: eng-performance
---

## Overview

This skill provides a structured workflow for performance profiling. For detailed optimization standards (measurement, caching strategy, anti-patterns), load `eng-performance`.

## Profiling Workflow

### 1. Establish Baseline
- Measure current performance metrics
- Record: LCP, FID, CLS (frontend), p50/p95 latency (backend), bundle size
- Document the baseline in findings

### 2. Identify Bottleneck
- Frontend: Lighthouse, React DevTools profiler, bundle analyzer
- Backend: flame graphs, slow query log, APM traces
- Find the SLOWEST thing. Rank by user impact, not technical interest

### 3. Form Hypothesis
- "X is slow because Y. If we change Z, it will improve by N%"
- Validate the hypothesis before implementing

### 4. Implement Fix
- One optimization at a time
- Measure after each change to confirm improvement
- If no improvement, revert and try the next bottleneck

### 5. Verify
- Did the metric improve?
- Did any other metric degrade?
- Did test coverage catch any regressions?

## Common First Checks

| Area | Quick Check |
|---|---|
| Database | Slow query log → missing indexes? N+1 queries? |
| API | Response time by endpoint → caching? Heavy computation? |
| Bundle | Bundle analyzer → large dependencies? Missing tree-shaking? |
| Images | Lighthouse → unoptimized? Wrong format? Not lazy-loaded? |
| Rendering | React profiler → unnecessary re-renders? Expensive effects? |

## Output

Produce a report with:
1. Current baseline
2. Identified bottleneck (ranked by impact)
3. Proposed fix with expected improvement
4. Verification results (before/after metrics)
5. Remaining bottlenecks for future optimization

Always load `eng-performance` for detailed optimization standards before implementing fixes.
