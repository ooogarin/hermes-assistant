# Notes Screen List

> Status: Create, list, detail, edit, and delete confirmation implemented. Visual reference: [Notes list design](../frontend-design/notes-list.png). Read [Frontend Screen Guide](../frontend-screens.md) with this document before implementing Notes screens.

## Scope

Notes are searchable personal records for insights, facts, ideas, quotes, useful information, and passive reminders. Hermes/Telegram remains the primary assisted capture flow, while the browser also supports deliberate manual creation.

The implementation includes create, list, detail, edit, and confirmed deletion. Internal origin fields remain read-only and are not exposed by browser forms.

## Screen map

```text
/notes
├── ?preview=:code  Supporting preview over the list context
├── SCR-NOTE-001  Notes list, search, filter, and sorter
├── /new  SCR-NOTE-005  Create note
└── /notes/:code
    ├── SCR-NOTE-002  Full-page note detail
    ├── SCR-NOTE-003  Edit note
    └── SCR-NOTE-004  Delete confirmation
```

| ID | Screen | Proposed route | Initial status | API status |
| --- | --- | --- | --- | --- |
| SCR-NOTE-001 | Notes list, search, filter, and sorter | `/notes` | In scope | Available, with filter/sort limitations |
| SCR-NOTE-002 | Note preview / full-page detail | `/notes?preview=:code` and `/notes/:code` | In scope | Available |
| SCR-NOTE-003 | Edit note | `/notes/:code/edit` | Implemented | Available |
| SCR-NOTE-004 | Delete confirmation | No route; dialog over detail | Implemented | Available |
| SCR-NOTE-005 | Create note | `/notes/new` | Implemented | Available |

Proposed web routes are frontend navigation only. They do not alter the REST API contract.

## SCR-NOTE-005 — Create note

**Purpose**
Create a deliberate manual note without replacing the assisted Hermes capture flow.

- Reuses the same feature form as edit for title, content, type, category, source, and tags.
- Sends `sourceContext` and `sourceReference` as their API defaults by omitting them.
- Validates required fields, field limits, and tags before POST; protects unsaved input.
- On success, navigates to the generated note detail and shows a short confirmation.

```text
POST /api/v1/notes
```

## SCR-NOTE-001 — Notes list, search, filter, and sorter

**Purpose**  
Find a saved note, narrow the collection, then open a note for reading. The default state is a list-only screen: no right-side detail pane is open.

**Entry points**

- Top-level `Notes` item in the application sidebar.
- Back navigation from a note detail screen.
- A direct link to `/notes`.

**UI composition**

- Header: `Notes` with no supporting subtitle.
- A single control row below the header, in this order: search field with a `Cari` button, `Filter` button, then `Urutkan` control.
- `Cari` is disabled while the trimmed search field is empty. It is enabled only after the user has entered a non-whitespace keyword.
- `Filter` opens a dismissible advanced-filter popover. The intended fields are type, category, tag, source, and created-date range, with `Reset` and `Terapkan filter` actions.
- `Urutkan` is a compact ordinary sorter. The initial design offers newest first and oldest first by created date.
- An always-visible quick filter chip row directly below the controls: `Semua`, `Fact`, `Personal`, `Idea`, and `Quote`. It is a shortcut for a note-type filter; the soft-text `category` field remains an advanced-filter field. This wording avoids conflating the domain's fixed `type` enum with its free-form `category`.
- One grouped, table-like list surface matching the Junk list structure, with a column header and lightweight row separators.
- Each full-width row displays type, title/content excerpt, tags, created date, and stable note code. While the supporting preview is open, the list uses a compact variant without the redundant code column because the selected code is already visible in the detail pane.
- The outer page stacks the header, toolbar, and content region vertically. The content region uses the full available width while no note is selected.
- The application content frame and toolbar use the full available width; the search group absorbs remaining toolbar space while Filter and Sort retain compact widths and equal heights.
- The initial list state has no selected row and no detail pane. Selecting a row applies a selected-row indicator, records the selection as `/notes?preview=:code`, shrinks the list, and opens SCR-NOTE-002 in a right supporting pane on wide screens. On narrow screens, the preview becomes the primary content.

**Interactions**

- Submit keyword search by selecting `Cari`, or by pressing Enter when `Cari` is enabled. Do not send a request for an empty or whitespace-only query.
- Select a quick type chip; `Semua` clears that quick-filter selection.
- Open, adjust, reset, apply, or dismiss the advanced filter popover. Applied filters should be represented by a concise active-filter count on the `Filter` button.
- Select the desired created-date sort direction.
- Clear an active search/filter without losing the list context.
- Select a note row to open its detail pane.

**Data contract**

```text
GET /api/v1/notes?q=<keyword>&type=<type>&tag=<tag>&category=<category>&limit=<1..100>
```

- `q` searches title, content, and tags. It is sent only after an enabled `Cari` action.
- `type` is an optional exact filter over the fixed note-type enum.
- `tag` and `category` are optional exact filters.
- UI tag chips may display `#` for readability, but the request sends the stored tag value without assuming that prefix is persisted.
- Dates use the Indonesian locale. The frontend never displays an internal database ID.

**Known API limitations**

- The current list response has `limit` but no page, cursor, or total metadata. Do not display pagination until the API supports it.
- The current API has no query parameters for source, created-date range, or explicit sort direction. The visual design includes those advanced controls, but integration must not silently filter or sort only the limited client result set. Those controls remain unavailable until the API capability exists.
- The API's current natural order is relevance first when a query is present, then newest created date. The `Terbaru` display may reflect that default; `Terlama` requires an explicit API sort parameter.
- The API has no category-vocabulary endpoint. The category field begins as a text input, not a speculative category dropdown.

**States**

| State | Behavior |
| --- | --- |
| Loading | Render list skeleton rows inside the existing list surface. |
| Initial empty | Explain that no notes have been saved yet; do not show a browser-only “create note” flow. |
| No results | Keep the query/filter visible and show `Tidak ada catatan yang cocok` with `Hapus pencarian`. |
| Error | Keep search context visible and offer `Coba lagi` with safe non-technical copy. |

**Out of scope**

- Browser-driven note capture or AI metadata generation.
- Pagination UI before supporting API metadata exists.
- Pinning, related notes, exports, random resurfacing, active reminder delivery, and note linking.

## SCR-NOTE-002 — Note detail

**Purpose**  
Read one saved note and understand its metadata and origin. On desktop this begins as a right-side supporting preview opened from SCR-NOTE-001; the full route is a standalone page that can later own update and other note actions.

**Entry points**

- Select a result from SCR-NOTE-001 to open `/notes?preview=:code`.
- Select the preview's expand action or open a direct link to `/notes/:code` for the full page.

**UI composition**

- Right-side preview pane containing close and open-page controls at its outer edge.
- The preview title shares its top row with the pane controls so the reading content starts without an empty control-only region.
- Note title followed by one compact metadata line: colored type, category, created date, and stable code.
- Readable note content using a constrained text width.
- Tags as quiet supporting chips.
- Source section only when `source` is present.
- Origin section only when `sourceContext` or `sourceReference` is present.

**Panel behavior**

- Close removes the `preview` query parameter, restores the default list-only state, and lets the list expand to the full content width.
- Open page navigates from `/notes?preview=:code` to the standalone `/notes/:code` route.
- The full-page route omits a redundant detail page header, uses the full available content width, keeps a compact return control, and remains structurally ready for future update and other note actions.
- The supporting pane becomes the full primary detail screen on narrow viewports.

**Data contract**

```text
GET /api/v1/notes/:code
```

- The detail view uses `code`, never a database ID.
- `source`, `sourceContext`, and `sourceReference` are nullable. Omit an absent section instead of rendering placeholder values.
- `reminder` is presented as a note type only. It must not imply a due date, scheduler, or notification.

**States**

| State | Behavior |
| --- | --- |
| Loading | Preserve the title, metadata, and content layout with skeleton blocks. |
| Not found | Show a safe “Catatan tidak ditemukan” message and return action to Notes. |
| Error | Keep the note code context visible and offer retry. |

**Out of scope**

- Automatic source fetching or previewing external content.
- Rendering source text as a link unless the API contract later distinguishes a validated URL from a human-readable source name.

## SCR-NOTE-003 — Edit note

**Purpose**  
Correct a saved note after it has been created.

**Proposed UI**

- A detail-derived form, not a new browser-wide editor.
- Editable fields: title, content, type, category, source, tags, and supported source metadata.
- Preserve unedited data. Disable save while a request is pending.
- On success, return to the detail route and show a short non-blocking toast.

**Data contract**

```text
PATCH /api/v1/notes/:code
```

**Implementation decision**
Although the API accepts `sourceContext` and `sourceReference` updates, browser forms do not expose these internal-origin fields without a concrete correction need.

## SCR-NOTE-004 — Delete confirmation

**Purpose**  
Require an explicit confirmation before removing a note from active views.

**Proposed UI**

- Small dialog over the detail screen.
- Title names the affected note, for example: `Hapus “Postgres Advisory Lock”?`.
- Brief copy explains that the note will no longer appear in active results.
- Actions: secondary `Batal` and clearly destructive `Hapus`.
- On success, return to `/notes` and show a short success toast.

**Data contract**

```text
DELETE /api/v1/notes/:code
```

The underlying domain uses soft deletion. The interface should describe the user-visible outcome without exposing database details.

## Implementation order

1. Application shell and reusable list/detail primitives, including the closable and expandable detail pane.
2. SCR-NOTE-001 with explicit search submission, quick type filters, supported advanced filters, default newest ordering, and shared states.
3. SCR-NOTE-002 with safe metadata rendering, pane/full-page behavior, and not-found state.
4. SCR-NOTE-003 and SCR-NOTE-004 with changed-field PATCH payloads and the shared confirmation dialog.
5. SCR-NOTE-005 using the same feature form as edit and the existing POST contract.
