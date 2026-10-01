# Hermes Frontend Implementation Plan

> Status: Foundation, Finance, Notes, Junk, Reading, Writing, and Grammar settings implemented. This document plans the frontend foundation and screen delivery; it does not change domain behavior or API contracts.

## Current progress

Completed foundation work:

- Responsive application shell with a persistent collapsible desktop sidebar and keyboard-operable mobile drawer.
- Route tree, active navigation, expandable English group, direct routes, and safe not-found state.
- Semantic Tailwind design tokens and global accessibility rules.
- Runtime-validated API client, typed safe errors, query-string construction, and `204` support.
- Indonesian currency, number, percentage, date, and month formatting.
- Initial buttons, selector, proportional bar, page header, skeleton, and shared content states.
- Frontend unit/component test setup included in the repository-wide test command.
- Finance daily and range reports plus manual batch create, edit, and confirmed delete flows.
- Notes list and detail with API-backed keyword, type, category, and tag filtering, direct detail routes, and responsive list/detail behavior.
- Junk list, preview, and standalone detail with API-backed keyword, category, tag, and source-URL filtering plus safe nullable-title handling.

Finance and Notes validate the current foundation against the existing API contracts. Notes supports keyword, type, category, and tag filters. Controls without API support (source, date range, and alternative ordering) stay visibly unavailable rather than applying incomplete client-side filtering.

## 1. Purpose

Hermes already has a minimal React, Vite, and Tailwind CSS application, cross-cutting screen guidance, module screen specifications, and desktop visual references. The next frontend work should establish a small reusable foundation and validate it through one complete feature before implementing the remaining screens.

The recommended first vertical slice is the Finance report because its read contract already exists and it exercises the application shell, routing, API client, formatting, loading, empty, and error states without introducing a complex write flow.

## 2. Sources of truth

Use the following sources in this order when implementing a screen:

1. The applicable document in `docs/feature-docs/` for domain behavior.
2. `docs/frontend-screens/<module>.md` for screen behavior, routes, states, and API availability.
3. `docs/frontend-screens.md` for shared navigation, layout, content, accessibility, and responsive conventions.
4. The matching image in `docs/frontend-design/` for visual composition.
5. `docs/frontend.md`, `docs/architecture.md`, and `docs/coding-conventions.md` for technical boundaries.

The screen guide and module specification take precedence when an older visual reference contains a different navigation structure, label, or unsupported control. A visual mismatch that affects product behavior must be resolved in documentation before implementation.

Before implementing Finance, add a Finance screen specification using the template in `docs/frontend-screens.md`. The current Finance description and visual references are not yet as explicit as the other module specifications.

## 3. Scope and non-goals

### Initial scope

- Shared design tokens and global styles.
- Responsive application shell and navigation.
- Frontend routing and deep-link handling.
- Typed and runtime-validated API access.
- Reusable controls, layouts, and data-backed screen states.
- Finance report as the first integrated vertical slice.
- Notes and Junk create/list/detail/edit/delete screens.
- Reading, Writing, and Grammar settings.
- Known-code Reading, Writing, and Grammar workflows after their settings screens.
- Automated tests and visual verification proportional to each phase.

### Non-goals

- A large general-purpose design system or component library.
- A frontend state-management library before a demonstrated need exists.
- A chart library for proportional bars that can be rendered accessibly with CSS.
- Browser-side financial totals, grading, learning evaluation, or other authoritative calculations.
- Client-side filtering of a limited API result set presented as complete server-side filtering.
- Browser-direct LLM calls or exposure of the internal API key.
- Production deployment before the [personal web authentication boundary](auth-design.md) is implemented and verified.
- Screens or controls backed only by mock records when their collection API is missing.

## 4. Technical direction

### 4.1 Minimal dependencies

Add a dependency only when the phase that uses it begins. The expected needs are:

- A React routing library for nested routes, deep links, active navigation, detail routes, and navigation blocking for dirty forms.
- One icon library for functional icons, as required by the screen guide.
- Zod in the web package for runtime validation of API response envelopes and payloads.
- A Vite-compatible test runner with React Testing Library and user-event utilities for component and integration tests.
- A browser test runner only after the Finance vertical slice is stable.

Do not add a UI kit, chart library, global state store, form framework, or server-state library during foundation work unless implementation reveals a concrete requirement that the built-in React approach cannot handle cleanly.

### 4.2 Proposed source structure

```text
apps/web/src/
├── app/
│   ├── app-shell.tsx
│   ├── navigation.ts
│   └── routes.tsx
├── components/
│   ├── feedback/            # loading, empty, no-results, error, toast
│   ├── <feature>/           # visual components scoped to one feature
│   ├── forms/               # fields, selectors, dirty-form helpers
│   ├── layout/              # page header, detail pane, settings layout
│   └── ui/                  # buttons, chips, tags, icons, dividers
├── features/
│   ├── finance/
│   │   ├── daily/           # daily page entry point
│   │   └── report/          # range page entry point
│   ├── notes/
│   │   ├── list/            # list page entry point
│   │   ├── detail/          # detail page entry point
│   │   └── notes-api.ts
│   ├── junk/
│   └── english/
│       ├── general/
│       ├── grammar/
│       ├── reading/
│       └── writing/
├── lib/
│   ├── api/                 # fetch client, envelope schemas, typed errors
│   ├── formatting/          # currency, date, number, percentage
│   ├── hooks/               # request hooks shared by multiple features
│   └── validation/          # reusable client-side validation rules
├── styles/
│   ├── globals.css
│   └── tokens.css
├── app.tsx
└── main.tsx
```

Keep feature-specific types, hooks, response schemas, and mapping inside their feature. Put visual components scoped to one feature in `components/<feature>`; keep global primitives in `components/ui`, `components/layout`, and `components/feedback`. Promote code to `lib` only after at least two features need the same behavior.

### 4.3 State approach

Use React's built-in state and effects plus focused feature hooks, for example `useFinanceReport`, `useNoteList`, and `useReadingSettings`.

Every request hook must support the states relevant to its screen:

```text
idle -> loading -> success
                -> empty
                -> not found
                -> recoverable error
```

Mutation hooks additionally support dirty, invalid, pending, success, conflict, and error states where applicable. Requests must be cancellable with `AbortController` when the route, query, or selected period changes.

## 5. Foundation work

### Phase 0 — Contract and design alignment

1. Add the Finance screen specification.
2. Create a route and API-capability matrix for every designed screen.
3. Resolve shared visual inconsistencies across mockups, especially typography, sidebar variants, labels, active states, and spacing.
4. Define responsive behavior for the shell, detail panes, tables, and settings layouts because the current references are primarily desktop designs.
5. Record controls that must remain unavailable until an API contract exists.

Deliverable: screen documentation that is sufficient to implement without inventing behavior.

### Phase 1 — Tooling and application structure

1. Add routing and define the top-level route tree.
2. Add the selected icon library.
3. Add frontend test configuration.
4. Establish feature and shared-code directories.
5. Keep the current Vite proxy for local development and verify that the internal API key remains server-side only. The planned [personal auth implementation](auth-design.md) removes bearer injection and forwards browser cookies instead.

Proposed route tree:

```text
/
├── /finance
├── /notes
│   └── /:code
├── /junk
│   └── /:code
└── /english
    ├── /general
    ├── /grammar/*
    ├── /reading/*
    └── /writing/*
```

Do not create a speculative summary dashboard. The `/` route may redirect to the first implemented destination until `Ringkasan` has an explicit product and data contract.

### Phase 2 — Design tokens and global styles

Define semantic tokens for:

- Page, surface, subtle surface, border, primary text, muted text, and emerald accent colors.
- Success, warning, danger, selected, disabled, and focus states.
- Wordmark, page title, section title, body, label, and metadata typography.
- Spacing, control heights, 8px control radius, 12px grouped-surface radius, sidebar width, and reading width.
- Desktop, tablet, and mobile layout breakpoints.
- Motion duration with reduced-motion support.

Use tokens for recurring values instead of copying arbitrary Tailwind values from each image. Use a sans-serif UI typeface; reserve a serif face for the Hermes wordmark or a documented display role only if that direction is retained consistently.

### Phase 3 — Application shell

Implement:

- Persistent desktop sidebar.
- Dismissible mobile navigation drawer.
- Expandable English group.
- Route-derived active and expanded states.
- Main content container and constrained reading layout.
- Page header, back link, and local settings action patterns.
- Route-level not-found handling.
- Navigation confirmation for settings forms with unsaved changes.

The shell must preserve the product navigation defined in `docs/frontend-screens.md`; module list, detail, report, and settings screens are not separate global navigation items.

### Phase 4 — Core API and formatting layer

Build one centralized API client that provides:

- Relative `/api/v1` requests.
- Parsing of the standard success and error envelopes.
- Runtime validation of external response data.
- Mapping from `snake_case` transport objects to feature-owned `camelCase` models.
- A query-string builder that omits unset or blank values.
- Request cancellation and consistent handling of aborted requests.
- Typed errors for validation, authentication, not-found, conflict, unavailable dependency, and unexpected responses.
- Safe user-facing fallback messages that never expose stack traces, SQL details, credentials, or raw internal errors.

Add shared formatters for Indonesian dates, Rupiah, numbers, and percentages. Formatting may be client-side; authoritative totals, scores, evaluation, and category aggregation must come from the API.

### Phase 5 — Shared UI primitives

Implement only primitives already required by designed screens:

- `Button` and `IconButton`.
- `TextField`, numeric field, and `Select`.
- `SegmentedControl`, `FilterChip`, and `Tag`.
- `PageHeader`, `Section`, and `MetadataList`.
- `CollectionSurface` and lightweight `CollectionRow`.
- Closable and expandable `DetailPane`.
- `Skeleton`, `EmptyState`, `NoResultsState`, and `ErrorState`.
- `Toast` and `ConfirmDialog`.
- `SettingsLayout` and `SettingsSummary`.
- Accessible proportional bar for report breakdowns.

Every interactive component must have an accessible name, keyboard behavior, visible focus, disabled behavior, and sufficient contrast. Critical actions or states must not depend on color or hover alone.

## 6. Feature delivery sequence

### Phase 6 — Finance vertical slice

The Finance slice now includes:

- Current month as the initial period.
- Period selection reflected in the request.
- Net balance, income, and expense totals from the API.
- Category breakdown and proportional bars.
- Loading skeleton, empty state, recoverable error, and retry.
- Responsive report layout.
- Manual multi-transaction create using the API batch contract directly.
- Changed-fields-only edit and confirmed soft deletion from Daily view.
- Shared Finance transaction fields for batch create and single edit, plus the cross-feature confirmation dialog.

The slice validates routing, shell, API parsing, request cancellation, formatting, shared feedback states, and visual tokens before those abstractions are reused elsewhere.

### Phase 7 — Notes and Junk

Implement Notes and Junk together as separate features sharing proven list/detail and form primitives:

- List, explicit search submission, supported filters, and supported ordering.
- Query state represented in the URL where it improves navigation and reload behavior.
- Detail pane on wide screens.
- Primary detail screen on narrow screens or direct visits.
- Loading, initial empty, no-results, not-found, and recoverable-error states.
- Safe external-link handling for Junk source URLs.
- Manual create forms backed by the existing POST contracts, with one shared form per feature for create and edit.

Do not enable unsupported date filters, old-to-new sorting, or pagination. Editing and confirmed deletion are implemented from the full-page detail routes using their existing API contracts.

### Phase 8 — English settings

Reading and Writing settings are implemented through one shared English-learning settings component. Grammar settings use the same interaction conventions with their feature-specific daily-question contract.

Implement settings in this order:

1. Reading settings.
2. Writing settings.
3. Grammar settings. Implemented.

Use a shared settings pattern for load-before-edit, dirty-state detection, field and cross-field validation, pending state, unsaved-change confirmation, success toast, and synchronized read-only summary.

### Phase 9 — Known-code English workflows

Reading and Grammar known-code workflows are implemented. Writing prompt, feedback, and corrected-text screens are implemented; browser-originated Writing submission remains blocked by its current request contract. Browser-originated Grammar grading remains owned by Hermes.

Implement screens that already have detail contracts:

1. Reading material, complete submission, and expected-answer review.
2. Writing prompt, draft submission, feedback review, and corrected text.
3. Grammar practice/exam session, explanations, and report. Implemented; authoritative evaluation remains outside FE.

These screens must support direct navigation with a known public code. They must not rely on a collection screen that the API cannot yet populate.

### Phase 10 — Backend-enabled screens

Implement the following only after their missing contracts are designed and available:

| Screen or behavior | Current blocker |
| --- | --- |
| Grammar session list | No collection/search/filter/pagination endpoint |
| Writing draft submission | Current POST requires caller-authored estimated level and complete analysis |
| General English Q&A | No authenticated browser conversation contract |
| Save General English response to Notes | Save/preview payload and confirmation contract missing |
| Advanced Notes filters and sorting | Type, source, date-range, and sort API support missing |
| Advanced Junk filters and sorting | Date-range and sort API support missing |
| Production frontend access | [Auth backend](auth-design.md) implemented; FE login/session/logout, removal of proxy bearer injection, and deployment verification still pending |
| Ringkasan destination | Product content and data contract missing |

## 7. Testing and verification

### Unit tests

- API envelope parsing and feature mapping.
- Query-string construction.
- Currency, date, number, and percentage formatting.
- Range and numeric form validation.
- Route and navigation helpers.

### Component and integration tests

- Shell navigation and English expansion.
- Loading, empty, no-results, not-found, and retry states.
- Search submits only valid non-blank input.
- Dirty forms enable save only when valid and changed.
- Unsaved-change confirmation.
- Detail pane close, expand, direct-link, and mobile behavior.
- Stale requests cannot replace data for a newer route or filter.
- API errors are converted to safe user-facing messages.

### Browser smoke tests

Add browser tests after Finance is stable, then cover:

- Desktop and mobile navigation.
- Finance period change and retry.
- Notes/Junk list-to-detail navigation.
- One English settings save flow.
- Direct known-code route handling.

### Visual verification

Compare implemented screens with their visual references at minimum widths of approximately 1440px, 1024px, and 390px. Check text wrapping, keyboard focus, drawer behavior, detail-pane stacking, long English passages, and large Rupiah values. Treat the documentation as authoritative when a visual reference contains an outdated navigation structure.

## 8. Suggested pull-request sequence

| Work item | Scope |
| --- | --- |
| FE-01 | Finance screen specification, route/API matrix, and visual alignment decisions |
| FE-02 | Routing, design tokens, application shell, and responsive navigation |
| FE-03 | API client, runtime response schemas, typed errors, and formatters |
| FE-04 | Shared controls, feedback states, list/detail primitives, and settings layout |
| FE-05 | Complete Finance vertical slice |
| FE-06 | Notes list and detail |
| FE-07 | Junk list and detail |
| FE-08 | Reading, Writing, and Grammar settings |
| FE-09 | Reading known-code workflow |
| FE-10 | Writing known-code workflow |
| FE-11 | Grammar known-code workflow |
| Later | Collection screens, General English, Ringkasan, and production authentication following the [personal auth design](auth-design.md) |

Each work item should be independently reviewable, preserve unrelated changes, include proportionate tests, and update affected documentation when a behavior or contract decision changes.

## 9. Foundation definition of done

The frontend foundation is complete when:

- The responsive application shell and route tree work with keyboard and direct navigation.
- Shared visual tokens are used consistently by implemented screens.
- The API client validates envelopes and feature payloads and exposes safe typed errors.
- Shared loading, empty, no-results, not-found, and error states are available.
- Common controls meet keyboard, focus, accessible-name, disabled, and contrast requirements.
- Finance is fully integrated without browser-owned authoritative calculations.
- Unit, component, and Finance integration tests pass.
- Formatting, linting, type checks, tests, production build, and visual checks pass.
- The internal API key is absent from frontend source, browser storage, and browser-visible environment variables.

Foundation completion is demonstrated by a working vertical slice, not by creating empty folders or speculative abstractions.

## 10. Required checks per implementation PR

Run the checks relevant to the changed scope, ending with the repository-wide verification before handoff:

```sh
bun run fix -- apps/web
bun run typecheck
bun run test
bun run --filter @hermes/web build
bun run verify
```

When frontend tests are added, include them in the workspace `test` or `verify` workflow so the repository-wide command cannot pass while frontend tests are skipped.
