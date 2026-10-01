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

ORMs/query builders, microservices, Kubernetes, queues, caches, external search, object storage, and MCP are deferred until a concrete need exists. The [personal web authentication backend](auth-design.md) is implemented; frontend integration and deployment verification remain pending.

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
  → Agent API-key or browser-session authentication (exact login/logout exemptions)
  → route → validation → handler → service → repository → PostgreSQL
  → API response / global error handler
```

For the Telegram runtime, the upstream flow is:

```text
Telegram topic → Hermes gateway → Hermes skill → authenticated REST request
```

No Telegram adapter, webhook, or scheduler runs inside this API.

For current local report development, browser requests use relative `/api` URLs. The Vite development server forwards them to the API and adds `Authorization: Bearer <INTERNAL_API_KEY>` from its server-side environment. The internal API key must never be exposed through a `VITE_*` variable, browser storage, source code, or frontend API client.

[Personal Web Authentication Design](auth-design.md) defines the implemented API boundary: one static browser password hash in ENV, opaque HttpOnly cookie sessions held in one API process, and centralized session middleware alongside existing Agent bearer authentication. No user table, RBAC, or auth migration is required. Cookie-authenticated browser writes require an exact allowed Origin. Session state is lost on restart/redeploy. API startup validates required web-auth settings; database-only migrations do not require them.

Before publishing the personal frontend, add its login/session/logout UI and remove Vite bearer injection together so browser login cannot be bypassed. The implementation targets same-origin HTTPS hosting and one API instance; the current frontend remains unsuitable for public access until that integration and proxy verification are complete.

Liveness does not depend on PostgreSQL; readiness may use a lightweight database check.

`GET /health/ready` runs `SELECT 1` through the database health repository. It returns `503` when PostgreSQL is unavailable or the configured readiness deadline is reached, without exposing connection details.

## HTTP boundary

- Mount application routes below `/api/v1` and use plural, lowercase resource paths.
- Use `GET` for reads, `POST` for creates or explicit commands, `PATCH` for partial updates, and `DELETE` for removals.
- Validate every body, query, path parameter, and relevant header with Zod.
- Request bodies, query parameters, path parameters, and response JSON use `snake_case`, including nested objects, collection metadata, and error fields.
- Use ISO 8601 dates/timestamps and UUID strings for public identifiers unless a feature design explicitly defines a user-facing code or another identifier.
- Authenticate application routes with `Authorization: Bearer <INTERNAL_API_KEY>` for the Agent or a valid browser session cookie. A supplied invalid bearer credential cannot fall back to a cookie. `GET /health` and `GET /health/ready` are public.
- `POST /api/v1/auth/login` and `POST /api/v1/auth/logout` are exact authentication exemptions with mandatory browser Origin checks. `GET /api/v1/auth/session` requires a browser session; an Agent key alone does not satisfy it. Full contracts are in [auth-design.md](auth-design.md).
- Set `Cache-Control: private, no-store` on every `/api/*` response, including errors.

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

Use `200` for successful reads/updates, `201` for creation, `204` for no response body, `400` for invalid input, `401`/`403` for authentication/authorization failures, `404` for not found, `409` for conflicts, `413` for oversized requests, `415` for unsupported media types, `429` for rate limits, and `500`/`503` for unexpected or unavailable dependencies. Public errors must not expose SQL, stack traces, secrets, or dependency internals.

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
- Authenticate application routes with centralized bearer/session middleware. Only explicit health endpoints and the exact login/logout method/path pairs are exempt from prior authentication.
- The personal browser boundary is defined in [auth-design.md](auth-design.md). Cookie writes, login, and logout require an exact configured Origin; session inspection requires a cookie. Password verification has attempt/concurrency limits. The existing Agent credential and domain layer boundaries remain unchanged.
- Keep public errors safe and stable; internal detail belongs in logs only. The public envelope and status mapping are defined in the HTTP boundary above.
- Validation, parameterized SQL, and logging rules are defined in [coding-conventions.md](coding-conventions.md).
