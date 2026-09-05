# Foundation Execution Plan

This plan covers the domain-independent backend foundation. Do not add business modules, domain tables, or feature endpoints until these phases are complete.

## 1. Project bootstrap

- Initialize `package.json` and Bun lockfile.
- Configure strict TypeScript, Biome, `.gitignore`, and `.env.example`.
- Add initial dependencies: Hono, Zod, and `@logtape/logtape`.
- Define the initial formatting, linting, type-checking, and test scripts.
- Add a minimal Bun test-runner smoke test.

**Done when:** the project installs cleanly and the base quality commands run.

## 2. Application shell

- Create the `src/` layout from `architecture.md`.
- Create `src/app.ts` as an importable, testable Hono app.
- Create `src/index.ts` for configuration loading, server startup, and shutdown lifecycle.
- Add shared API response helpers and typed application errors.
- Add development and production startup scripts.

**Done when:** a minimal app can be exercised by an HTTP test without opening a production server port.

## 3. Core middleware

- Validate environment configuration at startup.
- Add request-ID middleware.
- Configure LogTape with structured request/application logs, safe redaction, and environment-appropriate output.
- Add a global error handler that maps typed errors to the API response contract.
- Add internal API-key middleware.
- Add `GET /health` as a dependency-free liveness endpoint.

**Done when:** health, authentication failures, validation failures, and unexpected errors return the documented response shape and produce safe logs.

## 4. Database and migrations

- Add a centralized `bun:sql` client/pool.
- Implement the raw-SQL migration runner and `_migrations` tracking table.
- Add `db:migrate`, `db:status`, and `db:rollback` commands.
- Add `GET /health/ready` with a lightweight PostgreSQL readiness check.
- Close the HTTP server and database pool gracefully on shutdown.

**Done when:** an isolated database can migrate, report status, run readiness, and safely roll back a test migration.

## 5. Test foundation

- Configure Bun test.
- Add HTTP integration tests for health, readiness, API-key authentication, error responses, and request IDs.
- Configure an isolated PostgreSQL test database.
- Add migration-runner and transaction integration tests.

**Done when:** tests are deterministic and run from a clean local setup.

## 6. Final verification

- Run formatting, linting, type checking, and the full test suite.
- Update the root README with actual setup and run commands.
- Confirm all implementation follows the architecture, coding conventions, and API contract.

## Explicitly out of scope

- Domain modules, domain schema, and feature endpoints.
- MCP, queues, caches, microservices, and multi-user authentication. The React report frontend is now tracked in `frontend.md`.
- Production deployment and operations automation.
