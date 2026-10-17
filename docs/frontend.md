# Hermes Report Frontend

## Scope

`apps/web` is a React and Tailwind CSS application for Hermes reports and focused correction workflows. Implemented vertical slices include Finance, Notes, Junk, Reading, API-backed Writing workflows, and Grammar session-list and known-code workflows. The frontend does not own durable data, calculations, aggregation, analysis, or filtering rules; those remain in the API and PostgreSQL.

The initial implementation deliberately uses React's built-in `useState` and `useEffect`, plus focused custom hooks such as `useFinanceReport`. It does not use a state-management library, UI kit, or chart library. Reusable UI is implemented as small Tailwind components in `src/components`.

## Structure

```text
apps/web/src/
├── app/                     # route tree, navigation model, and application composition
├── components/
│   ├── feedback/            # loading, empty, no-results, and error states
│   ├── finance/             # visual components scoped to Finance
│   ├── english/             # primitives shared by English learning features
│   ├── junk/                # visual components scoped to Junk
│   ├── notes/               # visual components scoped to Notes
│   ├── reading/             # visual components scoped to Reading
│   ├── writing/             # visual components scoped to Writing
│   ├── layout/              # application shell and page-level layouts
│   └── ui/                  # small accessible controls
├── features/                # feature-owned pages, hooks, schemas, and mapping
├── lib/
│   ├── api/                 # validated fetch boundary, typed errors, query strings
│   ├── formatting/          # Indonesian currency, date, number, and percentage formatting
│   └── hooks/               # cancellable query hook shared across features
├── styles/                  # semantic design tokens and global rules
├── test/                    # shared frontend test setup
├── app.tsx                  # application composition
├── main.tsx                 # React entry point
└── styles.css               # Tailwind entry point and global base styles
```

The frontend uses a routing library for nested and direct routes, Lucide for functional icons, and Zod to validate API response data at the browser boundary. Vitest and React Testing Library cover unit and component integration behavior. It still deliberately avoids a UI kit, chart library, global state store, form framework, and server-state library until a demonstrated need exists.

Feature pages, hooks, schemas, and mapping remain inside `features/<feature>`. A multi-page feature groups each page by use case. Visual components scoped to one feature live in `components/<feature>`; cross-feature primitives belong to `components/ui`, `components/layout`, or `components/feedback`. The current foundation is intentionally small and is expanded through implemented vertical slices rather than speculative components.

Form controls use the shared primitives documented in [Frontend Component Foundation](frontend-components.md). `ChoiceDropdown` owns searchable single- and multi-choice behavior, `TagInput` stores tags as discrete removable values, and the common field controls own labels, helper/error messaging, focus treatment, and disabled states. Feature components compose these primitives while retaining domain validation and payload mapping. Free-form API filters remain text inputs rather than being constrained to an incomplete option list.

The desktop application sidebar can be expanded or reduced to an icon rail through its chevron button. It does not auto-expand or auto-hide on hover. Its state is retained in local browser storage, and the sidebar width and content offset transition together. The mobile drawer remains independent of this desktop preference.

Finance Daily defaults to the current date and Range defaults to the current calendar month. Both show API-authoritative expense, income, net balance, and category breakdown. Daily also provides manual batch creation, correction, and confirmed deletion backed by the existing Finance contracts:

```text
GET /api/v1/finance/summary?from=YYYY-MM-DD&to=YYYY-MM-DD&mode=net
GET /api/v1/finance/summary/daily?from=YYYY-MM-DD&to=YYYY-MM-DD
GET /api/v1/finance/categories?type=expense|income
POST /api/v1/finance/transactions
GET /api/v1/finance/transactions/:date/:dailyNumber
PATCH /api/v1/finance/transactions/:date/:dailyNumber
DELETE /api/v1/finance/transactions/:date/:dailyNumber
```

Create sends one to 100 transaction rows that share an explicit date, type, and source text. Create and edit reuse the same transaction-field component; edit keeps date, type, and source text immutable and sends changed fields only. Delete reuses the cross-feature confirmation dialog.

Notes is read-only in this phase. Its list and detail routes use the API as the source of truth:

```text
GET /api/v1/notes?q=<keyword>&type=<type>&category=<category>&tag=<tag>&source=<name-or-domain>&from=<date>&to=<date>&sort=<newest|oldest>&limit=100
GET /api/v1/notes/:code
```

Keyword, type, category, tag, source, date-range, and ordering filters are applied by the API. Notes uses the shared calendar picker for its optional date range. The list uses `/notes?preview=:code` for its supporting pane, while `/notes/:code` is a standalone detail page.

Junk follows the same list, preview, and standalone-detail structure:

```text
GET /api/v1/junk?q=<keyword>&category=<category>&tag=<tag>&source=<name-or-domain>&source_url=<url>&from=<date>&to=<date>&sort=<newest|oldest>&limit=100
GET /api/v1/junk/:code
```

Keyword, category, tag, source, exact source-URL, date-range, and ordering filters are applied by the API. Junk uses the shared calendar picker for its optional date range. The list uses `/junk?preview=:code`; `/junk/:code` is the standalone detail page.

Reading provides settings, direct known-code material, complete answer submission, and expected-answer review:

```text
GET   /api/v1/reading/settings
PATCH /api/v1/reading/settings
GET   /api/v1/reading/materials/:code
POST  /api/v1/reading/materials/:code/submissions
GET   /api/v1/reading/materials/:code/expected-answers
```

The settings form validates positive integers and `minimum ≤ target ≤ maksimum`, protects unsaved edits from its back action, and synchronizes the saved summary. The material workspace requires every answer before submission and presents expected answers strictly as self-check content. `/english/reading` uses the paginated collection API for keyword search plus status, multi-level, and genre filters.

Writing reuses the same English settings primitive and provides known-code prompt, feedback, and corrected-text routes:

```text
GET   /api/v1/writing/settings
PATCH /api/v1/writing/settings
GET   /api/v1/writing/materials?q=&status=&levels=&genre=&page=&limit=&sort=
GET   /api/v1/writing/materials/:code
GET   /api/v1/writing/materials/:code/submissions/:submissionNumber
GET   /api/v1/writing/materials/:code/submissions/:submissionNumber/corrected-text
```

The prompt composer shows a non-authoritative live word count and preserves browser input. Its submission action remains unavailable because the current POST contract requires the caller to supply `estimatedLevel` and the complete authoritative analysis alongside `originalText`; the frontend does not fabricate those domain results. The Writing list uses its paginated API and routes reviewed materials directly to their latest feedback.

Grammar settings load and update the API-backed daily-practice defaults:

```text
GET   /api/v1/grammar/settings
PATCH /api/v1/grammar/settings
```

The form sends only changed fields, validates a daily question count from 1 through 100, protects unsaved edits, and preserves an existing non-CEFR level until the user selects a supported CEFR value. `/english/grammar` lists sessions with API-backed search, status chips, mode and level filters, newest/oldest ordering, and server-side pagination, and exposes the settings entry point.

Known Grammar session routes are read-only: they display session questions, saved answers, stored feedback, on-demand explanations, and completed reports. Answering, practice grading, and final exam evaluation are performed through Hermes because those commands require authoritative results; the browser does not save answers or infer correctness.

Notes and Junk support manual creation, detail-derived editing, and deletion from their full-page detail routes. Create and edit share one form per feature; both retain immutable/internal fields outside browser forms, use changed-fields-only PATCH requests, show deletion through one shared confirmation dialog, and return a short navigation notice after successful writes.

## Local development and API key safety

Start the API and frontend in separate terminals:

```sh
bun run dev:api
bun run dev:web
```

`apps/web/vite.config.ts` loads `.env` from the workspace root. It forwards relative `/api` requests to `API_PROXY_TARGET` (default `http://127.0.0.1:3000`) without adding an Agent bearer credential. Browser requests use the HttpOnly JWT cookie.

`INTERNAL_API_KEY` is an internal service credential, not a browser credential. Never prefix it with `VITE_`, interpolate it into frontend source, place it in local storage, or send it from browser code. The Vite proxy is for local development only.

## Personal web authentication

[Personal Web Authentication Design](auth-design.md) defines the implemented backend boundary: one static password hash and JWT signing secret in server ENV, an HttpOnly cookie containing a signed 24-hour JWT, and API middleware that accepts a valid browser JWT or the existing Agent bearer credential. No user entity or RBAC is introduced. JWTs remain valid across restarts when the signing secret is unchanged.

The frontend has public `/login` outside `AppShell`, an auth-status check before mounting protected routes, and `Keluar` in the sidebar/mobile drawer. The [Login screen specification](frontend-screens/auth.md) defines fields, responsive behavior, accessible feedback, direct-link return, expiry, and retry. Browser API requests remain relative and carry only their JWT cookie; Vite does not inject the Agent key.

Public deployment remains blocked until the production same-origin HTTPS proxy is verified with cookie and Origin forwarding. JWT expiry is fixed at 24 hours; logout clears the cookie without revoking a copied JWT. The exact deployment host remains open.

Shared navigation, screen, state, and accessibility conventions are defined in [frontend-screens.md](frontend-screens.md). Module-specific screen specifications will be added only after the related API data is available.

Finance screen behavior is defined in [frontend-screens/finance.md](frontend-screens/finance.md).

The implementation sequence and current backend blockers are tracked in [frontend-implementation-plan.md](frontend-implementation-plan.md).
