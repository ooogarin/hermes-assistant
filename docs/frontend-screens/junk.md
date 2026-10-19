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

- Reuses the same feature form as edit for optional title, category, description, source URL, optional source name (maximum 200 characters), and tags.
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

- Header: `Junk` with no supporting subtitle; `Tambah Junk` stays alongside the title, outside the toolbar.
- A single control row below the header, in this order: search field with a `Cari` button, `Filter` button, then `Urutkan` control.
- `Cari` is disabled while the trimmed search field is empty. It is enabled only after the user has entered a non-whitespace keyword.
- `Filter` opens a dismissible advanced-filter popover for category, tag, source name/domain, exact source URL, and created-date range, with `Reset` and `Terapkan filter` actions.
- `Urutkan` is a compact ordinary sorter. The initial design offers newest first and oldest first by created date.
- An always-visible quick category filter chip row directly below the controls: `Semua`, `Artikel`, `Video`, `Musik`, `Quote`, and `Tool`. The chips are shortcuts for the soft-text `category` field, not a new fixed enum. Categories outside this shortcut set remain searchable through the advanced filter.
- One grouped table-like list surface with lightweight row separators.
- Columns always run `Judul / Cuplikan → Sumber → Kategori → Tags → Tanggal disimpan`. Date means `created_at`, not last update. All five columns remain available at every list width, including beside the preview, through horizontal scrolling inside the list surface. Title/preview stays pinned with an opaque background, no vertical divider, and only a soft separating shadow after scrolling away from the start. Its width adapts to the list container. A right-edge overflow shadow and footer hint indicate more columns; the overflowing scroll area supports keyboard focus and native keyboard, trackpad, and touch scrolling.
- Title uses at most two lines; excerpt is derived only from `content_text`, with normalized whitespace and a three-line ellipsis clamp. No stored preview field is added.
- Source is a separate plain-text column, never a nested hyperlink. Prefer `source_name`, then a recognized platform label (e.g. YouTube), then hostname without `www.`.
- Category uses colored text without an icon. Tags flow into the available row space and wrap naturally. Every tag that fits in the three-row excerpt-height area is shown; only overflow is replaced by `+N`, and at least one tag remains visible. Labels wrap inside chips without being cut off. Detail shows all tags.
- Code is omitted from the list and remains available with a copy action in detail metadata.
- The entire row is a keyboard-accessible link. There is no trailing chevron; hover, focus, and selected styling indicate the interaction. The table keeps the same column order when its detail panel is open; narrower widths allow horizontal scrolling without hiding the source or other columns.
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
GET /api/v1/junk?q=<keyword>&tag=<tag>&category=<category>&source=<name-or-domain>&source_url=<url>&from=<date>&to=<date>&sort=<newest|oldest>&limit=<1..100>
```

- `q` searches title, content text, category, tags, code, and source name/URL. It is sent only after an enabled `Cari` action.
- `tag`, `category`, and `source_url` are optional exact API filters. `source` matches a source name or URL substring; `from` and `to` filter Jakarta calendar dates inclusively. Category and tag values are sent as typed and canonicalized to lowercase by the API, while display labels preserve punctuation. The FE model exposes `sourceUrl`; the navigation query parameter and the API request both use `source_url`.
- UI tag chips may display `#` for readability, but the request sends the stored tag value without assuming that prefix is persisted.
- The frontend formats dates in the Indonesian locale and never displays an internal database ID.
- If `title` is null, the row uses a concise display fallback from available `contentText`, `sourceUrl`, or `rawText`; this is display-only and does not write a generated title back to the API.

**Known API limitations**

- The current list response has `limit` but no page, cursor, or total metadata. Do not display pagination until the API supports it.
- Filtering and sorting are handled by the API before the list limit is applied; the default order is newest saved date.
- The API has no category-vocabulary endpoint. Quick chips are a curated shortcut from the accepted design, not a complete list of categories; the advanced category field begins as text input.

**States**

| State | Behavior |
| --- | --- |
| Loading | Render list skeleton rows inside the existing list surface. |
| Initial empty | Explain that no Junk items have been saved yet; keep the header's manual-create action available. |
| No results | Keep the query/filter visible and show `Tidak ada Junk yang cocok` with `Hapus pencarian`. |
| Error | Keep search context visible and offer `Coba lagi` with safe non-technical copy. |

**Out of scope**

- Automated browser capture, uploads, media storage, or link archiving. Manual creation is in scope.
- Pagination UI before supporting API metadata exists.
- Pinning, random resurfacing, related-item linking, or automatic Notes-versus-Junk classification.

## SCR-JUNK-002 — Junk detail

**Purpose**  
Read one saved external item and understand its category, source, and saved description. On desktop this begins as a right-side supporting pane opened from SCR-JUNK-001.

**Entry points**

- Select a result from SCR-JUNK-001 to open `/junk?preview=:code`.
- Select the preview's open-page action or use a direct link to `/junk/:code`.

**UI composition**

- Side-panel header: `Detail` on the left; `⋮`, expand, and close icon buttons on the right. A divider separates this header from the reading content.
- The side-panel `⋮` disclosure contains only `Edit` and `Hapus`. Hapus opens confirmation.
- Body order: title → source link and clipboard icon → content → metadata. Category is shown only once, in metadata below content.
- Source link uses the natural display name and an external-link icon; its title exposes the actual URL. A clipboard-only button copies the original URL with accessible success/failure feedback. Open only HTTP(S) links in a new tab with safe rel attributes.
- Full-width primary content from `contentText`; missing content gets a quiet empty message. No nested description card.
- Metadata order: code with copy icon → category → saved date → updated date only when different → all tags.
- Full-page detail shares the same centered reading width and inner padding as Notes.
- Clipboard actions briefly show a check icon after a successful copy, then return to the clipboard icon after two seconds.
- Full-page detail alone includes a `Teks asli` switch aligned to the right of the source row (wrapping on narrow screens). Default off shows `contentText`; on immediately replaces the body with `rawText`, preserving whitespace. Title and metadata remain unchanged. Disable the switch with an explanation when raw text is unavailable. It does not edit data or fetch content from the source.

**Panel behavior**

- Close removes the `preview` query parameter and restores the full-width list state.
- The pane sits in the list-content area below the toolbar and quick filters. Opening it never changes toolbar width or placement.
- Open page navigates from `/junk?preview=:code` to standalone `/junk/:code`, replacing the list with full-page detail. The return control restores the list query and selected preview when opened from the list; direct entry returns to `/junk`.
- The standalone route uses a centered readable content width, keeps a compact return control, places direct `Edit` and `Hapus` buttons beside the title, and adds the full-page-only raw-text switch. It has no extra `Detail` header.
- The supporting pane becomes the full primary detail screen on narrow viewports.

**Data contract**

```text
GET /api/v1/junk/:code
```

- The detail view uses `code`, never a database ID.
- API fields `title`, `raw_text`, `content_text`, `source_url`, and `source_name` are nullable; the adapter exposes camelCase FE models.
- A name without a URL is plain text. No source displays `Tanpa sumber`; invalid/non-HTTP(S) URLs are never clickable. Do not fetch, archive, or embed external content.

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
- Editable fields: title, category, content text, source URL, source name, and tags.
- Empty source name saves null and restores the display fallback. Requests use snake_case API fields, preserving omitted fields on PATCH.
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

- Small dialog opened from `⋮ → Hapus` in preview or the direct `Hapus` button in full-page detail.
- Title names the affected item, using its title or code when the title is absent.
- Brief copy explains that the item will no longer appear in active results.
- Actions: secondary `Batal` and clearly destructive `Hapus`.
- On success in preview, close the pane and refresh the list while preserving filters. From full detail, return to the originating list filters (without the deleted selection), or `/junk` for direct entry, with a short success notice.

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
