---
name: frontend-modules
description: Write or modify production code for React, Vite, and Tailwind frontend modules. Use when implementing pages, components, hooks, API mapping, or frontend tests under the project's web source tree; do not use for backend, documentation-only, review-only, or deployment work.
---

# Frontend Modules

Work from the repository root. Preserve unrelated changes and keep the change as small as the requested behavior allows.

## Scope

Use this skill only when the task requires writing or changing production frontend code in the project's web source tree, directly related frontend tests, or the shared frontend API and component layers. The Project binding section maps these terms to the current repository.

Do not use this skill for backend or database work, documentation-only work, review-only work, or deployment work. Do not edit API contracts to make the browser side fit; coordinate with the backend skill instead.

## Project binding

This skill is reusable across projects with the same stack. Set this section for the current repository; the rest of the document uses the binding terms.

| Item | This repository |
| --- | --- |
| Web root | `apps/web` |
| Source root | `apps/web/src/` |
| Route table | `apps/web/src/app/app-routes.ts` |
| Shared components | `apps/web/src/components/ui/`, `components/layout/`, `components/feedback/` |
| API boundary | `apps/web/src/lib/api/` |
| Shared hooks | `apps/web/src/lib/hooks/` |
| Feature root | `apps/web/src/features/` |
| Commands | `bun run fix -- apps/web`, `bun run --filter @hermes/web typecheck`, `bun run --filter @hermes/web test`, `bun run --filter @hermes/web build`, `bun run verify` |
| Frontend docs | `docs/frontend.md` plus the matching file in `docs/frontend-screens/` and `docs/feature-docs/` |

For another repository, copy this skill and replace the binding table. Keep the workflow sections unchanged.

## Read before editing

Read the project's repository instructions, then:

1. the frontend guide,
2. the matching screen specification,
3. the matching feature design for domain behavior.

Treat the screen specification as the source of truth for screen behavior and the feature design as the source of truth for domain behavior. Do not invent fields, endpoints, validation, or UI states that those documents do not define.

## Architecture

- Keep route-level pages under `features/<feature>/<use-case>/page.tsx`.
- Feature-owned schemas, request functions, and view-model mapping stay in the feature.
- Visual components scoped to one feature live in `components/<feature>/`.
- Cross-feature primitives belong in `components/ui`, `components/layout`, or `components/feedback`. Search for an existing primitive before adding another one.
- Keep the route table as the single source of truth for pages behind the sign in; add a route there rather than duplicating paths.

## API and data

- Browser requests use relative `/api/v1/` URLs through the shared API client. Never expose an internal service key, bearer key, or secret in frontend source, storage, or a `VITE_*` variable.
- Validate every response with Zod and map the wire contract to a camelCase view model in the feature API file. Components must not depend on raw `snake_case` transport objects.
- Use the shared query hook for cancellable loads and expose loading, success, empty, not-found, and recoverable-error states.
- Keep the browser URL as the source of truth for list filters and sort order where the project provides a list-params hook.
- Format dates, currency, numbers, and percentages with the shared formatters; the API owns authoritative calculations.

## UI and interaction

- Use the shared design tokens and existing primitives instead of one-off colors, controls, or layouts.
- Every interactive element needs a visible label, keyboard focus, and an accessible name. Do not rely on color or hover alone for state.
- Preserve content while a request is pending, disable only the affected action, and keep failed input available for retry.
- Put destructive actions behind an explicit confirmation that names the affected record.
- Add an inline comment only when it explains non-obvious behavior or an invariant.

## Verify the implementation

Add tests proportional to the change:

- Unit tests for formatting, mapping, query-string, and pure helpers.
- Component or integration tests for user flows, validation, URL-backed filters, and loading/error/empty states.
- Run the frontend build when the change affects routes, lazy loading, styles, or dependencies.

Use the Project binding's focused commands while iterating. Run the repository-wide verify command before handoff.

## Finish cleanly

1. Run the Project binding's fix command on the changed paths.
2. Run the relevant focused tests and type check.
3. Run the frontend build when the change affects the bundle or routes.
4. Run `git diff --check` and inspect the final diff for unrelated changes.
5. Do not update docs unless explicitly requested. When behavior or a screen contract changes, identify the related doc paths that may need updates in the final report.

Report passed, failed, and skipped tests separately.
