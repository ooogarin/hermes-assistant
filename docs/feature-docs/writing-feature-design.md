# English Learning - Writing - Detailed Design

This document focuses on the Writing sub-skill in Hermes English Learning. Writing practice is delivered through Telegram and persisted through the REST API and PostgreSQL.

> Status: MVP design. The MVP uses direct REST API calls, not MCP.

---

## 1. Goal

Train active English writing through AI-generated prompts and detailed feedback. Unlike Reading, Writing includes full analysis because corrections and structured feedback are central to improving active language production.

---

## 2. Defaults vs One-Off Overrides

Writing uses persistent defaults plus one-off overrides, following the same pattern as Reading.

```text
Persistent defaults: A1, 150 words, min 120, max 180
        |
        +-- Daily cron -> uses defaults
        |
        +-- On-request -> may use one-off overrides
                "writing C1 tentang AI, sekitar 300 kata, gaya esai formal"
                -> generate prompt with C1 + 300-word target + formal essay genre
                -> defaults remain unchanged
```

- Permanent default changes require explicit commands, e.g. "ganti default writing level jadi B2".
- One-off requests may override level, target word count, genre, or topic without changing defaults.
- Length is stored as word count, not labels like `short`, `medium`, or `long`.
- `writing_settings` stores `default_word_count`, `min_word_count`, and `max_word_count`.
- Explicit one-off requests may ask for a word count outside the default min/max range.

---

## 3. Topics, Genre, and Tags

Hermes may choose writing topics freely unless the user asks for a specific topic.

- Topic selection should avoid repeating recent topics.
- `genre` is stored as flexible text, not an enum.
- Initial default genres can include `journal`, `opinion`, `description`, `story`, and `formal_essay`.
- Each writing material stores `tags` to support search, evaluation, and anti-repetition.
- Hermes should rotate genre/register so the user practices different writing modes.

---

## 4. Code and Submission Resolution

Each writing prompt/material has a user-facing code that can be used from Telegram or FE.

Example:

```text
WR-20260726-001
```

Rules:

- `code` must be unique.
- `code` is shown when the prompt is sent.
- By default, user submissions are applied to the latest unanswered writing material.
- The user can submit to an older material explicitly by mentioning `code`.
- If Hermes is unsure which writing material the submission refers to, it must ask for confirmation before saving/analyzing.
- Soft-deleted materials keep their code history; codes are not reused.
- One writing material may have multiple submissions. This allows retries, revised drafts, and future progress comparison.

---

## 5. Full Flow

```text
Trigger: daily cron or on-request
        |
        v
Check request overrides:
  - if override exists, use override params
  - otherwise use writing_settings defaults
        |
        v
Generate writing prompt:
  - choose topic unless user provided one
  - avoid recent repetition
  - rotate genre/register
  - use selected level and target length
        |
        v
Save material through the REST API
        |
        v
Send prompt + material code to Telegram Writing topic
        |
        v
User submits writing later
        |
        v
Hermes resolves target material:
  - default: latest unanswered material
  - explicit: by material code
        |
        v
Hermes analyzes the writing
        |
        v
Hermes saves submission + analysis through the REST API
        |
        v
Hermes shows a concise analysis summary and offers review/correction details
```

---

## 6. Analysis Scope

Writing uses full analysis in MVP.

| Aspect                  | What Hermes analyzes                                                               |
| ----------------------- | ---------------------------------------------------------------------------------- |
| Grammar                 | Grammar mistakes with short explanations                                           |
| Corrected version       | Fully corrected version of the user's text                                         |
| Vocabulary              | Word choice, repeated words, alternative expressions                               |
| Structure and coherence | Paragraph flow, transitions, idea organization                                     |
| Estimated CEFR level    | Estimated writing level based on sentence complexity and vocabulary                |
| Topic adherence         | Whether the submission answers the assigned topic                                  |
| Genre adherence         | Whether the writing matches the requested genre/register                           |
| Next steps              | Small actionable exercises or revision suggestions based on the current submission |

Deferred to Phase 2:

- Progress tracking across submissions.
- Cross-skill vocabulary reuse from Reading/Listening materials.
- Automatic comparison between first draft and revised draft.

### Response Behavior

- Hermes does not send the full corrected version by default.
- Hermes first sends a concise feedback summary.
- Hermes offers review/correction details after the summary.
- The full `corrected_text` remains stored in the database and can be requested later.
- `summary` and `next_steps` are the main fields used for the first Telegram response.

Example follow-up commands:

```text
kirim versi perbaikannya WR-20260726-001
tampilkan feedback lengkap WR-20260726-001
```

---

## 7. Database Schema

### `writing_settings`

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

### `writing_materials`

Prompt/material generated by Hermes.

| Column              | Type                    | Notes                                                                                            |
| ------------------- | ----------------------- | ------------------------------------------------------------------------------------------------ |
| `id`                | bigserial (PK)          |                                                                                                  |
| `code`              | text, unique            | User-facing key for Telegram/FE. Example: `WR-20260726-001`.                                     |
| `topic`             | text                    | AI-generated or user-requested topic.                                                            |
| `prompt_text`       | text                    | Full writing prompt sent to the user.                                                            |
| `level`             | text                    | Actual level used for this material. May differ from default if overridden.                      |
| `genre`             | text                    | Flexible text, not enum. Examples: `journal`, `opinion`, `description`, `story`, `formal_essay`. |
| `tags`              | text[]                  | Tags for search, evaluation, and anti-repetition.                                                |
| `target_word_count` | integer                 | Target word count for the user's writing.                                                        |
| `is_override`       | boolean                 | True when this material used a one-off override.                                                 |
| `source`            | enum(`cron`, `request`) | Trigger source.                                                                                  |
| `created_at`        | timestamp               |                                                                                                  |
| `updated_at`        | timestamp               |                                                                                                  |
| `deleted_at`        | timestamp, nullable     | Soft delete; code is not reused.                                                                 |

### `writing_submissions`

One row represents one submitted draft/attempt for a writing material.

| Column            | Type                         | Notes                                                                                                                                     |
| ----------------- | ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `id`              | bigserial (PK)               |                                                                                                                                           |
| `material_id`     | FK -> `writing_materials.id` |                                                                                                                                           |
| `original_text`   | text                         | User's submitted writing.                                                                                                                 |
| `word_count`      | integer                      | Actual word count of `original_text`.                                                                                                     |
| `estimated_level` | text                         | Estimated CEFR level. Stored separately for filtering/querying.                                                                           |
| `analysis`        | JSONB                        | Structured narrative feedback: summary, grammar, corrected text, vocabulary, structure, topic adherence, genre adherence, and next steps. |
| `submitted_at`    | timestamp                    | When the user submitted the writing.                                                                                                      |
| `created_at`      | timestamp                    |                                                                                                                                           |
| `updated_at`      | timestamp                    |                                                                                                                                           |
| `deleted_at`      | timestamp, nullable          | Soft delete.                                                                                                                              |

### `analysis` JSONB Shape

`analysis` is stored as JSONB because Writing feedback is rich, narrative, and likely to evolve. However, it should not be an unstructured text blob. MVP should keep the top-level keys below stable so Telegram, FE, and future learning reports can reuse the same shape.

`estimated_level` stays as a separate DB column because it is likely to be queried and filtered directly. Other details can remain inside `analysis` for MVP. If a nested field becomes frequently queried later, it can be promoted to a separate column or materialized view.

```json
{
  "summary": {
    "overall_feedback": "Your writing is clear and easy to follow, but tense consistency needs work.",
    "strengths": ["Clear chronological flow", "Good topic relevance"],
    "priority_improvements": [
      "Past tense consistency",
      "More varied vocabulary"
    ]
  },
  "grammar": {
    "error_count": 2,
    "items": [
      {
        "original": "I go to office yesterday",
        "corrected": "I went to the office yesterday",
        "error_type": "past_tense",
        "explanation": "Use past tense for completed actions in the past."
      }
    ]
  },
  "corrected_text": "...",
  "vocabulary": {
    "repeated_words": [
      {
        "word": "good",
        "count": 4,
        "suggestions": ["great", "enjoyable", "productive"]
      }
    ],
    "better_phrases": [
      {
        "original": "very good",
        "suggestions": ["excellent", "highly effective"]
      }
    ],
    "new_useful_words": [
      {
        "word": "productive",
        "meaning": "able to produce good results",
        "example": "I had a productive meeting today."
      }
    ]
  },
  "structure": {
    "feedback": "The chronological flow is clear, but the final paragraph needs a stronger closing sentence.",
    "suggestions": [
      "Add a short conclusion that summarizes the main feeling or lesson."
    ]
  },
  "topic_adherence": {
    "status": "aligned",
    "notes": "The response answers the assigned topic."
  },
  "genre_adherence": {
    "status": "aligned",
    "notes": "The tone matches an informal journal style."
  },
  "next_steps": [
    "Practice past tense in 5 short sentences.",
    "Rewrite the final paragraph with a stronger conclusion."
  ]
}
```

Recommended status values:

- `topic_adherence.status`: `aligned`, `partially_aligned`, `off_topic`
- `genre_adherence.status`: `aligned`, `partially_aligned`, `not_aligned`

---

## 8. Chat Response Templates

### Daily Prompt

```text
✏️ Writing WR-20260726-001 — 26 Jul 2026
Topic: "Tell me about your work experience this week"
Genre: Journal · Level A1 · Target ~150 words
Tags: work, reflection, journal
```

### After Submission

```text
✅ Writing saved and analyzed — WR-20260726-001

📊 Estimated level: A1 · 142 words

Grammar: 2 notes
Vocab: "good" appears 4x; try alternatives like great, enjoyable, productive
Structure: clear chronological flow, but the final paragraph needs a stronger closing sentence
Topic: aligned
Genre: aligned with journal/informal style

Next steps:
1. Practice past tense in 5 short sentences.
2. Rewrite the final paragraph with a stronger conclusion.

I can send the corrected version or full feedback if you want.
```

### Corrected Version Follow-Up

```text
User: "kirim versi perbaikannya WR-20260726-001"

📄 Corrected version — WR-20260726-001

[corrected text...]
```

### On-Request With Override

```text
User: "writing C1 tentang teknologi AI, gaya esai formal"

✏️ Writing WR-20260726-002 — Request
Topic: The Impact of AI on Everyday Life
Genre: Formal Essay · Level C1 · Target ~300 words
Tags: technology, ai, formal-essay
```

---

## 9. Final Design Decisions

| Decision                     | Final Choice                                                                                                                                             |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Writing level                | Persistent default; permanent change only through explicit command                                                                                       |
| Text length                  | Word count with `default_word_count`, `min_word_count`, and `max_word_count`; one-off override allowed                                                   |
| Topic source                 | Hermes may choose freely unless user provides a topic; avoid recent repetition                                                                           |
| Genre                        | Flexible text; initial defaults: `journal`, `opinion`, `description`, `story`, `formal_essay`                                                            |
| Tags                         | Stored per material for search, evaluation, and anti-repetition                                                                                          |
| Code                         | Unique user-facing `code` for Telegram/FE reference                                                                                                      |
| Submission target            | Defaults to latest unanswered material; can be explicit by material `code`                                                                               |
| Multiple submissions         | Allowed; one material may have multiple submitted drafts/attempts                                                                                        |
| Analysis                     | Full structured analysis in MVP: summary, grammar, corrected version, vocabulary, structure, CEFR estimate, topic adherence, genre adherence, next steps |
| Progress tracking            | Deferred to Phase 2                                                                                                                                      |
| Cross-skill vocabulary reuse | Deferred to Phase 2                                                                                                                                      |
| Analysis storage             | One JSONB `analysis` column for narrative feedback, with `estimated_level` stored separately                                                             |
| Review/correction response   | Offered first; full corrected text is stored and sent only when requested                                                                                |
| Delete behavior              | Soft delete using `deleted_at` for materials and submissions                                                                                             |

---

## 10. MVP API Contract

`/api/v1/writing` provides `GET/PATCH /settings`, `POST /materials`, `GET /materials`, `GET /materials/:code`, `POST /materials/:code/submissions`, `GET /materials/:code/submissions/:submission_number`, and `GET /materials/:code/submissions/:submission_number/corrected-text`.

Request bodies, query parameters, path parameters, and every response field use `snake_case` recursively.

`GET /materials` searches `topic`, `prompt_text`, `genre`, `tags`, and `code` case-insensitively. It supports exact `level` and `genre` filters, `status` (`unsubmitted` or `reviewed`), `page`, `limit` (maximum 100), and `sort` (`newest` or `oldest`). PostgreSQL applies the filtering, stable `created_at`/`id` ordering, pagination, and active submission counts. `reviewed` means at least one active submission exists, which always has structured analysis under the current Hermes submission contract; soft-deleted materials and submissions are excluded. The list returns a 200-character `prompt_excerpt`, adding `...` only when the full prompt is longer.

The backend calculates response field `word_count` from request field `original_text`. Each draft receives a stable response field `submission_number` scoped to its material. The submission `analysis` is validated against the documented structured JSON shape and recursively returned as `snake_case`; ordinary submission detail may be used for full feedback, while the corrected text has a dedicated endpoint for on-demand Telegram delivery.
