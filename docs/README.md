# Hermes Engineering Documentation

Read the relevant document before changing code or defining a feature.

## Active

| Document | Purpose |
| --- | --- |
| [architecture.md](architecture.md) | Application structure, HTTP boundary, key decisions, and security baseline |
| [coding-conventions.md](coding-conventions.md) | Code, database, migration, and test conventions |
| [auth-design.md](auth-design.md) | Single-owner JWT auth, static password ENV, API contracts, and frontend integration |
| [hermes-agent.md](hermes-agent.md) | Hermes gateway, runtime skill, Telegram, and cron ownership/setup |
| [frontend.md](frontend.md) | React frontend structure, shared components, screen conventions, local proxy, and security boundary |
| [frontend-deployment.md](frontend-deployment.md) | Deploy frontend on an Ubuntu VPS with Caddy, HTTPS, API proxy, verification, update, and rollback |
| [frontend-screens/](frontend-screens/) | Per-screen specifications |
| [feature-docs/](feature-docs/) | Product and domain designs |
| [feature-docs/writing-submission-contract.md](feature-docs/writing-submission-contract.md) | Implemented Writing submission schema, API, edit guards, and errors |

## Archive

Historical plans, proposals, feature designs, and QA records. They describe past decisions and are not current contracts.

| Document | Purpose |
| --- | --- |
| [archive/plans/plan-hermes-personal-assistant.md](archive/plans/plan-hermes-personal-assistant.md) | Original MVP plan |
| [archive/plans/frontend-implementation-plan.md](archive/plans/frontend-implementation-plan.md) | Original frontend delivery plan and status history |
| [archive/proposals/writing-submission-redesign-proposal.md](archive/proposals/writing-submission-redesign-proposal.md) | Superseded Writing redesign proposal |
| [archive/proposals/grammar-explanation-drawer-proposal.md](archive/proposals/grammar-explanation-drawer-proposal.md) | Implemented Grammar explanation drawer handoff |
| [archive/features/general-english-feature-design.md](archive/features/general-english-feature-design.md) | General English design, archived until a browser contract exists |
| [archive/features/general-english-screen.md](archive/features/general-english-screen.md) | General English screen design, archived with the feature design |
| [archive/qa/design-qa.md](archive/qa/design-qa.md) | One-off Finance design QA record |

`feature-docs/` remains the source of truth for domain behavior. `architecture.md` owns cross-cutting technical decisions. The VPS runbook `docs-vps.md` is local-only and intentionally untracked.

## Precedence

1. A feature-specific contract, such as `feature-docs/writing-submission-contract.md`, overrides a feature overview or archived proposal.
2. `frontend-screens/` owns per-screen behavior; `frontend.md` owns the technical boundary and shared screen conventions.
3. Archived documents never override active documents.
