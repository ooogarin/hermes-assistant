# Hermes Backend — Tech Stack

## Final decisions

Hermes is a Bun workspace with a modular-monolith API and a separate report frontend:

```text
React → Vite → Tailwind CSS
                 ↓ (local development proxy)
TypeScript → Bun → Hono → bun:sql → PostgreSQL
```

| Area | Decision |
| --- | --- |
| Runtime | Bun |
| Language | TypeScript |
| HTTP | Hono with REST API |
| Validation | Zod |
| Database | PostgreSQL via native `bun:sql` |
| Queries | Parameterized raw SQL only |
| ORM / query builder | Not used |
| Migrations | TypeScript `up` / `down` files running raw SQL |
| Logging | LogTape with structured logs |
| Code quality | Biome for formatting, linting, and import organization |
| API version | `/api/v1` at the HTTP layer |
| Authentication | Internal API key/token initially |
| Deployment | One application and minimal infrastructure |
| Web frontend | React, Vite, and Tailwind CSS; no React framework |

## Why this stack

Hermes needs relational data, transactions, aggregations, reporting, full-text search, and explicit business rules. PostgreSQL and raw SQL keep these operations visible and reviewable. Bun and Hono keep the TypeScript application and deployment small.

The backend is the source of truth. The Hermes Agent understands intent, calls the API, and presents results; it must not become the source of truth for durable data, calculations, or aggregation.

## Rules implied by the stack

- Use one centralized `bun:sql` client/pool.
- Keep all database access in repositories.
- Bind every dynamic SQL value as a parameter; never concatenate user or agent input into SQL.
- Use raw SQL for migrations as well as application queries.
- Use Zod at every external input boundary.
- Validate configuration before startup: accept PostgreSQL URLs only, require a non-placeholder internal API key of at least 32 characters, and bound readiness checks with a configured deadline.
- Keep API versioning in routes/handlers; do not duplicate services or repositories solely for a URL version.
- For a multi-write workflow, services use the shared explicit transaction helpers and pass one reserved connection to every participating repository write.

## Deliberately deferred

MCP server, ORM tooling, microservices, Kubernetes, Redis, background queues, Kafka/RabbitMQ, Elasticsearch, object storage, production frontend authentication, and complex multi-user authorization are deferred until a concrete need exists.
