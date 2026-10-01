# English Learning - Reading - Detailed Design

This document focuses on the Reading sub-skill in Hermes English Learning. Reading practice is delivered through Telegram and persisted through the REST API and PostgreSQL.

> Status: The revised database schema is implemented by `0010_align_reading_schema.ts`. Reading repository, API, frontend, and Hermes create examples use `title` and `content_text` directly. Optional-question, partial-answer, manual-status, and list/detail redesign behavior remains pending in the next implementation stages. Reading uses direct REST API calls, not MCP.

---

## 1. Goal

Provide English passages with adjustable difficulty, length, genre, and topic. Reading is useful on its own; comprehension questions are optional supplements grounded in the passage. Users may answer none, some, or all questions without grading or a requirement to finish them.

The approved list/detail design is [reading-approved.png](../frontend-design/reading-approved.png). The manual mark-read action sits beside the material title, matching Notes/Junk detail actions.

---

## 2. Defaults vs One-Off Overrides

Reading uses persistent defaults plus one-off overrides.

```text
Persistent defaults: A1, 300 words, min 250, max 350
        |
        +-- Daily cron -> uses defaults
        |
        +-- On-request -> may use one-off overrides
                "kasih reading C1 sekitar 600 kata tentang space"
                -> generate with C1 + 600-word target
                -> defaults remain A1 / 300 words / min 250 / max 350
                -> next request without override returns to defaults
```

- Permanent default changes require explicit commands, e.g. "ganti default level jadi B2".
- One-off requests may override level, target word count, and question count without changing defaults.
- Length is stored as word count, not labels like `short`, `medium`, or `long`.
- `reading_settings` stores `default_word_count`, `min_word_count`, and `max_word_count`.
- Explicit one-off requests may ask for a word count outside the default min/max range.
- `default_question_count` starts at 3 and accepts integers from 0 through 20. Zero means no questions.
- The effective question count is the explicit override, or the saved default when omitted. A zero override must not fall back to the default.
- Each material stores `target_question_count` as the generation snapshot. Changes to settings never reconfigure existing materials.
- Hermes generates the text and optional questions. The passive API resolves omitted parameters from settings and validates supplied content; it does not generate missing questions. Missing/empty questions are valid when the effective count is zero; a positive count requires the corresponding questions and reference answers.

---

## 3. Topics, Genre, and Tags

The user does not need to provide a specific topic. Hermes may choose topics freely with a few constraints:

- Topic selection should avoid repeating recent topics for several consecutive sessions.
- `genre` is stored as flexible text, not an enum. Initial default genres can include `essay`, `blog`, `story`, and `news`.
- Each material stores `tags` to support search, evaluation, and anti-repetition.
- Hermes should rotate genre/register so the user sees different kinds of English.

---

## 4. Comprehension Questions

Each reading material may include comprehension questions to support reflection.

### Key Principle

When questions are requested, questions and expected answers are generated and stored together with the passage. They must be grounded in the generated passage. A material without questions has no question or expected-answer rows.

This ensures:

- Questions are based on facts or ideas available in the passage.
- `expected_answer` is available for self-checking.
- The system does not need to regenerate reference answers later.

### Question Types by Genre

| Genre   | Example question focus                |
| ------- | ------------------------------------- |
| `news`  | When, where, who, what happened       |
| `story` | Plot, characters, conflict, message   |
| `essay` | Main argument, supporting points      |
| `blog`  | Opinion, examples, practical takeaway |

- Each passage has 0–20 questions, selected from the persistent default or a one-off override.
- Answers are free-form or short-form, not multiple choice.
- No answers are required. Only answered questions receive `reading_answers` rows; unanswered questions appear as `user_answer: null` in detail responses, not empty answer rows.
- Partial answers may be saved, continued, corrected, or cleared later. Saving a subset preserves omitted answers. An explicit `user_answer: null` clears an existing answer through soft deletion.
- Materials without questions must not create submissions or answers. Services validate question ownership and reject duplicate/unknown question numbers.

### Evaluation in MVP

- User answers are stored as-is.
- There is no automatic grading in MVP.
- Hermes does not classify answers as correct, partially correct, or incorrect.
- `expected_answer` is stored in `reading_questions` for self-checking only.
- Expected answers are shown only through an explicit request/action, regardless of whether any user answers exist, e.g. "lihat jawaban acuan reading RD-20260726-001".

Reading has no score, correctness classification, or answer-based completion state. Automatic grading is outside the accepted scope.

---

## 5. Code and Answer Resolution

Each reading material has a user-facing code that can be used from Telegram or FE.

Example:

```text
RD-20260726-001
```

Rules:

- `code` must be unique.
- `code` is shown when the passage is sent.
- Resolve answers to the unambiguous current material with questions, or an explicit material code. Read status is not an answer-targeting rule.
- The user can answer an older material explicitly by mentioning `code`.
- If Hermes is unsure which reading material the answer refers to, it must ask for confirmation before saving.
- Soft-deleted materials keep their code history; codes are not reused.

### Manual read status

- `reading_status` is stored on each material as `unread` or `read` and defaults to `unread`.
- It records an explicit user mark, independently from questions, submissions, and answers. It can be changed in either direction, including for materials without questions.
- Opening a material, scrolling, saving any number of answers, or opening reference answers does not change it.
- Existing materials migrate to `unread`, meaning not yet manually marked; never infer a read mark from a legacy submission.
- List labels are `Belum dibaca` and `Sudah dibaca`, with `Semua` as the unfiltered option. Answer counts remain separate information, not the status of the passage.
- Read timestamps and read-history tracking are outside this scope.

---

## 6. Full Flow

```text
Trigger: daily cron or on-request
        |
        v
Check request overrides:
  - if override exists, use override params
  - otherwise use reading_settings defaults
        |
        v
Generate passage:
  - choose topic
  - avoid recent repetition
  - rotate genre/register
  - use selected level and target length
        |
        v
If effective question count > 0:
  generate that many questions grounded in the passage
  generate expected_answer for each question
        |
        v
Save material + questions through the REST API
        |
        v
Send passage + material code + optional questions to Telegram Reading topic
        |
        v
User reads; may explicitly mark read/unread and optionally answer any subset
        |
        v
Hermes resolves target material:
  - default: unambiguous current material with questions
  - explicit: by material code
        |
        v
Hermes saves or updates only the provided answers through the REST API
        |
        v
Show expected answers only on explicit request; read status is independent
```

---

## 7. Database Schema

### `reading_settings`

One row representing the current user defaults.

| Column               | Type           | Notes                               |
| -------------------- | -------------- | ----------------------------------- |
| `id`                 | bigserial (PK) |                                     |
| `default_level`      | text           | CEFR level, e.g. `A1`.              |
| `default_word_count` | integer        | Default target word count.          |
| `min_word_count`     | integer        | Default lower bound for generation. |
| `max_word_count`     | integer        | Default upper bound for generation. |
| `default_question_count` | integer | Default question count; initially 3, allowed range 0–20. |
| `created_at`         | timestamp      |                                     |
| `updated_at`         | timestamp      | Last time defaults were changed.    |

### `reading_materials`

| Column              | Type                    | Notes                                                                        |
| ------------------- | ----------------------- | ---------------------------------------------------------------------------- |
| `id`                | bigserial (PK)          |                                                                              |
| `code`              | text, unique            | User-facing key for Telegram/FE. Example: `RD-20260726-001`.                 |
| `title`             | text                    | Reading title; renamed from `topic` without changing stored text.             |
| `level`             | text                    | Actual level used for this material. May differ from default if overridden.  |
| `genre`             | text                    | Flexible text, not enum. Initial examples: `essay`, `blog`, `story`, `news`. |
| `tags`              | text[]                  | Tags for search, evaluation, and anti-repetition.                            |
| `target_word_count` | integer                 | Target word count used during generation.                                    |
| `target_question_count` | integer, not null | Effective generation question count, 0–20; supplied explicitly by the writer. |
| `word_count`        | integer                 | Actual generated word count.                                                 |
| `content_text`      | text                    | Reading passage content; renamed from `passage_text`.                         |
| `reading_status`    | text, not null          | Manual `unread` / `read` mark; defaults to `unread`.                           |
| `is_override`       | boolean                 | True when this material used a one-off override.                             |
| `source`            | enum(`cron`, `request`) | Trigger source.                                                              |
| `created_at`        | timestamp               |                                                                              |
| `updated_at`        | timestamp               |                                                                              |
| `deleted_at`        | timestamp, nullable     | Soft delete; code is not reused.                                             |

### `reading_questions`

| Column            | Type                         | Notes                                                             |
| ----------------- | ---------------------------- | ----------------------------------------------------------------- |
| `id`              | bigserial (PK)               |                                                                   |
| `material_id`     | FK -> `reading_materials.id` |                                                                   |
| `question_number` | integer                      | Question order within the material.                               |
| `question_text`   | text                         |                                                                   |
| `expected_answer` | text                         | Reference answer grounded in the passage. Used for self-checking. |
| `created_at`      | timestamp                    |                                                                   |
| `updated_at`      | timestamp                    |                                                                   |
| `deleted_at`      | timestamp, nullable          | Soft delete.                                                      |

### `reading_submissions`

One row groups the material's saved user answers. It is created only when the user saves an answer and does not represent reading completion or grading.

| Column         | Type                         | Notes                                  |
| -------------- | ---------------------------- | -------------------------------------- |
| `id`           | bigserial (PK)               |                                        |
| `material_id`  | FK -> `reading_materials.id` |                                        |
| `submitted_at` | timestamp                    | First save of the answer group; not a completion timestamp. |
| `created_at`   | timestamp                    |                                        |
| `updated_at`   | timestamp                    |                                        |
| `deleted_at`   | timestamp, nullable          | Soft delete.                           |

Only one active submission is allowed per material. The uniqueness is enforced by a partial unique index on `material_id` where `deleted_at IS NULL`, so a new active submission can be created after an earlier submission is soft-deleted.

The approved answer workflow updates the existing active group rather than creating new attempts. The existing API's one-complete-submission rule is removed in its next implementation stage; no schema change to the child tables is required for partial answers.

### `reading_answers`

One row per answered question.

| Column          | Type                           | Notes                          |
| --------------- | ------------------------------ | ------------------------------ |
| `id`            | bigserial (PK)                 |                                |
| `submission_id` | FK -> `reading_submissions.id` | Parent answer session.         |
| `question_id`   | FK -> `reading_questions.id`   |                                |
| `user_answer`   | text                           | Stored as-is, without grading. |
| `created_at`    | timestamp                      |                                |
| `updated_at`    | timestamp                      |                                |
| `deleted_at`    | timestamp, nullable            | Soft delete.                   |

The unique `(submission_id, question_id)` pair remains. Clearing an answer soft-deletes it; filling it again must update/reactivate that row rather than inserting a duplicate. Question/material consistency and target-count/content consistency belong to the service transaction, not a new database trigger.

### Migration and field contracts

`0010_align_reading_schema.ts` preserves material IDs, codes, text, timestamps, tags, soft-delete history, questions, references, and answers. It backfills each material's `target_question_count` from all of its question rows, including deleted questions, so the generation snapshot is not changed by later soft deletion. Materials with no questions receive zero. Existing settings gain a default question count of 3 without changing their other values. Existing materials receive `unread` regardless of submissions.

Database constraints enforce 0–20 question counts and the two allowed read statuses. The partial index `(reading_status, created_at DESC, id DESC) WHERE deleted_at IS NULL` supports the approved status filter and stable created-date ordering.

Reading uses `title` and `content_text` directly in repository rows, service payloads, and API create/detail contracts; list responses use `title`. There are no aliases or fallbacks to the former `topic` or `passage_text` fields. The frontend consumes these new fields, exposing `contentText` to components in the same style as Notes. Hermes create examples use the same API names. Inserts explicitly persist the supplied question array length as `target_question_count`. Schema defaults do not enable optional questions, partial answer saving, or manual marking in the current HTTP API by themselves.

The migration's `down` restores the legacy column names and preserves material/question/answer rows. It removes the newly added settings count, target count, read marks, and status index; rolling back discards those new fields' values. Deploy the migration together with the matching repository SQL; use a safe `_test` database for verification.

---

## 8. Chat Response Templates

### When Passage Is Sent

```text
📖 Reading RD-20260726-001 — 26 Jul 2026
Topic: Earthquake in Japan (News) · Level A1 · ~280 words
Tags: news, natural-disaster, japan

[reading passage...]

Questions:
1. When did the event happen?
2. Where did it happen?
3. What was the magnitude?
4. What impact was mentioned in the news?
```

Omit the entire questions section when `target_question_count` is zero. There is no requirement to answer the passage's questions.

### After User Answers

```text
✅ Answer saved — RD-20260726-001 · Earthquake in Japan

Expected answers:
1. ...
2. ...
3. ...
4. ...
```

The expected-answer section above is included only if the user explicitly requests it; saving an answer alone does not reveal it.

### User Requests Expected Answers Directly

```text
User: "lihat jawaban acuan RD-20260726-001"

Expected answers — RD-20260726-001:
1. ...
2. ...
3. ...
4. ...
```

### On-Request With Override

```text
User: "reading C1 panjang tentang space exploration dong"

📖 Reading RD-20260726-002 — Request
Topic: Space Exploration (Essay) · Level C1 · ~600 words · ~4 min read
Tags: science, space, exploration

[reading passage...]

Questions:
...
```

---

## 9. Final Design Decisions

| Decision                 | Final Choice                                                                                           |
| ------------------------ | ------------------------------------------------------------------------------------------------------ |
| Reading level            | Persistent default; permanent change only through explicit command                                     |
| Text length              | Word count with `default_word_count`, `min_word_count`, and `max_word_count`; one-off override allowed |
| Cron topic source        | Hermes may choose freely while avoiding recent repetition                                              |
| Genre                    | Flexible text; initial defaults: `essay`, `blog`, `story`, `news`                                      |
| Tags                     | Stored per material for search, evaluation, and anti-repetition                                        |
| Code                     | Unique user-facing `code` for Telegram/FE reference                                                    |
| Answer target            | Unambiguous current material with questions, or explicit material `code`                                |
| Comprehension questions  | Optional; 0–20, persistent default 3 with one-off override                                               |
| Answer format            | Free-form/short-form, not multiple choice                                                              |
| Grading                  | None in MVP; user answers are stored as-is                                                             |
| Question generation time | Generated together with the passage                                                                    |
| `expected_answer`        | Stored when questions exist; revealed only by explicit request/action                                  |
| `target_word_count`      | Kept to compare intended generation length vs actual `word_count`                                      |
| `target_question_count`  | Generation snapshot, distinct from the live question count                                              |
| `reading_submissions`    | Kept as one updatable active group for optional/partial answers                                         |
| Reading status           | Explicit manual `reading_status: unread/read`, independent of submissions                                |
| Collection display       | Notes-style bounded list; footer uses returned item length, with no total-count query or pagination      |
| Delete behavior          | Soft delete using `deleted_at` for materials, questions, submissions, and answers                      |

---

## 10. Current API During the Database Stage

This section documents the current HTTP behavior for the staged rollout. The new field names are already implemented; the revised question/answer/status and collection behavior described above follows in the next stages.

`/api/v1/reading` provides `GET/PATCH /settings`, `POST /materials`, `GET /materials`, `GET /materials/:code`, `POST /materials/:code/submissions`, and `GET /materials/:code/expected-answers`.

Request bodies, query parameters, path parameters, and every response field use `snake_case` recursively.

`POST /materials` requires `title` and `content_text`; requests using only the old `topic` and `passage_text` names fail validation. Detail responses return `title` and `content_text`, and list items return `title`. Old field names are not emitted.

`GET /materials` searches `title`, `genre`, `tags`, and `code` case-insensitively. It supports `levels` as a comma-separated list of exact level values, exact `genre`, `status` (`unanswered` or `completed`), `page`, `limit` (maximum 100), and `sort` (`newest` or `oldest`). The legacy single `level` parameter remains accepted, but clients must not send it together with `levels`. PostgreSQL applies the filtering, stable `created_at`/`id` ordering, pagination, and active-row counts. `completed` means the material has one active complete submission; soft-deleted materials, submissions, questions, and answers are excluded.

The backend calculates response field `word_count` from the stored passage. A submission must contain every question exactly once; MVP permits one active complete submission per material and returns `409 READING_SUBMISSION_ALREADY_EXISTS` for a repeated submission while an active submission exists. Material detail excludes `expected_answer`; expected answers are retrieved only by the dedicated endpoint after submission or by explicit request.

### Approved API target — pending implementation

- Keep the implemented `title` and `content_text` names and expose `reading_status`, `target_question_count`, and `default_question_count` where relevant.
- Resolve omitted level, target word count, and target question count from saved settings. Explicit zero questions is valid; positive effective counts require matching question content.
- `PATCH /materials/:code` sets `reading_status` to `read` or `unread`; sending the target value makes retries idempotent.
- `PATCH /materials/:code/answers` saves/updates a subset, preserves omitted answers, and accepts an explicit null to clear a saved answer. Reject duplicate/unknown question numbers and answers for materials without questions.
- `GET /materials` supports `reading_status=read|unread`, search, levels, genre, `limit` (maximum 100), and sort. It returns `{ items: [...] }` without pagination metadata or a total-count query. Filtering and sorting happen before the limit. Remove legacy `status`, `page`, and SQL offset/count behavior in this API stage.
- The FE requests `limit=100`, shows `Menampilkan N bacaan` using `items.length`, and opens full detail directly. There is no list side-panel or pagination.
- Return a derived `content_excerpt` for list previews; do not store a redundant excerpt column or request each detail separately.
- Ordinary material responses exclude expected answers. Explicit reference-answer requests remain available independently of user answers.
