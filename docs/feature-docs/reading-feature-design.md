# English Learning - Reading - Detailed Design

This document focuses on the Reading sub-skill in Hermes English Learning. Reading practice is delivered through Telegram and persisted through the REST API and PostgreSQL.

> Status: MVP design. The MVP uses direct REST API calls, not MCP.

---

## 1. Goal

Train reading comprehension through English passages with adjustable difficulty, length, genre, and topic. Each passage includes comprehension questions grounded in the passage content, so the activity is not just passive exposure.

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
- One-off requests may override level and target word count without changing defaults.
- Length is stored as word count, not labels like `short`, `medium`, or `long`.
- `reading_settings` stores `default_word_count`, `min_word_count`, and `max_word_count`.
- Explicit one-off requests may ask for a word count outside the default min/max range.

---

## 3. Topics, Genre, and Tags

The user does not need to provide a specific topic. Hermes may choose topics freely with a few constraints:

- Topic selection should avoid repeating recent topics for several consecutive sessions.
- `genre` is stored as flexible text, not an enum. Initial default genres can include `essay`, `blog`, `story`, and `news`.
- Each material stores `tags` to support search, evaluation, and anti-repetition.
- Hermes should rotate genre/register so the user sees different kinds of English.

---

## 4. Comprehension Questions

Each reading material includes comprehension questions to check understanding.

### Key Principle

Questions and expected answers are generated and stored together with the passage. They must be grounded in the generated passage.

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

- Each passage has 3-5 questions.
- Answers are free-form or short-form, not multiple choice.

### Evaluation in MVP

- User answers are stored as-is.
- There is no automatic grading in MVP.
- Hermes does not classify answers as correct, partially correct, or incorrect.
- `expected_answer` is stored in `reading_questions` for self-checking only.
- After the user answers all questions for a material, Hermes shows the expected answers by default.
- The user can also explicitly request expected answers earlier, e.g. "lihat jawaban acuan reading RD-20260726-001".

Future improvement: automatic grading can be added later, including support for factual vs interpretive question types. MVP focuses on reading exposure and reflective answering without grading overhead.

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
- By default, user answers are applied to the latest unanswered reading material.
- The user can answer an older material explicitly by mentioning `code`.
- If Hermes is unsure which reading material the answer refers to, it must ask for confirmation before saving.
- Soft-deleted materials keep their code history; codes are not reused.

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
Generate 3-5 comprehension questions from the passage
Generate expected_answer for each question
        |
        v
Save material + questions through the REST API
        |
        v
Send passage + material code + questions to Telegram Reading topic
        |
        v
User reads and answers later
        |
        v
Hermes resolves target material:
  - default: latest unanswered material
  - explicit: by material code
        |
        v
Hermes saves answer submission through the REST API
        |
        v
If all questions are answered, Hermes shows expected answers
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
| `created_at`         | timestamp      |                                     |
| `updated_at`         | timestamp      | Last time defaults were changed.    |

### `reading_materials`

| Column              | Type                    | Notes                                                                        |
| ------------------- | ----------------------- | ---------------------------------------------------------------------------- |
| `id`                | bigserial (PK)          |                                                                              |
| `code`              | text, unique            | User-facing key for Telegram/FE. Example: `RD-20260726-001`.                 |
| `topic`             | text                    | AI-generated topic.                                                          |
| `level`             | text                    | Actual level used for this material. May differ from default if overridden.  |
| `genre`             | text                    | Flexible text, not enum. Initial examples: `essay`, `blog`, `story`, `news`. |
| `tags`              | text[]                  | Tags for search, evaluation, and anti-repetition.                            |
| `target_word_count` | integer                 | Target word count used during generation.                                    |
| `word_count`        | integer                 | Actual generated word count.                                                 |
| `passage_text`      | text                    | Reading passage content.                                                     |
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

One row represents one answer session/attempt for a reading material.

| Column         | Type                         | Notes                                  |
| -------------- | ---------------------------- | -------------------------------------- |
| `id`           | bigserial (PK)               |                                        |
| `material_id`  | FK -> `reading_materials.id` |                                        |
| `submitted_at` | timestamp                    | When the answer session was submitted. |
| `created_at`   | timestamp                    |                                        |
| `updated_at`   | timestamp                    |                                        |
| `deleted_at`   | timestamp, nullable          | Soft delete.                           |

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

### After User Answers

```text
✅ Answer saved — RD-20260726-001 · Earthquake in Japan

Expected answers:
1. ...
2. ...
3. ...
4. ...
```

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
| Answer target            | Defaults to latest unanswered material; can be explicit by material `code`                             |
| Comprehension questions  | 3-5 per passage, grounded in the passage                                                               |
| Answer format            | Free-form/short-form, not multiple choice                                                              |
| Grading                  | None in MVP; user answers are stored as-is                                                             |
| Question generation time | Generated together with the passage                                                                    |
| `expected_answer`        | Stored for self-checking; shown after full answer submission or when requested                         |
| `target_word_count`      | Kept to compare intended generation length vs actual `word_count`                                      |
| `reading_submissions`    | Kept as the parent session/attempt for grouped answers                                                 |
| Delete behavior          | Soft delete using `deleted_at` for materials, questions, submissions, and answers                      |

---

## 10. MVP API Contract

`/api/v1/reading` provides `GET/PATCH /settings`, `POST /materials`, `GET /materials`, `GET /materials/:code`, `POST /materials/:code/submissions`, and `GET /materials/:code/expected-answers`.

Request bodies, query parameters, path parameters, and every response field use `snake_case` recursively.

`GET /materials` searches `topic`, `genre`, `tags`, and `code` case-insensitively. It supports `levels` as a comma-separated list of exact level values, exact `genre`, `status` (`unanswered` or `completed`), `page`, `limit` (maximum 100), and `sort` (`newest` or `oldest`). The legacy single `level` parameter remains accepted, but clients must not send it together with `levels`. PostgreSQL applies the filtering, stable `created_at`/`id` ordering, pagination, and active-row counts. `completed` means the material has one active complete submission; soft-deleted materials, submissions, questions, and answers are excluded.

The backend calculates response field `word_count` from the stored passage. A submission must contain every question exactly once; MVP permits one complete submission per material and returns `409 READING_SUBMISSION_ALREADY_EXISTS` for a repeated submission. Material detail excludes `expected_answer`; expected answers are retrieved only by the dedicated endpoint after submission or by explicit request.
