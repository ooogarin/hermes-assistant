# Hermes Repository Instructions

Read the relevant documents before changing code:

1. `docs/tech-stack.md` — chosen technology and non-negotiable decisions.
2. `docs/architecture.md` — layers, ownership, and application flow.
3. `docs/coding-conventions.md` — code, database, migration, and test rules.
4. `docs/api-conventions.md` — HTTP contract.
5. `docs/feature-docs/` — only when working on the matching domain.

If documents conflict, the newest explicit user decision wins. Update the affected documents together. Do not invent domain behavior absent from its feature design; mark it as an open decision.

## Non-negotiable rules

- Use TypeScript, Bun, Hono, Zod, PostgreSQL, and native `bun:sql`.
- Use parameterized raw SQL only. Do not add Prisma, Drizzle, an ORM, or a default query builder.
- Keep the boundary: route → validator → handler → service → repository → PostgreSQL.
- Only repositories access the database. Services own business rules and transaction boundaries; handlers own HTTP adaptation.
- Validate every external input with Zod.
- Never expose or log secrets, SQL internals, database details, or client-visible stack traces.
- Preserve unrelated user changes and avoid unrelated refactors.

## Change workflow

1. Inspect relevant code and docs.
2. State assumptions that affect behavior, schema, API, or scope.
3. Make the smallest cohesive change and add proportionate tests.
4. Run available formatting, linting, type checks, and relevant tests.
5. Update docs when behavior, schema, API, or architecture changes.
