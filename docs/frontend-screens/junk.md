# Junk Screen List

> Status: Design ready for list and detail review. Visual reference: [Junk list design](../fe-design/junk-list.png). Read [Frontend Screen Guide](../frontend-screens.md) with this document before implementing Junk screens.

## Scope

Junk is a searchable archive for low-friction external finds: articles, videos, music, quotes, posts, tools, and other items worth keeping but not formal Notes. Items are normally captured through Hermes/Telegram; the initial web scope is to review and find saved items, not to replace capture.

The initial implementation includes the list and detail states. Editing and deletion remain deferred, as they need a deliberate write-flow pass and confirmation behavior.

## Screen map

```text
/junk
├── SCR-JUNK-001  Junk list, search, filter, and sorter
└── /junk/:code
    ├── SCR-JUNK-002  Junk detail supporting pane / full-page detail
    ├── SCR-JUNK-003  Edit junk item (deferred)
    └── SCR-JUNK-004  Delete confirmation (deferred dialog)
```

| ID | Screen | Proposed route | Initial status | API status |
| --- | --- | --- | --- | --- |
| SCR-JUNK-001 | Junk list, search, filter, and sorter | `/junk` | In scope | Available, with date/sort limitations |
| SCR-JUNK-002 | Junk detail pane / full-page detail | `/junk/:code` | In scope | Available |
| SCR-JUNK-003 | Edit junk item | `/junk/:code/edit` | Deferred | Available |
| SCR-JUNK-004 | Delete confirmation | No route; dialog over detail | Deferred | Available |

Proposed web routes are frontend navigation only. They do not alter the REST API contract.

## SCR-JUNK-001 — Junk list, search, filter, and sorter

**Purpose**  
Find a saved external item, narrow the collection, then open it for reading. The default state is a list-only screen: no right-side detail pane is open.

**Entry points**

- Top-level `Junk` item in the application sidebar.
- Back navigation from a Junk detail state.
- A direct link to `/junk`.

**UI composition**

- Header: `Junk` and the short purpose statement “Simpan temuan menarik untuk dicari lagi nanti.”
- A single control row below the header, in this order: search field with a `Cari` button, `Filter` button, then `Urutkan` control.
- `Cari` is disabled while the trimmed search field is empty. It is enabled only after the user has entered a non-whitespace keyword.
- `Filter` opens a dismissible advanced-filter popover. The intended fields are category, tag, source URL, and created-date range, with `Reset` and `Terapkan filter` actions.
- `Urutkan` is a compact ordinary sorter. The initial design offers newest first and oldest first by created date.
- An always-visible quick category filter chip row directly below the controls: `Semua`, `Artikel`, `Video`, `Musik`, `Quote`, and `Tool`. The chips are shortcuts for the soft-text `category` field, not a new fixed enum. Categories outside this shortcut set remain searchable through the advanced filter.
- One grouped table-like list surface with lightweight row separators.
- Each row displays category, title or a safe title fallback, content excerpt, tags, source host or URL label, created date, and stable Junk code.
- The initial list state has no selected row and no detail pane. Selecting a row applies a selected-row indicator, updates the route to `/junk/:code`, and opens SCR-JUNK-002 in a right supporting pane on wide screens. On narrow screens, it opens as the primary screen.

**Interactions**

- Submit keyword search by selecting `Cari`, or by pressing Enter when `Cari` is enabled. Do not send a request for an empty or whitespace-only query.
- Select a quick category chip; `Semua` clears that quick-filter selection.
- Open, adjust, reset, apply, or dismiss the advanced filter popover. Applied filters should be represented by a concise active-filter count on the `Filter` button.
- Select the desired created-date sort direction.
- Clear an active search/filter without losing the list context.
- Select a Junk row to open its detail pane.

**Data contract**

```text
GET /api/v1/junk?q=<keyword>&tag=<tag>&category=<category>&sourceUrl=<url>&limit=<1..100>
```

- `q` searches title, content text, category, and tags. It is sent only after an enabled `Cari` action.
- `tag`, `category`, and `sourceUrl` are optional exact filters. A quick category chip sends its matching stored category value.
- UI tag chips may display `#` for readability, but the request sends the stored tag value without assuming that prefix is persisted.
- The frontend formats dates in the Indonesian locale and never displays an internal database ID.
- If `title` is null, the row uses a concise display fallback from available `contentText`, `sourceUrl`, or `rawText`; this is display-only and does not write a generated title back to the API.

**Known API limitations**

- The current list response has `limit` but no page, cursor, or total metadata. Do not display pagination until the API supports it.
- The current API supports keyword, tag, category, and exact source-URL filters, but has no created-date-range or explicit sort-direction parameters. The visual design includes date and sorter controls, but integration must not silently filter or sort only the limited client result set. Those controls remain unavailable until the API capability exists, or the API is extended as a separate backend change.
- The API's current natural order is relevance first when a query is present, then newest created date. The `Terbaru` display may reflect that default; `Terlama` requires an explicit API sort parameter.
- The API has no category-vocabulary endpoint. Quick chips are a curated shortcut from the accepted design, not a complete list of categories; the advanced category field begins as text input.

**States**

| State | Behavior |
| --- | --- |
| Loading | Render list skeleton rows inside the existing list surface. |
| Initial empty | Explain that no Junk items have been saved yet; do not show a browser-only capture flow. |
| No results | Keep the query/filter visible and show `Tidak ada Junk yang cocok` with `Hapus pencarian`. |
| Error | Keep search context visible and offer `Coba lagi` with safe non-technical copy. |

**Out of scope**

- Browser-driven Junk capture, uploads, media storage, or link archiving.
- Pagination UI before supporting API metadata exists.
- Pinning, random resurfacing, related-item linking, or automatic Notes-versus-Junk classification.

## SCR-JUNK-002 — Junk detail

**Purpose**  
Read one saved external item and understand its category, source, and saved description. On desktop this begins as a right-side supporting pane opened from SCR-JUNK-001.

**Entry points**

- Select a result from SCR-JUNK-001.
- Direct link to `/junk/:code`.

**UI composition**

- Right-side detail pane containing close and expand controls at its outer edge.
- Category, title or safe title fallback, and stable code.
- Source URL as an external link only when `sourceUrl` is present and API-valid.
- Description from `contentText` when it is present.
- Tags as quiet supporting chips.
- Compact metadata rows for category, source host, created date, and code.
- Do not render `rawText` by default. It is preserved for origin/audit purposes and must not become a frontend debug surface without a specific user-facing need.

**Panel behavior**

- Close returns to the default list-only state at `/junk`; it removes the selected row state and right pane.
- Expand changes the detail into a full-page reading state and visually covers the list. The selected item route remains `/junk/:code`.
- In full-page state, a return control restores the right supporting pane on wide screens. A direct visit to `/junk/:code` may use the full-page state when no list context is available.
- The supporting pane becomes the full primary detail screen on narrow viewports.

**Data contract**

```text
GET /api/v1/junk/:code
```

- The detail view uses `code`, never a database ID.
- `title`, `rawText`, `contentText`, and `sourceUrl` are nullable. Omit a missing section rather than render a placeholder value.
- `sourceUrl` has already passed API URL validation. Open it with safe external-link handling; do not fetch, archive, or preview external content in the initial frontend scope.

**States**

| State | Behavior |
| --- | --- |
| Loading | Preserve the pane title, metadata, and content layout with skeleton blocks. |
| Not found | Show a safe `Junk tidak ditemukan` message and return action to Junk. |
| Error | Keep the Junk code context visible and offer retry. |

**Out of scope**

- Editing and deletion controls in the initial frontend release.
- Inline media, embedded video/music players, external page previews, or automatic URL fetches.
- Exposing `rawText` as a technical/audit field by default.

## SCR-JUNK-003 — Edit junk item (deferred)

**Purpose**  
Correct a saved Junk item after it has been created.

**Proposed UI**

- A detail-derived form, not a new browser-wide editor.
- Editable fields: title, category, content text, source URL, and tags.
- Preserve unedited data. Disable save while a request is pending.
- Keep `rawText` read-only and hidden by default because the API deliberately preserves it.
- On success, return to the detail route and show a short non-blocking toast.

**Data contract**

```text
PATCH /api/v1/junk/:code
```

## SCR-JUNK-004 — Delete confirmation (deferred)

**Purpose**  
Require an explicit confirmation before removing a Junk item from active views.

**Proposed UI**

- Small dialog over the detail screen.
- Title names the affected item, using its title or code when the title is absent.
- Brief copy explains that the item will no longer appear in active results.
- Actions: secondary `Batal` and clearly destructive `Hapus`.
- On success, return to `/junk` and show a short success toast.

**Data contract**

```text
DELETE /api/v1/junk/:code
```

The underlying domain uses soft deletion. The interface should describe the user-visible outcome without exposing database details.

## Implementation order

1. Application shell and reusable list/detail primitives, including the closable and expandable detail pane.
2. SCR-JUNK-001 with explicit search submission, quick category filters, supported advanced filters, default newest ordering, and shared states.
3. SCR-JUNK-002 with safe source rendering, safe null-title handling, pane/full-page behavior, and not-found state.
4. Defer SCR-JUNK-003 and SCR-JUNK-004 until write controls are in scope.
