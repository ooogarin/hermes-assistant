# Hermes Backend Architecture

## Workspace and architectural style

Hermes is a Bun workspace. `apps/api` is a modular monolith with one Bun application, one PostgreSQL database, and modules organized by business capability. Module boundaries are code boundaries, not network calls. `apps/web` is a separate React application for read-oriented reports.

## Technology baseline

| Area | Decision |
| --- | --- |
| Runtime and language | Bun and TypeScript |
| HTTP API | Hono with REST under `/api/v1` |
| Validation | Zod at external boundaries |
| Database | PostgreSQL through native `bun:sql` |
| Queries and migrations | Parameterized raw SQL; TypeScript `up`/`down` migrations |
| Logging and code quality | LogTape and Biome |
| Web frontend | React, Vite, and Tailwind CSS |

ORMs/query builders, microservices, Kubernetes, queues, caches, external search, object storage, production frontend authentication, and MCP are deferred until a concrete need exists.

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

Implementation-level rules are defined in [coding-conventions.md](coding-conventions.md). This document also defines the public HTTP boundary so the architecture and transport rules remain in one place.

## Layout

```text
apps/
├── api/
│   ├── src/                 # app, core, modules, shared
│   ├── migrations/          # ordered raw-SQL migrations
│   ├── scripts/             # operational scripts
│   └── tests/
└── web/
    └── src/
        ├── components/      # small reusable Tailwind components
        ├── features/        # feature-specific views and hooks
        └── lib/             # API client and formatting helpers
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

For local report development, browser requests use relative `/api` URLs. The Vite development server forwards them to the API and adds `Authorization: Bearer <INTERNAL_API_KEY>` from its server-side environment. The internal API key must never be exposed through a `VITE_*` variable, browser storage, source code, or frontend API client. A production-facing frontend requires its own authentication or BFF design before deployment.

Liveness does not depend on PostgreSQL; readiness may use a lightweight database check.

`GET /health/ready` runs `SELECT 1` through the database health repository. It returns `503` when PostgreSQL is unavailable or the configured readiness deadline is reached, without exposing connection details.

## HTTP boundary

- Mount application routes below `/api/v1` and use plural, lowercase resource paths.
- Use `GET` for reads, `POST` for creates or explicit commands, `PATCH` for partial updates, and `DELETE` for removals.
- Validate every body, query, path parameter, and relevant header with Zod.
- Request bodies, query parameters, and path parameters use `camelCase`. Response JSON uses recursive `snake_case`, including nested objects, collection metadata, and error fields.
- Use ISO 8601 dates/timestamps and UUID strings for public identifiers unless a feature design explicitly defines a user-facing code or another identifier.
- Authenticate application routes with `Authorization: Bearer <INTERNAL_API_KEY>`. `GET /health` and `GET /health/ready` are public.

Successful responses use:

```json
{
  "success": true,
  "data": {
    "code": "NT-20260906-001"
  }
}
```

Collections may include a `meta` object. Errors use a stable safe envelope:

```json
{
  "success": false,
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "Resource not found",
    "details": null
  },
  "request_id": "req_123"
}
```

Use `200` for successful reads/updates, `201` for creation, `204` for no response body, `400` for invalid input, `401`/`403` for authentication/authorization failures, `404` for not found, `409` for conflicts, and `500`/`503` for unexpected or unavailable dependencies. Public errors must not expose SQL, stack traces, secrets, or dependency internals.

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

Small modules may combine files when responsibilities remain clear. HTTP DTOs, domain types, and database rows may have different shapes, but every data field crossing or used by the API/service boundary uses `snake_case`. The shared HTTP response boundary recursively preserves that convention and guards against accidental non-snake response keys. The application should not leak database rows directly.

Routes apply the shared `appValidator` wrapper around `@hono/zod-validator` before a handler runs. Handlers export named operations directly, read parsed input through `getBody`, `getParam`, or `getQuery` (which delegate to Hono's `request.valid(...)`), compose explicit `*Request` contracts from it and any request scope, then format the HTTP response with the core HTTP response helpers. Services export named operations directly and never receive a Hono context. Services own domain and response composition; repository methods return database rows or primitive write results only and do not build domain objects, API responses, public codes, or question numbering. A repository method has one result responsibility, so list and count queries are separate methods and are combined by the service when needed.

For a workflow that needs a transaction, the service obtains a reserved connection through the shared database helper, passes that one connection to every participating repository write, then commits it. On failure before commit, the service rolls it back. If commit itself fails, the helper attempts a rollback without replacing the original commit error. The helper always releases the connection after commit or rollback.

## Security boundary

- Treat every request, including one from the Hermes Agent, as untrusted input.
- Authenticate application routes with centralized API-key middleware; only explicit health endpoints are exempt.
- Keep public errors safe and stable; internal detail belongs in logs only. The public envelope and status mapping are defined in the HTTP boundary above.
- Validation, parameterized SQL, and logging rules are defined in [coding-conventions.md](coding-conventions.md).
