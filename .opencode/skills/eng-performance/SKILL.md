---
name: eng-performance
description: Performance optimization standards covering profiling, measurement, optimization patterns, and performance testing
license: MIT
compatibility: opencode
metadata:
  domain: performance
  audience: builder, reviewer
  priority: medium
---

## Performance Principles

1. **Measure before optimizing.** Never optimize based on intuition. Profile, identify the bottleneck, fix the slowest thing first.
2. **Set performance budgets.** Define acceptable thresholds before optimization. Example budgets: LCP < 2.5s, API p95 < 200ms, bundle < 200KB.
3. **Optimize the critical path.** Focus on what users experience most: initial load time, interaction responsiveness, API latency.
4. **Cache aggressively.** Computation is expensive; cache results at every reasonable layer.

## Measurement

### Frontend Metrics
- **LCP** (Largest Contentful Paint) < 2.5s
- **FID** (First Input Delay) < 100ms
- **CLS** (Cumulative Layout Shift) < 0.1
- **TTI** (Time to Interactive) < 5s
- **Bundle size** — no single chunk > 200KB uncompressed

### Backend Metrics
- **p50 latency** — median response time
- **p95 latency** — 95th percentile (the slow users)
- **p99 latency** — worst 1% (critical to monitor)
- **Error rate** < 0.1%
- **Throughput** — requests per second at p95

## Common Bottlenecks & Fixes

| Bottleneck | Detection | Fix |
|---|---|---|
| N+1 queries | Query logs, ORM eager loading config | Use JOINs, eager loading, batch queries |
| Missing indexes | Slow query log, EXPLAIN ANALYZE | Add covering indexes for WHERE + JOIN + ORDER BY |
| Large payloads | Network tab, response size | Paginate, compress, select only needed fields |
| Unoptimized images | Lighthouse, bundle analyzer | Correct size, modern format, lazy load |
| Excessive re-renders | React DevTools profiler | Memoize, virtualize, split components |
| Synchronous heavy work | Profiler, flame graphs | Move to background job, use worker threads |
| Missing caching | Repeated identical requests | Cache at query, HTTP, or CDN level |
| Chatty APIs | Network waterfall | Batch endpoints, GraphQL, BFF pattern |

## Caching Strategy

| Layer | What to Cache | TTL |
|---|---|---|
| CDN | Static assets, public API responses | Days to weeks (versioned URLs) |
| Application | Computed values, query results | Minutes to hours |
| Database | Query results, materialized views | Automatic (query cache) |
| Browser | Static assets, API responses | Service worker, Cache-Control headers |

**Cache invalidation**: versioned URLs for assets, TTL + event-based invalidation for data, cache-aside pattern for queries.

## Optimization Patterns

### Bundle Optimization
- Code split at route boundaries (lazy load pages)
- Tree shake unused exports
- Import only what's needed (no `import *` from large libraries)
- Use dynamic imports for heavy optional features
- Monitor bundle with bundle analyzer

### Database Optimization
- Covering indexes for frequent queries
- Connection pooling (reuse connections)
- Read replicas for read-heavy workloads
- Paginate everything — cursor-based for infinite scroll, offset for pages
- Batch writes in transactions

### Network Optimization
- Enable HTTP/2 or HTTP/3
- Compress responses (gzip/brotli)
- Use CDN for static assets
- Minimize API round trips (batch, GraphQL, aggregate endpoints)
- Set appropriate Cache-Control headers

## Anti-Patterns
- Premature optimization (optimizing without measuring)
- Micro-optimizations that hurt readability (unless measured and significant)
- Optimizing the wrong thing (fixing 1ms save when 2s load is the problem)
- Assuming local performance equals production performance
