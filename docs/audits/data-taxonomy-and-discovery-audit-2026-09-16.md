# Data Taxonomy and Discovery Audit — 2026-09-16

> Status: Partially implemented. The normalization and search items in this document
> are in place for Notes and Junk. The remaining items are a decision and delivery
> backlog, not an approved schema or API change. No recommendation in this document
> changes current behavior until its open decisions are approved and implemented
> through the normal migration, API, frontend, and Hermes-skill workflow.

## Scope

Audit how categorical and tag-like data is created, read, searched, and filtered in
Notes, Junk, Finance, Reading, Writing, and Grammar. The audit includes the Telegram
capture path where Hermes supplies metadata, and the web UI where users create, list,
search, and filter records.

The audit does not redesign content fields such as titles, descriptions, passages, or
user answers. The Telegram preview-output contract is tracked separately in
[hermes-agent.md](../hermes-agent.md).

## Summary

Free text is suitable for human content. It is not sufficient by itself for data used
as a facet, quick filter, rotation rule, or report grouping. The application mixes
those two purposes, which causes search and filter failures.

The desired model has four groups:

| Group | Storage rule | Examples |
| --- | --- | --- |
| Closed state | Enum or validated fixed code | note type, Finance transaction type, source, status, mode, answer result, CEFR level |
| Managed vocabulary | Canonical code plus user-facing label; aliases may map to a code | Notes/Junk category, Reading/Writing genre, Grammar area and question type |
| Canonical free tag | User/Hermes may create it, but it is normalized and deduplicated | `postgres`, `remote-work`, `old-pop` |
| Content/free text | Preserve meaning; do not use as an exact filter value | title, content, topic, source name, location, note, grammar point narrative |

## Evidence and current failure modes

### P0 — Legacy category values can hide visible data

The active Junk data observed during the audit contained the categories `Music`,
`Musik`, and `Quotes`, while the web quick filter uses `music` and `quote`.

The API owns the canonical form. Categories and tags are normalized to lowercase at
the request boundary, for writes and for filters alike, so `category=music` and
`category=Music` select the same rows. Notes and Junk behave the same way, and
repositories compare exactly against that canonical lowercase data.

Rows written before the boundary normalized still hold their original casing and are
not backfilled, so a legacy `Music` row stays invisible to `category=music`. The fix
for historical rows is a reviewed backfill, not a looser comparison.

See [junk.validator.ts](../../apps/api/src/modules/junk/junk.validator.ts),
[notes.validator.ts](../../apps/api/src/modules/notes/notes.validator.ts), and
[junk-toolbar.tsx](../../apps/web/src/components/junk/junk-toolbar.tsx).

### P1 — Free-text genre is filtered exactly

Reading currently stores `short_article`. The exact genre filter matches
`short_article` but not `Short Article`; the frontend exposes genre as a free-text
input. Writing has the same model. This makes a category-like filter depend on users
knowing the internal spelling.

See [learning list toolbar](../../apps/web/src/components/english/learning-list-toolbar.tsx),
[reading.validator.ts](../../apps/api/src/modules/reading/reading.validator.ts), and
[writing-material.validator.ts](../../apps/api/src/modules/writing/writing-material/writing-material.validator.ts).

### P1 — CEFR and Grammar reporting fields are too permissive

The web UI offers CEFR values A1–C2, but Reading, Writing, Grammar, and estimated
Writing level accept arbitrary text. Grammar also stores `grammar_area`,
`grammar_point`, and `question_type` as arbitrary text despite using them for rotation,
search, grading behavior, and reporting. Unnormalized variants would fragment filters
and aggregate reports.

## Resolved findings

### Search promise and search index differ

The Junk search placeholder promises title, quote, tag, source, and code search, while
its `search_vector` covers only title, content text, category, and tags. Notes keyword
search has the same shape.

Notes and Junk answer this outside the index. The list query matches `code`,
`category`, `source_name`, and `source_url` as case-insensitive substrings in addition
to the full-text vector, so a user can paste a stable code or remember a source host
without needing to know an exact filter value. `raw_text` stays out of the index
because it is the untouched original input, not the searchable representation.

See [Notes migration](../../apps/api/migrations/0001_create_notes.ts),
[Junk migration](../../apps/api/migrations/0002_create_junk_items.ts),
[notes.repository.ts](../../apps/api/src/modules/notes/notes.repository.ts), and
[junk.repository.ts](../../apps/api/src/modules/junk/junk.repository.ts).

### Junk frontend and API use different field names

The Junk API requires snake_case `content_text` and `source_url` fields and rejects
unknown keys. The frontend adapter in
[junk-api.ts](../../apps/web/src/features/junk/junk-api.ts) maps the camelCase FE
model to those snake_case request fields, and the browser navigation query parameter
uses the same `source_url` name as the API filter.

## Field decisions

| Domain | Field | Decision | Read/filter behavior | Frontend control |
| --- | --- | --- | --- | --- |
| Notes | `type` | Keep closed enum | Exact filter and quick chips | Select/chips |
| Notes | `category` | Managed vocabulary | Facet filter; include in broad search | Searchable creatable combobox |
| Notes | `tags` | Canonical free tags | Facet filter and broad search | Creatable multi-select with suggestions |
| Notes | `source` | Free text | Broad search; no exact source filter until a source model exists | Text input |
| Junk | `category` | Managed vocabulary | Facet filter; quick chips use canonical code | Searchable select, with an explicit new-category path only if approved |
| Junk | `tags` | Canonical free tags | Facet filter and broad search | Creatable multi-select with suggestions |
| Junk | `source_url` | Structured URL | Exact URL for dedup/look-up; host/domain facet for discovery | URL input; source-domain filter |
| Finance | category | Keep managed table/code model | Exact canonical code and reports | Existing select is the reference pattern |
| Reading/Writing | `level` | Closed CEFR code | Exact multi-filter | Existing A1–C2 multi-select |
| Reading/Writing | `genre` | Managed vocabulary | Facet filter and broad search | Searchable select/combobox |
| Reading/Writing | `tags` | Canonical free tags | Broad search now; facet filter when exposed | Read-only chips now; suggestions when authoring is added |
| Grammar | `level` | Closed CEFR code | Exact filter | CEFR select |
| Grammar | `grammar_area` | Managed vocabulary | Facet/report grouping | Select |
| Grammar | `question_type` | Managed registry | Governs generation/grading and reports | Select |
| Grammar | `grammar_point` | Managed child vocabulary under area | Facet/search/report grouping | Dependent searchable combobox |
| Writing feedback | `error_type` | Free text for now | Promote to managed vocabulary only when used for cross-submission reports | No new control needed |

## Frontend behavior

### Default preview/create/edit

Use a text field only for genuine free text. For a managed vocabulary, use a
searchable combobox that shows existing values and their usage count. If creating a
new value is approved, offer a deliberate action such as `Buat kategori baru “...”`
after checking for case-insensitive and alias matches.

`TagInput` already stores discrete tag values rather than comma-separated strings.
Extend it with autocomplete and canonical duplicate checks; do not replace it with one
large text field.

### List/search/filter

Separate broad search from facets:

- `q` should search user-visible text and stable codes: title/content, category label,
  tags, code, and source host where appropriate.
- Category, genre, area, and tag filters should offer existing facet values, never
  require a user to type an unknown exact database string.
- Tag filtering should support multiple tags. The operator choice is open: OR is a
  practical default; intersection must be explicit if offered.
- Junk source filtering should default to normalized host/domain. Exact full URL
  remains useful for deduplication or a specific known-link lookup.

Candidate API shape, subject to normal API-contract review:

```text
GET /api/v1/notes/facets
GET /api/v1/junk/facets
GET /api/v1/reading/materials/facets
GET /api/v1/writing/materials/facets
```

Each response should return canonical value, display label, and active-item count.
Returning facets beside a paginated list is also acceptable if pagination and filter
semantics remain unambiguous.

## Data-normalization rules

Notes and Junk normalize categories and tags at the API write and filter boundary and compare them exactly against that canonical lowercase form. The rules below extend that treatment to the remaining fields and domains. The parts that are still proposals are marked as such.

1. Normalize managed terms at the API write boundary, not only in the browser or
   Telegram skill. **Applied to Notes and Junk categories and tags.**
2. Match category and tag input case-insensitively after Unicode normalization, trim,
   and whitespace collapse. **Trim and case are applied to Notes and Junk. Unicode
   normalization and whitespace collapse remain proposed.**
3. Remove a leading `#` from tags and reject duplicates after canonicalization.
   **Duplicates are rejected for Notes and Junk. The leading `#` is not yet stripped.**
4. Store tags in one stable form. Lowercase kebab-case is the default proposal, for
   example `remote-work`; final formatting is an open decision for non-Latin text.
5. Store managed values by canonical code and show a separate display label. Use aliases
   to map `music` and `musik` to one approved category when applicable.
6. Backfill existing values before relying on exact canonical filters. Preserve the
   original user content; only metadata canonicalization is in scope.

## Delivery order

| Step | Status |
| --- | --- |
| Fix the Junk camelCase/snake_case request and query mismatch. | Done. The adapter maps the FE model to snake_case, and the browser query parameter uses the API field name. |
| Add server-side normalization and case-insensitive canonical lookup at every write boundary, including Telegram-sourced writes. | Done for Notes and Junk categories and tags. |
| Update list/search queries to use canonical fields and include the promised broad search fields. | Done. The list query matches code, category, and the source name/URL as case-insensitive substrings. |
| Decide canonical category mappings and tag representation; backfill current Notes and Junk metadata in a reversible, reviewed migration. | Pending. Requires the approved mappings below. |
| Add facet APIs and change Notes/Junk/Reading/Writing filters to selectable values. | Pending. |
| Introduce managed vocabularies for genre and Grammar metadata, then migrate historic values and update reporting. | Pending. |
| Add integration tests covering aliases, case variants, tags with `#`, legacy values, exact URL lookup, source-domain filtering, and multi-tag semantics. | Partial. Category and tag normalization, canonical filters, and the broad keyword search are covered. Aliases, `#` tags, legacy values, and multi-tag semantics still need coverage once the behavior is decided. |

## Open decisions

The following require an explicit product decision before implementation:

1. Should Notes and Junk categories use separate vocabularies, or one shared generic
   taxonomy? The audit recommends separate vocabularies because their meanings differ.
2. Which canonical mappings and aliases are approved? Initial candidates include
   `Music`/`Musik` → `music`, `Quotes` → `quote`, and
   `Tech/Programming` → `tech_programming`; they must not be backfilled without user
   approval.
3. May users create a new category from the browser, or are new values Hermes-only or
   admin-managed?
4. Should multi-tag filtering mean any selected tag (OR), every selected tag (AND), or
   expose both modes?
5. Does CEFR accept only A1–C2, or must historic non-CEFR values remain valid? The audit
   recommends a migration path that preserves legacy display data while rejecting new
   non-CEFR writes.

## Acceptance criteria

- A quick filter returns records displayed under its matching category, independent of
  historical casing or approved aliases. **Casing is satisfied. Approved aliases
  require the vocabulary decisions below.**
- Creating `Music`, `musik`, or `music` cannot create three separate canonical
  categories. **Satisfied for casing. `Musik` and `Quotes` remain separate legacy
  values until a backfill is approved.**
- `#Postgres` and `postgres` cannot create duplicate canonical tags.
- The default browser filters can be selected from server-authoritative vocabulary
  values and do not apply incomplete client-side filtering.
- Junk URL filtering sends the documented snake_case API field; create and edit payloads
  also use the documented field names. **Satisfied.**
- Broad search behavior matches visible UI copy and includes stable codes. **Satisfied
  for Notes and Junk.**
- Finance category behavior remains unchanged.
- Existing active records stay readable and are covered by migration and integration
  tests before the new exact-filter contract is enforced.
