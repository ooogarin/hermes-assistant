# Hermes Coding Conventions

## General

- Use strict TypeScript. Avoid `any`; use `unknown` and narrow external data safely.
- Use `snake_case` for API request and response fields, service/domain data contracts, and PostgreSQL columns. Use `PascalCase` for types/errors and idiomatic `camelCase` only for non-data TypeScript identifiers such as functions, local variables, and class members. The shared HTTP response boundary preserves this contract and remains a defensive serializer for future callers.
- Prefer small, single-purpose functions, guard clauses, explicit types at boundaries, and comments that explain non-obvious reasoning.
- Do not add a dependency, broad abstraction, or unrelated refactor without a concrete need.
- Bind handler request types to their Zod schemas; do not let handlers assert arbitrary validated-input types.

## Code readability

- Always write simple code that can be read from top to bottom. Prefer direct steps and clear variable names; add helpers or abstractions only when they make the actual workflow easier to follow.
- Separate logical steps with one blank line, such as fetching data, validating it, preparing payloads, writing changes, composing results, and committing. Keep closely related declarations together.
- Always use multiline braced blocks for `if`, `else`, and loops, including a single `throw`, `return`, or awaited call. Put a blank line around each control-flow block so its boundary is visible.
- Use a named intermediate result when an awaited operation is nested inside a condition or another function call. Fetch the result, validate or compose it, then continue.
- Extract long or compound conditions into clearly named boolean variables, such as `hasDuplicateQuestionNumbers` and `hasUnknownQuestionNumbers`, so the `if` statement reads the validation intent. Use simple membership checks when they make nested collection predicates easier to understand.
- In transaction workflows, keep `startTransaction`, validation, writes, result reads, `commitTransaction`, return, and rollback visibly separated. Preserve the existing error handling and connection lifecycle while improving readability.
- Biome handles syntax formatting; manually maintain the blank lines that explain the workflow. Use the Reading `createMaterial` service's layout as the reference for a readable transaction flow.

## Formatting and imports

- Use Biome. TypeScript and JavaScript use two-space indentation, single quotes, semicolons, trailing commas, and a 120-character line width.
- Let Biome organize imports. Keep imports in one contiguous block without manually inserted blank lines between groups.
- Runtime import sources are ordered as Bun/Node built-ins, external packages, internal aliases, parent-relative paths, then sibling-relative paths. Type-only imports use `import type` and appear after every runtime import.
- Use `bun run fix -- <path>` to apply safe formatting, lint, and import fixes to the repository or a specific file/directory. Use `bun run check -- <path>` to validate those rules without writing changes. API paths begin at `apps/api/`; frontend paths begin at `apps/web/`.
- Use `bun run verify` before handoff for the full Biome check, TypeScript check, and test suite.

## Application layers

- Routes wire method, path, middleware, validator, and handler only.
- Validators use Zod through the shared `appValidator(...)` wrapper around `@hono/zod-validator`. A route applies it before its handler; handlers read only validated input through `getBody(...)`, `getParam(...)`, or `getQuery(...)`, which delegate to Hono's `request.valid(...)`.
- Every request body, query, and nested object schema ends with `.strict()` so unknown fields are rejected with 400, even when the schema currently has no other refinement. Path parameter schemas that only describe route segments may omit it.
- Handlers export named operations directly, compose explicit `*Request` contracts from validated input and request scope, map HTTP input/output, and select status codes. They contain no SQL or core business rules.
- Services export named operations directly, own business rules, workflows, and transaction boundaries, and do not receive Hono context or return Hono responses.
- Repositories are the only layer that accesses `bun:sql`; they contain parameterized raw SQL and return raw database rows or primitive write results. Domain mapping, response composition, public-code formatting, and question numbering belong in services.
- A module's `*.types.ts` owns its reusable request contracts, domain maps, repository payloads/rows, and service interfaces used by tests or consumers. Group these with clearly labeled sections (for example: request contracts, service operations, repository payloads, repository responses). Keep service and repository files focused on executable behavior, not local type declarations.
- Modules interact through services/use cases, not another module's repository.
- Put independently maintained subfeatures in `<module>/<module>-<submodule>/`. Subfeatures with their own HTTP surface (for example settings) get route, validator, handler, service, repository, and types files; parent routes compose child routes and parent services call child services. Data-only subfeatures (for example `grammar/grammar-question/`), whose table belongs to the parent workflow and has no endpoint of its own, keep only repository and types files; the parent service calls their repository directly. Apply the same structure across modules; settings code must not be mixed into the parent files.

## Repository naming

- Use operation + cardinality + lookup criteria: `getAll`, `getOneById`, `getOneByCode`, `getAllByTags`, `updateOneById`, or `updateAllByStatus`. `getAll` means the collection query with its filters and limit, not necessarily every row in the table.
- Use `insert` for a single-row write and `bulkInsert` for a multi-row write, for example `bulkInsert` in `grammar-question.repository.ts`. Use `upsertOne...` / `upsertAll...` and `softDeleteOne...` / `softDeleteAll...` for other writes. Include the entity when a repository also handles dependent rows, for example `getAllQuestionsByMaterialId`; inside a folder dedicated to one table, the folder already names the entity, so the method name can omit it.
- Name the actual lookup keys: Finance uses `getOneByDateAndDailyNumber`, not an ambiguous `findByReference`. Singleton settings use `getOne` and `updateOne` because callers do not supply an identifier.
- Use `countAll` for collection counts. Aggregates describe the result and criteria, for example `getOneSummaryByDateRange` and `getAllDailySummariesByDateRange`.
- Use `ForUpdate` to identify locking operations. Sequence lookups return the current maximum, so use `getLastSequenceByDateForUpdate`; the service calculates the next number while holding the transaction lock. Keep one method per operation and select its connection signature from actual usage rather than adding separate `InTransaction` variants.

## Database and migrations

- Parameterize every dynamic SQL value. Never concatenate user, agent, or request input into SQL.
- Use readable multi-line SQL with uppercase keywords, explicit columns, and distinct `*Row` result types. Do not use `SELECT *` or qualified wildcards such as `transactions.*`.
- Put each selected expression, inserted column/value, returned column, `SET` assignment, and `GROUP BY` / `ORDER BY` expression on its own line after the clause keyword. Apply this to nested queries and conflict updates too; function arguments may remain together within one expression. Do not reformat applied migrations.
- Payload-driven `INSERT` and `UPDATE` statements may list their columns through the connection helper: `INSERT INTO notes ${database(payload, ...allowedColumns)}` and `SET ${database(payload, ...allowedColumns)}`. Declare `allowedColumns` in the function as `as const`, keep every value parameterized, never build the column list from request input, and still assign `updated_at` and list `RETURNING` columns explicitly. This is the one exception to the explicit-column and one-`SET`-assignment-per-line rules above.
- The payload helper skips `undefined` keys, so an insert falls back to column defaults and an update keeps the existing value, and it writes `null` as `NULL`, so a nullable column can be cleared. Wrap array columns with `database.array(values, 'TYPE')`, because the helper does not serialize JavaScript arrays. Reject an empty payload in the request schema, because a `SET` with no listed column fails at runtime. The helper does not check the column list against the payload type, so a payload field that is missing from `allowedColumns` is dropped silently.
- Let PostgreSQL handle filtering, joins, aggregation, sorting, locking, and reporting when appropriate.
- Use one bulk-write style per module: pass an array of payload objects whose keys match the target columns and read it with `jsonb_to_recordset(${payloads}) AS payload(...)`. Do not split one batch into parallel arrays with `UNNEST`. Build the payload objects in the service so repositories receive clean data.
- Keep one result responsibility per repository method. For paginated data, expose separate list-row and count-row methods; the service calls both and builds collection metadata.
- A service opens a transaction only when multiple dependent operations must succeed or fail together; keep it short. Use `startTransaction`, `commitTransaction`, and `rollbackTransaction` explicitly. Pass the same reserved connection to each participating repository write, clear the local transaction reference before commit, and do not let a rollback failure hide the original error.
- Name variables and parameters that hold a PostgreSQL transaction executor `trx`. Keep `transaction` for Finance domain values where it means a financial transaction.
- In every module, derive repository connection parameters from actual callers: pool-only methods have no `trx` parameter and use `getDatabaseClient()` internally; transaction-only methods require a final `trx: DatabaseReservedConnection` and execute directly through it. Only methods actually called both with and without a transaction accept a final `trx?: DatabaseReservedConnection` and select the executor with `const database = trx ?? getDatabaseClient()`. Multiple callers alone do not justify an optional parameter when all use the same connection mode. Keep the SQL directly in that method; do not add pool/transaction wrappers or a private `WithExecutor` helper for the same query. The service supplies the same `trx` to all dependent reads and writes, including locking operations.
- Name migrations `<four-digit-sequence>_<description>.ts`, export `up(trx)` and `down(trx)`, and use raw SQL.
- Never edit an applied migration. Create a new migration and review destructive changes carefully.
- The migration runner records applied filenames in `_migrations`. Each migration and its tracking-row update run in one transaction; migration commands refuse to proceed if an applied file is missing from disk and serialize migrations/rollbacks with a PostgreSQL advisory lock.

## Errors, logs, and tests

- Use typed application errors for expected failures; the global error handler maps them to the public HTTP contract in [architecture.md](architecture.md).
- Never forward framework exception messages or response bodies directly to clients.
- Accept only `postgres:` or `postgresql:` database URLs. Internal API keys must be trimmed, contain at least 32 characters, and must not use the documented placeholder in production.
- API startup also validates the required web password hash, exact allowed Origin, and JWT signing secret described in [auth-design.md](auth-design.md). Keep browser credentials independent of the Agent key; do not bypass auth in development. Database-only migration settings remain independent of browser auth.
- Use LogTape for structured logs with safe context and request ID. Never log credentials, connection strings, sensitive bodies, SQL parameters, or client-visible stack traces.
- Unit-test service behavior. Integration-test routes, repositories, migrations, and transactions where PostgreSQL/Hono behavior matters.
- Tests must be deterministic and use an isolated test database.
- Database integration tests read `TEST_DATABASE_URL` and reset only databases whose name ends in `_test`. Never point it at a development or production database.

## Before handoff

- Confirm layer boundaries, validation, parameterized SQL, and API contract compliance.
- Run the available formatter, linter, type checker, and relevant tests.
- Update the applicable feature or technical document when behavior, schema, or contract changes.
