# Writing Submission Contract and Migration Preparation

> Updated: 2026-10-03. Development phases 1–2: contract defined and migration prepared.
> The migration has not been executed. The user owns database migration execution.
> New API handlers, Hermes instructions, and frontend workflows belong to later phases.

This document refines the [Writing redesign proposal](writing-submission-redesign-proposal.md).
It takes precedence over that proposal where implementation details differ. The original
[Writing design](writing-feature-design.md) describes the previous implementation pending phase 3.

## 1. Decisions and scope

Confirmed user decisions:

- Daily and by-request writing use a material; free writing has no material.
- Saving text and analyzing it are separate actions. Analysis is optional and explicit.
- After successful analysis, lock the original text. All four `estimated_*` fields remain
  editable by the user; correcting them does not rerun analysis or reset its status.
- For now, analysis is requested only by a direct Telegram command. The web shows an
  inactive analysis button; it must not imply that clicking starts or queues analysis.
- The target schema uses `created_at`, removes `submitted_at` and `submission_number`,
  and identifies submissions by their own codes.

Implementation conventions selected for this release:

- Submission code: `WS-YYYYMMDD-NNN`, using the Jakarta creation date. The sequence is
  shared across all Writing submissions for that day, includes soft-deleted rows, and
  expands beyond three digits without truncation. Material codes remain `WR-...`.
- `analysis_status` is a computed response field derived from `analysis`: SQL null means
  `not_analyzed`; an object means `analyzed`. There is no database status column.
  Collection filters use `analysis IS NULL` or `analysis IS NOT NULL`.
- Writing data is assumed empty. Migration 0011 changes only the schema: no backfill,
  existing-row updates, or historical-data conversion.
- Enforce text locking, analysis immutability, and code immutability in application code.
  Do not create a database guard function or update trigger.
- The application has not been used and Writing data is empty. Migration 0011 directly
  prepares the final schema: remove `submission_number` and `submitted_at`, require
  submission codes, and remove the old number-based index/unique constraint. There is
  no compatibility phase or later schema cutover.
- Remove material `is_override`. Store actual prompt criteria and `source`; one-off
  requests leave persistent defaults unchanged.

Reanalysis and an automatic web-to-Hermes integration are outside this release. A repeated result write must not silently replace existing
feedback. Revisiting those capabilities requires a separate contract change.

## 2. Edit guard

| Field / operation | `not_analyzed` | `analyzed` |
| --- | --- | --- |
| `original_text` | Editable | Locked |
| `word_count` | Recalculated by backend after text edits | Locked with the text |
| `estimated_topic`, `estimated_genre`, `estimated_tags`, `estimated_level` | May be supplied through a metadata edit | User may correct them |
| `material_code` | Set at creation; not a PATCH field | Not editable |
| `analysis` | Written through the dedicated result endpoint | No replacement/reset endpoint in this release |
| `analysis_status`, `analyzed_at`, timestamps | Backend/database-owned | Backend/database-owned |
| Identity (`code`, internal ID) | Not a user edit | Not a user edit |

The initial save always leaves estimates null. If a user manually supplies metadata
before analysis, the first result write fills only still-null fields and preserves those
user values. An empty tag array is an explicit value and must not be replaced. Metadata
correction requests supply non-null values; clearing to null is not a public operation.

Metadata edits do not rewrite the narrative feedback, `prompt_adherence`, or `analyzed_at`.
Feedback describes the text and assessment at analysis time; displayed metadata may
subsequently contain the user's corrections.

### API/service guard to implement in phase 3

1. Read the active submission. Return `404 WRITING_SUBMISSION_NOT_FOUND` if absent or
   soft-deleted. Submissions linked to a soft-deleted material follow the hidden-parent rule.
2. If `original_text` is present in a PATCH against an analyzed submission, reject the
   complete request with `409 WRITING_SUBMISSION_TEXT_LOCKED`, even if metadata is also
   present. Do not partially save a mixed request.
3. For a result write against an analyzed submission, return
   `409 WRITING_SUBMISSION_ALREADY_ANALYZED` before accepting new feedback.
4. Validate permitted fields and compose the result. Recalculate word count only when
   editing text; never trim or normalize the stored original text.
5. Save permitted changes and refresh `updated_at`. Persist generated feedback, estimates,
   and `analyzed_at` atomically, then compute response status from the stored `analysis`.

Hermes generates feedback outside a database transaction. After an uncertain HTTP
response, read the submission before retrying; do not create another submission.

### Application ownership

Phase 3 implements these guards in the service and strict input validation. Submission
code and material association are creation-only fields. Reject clearing or replacing
completed analysis; metadata corrections remain allowed. Every successful application
update, including soft delete, must refresh `updated_at` explicitly.
Failed or rejected writes leave both unchanged.

Migration 0011 creates no guard function or update trigger. Database constraints still
validate field shape, uniqueness, and references. The API derives `analysis_status` from
`analysis` on reads. Direct SQL updates do not enforce the text lock.
The service guards and their HTTP 409 responses are phase 3 work, not implemented in
phases 1–2.

## 3. Prepared final schema

Migration: `apps/api/migrations/0011_prepare_independent_writing_submissions.ts`.

| Column | Prepared database schema | Final API contract |
| --- | --- | --- |
| `id` | Existing `BIGSERIAL` primary key | Internal only |
| `code` | `TEXT NOT NULL UNIQUE` | Every submission has a `WS-...` code |
| `material_id` | Nullable existing FK | `material_code` or null externally |
| `original_text` | Existing text plus nonblank check | Required, exact user text |
| `word_count` | Existing positive integer | Backend-calculated |
| `estimated_topic` | Nullable `TEXT` | Null until available; user-correctable |
| `estimated_genre` | Nullable `TEXT` | Null until available; user-correctable |
| `estimated_tags` | Nullable `TEXT[]`, no empty-array default | Null until available; empty array is an explicit value |
| `estimated_level` | Existing `TEXT`, now nullable | Null until available; user-correctable CEFR estimate |
| `analysis` | Existing `JSONB`, now nullable; object check | Null or validated structured feedback |
| `analyzed_at` | Nullable `TIMESTAMPTZ` | Set by the result-write service on successful analysis |
| `created_at` | Existing timestamp | Sole submission creation timestamp |
| `updated_at` | Existing timestamp, explicitly refreshed by application writes | Last change, including metadata correction |
| `deleted_at` | Existing nullable timestamp | Soft delete |

Migration 0011 removes material `is_override`, submission `submission_number`/`submitted_at`,
and the dependent number constraint and index. Service code allocates submission codes
while holding a dedicated transaction advisory lock. Material codes remain in
`writing_materials`. `analysis_status` is computed by the API and has no stored column.

Indexes: unique code across all rows; active `(created_at DESC, id DESC)`; active material
`(material_id, created_at DESC, id DESC)`. No tag/search/status index is added without a
query-plan need.

`analysis` and `analyzed_at` are either both null or both present. The result-write service
must supply all estimated metadata and `analyzed_at` atomically.

### Field review

| Fields | Purpose / decision |
| --- | --- |
| `writing_materials.is_override` | Remove: no flow or UI consumes this flag; store actual prompt criteria instead. |
| `submission_number`, `submitted_at` | Removed: submission codes provide identity and `created_at` provides creation order. |
| Settings `default_level`, `default_word_count`, `min_word_count`, `max_word_count` | Keep: criteria and length guidance for daily prompts; settings validation/UI use the range. |
| Material `topic`, `prompt_text`, `level`, `genre`, `tags`, `target_word_count` | Keep: requested exercise criteria; distinct from estimates about the actual text. |
| Material `source` | Keep: distinguishes cron and by-request prompts. Free writing has no material. |
| `id`, `code`, `material_id` | Keep: internal identity, public reference, and optional prompt relationship. |
| `original_text`, `analysis`, all four `estimated_*` fields | Keep: user content, feedback, and editable estimates about the actual writing. |
| Submission `word_count` | Keep: calculated length for lists and feedback without counting full text on every read. |
| Submission `analysis_status` | Response/filter only: derive from `analysis`; omit the database column. |
| Submission `analyzed_at` | Keep: analysis time can differ from save time; metadata edits do not change it. |
| Submission `created_at`, `updated_at`, `deleted_at` | Keep: creation order, last change, and soft deletion. |
| Material `created_at`, `deleted_at`; settings `updated_at` | Keep: prompt ordering/visibility and the settings' last-change display. |

Two further simplification candidates are `writing_settings.created_at` and
`writing_materials.updated_at`. Neither is currently returned or consumed by Writing
flows. They are record timestamps in the existing design; this review flags them as
optional rather than a product requirement.

Analysis status, material review status/counts, and writing type are derived response
values; they require no additional persisted flags. Text locking follows stored analysis;
a separate `is_locked` field is unnecessary. There is no submission `source` column duplicating its optional material link.

## 4. Finalized API contracts for phase 3

All paths are below `/api/v1/writing`. These contracts are ready for implementation but
are not live endpoints yet. Requests/responses use snake_case and standard envelopes.
Use strict Zod objects to reject unknown or server-owned write fields.

### Save and read

`POST /submissions` → `201`. Body:

```json
{
  "material_code": null,
  "original_text": "I played football yesterday."
}
```

`material_code` may be omitted or null for free writing. A supplied code must resolve to
an active material. Require nonblank text, maximum 100,000 characters, preserving its
exact value. Do not accept metadata, feedback, status, code, word count, or timestamps
on initial creation. Return the complete saved submission.

`GET /submissions/:code` → `200`. Return `code`, nullable `material_code`, `original_text`,
`word_count`, all four nullable `estimated_*` fields, `analysis_status`, nullable `analysis`,
nullable `analyzed_at`, `created_at`, and `updated_at`.
Do not expose internal IDs.

`GET /submissions/:code/corrected-text` → `200` with `{ code, corrected_text }`, or
`409 WRITING_SUBMISSION_NOT_ANALYZED` when no feedback exists.

### Collection and material summaries

`GET /submissions` → `200` with `data.items` and `data.meta` containing `page`, `limit`,
`total`, `total_pages`.

| Query field | Contract |
| --- | --- |
| `q` | Optional trimmed nonempty text, max 500; literal case-insensitive substring across code, original text, estimated topic/genre/tags |
| `material_code` | Exact material filter; cannot combine with `writing_type=free` |
| `writing_type` | Optional `free` or `prompted`; omitted means both |
| `analysis_status` | Optional `not_analyzed` or `analyzed` |
| `page` | Positive integer, default 1 |
| `limit` | Integer 1–100, default 20 |
| `sort` | `newest` or `oldest`, default `newest` |

Items contain submission identity, material code, creation/update times, status,
estimated metadata, word count, and a maximum-200-character `text_excerpt`; full text
and feedback are detail-only. Include deleted parents/rows in neither list nor totals.
PostgreSQL performs filtering, ordering (`created_at`, then `id`), pagination, and counts.

For material lists, retain `unsubmitted` for zero active submissions. Add `submitted`
for one or more saved submissions with no analysis; `reviewed` means at least one active
analyzed submission. Return `submission_count`, `analyzed_submission_count`,
`unanalyzed_submission_count`, and `latest_submission_code`. Counts expose mixed states
even when the material is reviewed. Determine the latest submission by `(created_at, id)`.

### User edits

`PATCH /submissions/:code` → `200`. Require at least one permitted field. Example metadata correction after analysis:

```json
{
  "estimated_topic": "Sports",
  "estimated_genre": "opinion",
  "estimated_tags": ["football", "exercise"],
  "estimated_level": "B1"
}
```

Permitted fields are `original_text` and the four estimated fields, subject to section 2.
Topic: trimmed nonblank text up to 300 characters. Genre: up to 100. Tags: at most 50
nonblank strings, each up to 64 characters; `[]` is accepted. New level writes use the
CEFR codes A1, A2, B1, B2, C1, C2.

### Store generated analysis

`PATCH /submissions/:code/analysis` → `200`. Require the four estimated fields and the
full current-format `analysis`. The shape remains the original structured feedback contract with `prompt_adherence` replacing the two adherence fields.
For free writing it must be JSON null; for prompted writing it must contain an allowed
status (`aligned`, `partially_aligned`, `not_aligned`) and a short nonblank note.

Validate grammar `error_count` against the number of correction items. Estimated fields
use the same bounds as metadata edits. Fill still-null metadata, preserve prior manual
values, and persist feedback plus the server's `analyzed_at` together. Compute status
from saved `analysis` and return the updated submission.

Only the authenticated Hermes Agent may write generated analysis. A browser JWT alone
must receive `403 FORBIDDEN` on this endpoint. This is an authentication-mode boundary,
not a new user-role system. Ordinary saves/edits/reads use the existing Agent-or-browser
authentication. Implement the distinction in phase 3; no browser credential may contain
the internal Agent key.

### Safe errors

| HTTP | Code | Condition |
| --- | --- | --- |
| 400 | `VALIDATION_ERROR` | Invalid shape, values, unknown fields, or conflicting collection filters |
| 401 / 403 | Existing authentication errors | Missing/invalid credentials or browser-only analysis-result write |
| 404 | `WRITING_MATERIAL_NOT_FOUND` | Referenced material is missing/deleted |
| 404 | `WRITING_SUBMISSION_NOT_FOUND` | Submission is missing/deleted or hidden by a deleted parent |
| 409 | `WRITING_SUBMISSION_TEXT_LOCKED` | Text edit after analysis |
| 409 | `WRITING_SUBMISSION_ALREADY_ANALYZED` | Attempt to replace existing feedback |
| 409 | `WRITING_SUBMISSION_NOT_ANALYZED` | Corrected text requested before analysis |

## 5. Migration preparation and manual execution

The migration file is prepared only. No database status, migrate, rollback, or PostgreSQL
integration command is executed as part of this work, including against a test database.
SQL integration tests are provided for later manual verification.

The user can inspect pending migrations and apply them from the repository root:

```sh
bun run db:status
bun run db:migrate
```

The runner applies all pending migrations in sequence, not just Writing. Review the
status before running it. Migration 0011 assumes empty Writing data and performs no
backfill, data updates, or feedback conversion.

Migration 0011 prepares the final schema directly. Phase 3 implements the API using this
schema; phases 4–5 update Hermes and the frontend to submission-code navigation. There
is no historical link mapping, old writer adapter, or later cleanup migration.

Rollback takes a table lock and checks in migration TypeScript that both
`writing_materials` and `writing_submissions` are empty. It refuses rollback after any
material or submission has been saved, preserving its data and public identity. On an empty table, it restores the prior schema, including the
removed columns and index. This is a one-time rollback safeguard, not an application
update guard or a database function/trigger.

## 6. Verification and later work

The prepared PostgreSQL suite covers removal of obsolete columns, required submission
codes, free/prompted unanalyzed saves, deleted-code uniqueness, schema constraints,
empty-schema rollback, and refusal of rollback after materials or submissions exist.
Text edit guards, metadata correction, and timestamp updates need application-level
coverage when implemented in phase 3.

These tests execute migrations and reset only a configured `_test` database through the
existing test helper. They are intentionally not run under the user's manual-migration
instruction. Formatting, lint, type checks, and non-database tests can run independently.

Phase 3 implements the API contracts and safe error mapping. Phase 4 updates Hermes to
save first and analyze only on command. Phase 5 implements web save/read/edit and an
inactive analysis CTA. Automatic web-triggered analysis and reanalysis remain deferred.
