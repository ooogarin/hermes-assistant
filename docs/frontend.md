# Hermes Frontend

## Scope

`apps/web` is a React and Tailwind CSS application for Hermes reports and focused correction workflows. Implemented vertical slices include Finance, Notes, Junk (manual and optional AI-assisted capture), Reading, Writing, and Grammar, plus the English settings and known-code workflows. The frontend is a read-oriented workspace for reviewing reports, saved information, and English-learning material. Durable data, calculations, aggregation, analysis, and filtering rules remain in the API and PostgreSQL.

The initial implementation deliberately uses React's built-in `useState` and `useEffect`, plus focused custom hooks such as `useApiQuery` and `useListParams`. It does not use a state-management library, UI kit, or chart library. Reusable UI is implemented as small Tailwind components in `src/components`.

## Structure

```text
apps/web/src/
├── app/                     # route tree, navigation model, and application composition
├── components/
│   ├── english/             # primitives shared by English learning features
│   ├── feedback/            # loading, empty, and error states
│   ├── finance/             # visual components scoped to Finance
│   ├── junk/                # visual components scoped to Junk
│   ├── notes/               # visual components scoped to Notes
│   ├── personal-content/    # primitives shared by the personal content features
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

Feature pages, hooks, schemas, and mapping remain inside `features/<feature>`. A multi-page feature groups each page by use case. Visual components scoped to one feature live in `components/<feature>`; cross-feature primitives belong to `components/ui`, `components/layout`, `components/feedback`, `components/english`, or `components/personal-content`. The current foundation is intentionally small and is expanded through implemented vertical slices rather than speculative components.

`app/app-routes.ts` holds the table of pages behind the sign in. It is the single source of truth: the route tree and the destinations a reader may return to after signing in are both derived from it. A new page is reachable after signing in as soon as it is listed there.

## Shared components

Shared visual and interaction primitives live in `apps/web/src/components/ui`. Feature components compose them and retain domain validation, API mapping, and workflow state. Feature components also keep free-form API filters as text inputs rather than constraining them to an incomplete option list.

### Rules

- Reuse a global primitive when appearance and interaction are shared across features.
- Search the primitives below before adding another one. A second copy of a shared behaviour is what this document exists to prevent.
- Keep feature-specific structures and business rules under their feature component directory.
- Inputs share the same height, border, radius, focus, disabled, and invalid states.
- Every icon-only action has an accessible label.
- Prefer controlled values at the feature boundary. Components may own temporary UI state such as a dropdown query or unfinished tag draft.
- Open layers close one at a time. Escape and an outside click always reach the innermost open layer, and the layer underneath stays open.

### Actions

`Button` accepts text, an icon, or both. At least one is required by its TypeScript contract; an icon-only button also requires `aria-label`. `ButtonLink` shares the same sizes and variants for navigational actions. `IconButton` is a small wrapper over the same button foundation.

Supported variants are `primary`, `secondary`, `danger`, and `ghost`; supported sizes are `sm`, `md`, and `icon`.

`RecordActions` is the edit and delete action set of a stored record. It offers a menu or plain buttons, confirms the deletion with a dialog, and reports a failed deletion. The feature keeps the wording, the routes, and the delete call; the primitive keeps the flow. `ConfirmationDialog` is the shared confirmation it uses.

`CopyButton` copies a value and reports the result in place. `PageHeader` is the heading of a page with its optional actions.

### Fields

`Field` owns the visible label and helper/error message. `Input`, `Textarea`, `TextField`, `TextAreaField`, and `SelectField` share the global control treatment. Domain-specific composites may place the primitive input inside a unit or date wrapper, but must not duplicate its base state styling.

### Calendar picker

`DatePicker` is the shared calendar control for date selection across the frontend, including Finance reports and forms, and date-range filters in Notes and Junk. It accepts optional minimum and maximum dates, can be disabled, and supports clearing optional filter dates. Paired range controls use the other selected date as their boundary.

The `position` prop accepts `top` or `bottom` (default) to place the calendar above or below its trigger. Notes and Junk filters use `position='top'` to keep the calendar above the date fields. Horizontal placement is controlled separately by `align` (`start` or `end`).

`DateRangeFilter` pairs two date pickers into the range filter used by Notes and Junk. Each side bounds the other, and the filter reports an invalid range.

`SearchField` accepts a custom leading icon, clear label, and clear handler. `SearchForm` composes it with an optional action icon and configurable action label.

### Choice dropdown

`ChoiceDropdown` uses a discriminated `mode`:

- `single` accepts one value or `null`, shows a circular radio-style indicator, and closes after selection.
- `multiple` accepts an array, shows square checkbox-style indicators, remains open while selecting, and renders selected values as removable chips.

Both modes support searchable options, disabled options, clear behavior, full-trigger interaction, outside-click closing, and Escape. Component width is controlled by its consumer; selected chips wrap vertically without changing that assigned width.

### Tags and chips

`TagInput` accepts and emits `string[]`. A draft becomes a tag through the Add action or Enter, then appears as a removable `Chip`. It rejects empty, duplicate, over-length, and over-limit values before updating the controlled array. Notes and Junk must not serialize tags through a comma-separated text field.

`TagList` shows a fixed number of tags with a counter for the rest, and is used by Reading. `ResponsiveTags` shows as many tags as fit the given number of rows and reports the rest as a counter; Notes, Junk, and Writing use it.

`FilterChipRow` is a group of quick filters where one option is active at a time. It marks the group with a hidden legend and the active option with `aria-pressed`. `FilterChip` is the single chip it is built from.

`FilterPopover` holds the filters that wait for the reader to apply them. It closes on an outside click and on Escape, and the list page owns whether it is open.

### Lists

Lists share the sideways scrolling table, the detail pane, the record actions, the failed request state, and one hook that keeps the filters in the browser URL.

`ScrollTable` is the shared table for records that are wider than the page. The first column stays in place while the rest scrolls sideways, and a hint appears once the table can be scrolled. The feature keeps the columns and the rows; the primitive keeps the overflow measurement, the frozen column, the edge fade, and the hint. `scrollTableRowClassName` and `scrollTableTitleClassName` are the shared row and title cell treatments, so a table does not restate them.

`SortToggle` switches a list between the newest and the oldest record.

### Record details

`DetailPane` shows one stored record with its source, its original text, and its metadata. The feature supplies the metadata rows; the primitive keeps the layout, the source link, the original text switch, and the metadata list. `DetailRow` is one metadata row.

### Request states

`QueryError` shows the state of a failed request. A record that is gone gets its own message, every other failure can be retried. A feature that has a special failure can pass a `fallback` for it.

`ContentState` is the shared empty and error panel, `ErrorState` is the retryable failure, `CollectionSkeleton` is the loading placeholder, `Skeleton` is the single loading block, and `NavigationNotice` is the message a page shows after an action. `ProgressBar` shows a bounded value and `useTooltip` shows a short hint next to a control.

`ListEmptyState` is the empty state of a list. A filtered list offers to clear the filters, an empty list explains what will fill it. The feature keeps the wording and any action of its own.

`StatusPill` is the small badge that marks the status of a record, in an `accent` or a `warning` tone.

### Forms

`ContentForm` is the form of a stored record. The container keeps the values, the dirty check, the save flow, and the cancel button; the feature renders the fields and the validation rules.

### Settings

`SettingsLevelPicker` is the grid of CEFR levels, `SettingsNumberField` is a number with a unit, and `SettingsSummary` is the panel that shows the values a feature starts with. `LearningSettingsPage` composes them for the English learning features, and `EnglishSettingsLink` is the link to them.

### Hooks and helpers

`useListParams` keeps the browser URL as the source of truth for the filters of a list. A page declares which filters it offers, which of them wait for the reader to apply them, and which one the quick filters change. The hook keeps the applied filters, the drafts, the sort order, the search text, and a query key that ignores unrelated parameters.

`useDismissOnOutside` dismisses an open layer when the reader clicks outside it or presses Escape. It keeps the open layers in one place, so the innermost layer always closes first.

`useUnsavedChanges` warns before a reader leaves a page with unsaved changes and registers the form so the application shell can warn as well.

`useApiQuery` runs a cancellable request and exposes its loading, success, and error states.

`lib/formatting/dates.ts` holds the shared date helpers: the `YYYY-MM-DD` value of a date, the validation of a date value, and the ranges that stay inside today.

## Screen conventions

This section provides a shared screen language so new module screens feel like one product. It does not define module-specific fields, workflows, or API behavior; those belong in the applicable feature design and screen specification.

### Visual baseline

The accepted visual direction is calm, spacious, and typography-led:

- Warm off-white page background with dark slate text.
- Emerald is the single primary accent for active navigation, primary actions, selected rows, and positive feedback.
- Use thin neutral borders and spacing to separate content. Shadows are exceptional, not a default.
- Use 12px rounded surfaces for grouped content; controls may use 8px rounding when visually appropriate.
- Avoid a dashboard made of many unrelated cards, cards inside cards, large illustrations, decorative gradients, and dense information grids.
- Body copy must remain comfortable to read; long-form text should use a constrained reading width.
- Use an icon library for functional icons. Do not create custom decorative iconography for MVP.

### Application shell

The [personal login screen](frontend-screens/auth.md) sits outside this shell. JWT status validation gates shell/feature mounting, and a `Keluar` action appears in the sidebar footer and mobile drawer. See [auth-design.md](auth-design.md) for the API enforcement boundary.

Desktop uses a persistent left sidebar. It contains product-level destinations only; list, detail, settings, and report pages remain within each destination rather than becoming additional global navigation items.

```text
Hermes
├── Ringkasan
├── Finance
├── English
│   ├── General English
│   ├── Grammar
│   ├── Reading
│   └── Writing
├── Notes
└── Junk
```

- `English` is an expandable group.
- When an English child is active, the group is expanded and the active child receives the primary visual indicator.
- A top-level active item uses a restrained tinted background plus an emerald leading indicator.
- Detail pages retain their parent item as active and provide an explicit back link within content.
- The desktop sidebar expands or reduces to an icon rail through explicit button interaction, never hover; changing its state moves the content frame with the same transition.
- The expanded state is retained in local browser storage. The mobile drawer remains independent of this desktop preference.
- On narrow screens, the sidebar becomes a dismissible drawer. The hierarchy and active states remain unchanged.

### Reusable screen patterns

#### List screen

Use for collections such as saved items, materials, prompts, and sessions.

- Header: destination name, short purpose statement, optional local settings action.
- Controls: search first, then only the filters relevant to the collection.
- Content: one grouped list or table surface, with lightweight row separators.
- Rows: title or primary label first; metadata follows in a predictable order; state and stable reference code remain visible when useful.
- Navigation: selecting a row opens its detail screen. The selected row may receive an emerald leading indicator.
- Pagination appears only when the API provides a paginated collection.

#### Detail and workspace screen

Use for a single material, item, conversation, or in-progress exercise.

- Start with a back link, clear title, stable reference code where applicable, and a compact metadata line.
- Keep one primary task dominant: reading, writing, answering, or reviewing.
- Supporting information belongs in a quiet secondary column only when it helps the task. Do not turn every datum into a card.
- Actions should follow task completion: submit, save, view explanation, or return to the parent list.

#### Report and review screen

Use for Finance summaries, completed exams, and writing feedback.

- Lead with the single most important result, followed by a concise explanation.
- Use grouped breakdown rows and proportional bars when comparison is needed.
- Do not add gamification, rankings, trends, or a large chart unless the relevant feature design explicitly requires them.
- Put optional detail—such as explanations or corrected text—behind a clear secondary action or local tab.

#### Lightweight Q&A screen

Use for short, non-persistent conversations.

- One active conversation only; do not imply durable chat history where none exists.
- Keep the composer fixed at the bottom of the content area.
- Show optional suggested questions only when they help an empty or early conversation.
- State clearly when content is not stored automatically; show an explicit save action only when the feature supports it.

### Shared states

Every data-backed screen must define its state before implementation.

| State | Visual behavior | User action |
| --- | --- | --- |
| Loading | Preserve the final layout with subtle skeleton rows or blocks; avoid a full-page spinner. | None required. |
| Initial empty | Explain that no content exists yet without inventing a browser-only creation flow. | Provide an action only when the feature supports one. |
| No results | Keep the search/filter context visible. Use a small message inside the normal collection surface. | Clear or adjust search/filter. |
| Recoverable error | Keep selected context, such as a date range or filter, visible. Use safe plain-language copy. | Retry. |
| Submit pending | Disable only the relevant action and keep entered data visible. | Wait or cancel when safe. |
| Success | Show a short, non-blocking toast. | None required. |
| Delete confirmation | Use a small explicit dialog naming the affected item. | Cancel or confirm delete. |

#### Safe error copy

Client-visible errors must be action-oriented and must not expose API keys, SQL, connection details, status internals, or stack traces. Example:

```text
Laporan belum dapat dimuat
Periksa koneksi lalu coba lagi.
```

### Interaction and content rules

- Use stable public codes in list and detail screens when the domain has them; never expose internal database IDs.
- Persisted values come from the API. The frontend may format data but does not calculate authoritative totals, scores, or evaluation results.
- Use Indonesian for navigation, labels, actions, and feedback. Preserve English material where it is the learning content.
- Format currency in Rupiah and dates in the Indonesian locale.
- Put destructive actions behind confirmation. Soft deletion remains an API/domain behavior; the frontend describes the action plainly without exposing database implementation details.
- Avoid controls that imply unimplemented behavior, such as automatic progress tracking, uploads, direct media storage, or persistent history when the feature design defers them.

### Accessibility and responsive behavior

- Every interactive element must have a visible label, keyboard focus state, and accessible name.
- Do not rely on color alone for active, correct, partial, incorrect, or destructive states; pair it with text or an icon label.
- Maintain readable contrast for muted text, borders, selected rows, and disabled controls.
- Do not use hover as the only way to reveal a critical action or status.
- On narrow viewports, collapse the sidebar into a drawer, stack secondary panels below the primary task, and preserve action order.
- Long passages, feedback, and user-entered text must wrap without horizontal scrolling.

### Screen specification template

Every future module screen specification should use this format:

```md
### SCR-<AREA>-<NUMBER> — <Screen name>

**Purpose**
One sentence describing the user outcome.

**Route**
Proposed web route. This is not an API contract.

**Entry points**
Where the user opens the screen.

**UI composition**
- Header
- Primary content
- Supporting content
- Actions

**Data contract**
API data required, formatting rules, and any known API gap.

**States**
Loading, empty/no-result, error, pending, success, and destructive confirmation as applicable.

**Responsive and accessibility notes**
Only screen-specific exceptions to the shared rules above.

**Out of scope**
Behavior deliberately not included in this screen.
```

### Screen specifications

Current specifications are [Finance](frontend-screens/finance.md), [Notes](frontend-screens/notes.md), [Junk](frontend-screens/junk.md), [Reading](frontend-screens/reading.md), [Grammar](frontend-screens/grammar.md), [Writing](frontend-screens/writing.md), and [Auth](frontend-screens/auth.md). The [General English screen](archive/features/general-english-screen.md) and its feature design are archived until a browser conversation contract exists.

1. Keep this guide as the shared baseline.
2. Add module-specific screen specifications only after their feature behavior and API availability are confirmed.
3. Update the relevant feature design, API contract, and this guide together when a screen requires a behavior or data change.
4. Implement shared UI primitives before composing module screens.

## Feature behavior

Each area keeps its behavior in two focused documents. This guide owns the shared structure, components, and screen conventions; it does not repeat endpoint or workflow detail.

| Area | Screen specification | Domain design |
| --- | --- | --- |
| Finance | [Finance](frontend-screens/finance.md) | [Finance design](feature-docs/finance-feature-design.md) |
| Notes | [Notes](frontend-screens/notes.md) | [Notes design](feature-docs/notes-feature-design.md) |
| Junk | [Junk](frontend-screens/junk.md) | [Junk design](feature-docs/junk-feature-design.md) |
| Reading | [Reading](frontend-screens/reading.md) | [Reading design](feature-docs/reading-feature-design.md) |
| Writing | [Writing](frontend-screens/writing.md) | [Writing design](feature-docs/writing-feature-design.md), [submission contract](feature-docs/writing-submission-contract.md) |
| Grammar | [Grammar](frontend-screens/grammar.md) | [Grammar design](feature-docs/grammar-feature-design.md) |
| Auth | [Auth](frontend-screens/auth.md) | [Auth design](auth-design.md) |

The screen specifications remain the source of truth for screen behavior. The feature designs remain the source of truth for domain behavior.

## Local development and API key safety

Start the API and frontend in separate terminals:

```sh
bun run dev:api
bun run dev:web
```

`apps/web/vite.config.ts` loads `.env` from the workspace root. It forwards relative `/api` requests to `API_PROXY_TARGET` (default `http://127.0.0.1:3000`) without adding an Agent bearer credential. Browser requests use the HttpOnly JWT cookie.

`INTERNAL_API_KEY` is an internal service credential, not a browser credential. Never prefix it with `VITE_`, interpolate it into frontend source, place it in local storage, or send it from browser code. The Vite proxy is for local development only.

Optional AI-assisted Junk capture is configured only on the API with `AI_BASE_URL`, `AI_API_KEY`, and `AI_MODEL` (plus the `AI_MAX_TOKENS`, `AI_TEMPERATURE`, and `AI_TIMEOUT_MS` settings). The browser never receives those values; it calls `POST /api/v1/junk/ai` with the session cookie and shows safe copy when the server has no AI configuration. Unset AI variables keep the endpoint disabled while the manual Junk form keeps working.

## Personal web authentication

[Personal Web Authentication Design](auth-design.md) defines the implemented backend boundary: one static password hash and JWT signing secret in server ENV, an HttpOnly cookie containing a signed 24-hour JWT, and API middleware that accepts a valid browser JWT or the existing Agent bearer credential. No user entity or RBAC is introduced. JWTs remain valid across restarts when the signing secret is unchanged.

The frontend has public `/login` outside `AppShell`, an auth-status check before mounting protected routes, and `Keluar` in the sidebar/mobile drawer. The [Login screen specification](frontend-screens/auth.md) defines fields, responsive behavior, accessible feedback, direct-link return, expiry, and retry. Browser API requests remain relative and carry only their JWT cookie; Vite does not inject the Agent key.

Public deployment remains pending until the production same-origin HTTPS proxy is verified with cookie and Origin forwarding; [frontend-deployment.md](frontend-deployment.md) records the proposed host, Caddy configuration, and verification steps. JWT expiry is fixed at 24 hours; logout clears the cookie without revoking a copied JWT.

## Delivery history

The [archived implementation plan](archive/plans/frontend-implementation-plan.md) records delivery history; remaining blocked work is described in the screen specifications.
