# Notes Screen List

> Status: Design ready for list and detail review. Visual reference: [Notes list design](../fe-design/notes-list.png). Read [Frontend Screen Guide](../frontend-screens.md) with this document before implementing Notes screens.

## Scope

Notes are searchable personal records for insights, facts, ideas, quotes, useful information, and passive reminders. They are normally created through Hermes/Telegram; the initial web scope is reviewing and finding saved notes, not replacing that capture flow.

The initial implementation includes the list and detail screens. Editing and deletion are documented as future screens because they need a deliberate implementation pass and confirmation behavior.

## Screen map

```text
/notes
├── SCR-NOTE-001  Notes list, search, filter, and sorter
└── /notes/:code
    ├── SCR-NOTE-002  Note detail supporting pane / full-page detail
    ├── SCR-NOTE-003  Edit note (deferred)
    └── SCR-NOTE-004  Delete confirmation (deferred dialog)
```

| ID | Screen | Proposed route | Initial status | API status |
| --- | --- | --- | --- | --- |
| SCR-NOTE-001 | Notes list, search, filter, and sorter | `/notes` | In scope | Available, with filter/sort limitations |
| SCR-NOTE-002 | Note detail pane / full-page detail | `/notes/:code` | In scope | Available |
| SCR-NOTE-003 | Edit note | `/notes/:code/edit` | Deferred | Available |
| SCR-NOTE-004 | Delete confirmation | No route; dialog over detail | Deferred | Available |

Proposed web routes are frontend navigation only. They do not alter the REST API contract.

## SCR-NOTE-001 — Notes list, search, filter, and sorter

**Purpose**  
Find a saved note, narrow the collection, then open a note for reading. The default state is a list-only screen: no right-side detail pane is open.

**Entry points**

- Top-level `Notes` item in the application sidebar.
- Back navigation from a note detail screen.
- A direct link to `/notes`.

**UI composition**

- Header: `Notes` and the short purpose statement “Temukan kembali hal yang ingin kamu simpan.”
- A single control row below the header, in this order: search field with a `Cari` button, `Filter` button, then `Urutkan` control.
- `Cari` is disabled while the trimmed search field is empty. It is enabled only after the user has entered a non-whitespace keyword.
- `Filter` opens a dismissible advanced-filter popover. The intended fields are type, category, tag, source, and created-date range, with `Reset` and `Terapkan filter` actions.
- `Urutkan` is a compact ordinary sorter. The initial design offers newest first and oldest first by created date.
- An always-visible quick filter chip row directly below the controls: `Semua`, `Fact`, `Personal`, `Idea`, and `Quote`. It is a shortcut for a note-type filter; the soft-text `category` field remains an advanced-filter field. This wording avoids conflating the domain's fixed `type` enum with its free-form `category`.
- One grouped list surface with lightweight row separators.
- Each row displays type, title, content excerpt, tags, created date, and stable note code.
- The initial list state has no selected row and no detail pane. Selecting a row applies a selected-row indicator, updates the route to `/notes/:code`, and opens SCR-NOTE-002 in a right supporting pane on wide screens. On narrow screens, it opens as the primary screen.

**Interactions**

- Submit keyword search by selecting `Cari`, or by pressing Enter when `Cari` is enabled. Do not send a request for an empty or whitespace-only query.
- Select a quick type chip; `Semua` clears that quick-filter selection.
- Open, adjust, reset, apply, or dismiss the advanced filter popover. Applied filters should be represented by a concise active-filter count on the `Filter` button.
- Select the desired created-date sort direction.
- Clear an active search/filter without losing the list context.
- Select a note row to open its detail pane.

**Data contract**

```text
GET /api/v1/notes?q=<keyword>&tag=<tag>&category=<category>&limit=<1..100>
```

- `q` searches title, content, and tags. It is sent only after an enabled `Cari` action.
- `tag` and `category` are optional exact filters.
- UI tag chips may display `#` for readability, but the request sends the stored tag value without assuming that prefix is persisted.
- Dates use the Indonesian locale. The frontend never displays an internal database ID.

**Known API limitations**

- The current list response has `limit` but no page, cursor, or total metadata. Do not display pagination until the API supports it.
- The current API supports only `q`, `tag`, and `category`. It has no query parameters for type, source, created-date range, or explicit sort direction. The visual design includes those advanced controls, but integration must not silently filter or sort only the limited client result set. Those controls remain unavailable until the API capability exists, or the API is extended as a separate backend change.
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
Read one saved note and understand its metadata and origin. On desktop this begins as a right-side supporting pane opened from SCR-NOTE-001.

**Entry points**

- Select a result from SCR-NOTE-001.
- Direct link to `/notes/:code`.

**UI composition**

- Right-side detail pane containing close and expand controls at its outer edge.
- Note title and stable code.
- Compact metadata line: type, category, and created date.
- Readable note content using a constrained text width.
- Tags as quiet supporting chips.
- Source section only when `source` is present.
- Origin section only when `sourceContext` or `sourceReference` is present.

**Panel behavior**

- Close returns to the default list-only state at `/notes`; it removes the selected row state and right pane.
- Expand changes the detail into a full-page reading state and visually covers the list. The selected note route remains `/notes/:code`.
- In full-page state, a return control restores the right supporting pane on wide screens. A direct visit to `/notes/:code` may use the full-page state when no list context is available.
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

- Editing and deletion controls in the initial frontend release.
- Automatic source fetching or previewing external content.
- Rendering source text as a link unless the API contract later distinguishes a validated URL from a human-readable source name.

## SCR-NOTE-003 — Edit note (deferred)

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

**Open implementation decision**  
Although the API accepts `sourceContext` and `sourceReference` updates, the initial edit design should decide whether those internal-origin fields are visible to a user. Do not expose them by default without a concrete correction need.

## SCR-NOTE-004 — Delete confirmation (deferred)

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
4. Defer SCR-NOTE-003 and SCR-NOTE-004 until write controls are in scope.
