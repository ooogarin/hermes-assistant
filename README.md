# Hermes Assistant

Backend repository for Hermes, a personal assistant. It contains the passive REST API, PostgreSQL-backed MVP modules, and the source package for the Hermes Agent runtime skill.

## Local setup

Requirements: Bun 1.4 or later and a manually provisioned PostgreSQL database.

```sh
bun install --frozen-lockfile
cp .env.example .env
```

Set a PostgreSQL `DATABASE_URL` and replace `INTERNAL_API_KEY` with a secret of at least 32 characters in `.env`, then apply pending migrations and start the application:

```sh
bun run db:migrate
bun run dev
```

`GET /health` checks application liveness without querying PostgreSQL. `GET /health/ready` checks PostgreSQL readiness and returns within `READINESS_TIMEOUT_MS`.

## Quality checks

```sh
# Apply safe formatting, lint, and import fixes to all files or a target.
bun run fix
bun run fix -- src/core

# Check formatting, lint, and import ordering without modifying files.
bun run check
bun run check -- src/core/config/env.ts

# Run format, lint, type, and non-database tests.
bun run verify
```

## Database commands

With `DATABASE_URL` configured in `.env`, use:

```sh
bun run db:status
bun run db:migrate
bun run db:rollback
```

## Database integration tests

Create an isolated PostgreSQL database whose name ends in `_test`, then copy `.env.test.example` to `.env.test` and adjust `TEST_DATABASE_URL` if needed:

```sh
cp .env.test.example .env.test
bun run test:integration
```

The integration test helper resets its database schema before each test and accepts only database names ending in `_test`.

## Documentation

- [Agent instructions](AGENTS.md)
- [Engineering documentation](docs/README.md)
- [Hermes Agent integration](docs/hermes-agent.md)
- [Feature designs](docs/feature-docs/)
