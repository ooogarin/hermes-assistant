# Junk Screen List

> Status: Create, list, detail, edit, and delete confirmation implemented. Visual reference: [Junk list design](../frontend-design/junk-list.png). Read [Frontend Screen Guide](../frontend-screens.md) with this document before implementing Junk screens.

## Scope

Junk is a searchable archive for low-friction external finds: articles, videos, music, quotes, posts, tools, and other items worth keeping but not formal Notes. Hermes/Telegram remains the primary assisted capture flow, while the browser also supports deliberate manual creation.

The implementation includes create, list, detail, edit, and confirmed deletion. Preserved raw input remains read-only and hidden from browser forms.

## Screen map

```text
/junk
├── ?preview=:code  Supporting preview over the list context
├── SCR-JUNK-001  Junk list, search, filter, and sorter
├── /new  SCR-JUNK-005  Create Junk item
└── /junk/:code
    ├── SCR-JUNK-002  Full-page Junk detail
    ├── SCR-JUNK-003  Edit junk item
    └── SCR-JUNK-004  Delete confirmation
```

| ID | Screen | Proposed route | Initial status | API status |
| --- | --- | --- | --- | --- |
| SCR-JUNK-001 | Junk list, search, filter, and sorter | `/junk` | In scope | Available, with date/sort limitations |
| SCR-JUNK-002 | Junk preview / full-page detail | `/junk?preview=:code` and `/junk/:code` | In scope | Available |
| SCR-JUNK-003 | Edit junk item | `/junk/:code/edit` | Implemented | Available |
| SCR-JUNK-004 | Delete confirmation | No route; dialog over detail | Implemented | Available |
| SCR-JUNK-005 | Create Junk item | `/junk/new` | Implemented | Available |

Proposed web routes are frontend navigation only. They do not alter the REST API contract.

## SCR-JUNK-005 — Create Junk item

**Purpose**
Create a deliberate manual archive item without replacing the assisted Hermes capture flow.

- Reuses the same feature form as edit for optional title, category, description, source URL, and tags.
- Omits `rawText`, preserving its meaning as original Hermes input rather than synthesizing it in the browser.
- Validates category, URL, field limits, and tags before POST; protects unsaved input.
- On success, navigates to the generated item detail and shows a short confirmation.

```text
POST /api/v1/junk
```

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
- The header, toolbar, and content are vertically stacked. The application frame and list use the full available width when no item is selected.
- The initial list state has no selected row and no detail pane. Selecting a row applies a selected-row indicator, records it as `/junk?preview=:code`, shrinks the list, and opens SCR-JUNK-002 in a right supporting pane on wide screens. On narrow screens, the preview becomes the primary content.

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

- Select a result from SCR-JUNK-001 to open `/junk?preview=:code`.
- Select the preview's open-page action or use a direct link to `/junk/:code`.

**UI composition**

- Right-side preview pane containing close and open-page controls in the title area.
- Category, title or safe title fallback, and stable code.
- Source URL as an external link only when `sourceUrl` is present and API-valid.
- Full-width primary content from `contentText` when it is present, using the same readable body structure as Notes without an extra nested description container.
- Tags as quiet supporting chips.
- Compact metadata rows for category, source host, created date, and code.
- Do not render `rawText` by default. It is preserved for origin/audit purposes and must not become a frontend debug surface without a specific user-facing need.

**Panel behavior**

- Close removes the `preview` query parameter and restores the full-width list state.
- Open page navigates from `/junk?preview=:code` to the standalone `/junk/:code` route.
- The standalone route uses the full content width, keeps a compact return control, and is structurally ready for future update actions.
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

- Inline media, embedded video/music players, external page previews, or automatic URL fetches.
- Exposing `rawText` as a technical/audit field by default.

## SCR-JUNK-003 — Edit junk item

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

## SCR-JUNK-004 — Delete confirmation

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
4. SCR-JUNK-003 and SCR-JUNK-004 with changed-field PATCH payloads and the shared confirmation dialog.
5. SCR-JUNK-005 using the same feature form as edit and the existing POST contract.
