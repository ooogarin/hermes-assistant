---
name: hermes-backend-modules
description: Write or modify production code for Hermes backend domain modules built with Bun, Hono, Zod, native bun:sql, and PostgreSQL. Use when implementing features, fixes, migrations, or API behavior under src/modules; do not use for review-only, cleanup-only, test-only, documentation-only, Hermes Agent, Telegram, frontend, or deployment work.
---

# Hermes Backend Modules

Work from the repository root. Preserve unrelated changes and keep the change as small as the requested behavior allows.

## Scope

Use this skill only when the task requires writing or changing production backend code in `src/modules/`, directly related shared or core code, or matching database migrations.

Tests and documentation are completion work for a production-code change, not standalone reasons to activate this skill. Do not use it for code review, general cleanup, test-only work, documentation-only work, or work outside the backend module boundary.

## Read before editing

Read `AGENTS.md`, then the relevant repository documents:

1. `docs/tech-stack.md`
2. `docs/architecture.md`
3. `docs/coding-conventions.md`
4. `docs/api-conventions.md`
5. Only the matching file in `docs/feature-docs/`

Treat the feature document as the source of truth for domain behavior. Do not infer missing behavior from another feature. If the requested behavior is not decided there, identify it as an open decision instead of silently inventing it.

## Use Finance as the implementation baseline

Use `src/modules/finance/` to calibrate file responsibilities and code style, while preserving intentional differences documented for another domain.

Every full module normally contains:

```text
<module>.route.ts
<module>.validator.ts
<module>.handler.ts
<module>.service.ts
<module>.repository.ts
<module>.types.ts
```

Maintain the boundary:

```text
route -> validator -> handler -> service -> repository -> PostgreSQL
```

- Routes only wire methods, paths, validators, and handlers.
- Validators use Zod for every external body, query, and path value.
- Handlers read validated values with the shared request helpers, compose explicit request contracts, and format responses.
- Services own business rules, target resolution, workflows, and transaction boundaries. They never receive Hono context.
- Repositories are the only domain files allowed to access the database. Use parameterized raw SQL and explicit selected columns.
- Types files own reusable request, service, repository payload, and row contracts. Keep those groups visibly separated.

## Preserve repository invariants

- The backend and PostgreSQL are authoritative; do not move calculations or durable state into a caller.
- Use `snake_case` for every API/service data field: request JSON, query/path parameter names, service/domain types, response JSON, and PostgreSQL. Keep ordinary TypeScript function and local-variable names idiomatic `camelCase`. The shared response boundary defensively preserves `snake_case`.
- Return stable, safe `AppError` codes for expected failures.
- Keep soft-deleted rows out of ordinary reads and never reuse user-facing codes or Finance daily numbers.
- Use `getJakartaDateCodeParts` for Jakarta-scoped code dates and `toIsoTimestamp` for database timestamps.
- Use `countWords` for Reading and Writing word counts.
- Name PostgreSQL transaction executor variables and parameters `trx`; reserve `transaction` for Finance domain values.
- Generate daily codes inside a transaction with the module's PostgreSQL advisory-lock namespace.
- Serialize scoped `MAX + 1` allocation, such as Finance daily numbers or Writing submission numbers, before inserting.
- For PATCH SQL, distinguish an omitted field from an explicit nullable value.
- Open a service transaction only for dependent writes. Pass the same reserved connection to every participating repository operation, clear the local reference before commit, and preserve the original error if rollback fails.
- If commit fails, attempt rollback before releasing the connection and preserve the original commit error.
- Add an inline comment only when it explains a non-obvious invariant, such as why a concurrency lock is required.

## Migrations

- Name migrations `<four-digit-sequence>_<description>.ts` and export `up` and `down`.
- Use readable multiline raw SQL with explicit constraints and indexes.
- Do not edit a migration known to have been applied. Add a new migration instead.
- Keep database constraints aligned with service validation when the invariant must survive all write paths.
- Review indexes for actual filter/order patterns and avoid duplicate indexes already supplied by `UNIQUE` constraints unless a partial index has a demonstrated benefit.

## Verify the implementation

Add tests proportional to the production-code change:

- Service tests for business rules and stable domain errors.
- API tests for authentication, validation, HTTP adaptation, status codes, and response envelopes. Stub the service rather than the repository.
- PostgreSQL integration tests for repository SQL, migrations, transactions, locks, generated numbers, search, and soft delete.
- Full HTTP-to-PostgreSQL tests when a change depends on interaction across all layers.

Use the existing fixtures and database helper. Integration tests must use `TEST_DATABASE_URL`, and the database name must end in `_test`. Never weaken that safeguard.

Bun module mocks can leak across test files in one process. Keep service-rule tests isolated through the repository's existing test script rather than making tests depend on file order.

## Finish cleanly

1. Run `bun run fix -- <changed paths>`.
2. Run the relevant focused tests while iterating.
3. Run `bun run verify` before handoff.
4. Run `bun run test:integration` when a safe PostgreSQL test database is configured.
5. Run `git diff --check` and inspect the final diff for unrelated changes.
6. Update the matching feature document whenever behavior, schema, API, or an error contract changes.

Report passed, failed, and skipped tests separately. A skipped PostgreSQL suite is not evidence that its SQL passed.
