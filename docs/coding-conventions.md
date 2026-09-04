# Hermes Coding Conventions

## General

- Use strict TypeScript. Avoid `any`; use `unknown` and narrow external data safely.
- Use `camelCase` in TypeScript and JSON, `PascalCase` for types/errors, and `snake_case` in PostgreSQL.
- Prefer small, single-purpose functions, guard clauses, explicit types at boundaries, and comments that explain non-obvious reasoning.
- Do not add a dependency, broad abstraction, or unrelated refactor without a concrete need.

## Formatting and imports

- Use Biome. TypeScript and JavaScript use two-space indentation, single quotes, semicolons, trailing commas, and a 120-character line width.
- Let Biome organize imports. Keep imports in one contiguous block without manually inserted blank lines between groups.
- Runtime import sources are ordered as Bun/Node built-ins, external packages, internal aliases, parent-relative paths, then sibling-relative paths. Type-only imports use `import type` and appear after every runtime import.
- Use `bun run fix -- <path>` to apply safe formatting, lint, and import fixes to the repository or a specific file/directory. Use `bun run check -- <path>` to validate those rules without writing changes.
- Use `bun run verify` before handoff for the full Biome check, TypeScript check, and test suite.

## Application layers

- Routes wire method, path, middleware, validator, and handler only.
- Validators use Zod for external request input.
- Handlers map HTTP input/output and select status codes; they contain no SQL or core business rules.
- Services own business rules, workflows, and transaction boundaries. They do not receive Hono context or return Hono responses.
- Repositories are the only layer that accesses `bun:sql`; they contain raw SQL and row mapping.
- Modules interact through services/use cases, not another module's repository.

## Database and migrations

- Parameterize every dynamic SQL value. Never concatenate user, agent, or request input into SQL.
- Use readable multi-line SQL with uppercase keywords, explicit columns, and distinct `*Row` result types. Do not use `SELECT *`.
- Let PostgreSQL handle filtering, joins, aggregation, sorting, locking, and reporting when appropriate.
- A service opens a transaction only when multiple dependent operations must succeed or fail together; keep it short.
- Name migrations `<sequence>_<description>.ts`, export `up(trx)` and `down(trx)`, and use raw SQL.
- Never edit an applied migration. Create a new migration and review destructive changes carefully.
- The migration runner records applied filenames in `_migrations`. Each migration and its tracking-row update run in one transaction; migration commands refuse to proceed if an applied file is missing from disk and serialize migrations/rollbacks with a PostgreSQL advisory lock.

## Errors, logs, and tests

- Use typed application errors for expected failures; the global error handler maps them to API responses.
- Use LogTape for structured logs with safe context and request ID. Never log credentials, connection strings, sensitive bodies, SQL parameters, or client-visible stack traces.
- Unit-test service behavior. Integration-test routes, repositories, migrations, and transactions where PostgreSQL/Hono behavior matters.
- Tests must be deterministic and use an isolated test database.
- Database integration tests read `TEST_DATABASE_URL` and reset only databases whose name ends in `_test`. Never point it at a development or production database.

## Before handoff

- Confirm layer boundaries, validation, parameterized SQL, and API contract compliance.
- Run the available formatter, linter, type checker, and relevant tests.
- Update the applicable feature or technical document when behavior, schema, or contract changes.
