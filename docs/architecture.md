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

ORMs/query builders, microservices, Kubernetes, queues, caches, external search, object storage, and MCP are deferred until a concrete need exists. [Personal web authentication](auth-design.md) is implemented in the API and frontend; deployment verification remains pending.

## Key decisions

- PostgreSQL/backend is the source of truth; the agent does not calculate or persist authoritative results.
- The API is passive. Hermes Agent owns Telegram ingress/egress, topic context, and scheduled jobs, then calls the API through authenticated HTTP requests.
- Hermes runtime behavior lives in `hermes/skills`; `.agents/skills` is reserved for repository code-writing guidance.
- Modules communicate through explicit services/use cases, never another module's repository.
- The Notes module is the reference implementation for a personal-content module. `apps/api/tests/module-contract.test.ts` enforces the module rules that hold everywhere: repository transaction signatures, database access, SQL placement, and strict request schemas.
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
  → Agent API-key or browser-JWT authentication (exact login/logout exemptions)
  → route → validation → handler → service → repository → PostgreSQL
  → API response / global error handler
```

For the Telegram runtime, the upstream flow is:

```text
Telegram topic → Hermes gateway → Hermes skill → authenticated REST request
```

No Telegram adapter, webhook, or scheduler runs inside this API.

Browser requests use relative `/api` URLs with the HttpOnly JWT cookie. The Vite development server forwards them to the API without adding an Agent bearer credential. The internal API key must never be exposed through a `VITE_*` variable, browser storage, source code, or frontend API client.

[Personal Web Authentication Design](auth-design.md) defines the implemented API boundary: one static browser password hash and JWT signing secret in ENV, a signed 24-hour JWT in an HttpOnly cookie, and centralized JWT middleware alongside existing Agent bearer authentication. No user table, RBAC, or auth migration is required. Cookie-authenticated browser writes require an exact allowed Origin. JWTs remain valid across restarts when the signing secret stays the same. API startup validates required web-auth settings; database-only migrations do not require them.

The frontend now gates private routes on JWT status, offers login/logout, and removes Vite bearer injection. Public deployment still requires production same-origin HTTPS proxy verification, including cookie and Origin forwarding.

Liveness does not depend on PostgreSQL; readiness may use a lightweight database check.

`GET /health/ready` runs `SELECT 1` through the database health repository. It returns `503` when PostgreSQL is unavailable or the configured readiness deadline is reached, without exposing connection details.

## HTTP boundary

- Mount application routes below `/api/v1` and use plural, lowercase resource paths.
- Use `GET` for reads, `POST` for creates or explicit commands, `PATCH` for partial updates, and `DELETE` for removals.
- Validate every body, query, path parameter, and relevant header with Zod.
- Request bodies, query parameters, path parameters, and response JSON use `snake_case`, including nested objects, collection metadata, and error fields.
- Use ISO 8601 dates/timestamps and UUID strings for public identifiers unless a feature design explicitly defines a user-facing code or another identifier.
- Authenticate application routes with `Authorization: Bearer <INTERNAL_API_KEY>` for the Agent or a valid browser JWT cookie. A supplied invalid bearer credential cannot fall back to a cookie. `GET /health` and `GET /health/ready` are public.
- `POST /api/v1/auth/login` and `POST /api/v1/auth/logout` are exact authentication exemptions with mandatory browser Origin checks. `GET /api/v1/auth/status` requires a browser JWT; an Agent key alone does not satisfy it. Full contracts are in [auth-design.md](auth-design.md).
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
├── <module>.types.ts
└── <module>-<submodule>/
    ├── <module>-<submodule>.route.ts
    ├── <module>-<submodule>.handler.ts
    ├── <module>-<submodule>.validator.ts
    ├── <module>-<submodule>.service.ts
    ├── <module>-<submodule>.repository.ts
    └── <module>-<submodule>.types.ts
```

Keep independently maintained subfeatures in nested folders with their own layers and types. Settings live in `reading/reading-setting/`, `writing/writing-setting/`, and `grammar/grammar-setting/`; Finance categories live in `finance/finance-category/`. Parent routes mount the child routes at the existing `/settings` or `/categories` path. Parent services use child services for defaults or category resolution, never child repositories. A subfeature that has its own HTTP surface owns the full layer set. A data-only subfeature, such as `grammar/grammar-question/`, keeps only its repository and types because its table is written and read exclusively through the parent workflow (for example, a grammar session); the parent service calls its repository directly and maps rows to domain types itself. Questions, answers, and submissions that participate in the parent's workflows stay with that workflow; a separate table alone does not require a separate module. Writing separates materials, settings, and submissions into `writing/writing-material/`, `writing/writing-setting/`, and `writing/writing-submission/`; its parent route only mounts these submodules. Submission creation resolves materials through the material service.

HTTP DTOs, domain types, and database rows may have different shapes, but every data field crossing or used by the API/service boundary uses `snake_case`. The shared HTTP response boundary recursively preserves that convention and guards against accidental non-snake response keys. The application should not leak database rows directly.

Routes apply the shared `appValidator` wrapper around `@hono/zod-validator` before a handler runs. Handlers export named operations directly, read parsed input through `getBody`, `getParam`, or `getQuery` (which delegate to Hono's `request.valid(...)`), compose explicit `*Request` contracts from it and any request scope, then format the HTTP response with the core HTTP response helpers. Services export named operations directly and never receive a Hono context. Services own domain and response composition; repository methods return database rows or primitive write results only and do not build domain objects, API responses, public codes, or question numbering. A repository method has one result responsibility, so list and count queries are separate methods and are combined by the service when needed.

For a workflow that needs a transaction, the service obtains a reserved connection through the shared database helper, passes that one connection to every participating repository write, then commits it. On failure before commit, the service rolls it back. If commit itself fails, the helper attempts a rollback without replacing the original commit error. The helper always releases the connection after commit or rollback.

`getDatabaseClient()` retrieves the already configured shared pool rather than creating a new client. PostgreSQL commits each standalone statement independently. `trx: DatabaseReservedConnection` is the single reserved connection returned by `startTransaction()` after `BEGIN`. Pass it to every query that belongs to the transaction, including reads that must see preceding uncommitted writes and locking reads. Using the pool in the middle of that workflow would execute outside its transaction.

Every repository chooses the connection signature from actual callers. Methods used only outside a transaction have no connection parameter and retrieve the pool internally. Methods used only inside a transaction require `trx: DatabaseReservedConnection` as their last parameter and execute through it directly. Only methods used both ways accept an optional final `trx` and use `const database = trx ?? getDatabaseClient()`. A method that later needs a transaction declares `trx` as a required final parameter and runs the statement through it, instead of keeping the optional form as a placeholder. Reading shares `getOneByCode` and `getAllQuestionsByMaterialId`; Grammar shares `getOneByCode` and `getAllReportRowsByCode`, while `getAllBySessionId` is transaction-aware and `getAllExplanationsBySessionId` uses the pool. Settings repositories use the pool directly. For example, `getOneByCode(code)` uses the pool and `getOneByCode(code, trx)` participates in the service's transaction. Keep one SQL implementation per operation, without executor helpers or `InTransaction` wrappers. Services supply the same `trx` for dependent operations and locking calls through commit or rollback. These signatures are checked by `apps/api/tests/module-contract.test.ts`.

## Security boundary

- Treat every request, including one from the Hermes Agent, as untrusted input.
- Authenticate application routes with centralized bearer/JWT middleware. Only explicit health endpoints and the exact login/logout method/path pairs are exempt from prior authentication.
- The personal browser boundary is defined in [auth-design.md](auth-design.md). Cookie writes, login, and logout require an exact configured Origin; auth status requires a valid JWT cookie. Password verification has attempt/concurrency limits. The existing Agent credential and domain layer boundaries remain unchanged.
- Keep public errors safe and stable; internal detail belongs in logs only. The public envelope and status mapping are defined in the HTTP boundary above.
- Validation, parameterized SQL, and logging rules are defined in [coding-conventions.md](coding-conventions.md).
