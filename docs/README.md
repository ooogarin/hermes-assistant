# Hermes Engineering Documentation

- `hermes-agent.md` — Hermes gateway, runtime skill, Telegram, and cron ownership/setup.

Read the relevant document before changing code or defining a feature.

| Document | Purpose |
| --- | --- |
| [architecture.md](architecture.md) | Application structure, key decisions, and security baseline |
| [coding-conventions.md](coding-conventions.md) | Code, database, migration, and test conventions |
| [auth-design.md](auth-design.md) | Single-owner JWT auth, static password ENV, API contracts, and frontend integration |
| [frontend.md](frontend.md) | React report frontend, local proxy, and security boundary |
| [frontend-deployment.md](frontend-deployment.md) | Panduan deploy frontend pada VPS Ubuntu dengan Caddy, HTTPS, proxy API, verifikasi, update, dan rollback |
| [frontend-implementation-plan.md](frontend-implementation-plan.md) | Frontend foundation, delivery phases, blockers, testing, and definition of done |
| [frontend-screens.md](frontend-screens.md) | Cross-cutting screen, navigation, state, and accessibility conventions |
| [frontend-screens/auth.md](frontend-screens/auth.md) | Login, JWT status check, logout, responsive layout, and accessible feedback |
| [frontend-screens/finance.md](frontend-screens/finance.md) | Finance Daily View, Range View, states, data contract, and API gap |
| [frontend-screens/notes.md](frontend-screens/notes.md) | Notes screen list, data needs, state handling, and implementation order |
| [frontend-screens/junk.md](frontend-screens/junk.md) | Junk screen list, data needs, state handling, and implementation order |
| [frontend-screens/general-english.md](frontend-screens/general-english.md) | General English Q&A screen, non-persistence, and integration boundary |
| [frontend-screens/reading.md](frontend-screens/reading.md) | Reading screen list, settings, data needs, and implementation order |
| [frontend-screens/grammar.md](frontend-screens/grammar.md) | Grammar screen list, settings, data needs, and implementation order |
| [frontend-screens/writing.md](frontend-screens/writing.md) | Writing screen list, settings, data needs, and implementation order |
| [feature-docs/](feature-docs/) | Product and domain designs |
| [feature-docs/writing-submission-redesign-proposal.md](feature-docs/writing-submission-redesign-proposal.md) | Proposed Writing flows, optional analysis, free writing, database/API design, migration, and open decisions |
| [feature-docs/writing-submission-contract.md](feature-docs/writing-submission-contract.md) | Writing phases 1–2: finalized edit guard/API contracts, prepared final-schema migration and manual execution |
| [audits/data-taxonomy-and-discovery-audit-2026-09-16.md](audits/data-taxonomy-and-discovery-audit-2026-09-16.md) | Deferred audit of categories, tags, search, and filtering across domain modules |

`feature-docs/` is the source of truth for domain behavior. Cross-cutting technical decisions belong in the documents above.
