# Hermes Assistant

Hermes is a Bun workspace containing the passive REST API, a React report frontend, and the Hermes Agent runtime skill.

```text
apps/
├── api/                  # Bun, Hono, PostgreSQL API
└── web/                  # React, Vite, Tailwind report frontend
docs/                     # Engineering and feature documentation
hermes/                   # Hermes Agent runtime skill
```

## Local setup

Requirements: Bun 1.4 or later and a manually provisioned PostgreSQL database.

```sh
bun install --frozen-lockfile
cp .env.example .env
```

Set a PostgreSQL `DATABASE_URL` and replace `INTERNAL_API_KEY` with a secret of at least 32 characters in `.env`. API startup also requires `WEB_AUTH_PASSWORD_HASH`, generated with native `Bun.password.hash(password, { algorithm: 'argon2id' })`, and the exact `WEB_AUTH_ORIGIN` (normally `http://127.0.0.1:5173` for development). Use a unique password/passphrase of at least 20 characters. Generate it through a local prompt or secret manager and keep it out of shell history/logs. In Bun dotenv files, escape every literal `$` in the PHC hash as `\$`, including inside quotes; quoting alone does not stop substitution. When supplying a real process environment variable through a secret manager, use the plain PHC hash without dotenv escape characters. `WEB_AUTH_SESSION_TTL_SECONDS` defaults to seven days. The placeholder hash is intentionally rejected at startup. See [auth configuration and constraints](docs/auth-design.md#data-and-env).

Then apply pending migrations and start the API:

```sh
bun run db:migrate
bun run dev:api
```

The API runs at `http://127.0.0.1:3000`. In another terminal, start the React frontend:

```sh
bun run dev:web
```

The frontend runs at `http://127.0.0.1:5173` and proxies `/api` requests to `API_PROXY_TARGET`. During local development, the Vite server—not browser code—adds the internal bearer key from `.env`. Do not add `INTERNAL_API_KEY` to a `VITE_*` variable.

The auth backend exposes login, session inspection, and logout under `/api/v1/auth`. Browser sessions use opaque HttpOnly cookies and are cleared by an API restart/redeploy. The FE login and protected routes are still pending; removing Vite key injection belongs to that same FE stage. This development proxy is not suitable for public deployment.

`GET /health` checks application liveness without querying PostgreSQL. `GET /health/ready` checks PostgreSQL readiness and returns within `READINESS_TIMEOUT_MS`.

## Quality checks

```sh
# Apply safe formatting, lint, and import fixes to all files or a target.
bun run fix
bun run fix -- apps/api/src/core

# Check formatting, lint, and import ordering without modifying files.
bun run check
bun run check -- apps/api/src/core/config/env.ts

# Run format, lint, type, and non-database tests.
bun run verify
```

To type-check or build only the frontend:

```sh
bun run --filter @hermes/web typecheck
bun run --filter @hermes/web build
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
- [Personal web authentication backend and frontend plan](docs/auth-design.md)
- [Hermes Agent integration](docs/hermes-agent.md)
- [Feature designs](docs/feature-docs/)
