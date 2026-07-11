---
name: eng-deployment
description: Deployment pipeline standards — Docker, GitHub Actions CI/CD, environment strategy, and infrastructure conventions for this platform
license: MIT
compatibility: opencode
metadata:
  domain: deployment
  audience: builder
  priority: medium
  extends: eng-platform
---

## Platform Deployment Architecture

### Environment Strategy

```
Development (local) → Staging (cloud) → Production (cloud)
```

- **Development**: Docker Compose. Hot reload. Synthetic data.
- **Staging**: Single instance in cloud. Anonymized prod-like data. Tests run here.
- **Production**: Scaled per load. Real data. Monitoring and alerting active.

### Docker Compose (Local Dev)

```yaml
# docker-compose.yml
services:
  api:
    build:
      context: .
      dockerfile: src/infrastructure/docker/Dockerfile.api
    ports: ['3000:3000']
    volumes: ['./src:/app/src']  # Hot reload
    environment:
      DATABASE_URL: postgres://user:pass@db:5432/app
      REDIS_URL: redis://redis:6379
      JWT_SECRET: dev-secret-change-in-production
    depends_on: [db, redis]

  web:
    build:
      context: .
      dockerfile: src/infrastructure/docker/Dockerfile.web
    ports: ['5173:5173']
    volumes: ['./src:/app/src']  # Hot reload (Vite)

  db:
    image: postgres:16-alpine
    ports: ['5432:5432']
    environment:
      POSTGRES_USER: user
      POSTGRES_PASSWORD: pass
      POSTGRES_DB: app
    volumes: ['pgdata:/var/lib/postgresql/data']

  redis:
    image: redis:7-alpine
    ports: ['6379:6379']

volumes:
  pgdata:
```

### GitHub Actions CI/CD

```yaml
# .github/workflows/ci.yml
name: CI/CD

on:
  push:
    branches: [main, staging]
  pull_request:
    branches: [main, staging]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1
      - run: bun install --frozen-lockfile
      - run: bun run lint
      - run: bun run typecheck
      - run: bun test --coverage

  deploy-staging:
    needs: validate
    if: github.ref == 'refs/heads/staging'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: bun run db:migrate
        env:
          DATABASE_URL: ${{ secrets.STAGING_DATABASE_URL }}
      # Deploy to staging provider (AWS, GCP, Railway, Fly.io, etc.)

  deploy-production:
    needs: validate
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: bun run db:migrate
        env:
          DATABASE_URL: ${{ secrets.PRODUCTION_DATABASE_URL }}
      # Deploy to production provider
      - run: bun run smoke-test
        env:
          API_URL: ${{ secrets.PRODUCTION_API_URL }}
```

### Dockerfile Standards

```dockerfile
# Multi-stage build for minimal image size
FROM oven/bun:1 AS builder
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production
COPY . .
RUN bun run build

FROM oven/bun:1-slim AS runner
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
EXPOSE 3000
CMD ["bun", "run", "dist/api/index.js"]
```

### Database Migration in CI/CD

- Migrations run BEFORE the new code deploys
- Migrations must be backward-compatible with the currently running version
- Breaking changes use expand-contract: add → deploy → migrate data → deploy → remove old
- Never run migrations manually in production

### Production Readiness Checklist

Before any production deployment:

- [ ] All CI checks pass (lint, typecheck, unit tests, integration tests)
- [ ] E2E tests pass on staging
- [ ] Database migrations tested on staging
- [ ] `GET /health` returns 200
- [ ] `GET /health/ready` returns 200 (DB and Redis connected)
- [ ] Structured logging enabled with correlation IDs
- [ ] Error alerting configured (>1% error rate → alert)
- [ ] Database backups configured (daily, retained 30 days)
- [ ] Security scan: no critical/high CVEs in dependencies
- [ ] Rollback documented and testable
- [ ] `.env` NOT committed; secrets in environment/secret manager

### Post-Deployment

- Monitor error rates, latency, and business metrics for 15 minutes
- Run smoke tests against production (critical flows only)
- Keep previous deployment warm for 1 hour (quick rollback)
- Error rate >2x baseline → initiate rollback immediately
