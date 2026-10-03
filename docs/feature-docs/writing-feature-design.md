# English Learning — Writing Design

> Updated: 2026-10-03. Backend implemented against the user-applied migration 0011.
> Hermes runtime and frontend integration with the new submission API are pending.

The [Writing submission contract](writing-submission-contract.md) defines exact API,
validation, schema, and error details. The [redesign proposal](writing-submission-redesign-proposal.md)
records the agreed flows and scenarios.

## 1. Purpose and ownership

Writing supports responses to generated exercises and independent free writing. Saving
text and requesting analysis are separate actions. Hermes generates prompts and AI
feedback; the backend validates and persists them through REST endpoints.

```text
writing/
├── writing.route.ts
├── writing-material/
├── writing-setting/
└── writing-submission/
```

Each submodule owns its route, validator, handler, service, repository, and types. The
parent route composes them. Services own business rules and transactions; only
repositories access PostgreSQL. Submission creation resolves an optional active material
through the material service.

## 2. Settings and prompt criteria

Persistent settings contain `default_level`, `default_word_count`, `min_word_count`, and
`max_word_count`. The default length must stay inside the configured positive range.
Permanent changes require an explicit settings update.

Daily prompts use defaults. By-request prompts may specify another topic, genre, level,
or target word count without changing defaults. Explicit requested length may be outside
the default range. Store actual criteria on the material and distinguish `source = cron`
from `source = request`.

Topics and genres are flexible text. Hermes should avoid recent topic repetition and
rotate genre/register. Initial genres include `journal`, `opinion`, `description`,
`story`, and `formal_essay`. Material tags support discovery and topic rotation.

## 3. Writing flows

| Flow | Material | Submission |
| --- | --- | --- |
| Daily | Hermes generates from defaults; `source = cron` | Linked to the delivered prompt |
| By request | Hermes generates from requested criteria and defaults; `source = request` | Linked to that prompt |
| Free writing | None | `material_id = null` |

1. For prompted writing, Hermes saves and delivers a material with its `WR` code.
2. Save the user's exact text through `POST /submissions`, optionally supplying `material_code`.
3. The backend calculates word count and returns a `WS` code. Estimates, feedback, and
   analysis time are initially null.
4. If the user requests analysis, Hermes reads the saved submission and optional material,
   generates feedback, then sends it to `PATCH /submissions/:code/analysis`.
5. The backend stores the result and analysis time atomically. Hermes can then show a
   concise summary and deliver the full corrected text when requested.

Explicit free writing must not attach to an unanswered prompt. For prompted responses,
use an explicit material code or unambiguous context; resolve an ambiguous target before
saving. The backend never chooses a material implicitly.

Analysis is optional and available through Telegram commands for this release. The
future web analysis CTA is inactive. No endpoint triggers or queues AI generation.
Analysis failure keeps the saved submission available for a later attempt using its
existing code.

## 4. Submission metadata and analysis

Material `topic`, `genre`, `tags`, and `level` describe the requested exercise. Submission
`estimated_topic`, `estimated_genre`, `estimated_tags`, and `estimated_level` describe the
actual writing. AI estimates these independently of prompt criteria. CEFR estimates use
A1, A2, B1, B2, C1, or C2.

Users may edit estimates before or after analysis. The first result fills only still-null
estimates and preserves manually supplied values, including an empty tag array. Metadata
corrections do not change feedback or `analyzed_at`.

| Analysis section | Content |
| --- | --- |
| `summary` | Overall feedback, strengths, priority improvements |
| `grammar` | Correction items, explanations, matching error count |
| `corrected_text` | Full corrected version |
| `vocabulary` | Repetition, better phrases, useful words |
| `structure` | Organization and coherence |
| `prompt_adherence` | Concise comparison against the prompt; null for free writing |
| `next_steps` | Actionable practice suggestions |

Prompt adherence statuses are `aligned`, `partially_aligned`, and `not_aligned`. A sports
response to a food prompt can be saved and analyzed normally; the feedback briefly
explains the mismatch. The estimate describes sports rather than copying the food topic.

`analysis_status` is computed from stored `analysis`: null means `not_analyzed`, an object
means `analyzed`. It is not a database column or a queue status.

## 5. Editing and identity

Original text is editable only before analysis. After analysis, a request containing
`original_text` returns `409 WRITING_SUBMISSION_TEXT_LOCKED`, even if it also contains
metadata or repeats the stored text. The service recalculates word count after permitted
text edits without trimming or normalizing the text.

Submission code and material association are creation-only. Analysis cannot be cleared
or replaced; repeated result writes return `409 WRITING_SUBMISSION_ALREADY_ANALYZED`.
Estimated metadata remains editable. Application writes explicitly refresh `updated_at`.

Material codes use `WR-YYYYMMDD-NNN`; submission codes use `WS-YYYYMMDD-NNN`. Each sequence
uses Jakarta creation dates, includes deleted rows, and expands beyond three digits.
Codes are not reused. Submissions are ordered by `created_at` and then internal `id`.

The final schema removes material `is_override` and submission `submission_number` /
`submitted_at`. Migration 0011 assumes empty Writing data and needs no backfill or
compatibility adapter. No database trigger implements the edit policy.

## 6. API surface

All paths below use `/api/v1/writing`, snake_case, strict Zod validation, and standard
response envelopes.

| Method / path | Responsibility |
| --- | --- |
| `GET/PATCH /settings` | Persistent prompt defaults |
| `POST /materials` | Persist a generated prompt |
| `GET /materials` | Material discovery and submission summaries |
| `GET /materials/:code` | Prompt details |
| `POST /submissions` | Save exact text with optional material |
| `GET /submissions` | Search/filter saved text with pagination |
| `GET /submissions/:code` | Text, metadata, status, and stored feedback |
| `PATCH /submissions/:code` | Permitted user edits |
| `PATCH /submissions/:code/analysis` | Persist complete Hermes-generated feedback |
| `GET /submissions/:code/corrected-text` | Stored corrected text; 409 before analysis |

Analysis result writes require Agent bearer authentication. Other Writing operations
accept Agent bearer or browser JWT authentication; browser writes require an allowed
Origin. The browser never receives the Agent key.

Material lists derive `unsubmitted` from zero active submissions, `submitted` from saved
submissions with no analyzed ones, and `reviewed` from at least one analyzed submission.
Responses include saved, analyzed, and unanalyzed counts plus `latest_submission_code`.
Submission lists support text search, material, writing type, analysis status, and stable
pagination. Deleted submissions and those with deleted parents are hidden; free writing
remains visible.

## 7. Remaining delivery work

Hermes runtime instructions need the save-first flow, `WS` references, and separate
analysis writes. Frontend adapters and screens need submission-code navigation,
free-writing save/read/edit, metadata corrections, and an inactive analysis CTA.

Reanalysis, automatic web-to-Hermes analysis requests, progress tracking, and cross-skill
vocabulary reuse are deferred.
