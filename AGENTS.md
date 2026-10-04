# Hermes Repository Instructions

Read the relevant documents before changing code:

1. `docs/architecture.md` — technology baseline, HTTP boundary, layers, ownership, and application flow.
2. `docs/coding-conventions.md` — code, database, migration, and test rules.
3. `docs/feature-docs/` — only when working on the matching domain.

If documents conflict, the newest explicit user decision wins. Do not invent domain behavior absent from its feature design; mark it as an open decision. Documentation changes require an explicit user request; implementation work does not by itself authorize writing or updating docs.

## Non-negotiable rules

- Use TypeScript, Bun, Hono, Zod, PostgreSQL, and native `bun:sql`.
- Use parameterized raw SQL only. Do not add Prisma, Drizzle, an ORM, or a default query builder.
- Keep the boundary: route → validator → handler → service → repository → PostgreSQL.
- Only repositories access the database. Services own business rules and transaction boundaries; handlers own HTTP adaptation.
- Validate every external input with Zod.
- Never expose or log secrets, SQL internals, database details, or client-visible stack traces.
- Preserve unrelated user changes and avoid unrelated refactors.
- Do not create documentation, request descriptions, or standalone or embedded scripts (including Postman test or pre-request scripts) unless the user explicitly asks for them. A feature request authorizes the source code and migrations needed to implement it, but not supplemental docs or scripts.
- Always write simple, readable code: separate logical steps with blank lines, use braced control-flow blocks, and give intermediate operations and long conditions clear variable names. Follow the readability rules in `docs/coding-conventions.md`.

## Change workflow

1. Inspect relevant code and docs.
2. State assumptions that affect behavior, schema, API, or scope.
3. Make the smallest cohesive change and add proportionate tests.
4. Run available formatting, linting, type checks, and relevant tests.
5. If behavior, schema, API, or architecture changes, identify related docs that may need updates, but edit them only when the user explicitly asks.

## Git naming

- Use a conventional change type for branch names: `feat/<slug>`, `fix/<slug>`, `docs/<slug>`, `chore/<slug>`, or another appropriate type.
- Use conventional commit messages such as `feat: add personal web authentication` or `docs: define personal web auth`.
- Git branch names cannot contain spaces or `:`; express the requested type with `/` in branch names.
