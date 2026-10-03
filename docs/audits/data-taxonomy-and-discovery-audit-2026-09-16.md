# Data Taxonomy and Discovery Audit — 2026-09-16

> Status: Deferred implementation. This is a decision and delivery backlog, not an
> approved schema or API change. No recommendation in this document changes current
> behavior until its open decisions are approved and implemented through the normal
> migration, API, frontend, and Hermes-skill workflow.

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
as a facet, quick filter, rotation rule, or report grouping. The current application
mixes those two purposes, which already causes search and filter failures.

The desired model has four groups:

| Group | Storage rule | Examples |
| --- | --- | --- |
| Closed state | Enum or validated fixed code | note type, Finance transaction type, source, status, mode, answer result, CEFR level |
| Managed vocabulary | Canonical code plus user-facing label; aliases may map to a code | Notes/Junk category, Reading/Writing genre, Grammar area and question type |
| Canonical free tag | User/Hermes may create it, but it is normalized and deduplicated | `postgres`, `remote-work`, `old-pop` |
| Content/free text | Preserve meaning; do not use as an exact filter value | title, content, topic, source name, location, note, grammar point narrative |

## Evidence and current failure modes

### P0 — Junk category quick filters can hide visible data

The active Junk data observed during the audit contained the categories `Music`,
`Musik`, and `Quotes`. The web quick filter uses `music` and `quote`, while the API
uses exact case-sensitive comparison. Read-only API checks returned:

| Query | Matching items |
| --- | ---: |
| `category=music` | 0 |
| `category=Music` | 1 |
| `category=Musik` | 1 |
| `tag=musik` | 0 |
| `tag=Musik` | 2 |

The same failure mode exists for Notes: `category=tech/programming` returned no
results while `category=Tech/Programming` returned two; `tag=Postgres` returned no
results while `tag=postgres` returned two.

The API performs exact `category` and `tag` comparison in
[notes.repository.ts](../../apps/api/src/modules/notes/notes.repository.ts) and
[junk.repository.ts](../../apps/api/src/modules/junk/junk.repository.ts). The Junk
quick-filter values are hardcoded in
[junk-toolbar.tsx](../../apps/web/src/components/junk/junk-toolbar.tsx).

### P0 — Junk frontend and API use different field names

The Junk API requires snake_case `content_text` and `source_url` fields and rejects
unknown keys. The frontend creates request objects using `contentText` and `sourceUrl`;
the list also serializes `sourceUrl` rather than `source_url`. As a result, a source
URL filter is rejected with `400`, and create/edit requests containing the camelCase
fields do not meet the strict API contract.

This transport mismatch must be fixed before taxonomy work because it blocks normal
Junk create and filter flows. See [junk.validator.ts](../../apps/api/src/modules/junk/junk.validator.ts),
[junk-api.ts](../../apps/web/src/features/junk/junk-api.ts), and
[Junk list page](../../apps/web/src/features/junk/list/page.tsx).

### P1 — Search promise and search index differ

The Junk search placeholder promises title, quote, tag, source, and code search, but
its `search_vector` excludes `code`, `source_url`, and `raw_text`. Notes keyword
search similarly excludes `category`, `source`, and code. A user should be able to
paste a stable code or remember a source host without needing to know an exact filter
value.

See [Notes migration](../../apps/api/migrations/0001_create_notes.ts) and
[Junk migration](../../apps/api/migrations/0002_create_junk_items.ts).

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

These rules are proposed, not yet implemented:

1. Normalize managed terms at the API write boundary, not only in the browser or
   Telegram skill.
2. Match category and tag input case-insensitively after Unicode normalization, trim,
   and whitespace collapse.
3. Remove a leading `#` from tags and reject duplicates after canonicalization.
4. Store tags in one stable form. Lowercase kebab-case is the default proposal, for
   example `remote-work`; final formatting is an open decision for non-Latin text.
5. Store managed values by canonical code and show a separate display label. Use aliases
   to map `music` and `musik` to one approved category when applicable.
6. Backfill existing values before relying on exact canonical filters. Preserve the
   original user content; only metadata canonicalization is in scope.

## Delivery order

1. Fix the Junk camelCase/snake_case request and query mismatch.
2. Decide canonical category mappings and tag representation; backfill current Notes
   and Junk metadata in a reversible, reviewed migration.
3. Add server-side normalization and case-insensitive canonical lookup at every write
   boundary, including Telegram-sourced writes.
4. Update list/search queries to use canonical fields and include the promised broad
   search fields.
5. Add facet APIs and change Notes/Junk/Reading/Writing filters to selectable values.
6. Introduce managed vocabularies for genre and Grammar metadata, then migrate historic
   values and update reporting.
7. Add integration tests covering aliases, case variants, tags with `#`, legacy values,
   exact URL lookup, source-domain filtering, and multi-tag semantics.

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

## Acceptance criteria for a future implementation

- A quick filter returns records displayed under its matching category, independent of
  historical casing or approved aliases.
- Creating `Music`, `musik`, or `music` cannot create three separate canonical
  categories.
- `#Postgres` and `postgres` cannot create duplicate canonical tags.
- The default browser filters can be selected from server-authoritative vocabulary
  values and do not apply incomplete client-side filtering.
- Junk URL filtering sends the documented snake_case API field; create and edit payloads
  also use the documented field names.
- Broad search behavior matches visible UI copy and includes stable codes.
- Finance category behavior remains unchanged.
- Existing active records stay readable and are covered by migration and integration
  tests before the new exact-filter contract is enforced.
