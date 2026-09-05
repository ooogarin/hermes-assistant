# Hermes Backend Architecture

## Architectural style

Hermes is a modular monolith: one Bun application, one PostgreSQL database, and modules organized by business capability. Module boundaries are code boundaries, not network calls.

## Key decisions

- PostgreSQL/backend is the source of truth; the agent does not calculate or persist authoritative results.
- The API is passive. Hermes Agent owns Telegram ingress/egress, topic context, and scheduled jobs, then calls the API through authenticated HTTP requests.
- Hermes runtime behavior lives in `hermes/skills`; `.agents/skills` is reserved for repository code-writing guidance.
- Modules communicate through explicit services/use cases, never another module's repository.
- `app.ts` builds an importable Hono app; `index.ts` owns startup and shutdown.
- Use one database client/pool and let services define transaction boundaries with explicit `BEGIN`, `COMMIT`, and `ROLLBACK` helpers.
- Keep the client, migration runner, and readiness query in `core/database`; repositories remain the only domain-layer database callers.
- Use LogTape for structured application and request logging.
- Add infrastructure only for a demonstrated need. Do not introduce an ORM, MCP server, queue, cache, or service split speculatively.

## Layout

```text
src/
├── app.ts
├── index.ts
├── core/                    # config, database, errors, middleware
├── modules/                 # business modules, added when needed
└── shared/                  # small, dependency-neutral helpers
migrations/                  # ordered raw-SQL migrations
scripts/                     # operational scripts
tests/
docs/
```

## Request lifecycle

```text
HTTP request
  → request ID and logging middleware
  → API-key authentication
  → route → validation → handler → service → repository → PostgreSQL
  → API response / global error handler
```

For the Telegram runtime, the upstream flow is:

```text
Telegram topic → Hermes gateway → Hermes skill → authenticated REST request
```

No Telegram adapter, webhook, or scheduler runs inside this API.

Liveness does not depend on PostgreSQL; readiness may use a lightweight database check.

`GET /health/ready` runs `SELECT 1` through the database health repository. It returns `503` when PostgreSQL is unavailable or the configured readiness deadline is reached, without exposing connection details.

## Module boundary

```text
src/modules/<module>/
├── <module>.route.ts
├── <module>.handler.ts
├── <module>.validator.ts
├── <module>.service.ts
├── <module>.repository.ts
└── <module>.types.ts
```

Small modules may combine files when responsibilities remain clear. HTTP DTOs, domain types, and database rows may have different shapes. Use `camelCase` in TypeScript/JSON and `snake_case` in PostgreSQL.

Routes apply the shared `appValidator` wrapper around `@hono/zod-validator` before a handler runs. Handlers export named operations directly, read parsed input through `getBody`, `getParam`, or `getQuery` (which delegate to Hono's `request.valid(...)`), compose explicit `*Request` contracts from it and any request scope, then format the HTTP response with the core HTTP response helpers. Services export named operations directly and never receive a Hono context.

For a workflow that needs a transaction, the service obtains a reserved connection through the shared database helper, passes that one connection to every participating repository write, then commits it. On failure before commit, the service rolls it back. If commit itself fails, the helper attempts a rollback without replacing the original commit error. The helper always releases the connection after commit or rollback.

## Security notes

- Treat every request, including one from the Hermes Agent, as untrusted input.
- Validate external input with Zod and bind every dynamic SQL value as a parameter.
- Authenticate application routes with centralized API-key middleware; only explicit health endpoints are exempt.
- Log safe structured metadata with a request ID. Never log API keys, tokens, passwords, database URLs, sensitive bodies, SQL parameters, or client-visible stack traces.
- Keep public errors safe and stable; internal detail belongs in logs only.
