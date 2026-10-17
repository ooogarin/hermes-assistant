# English Learning - Grammar - Detailed Design

This document focuses on the Grammar sub-skill in Hermes English Learning. Grammar practice is delivered through Telegram and persisted through the REST API and PostgreSQL.

> Status: MVP design. The MVP uses direct REST API calls, not MCP.

---

## 1. Goal

Train English grammar through daily practice, on-request practice, and exam mode. Grammar includes grading, short feedback, and on-demand rule explanations.

---

## 2. Modes and Sources

Grammar has two modes:

| Mode       | Purpose                      | Feedback timing                                                 |
| ---------- | ---------------------------- | --------------------------------------------------------------- |
| `practice` | Learning and guided practice | Each question is evaluated as soon as it is answered            |
| `exam`     | Evaluation                   | Questions are evaluated only after the user submits all answers |

Grammar also tracks source:

| Source    | Meaning                                           |
| --------- | ------------------------------------------------- |
| `cron`    | Daily scheduled practice                          |
| `request` | User explicitly requested a practice/exam session |

Examples:

| mode       | source    | Example                     |
| ---------- | --------- | --------------------------- |
| `practice` | `cron`    | Daily 5-question practice   |
| `practice` | `request` | "kasih 5 soal past perfect" |
| `exam`     | `request` | "ujian grammar 50 soal"     |

---

## 3. Defaults vs One-Off Overrides

- `grammar_settings.default_level` is persistent.
- `grammar_settings.daily_question_count` defaults to 5 and can be changed explicitly.
- Daily cron practice uses the default level and daily question count.
- On-request practice can override level, grammar area, grammar point, question count, and question type for one session.
- Exam mode question count is requested by the user, e.g. "ujian grammar 50 soal".
- Permanent default changes require explicit commands.

---

## 4. Grammar Area, Grammar Point, and Question Type

Grammar question metadata uses three fields:

```text
grammar_area = "tenses"
grammar_point = "past perfect"
question_type = "fill_blank"
```

Definitions:

| Field           | Purpose                                      | Example                                                                                   |
| --------------- | -------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `grammar_area`  | High-level grouping for reports and rotation | `tenses`, `conditionals`, `prepositions`, `modals`, `passive_voice`                       |
| `grammar_point` | Specific grammar topic                       | `past perfect`, `conditional type 2`, `prepositions of place`                             |
| `question_type` | Exercise format                              | `fill_blank`, `error_correction`, `sentence_transformation`, `full_sentence_construction` |

Design decisions:

- `grammar_area`, `grammar_point`, and `question_type` are stored as text, not enums.
- Hermes may introduce new question types without schema migration.
- No `tags` field is needed for Grammar MVP. `grammar_area + grammar_point + question_type` is enough for rotation, reporting, and weakness analysis.
- Hermes should avoid repeating the same grammar point too often.
- Exam mode should vary grammar points and question types where possible.

---

## 5. Session Code and Resolution

Each grammar session has a user-facing `code`.

Example:

```text
GR-20260726-001
```

Rules:

- `code` must be unique.
- `code` is shown when a grammar session is sent.
- Questions are referenced by `code + question_number`.
- By default, answers and explanation requests apply to the latest active grammar session.
- The user can explicitly refer to an older session by mentioning `code`.
- If Hermes is unsure which session the user refers to, it must ask for confirmation.
- If the user answers late and Hermes cannot confidently map the answer to a session and question number, Hermes must ask for confirmation before saving or evaluating the answer.
- Soft-deleted sessions keep their code history; codes are not reused.

Ambiguous delayed answer example:

```text
User: "jawabannya went"
```

If multiple active or recent grammar sessions exist, Hermes should ask:

```text
This answer is for which grammar session and question number?
Example: GR-20260726-001 number 3
```

---

## 6. Explanation Behavior

`explanation` is generated together with each question and stored immediately.

Hermes does not show the full explanation by default. It only shows explanations when the user explicitly asks, for example:

```text
jelasin nomor 3
kenapa nomor 3 salah?
jelasin nomor 3 GR-20260726-001
```

The stored explanation can be requested multiple times. Hermes simply fetches `grammar_questions.explanation` and shows it again.

The user may also ask for a deeper explanation, similar to General English Q&A. Hermes can answer with a more detailed explanation conversationally, but this extra explanation does not need to be stored.

---

## 7. Grading Model

Grammar grading uses three result levels:

```text
correct
partial
incorrect
```

The aggregate session `score` weights these levels as `correct` = 1, `partial` = 0.5, and `incorrect` = 0, so a session score can carry a `.5` value.

`result` is nullable because exam answers can be stored before evaluation.

Grading differs by `question_type`:

| Question type                    | Grading behavior                                                                                               |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `fill_blank`, `error_correction` | Exact-answer style; compare against `correct_answer`, but allow `partial` for minor typo/capitalization issues |
| `sentence_transformation`        | Compare against required transformed structure; may be exact or semi-open                                      |
| `full_sentence_construction`     | AI judges against criteria stored in `correct_answer`                                                          |

For open-ended questions, `correct_answer` is not necessarily one exact answer. It can store grading criteria, e.g. "must use had + past participle and make sense in context".

Examples:

```text
Question: "She ___ (go) to school yesterday."
Correct answer: "went"
User answer: "Went"
Result: partial
Feedback: "Grammatically correct, but capitalization is unusual in the middle of a sentence."
```

```text
Question: "Create a sentence using past perfect."
Correct answer: "Must use had + V3 and make sense in context."
User answer: "I had finish my homework before dinner."
Result: partial
Feedback: "The past perfect structure is attempted, but 'finish' should be 'finished'."
```

---

## 8. Exam Answer Behavior

Exam mode intentionally delays grading until the user submits all answers.

During answer collection:

```text
grammar_answers.user_answer = filled
grammar_answers.result = null
grammar_answers.feedback = null
grammar_answers.answered_at = filled
grammar_answers.evaluated_at = null
```

After final evaluation:

```text
grammar_answers.result = correct / partial / incorrect
grammar_answers.feedback = filled when useful
grammar_answers.evaluated_at = filled
grammar_sessions.status = completed
grammar_sessions.completed_at = filled
grammar_sessions.score = calculated score
grammar_sessions.max_score = question_count
```

Practice mode evaluates immediately, so `answered_at` and `evaluated_at` are usually close together.

---

## 9. Full Flow

### Practice Mode

```text
Trigger: daily cron or on-request practice
        |
        v
Resolve parameters:
  - default or override level
  - question count
  - optional grammar_area / grammar_point / question_type
        |
        v
Generate questions with grammar_area + grammar_point + question_type
Generate correct_answer and explanation for each question
        |
        v
Save session + questions through the REST API
        |
        v
Send session code + questions to Telegram Grammar topic
        |
        v
User answers one or more questions
        |
        v
Hermes resolves latest active session or explicit session code
        |
        v
If session/question mapping is ambiguous, Hermes asks for confirmation
        |
        v
Hermes evaluates each answered question immediately
        |
        v
Hermes saves all answered questions in one bulk answer request
(user_answer + result + feedback per question_number)
        |
        v
The API marks the session completed once every question has an answer
        |
        v
Hermes sends concise feedback without full explanation
```

### Exam Mode

```text
Trigger: user requests exam
        |
        v
Resolve parameters:
  - question count from user
  - default or override level
  - optional grammar_area / grammar_point focus
        |
        v
Generate all questions at once
Generate correct_answer and explanation for each question
        |
        v
Save session + questions through the REST API
        |
        v
Send session code + all questions to Telegram Grammar topic
        |
        v
User answers all questions
        |
        v
Hermes stores answers in bulk without result if needed
        |
        v
Hermes evaluates all answers together after final submit
        |
        v
Hermes saves result + feedback + score through the REST API
        |
        v
Hermes sends final score report + breakdown by grammar_area / grammar_point
```

### Explanation On Demand

```text
User: "kenapa nomor 3 salah?"
        |
        v
Hermes resolves latest active session or explicit session code
        |
        v
If session/question mapping is ambiguous, Hermes asks for confirmation
        |
        v
Hermes fetches the stored explanation
        |
        v
Hermes shows the explanation
```

---

## 10. Direct REST API Responsibility

Hermes does not write directly to PostgreSQL. Hermes calls the backend REST API.

Hermes is responsible for:

- understanding user requests;
- generating questions;
- judging answers;
- preparing concise feedback;
- showing explanations when requested;
- preparing API payloads.

The backend API is responsible for:

- validating session codes and question references;
- storing sessions, questions, answers, and evaluations;
- calculating score and report data from stored results;
- updating session status;
- enforcing data consistency;
- querying summaries for FE/Telegram.

Flow:

```text
Telegram -> Hermes -> REST API -> PostgreSQL
```

Not:

```text
Hermes -> PostgreSQL
Hermes -> MCP -> REST API
```

---

## 11. Database Schema

### `grammar_settings`

One row representing current user defaults.

| Column                 | Type           | Notes                                        |
| ---------------------- | -------------- | -------------------------------------------- |
| `id`                   | bigserial (PK) |                                              |
| `default_level`        | text           | CEFR level, same pattern as Reading/Writing. |
| `daily_question_count` | integer        | Default 5, explicitly configurable.          |
| `created_at`           | timestamp      |                                              |
| `updated_at`           | timestamp      |                                              |

### `grammar_sessions`

| Column           | Type                                     | Notes                                                                      |
| ---------------- | ---------------------------------------- | -------------------------------------------------------------------------- |
| `id`             | bigserial (PK)                           |                                                                            |
| `code`           | text, unique                             | User-facing key for Telegram/FE. Example: `GR-20260726-001`.               |
| `mode`           | enum(`practice`, `exam`)                 | Practice gives immediate feedback; exam delays grading until final submit. |
| `source`         | enum(`cron`, `request`)                  | Trigger source.                                                            |
| `status`         | enum(`active`, `completed`, `abandoned`) | Current session state.                                                     |
| `level`          | text                                     | Actual level used for this session.                                        |
| `question_count` | integer                                  | Number of questions in the session.                                        |
| `score`          | numeric(5,2), nullable                        | Weighted score (`correct` = 1, `partial` = 0.5, `incorrect` = 0); set when the session completes.             |
| `max_score`      | integer, nullable                        | Usually equals `question_count` for exam.                                  |
| `started_at`     | timestamp                                |                                                                            |
| `completed_at`   | timestamp, nullable                      | Filled when session is completed.                                          |
| `created_at`     | timestamp                                |                                                                            |
| `updated_at`     | timestamp                                |                                                                            |
| `deleted_at`     | timestamp, nullable                      | Soft delete; code is not reused.                                           |

### `grammar_questions`

| Column            | Type                        | Notes                                                            |
| ----------------- | --------------------------- | ---------------------------------------------------------------- |
| `id`              | bigserial (PK)              |                                                                  |
| `session_id`      | FK -> `grammar_sessions.id` |                                                                  |
| `question_number` | integer                     | Order within the session.                                        |
| `question_type`   | text                        | Soft list. Hermes may introduce new types without migration.     |
| `grammar_area`    | text                        | High-level group, e.g. `tenses`, `conditionals`, `prepositions`. |
| `grammar_point`   | text                        | Specific point, e.g. `past perfect`, `conditional type 2`.       |
| `level`           | text                        | CEFR level for this question. Usually same as session level.     |
| `question_text`   | text                        |                                                                  |
| `correct_answer`  | text                        | Exact answer or grading criteria for open-ended questions.       |
| `explanation`     | text                        | Grammar rule explanation generated with the question.            |
| `created_at`      | timestamp                   |                                                                  |
| `updated_at`      | timestamp                   |                                                                  |
| `deleted_at`      | timestamp, nullable         | Soft delete.                                                     |

### `grammar_answers`

| Column         | Type                                              | Notes                                                          |
| -------------- | ------------------------------------------------- | -------------------------------------------------------------- |
| `id`           | bigserial (PK)                                    |                                                                |
| `question_id`  | FK -> `grammar_questions.id`                      |                                                                |
| `user_answer`  | text                                              | Stored as-is.                                                  |
| `result`       | enum(`correct`, `partial`, `incorrect`), nullable | Nullable until evaluation, especially in exam mode.            |
| `feedback`     | text, nullable                                    | Concise feedback. Usually filled for `partial` or `incorrect`. |
| `answered_at`  | timestamp, nullable                               | When the answer was submitted.                                 |
| `evaluated_at` | timestamp, nullable                               | When the answer was graded.                                    |
| `created_at`   | timestamp                                         |                                                                |
| `updated_at`   | timestamp                                         |                                                                |
| `deleted_at`   | timestamp, nullable                               | Soft delete.                                                   |

---

## 12. Chat Response Templates

### Practice - Send Questions

```text
📐 Grammar GR-20260726-001 — Practice · 26 Jul 2026
Level A1 · 5 questions

1. Fill the blank: "She ___ (go) to school yesterday."
2. Error correction: "He don't like coffee."
3. Create a sentence using past perfect about a travel experience.
4. Fill the blank: "If I ___ (know) earlier, I would have come."
5. Sentence transformation: "The chef cooked the meal." -> passive voice
```

### Practice - Concise Feedback

```text
2. ✓ Correct
3. 🟡 Partial — the structure is close, but the verb form needs correction.
   Type "jelasin nomor 3" for details.
```

### Explanation On Demand

```text
User: "jelasin nomor 3"

📖 Past Perfect — why "had finish" is incorrect
Rule: past perfect uses had + V3 / past participle, not V1.
"finish" should be "finished". Your sentence structure is close;
only the verb form needs correction.
```

### Exam Mode

```text
User: "ujian grammar 50 soal"

📝 Grammar Exam GR-20260726-002 — 50 questions · Level A1
[all questions are sent]

...user answers all questions...

📊 Exam Result — GR-20260726-002
Score: 38/50 (76%)

Breakdown:
- Tenses: 12/15
- Conditionals: 8/10
- Prepositions: 10/15
- Passive Voice: 8/10

Type "jelasin nomor X GR-20260726-002" to see a question explanation.
```

---

## 13. Final Design Decisions

| Decision                  | Final Choice                                                                                           |
| ------------------------- | ------------------------------------------------------------------------------------------------------ |
| Modes                     | `practice` and `exam`                                                                                  |
| Sources                   | `cron` and `request`                                                                                   |
| Daily practice            | Default 5 questions/day, configurable                                                                  |
| On-request practice       | Supported; can request count/topic/type without entering exam mode                                     |
| Exam question count       | User-defined                                                                                           |
| Level                     | Persistent default + one-off override                                                                  |
| Code                      | Unique user-facing `code`, e.g. `GR-20260726-001`                                                      |
| Answer/explanation target | Defaults to latest active session; can be explicit by session `code`                                   |
| Ambiguous delayed answers | Hermes must ask for `code` and question number before saving/evaluating                                |
| Session status            | `active`, `completed`, `abandoned`                                                                     |
| Grammar metadata          | `grammar_area + grammar_point + question_type`                                                         |
| Tags                      | Not included in Grammar MVP                                                                            |
| Question type             | Soft list stored as text                                                                               |
| Explanation               | Generated with the question; shown on demand; deeper follow-up explanations are allowed but not stored |
| Grading                   | `correct`, `partial`, `incorrect`; result is nullable until evaluated                                  |
| Answer submission         | One bulk `PUT .../answers` request; each item links to its question by `question_number`; subsets and overwrites are supported |
| Practice evaluation       | Immediate per answered question, saved in one bulk request                                             |
| Practice completion       | Automatic: the API completes the session with its score once every question has an answer               |
| Exam evaluation           | Delayed until final submission; answers may be stored before results                                   |
| Score                     | Weighted: `correct` = 1, `partial` = 0.5, `incorrect` = 0; stored as `numeric(5,2)`                   |
| API architecture          | Hermes calls REST API; API stores and queries PostgreSQL                                               |
| Delete behavior           | Soft delete using `deleted_at` for sessions, questions, and answers                                    |

---

## 14. MVP API Contract and Persistence Flow

The Grammar API is mounted below `/api/v1/grammar` and requires the internal bearer token.

Request bodies and every response field use `snake_case` recursively.

| Method | Path | Purpose |
| ------ | ---- | ------- |
| `GET` | `/api/v1/grammar/settings` | Read the persistent default level and daily question count. |
| `PATCH` | `/api/v1/grammar/settings` | Update `default_level` and/or `daily_question_count`. |
| `POST` | `/api/v1/grammar/sessions` | Save a generated practice or exam session with all questions, correct answers, and explanations. The backend generates the session code. |
| `GET` | `/api/v1/grammar/sessions` | List active, completed, or abandoned sessions with search, filters, and sorting. Soft-deleted sessions are excluded. |
| `GET` | `/api/v1/grammar/sessions/:code` | Read a session, its questions, and saved user answers. Correct answers and explanations are deliberately excluded. |
| `DELETE` | `/api/v1/grammar/sessions/:code` | Soft delete the session, questions, and answers together. |
| `PUT` | `/api/v1/grammar/sessions/:code/answers` | Save or replace one or more user answers in one request. Practice includes immediate evaluation per answer; exam stores unevaluated answers. |
| `GET` | `/api/v1/grammar/sessions/:code/questions/:question_number/explanation` | Fetch the stored explanation only when Hermes/user explicitly requests it. |
| `POST` | `/api/v1/grammar/sessions/:code/evaluate` | Save all exam results, calculate the score, and complete the session. |
| `GET` | `/api/v1/grammar/sessions/:code/report` | Return score and result breakdown grouped by grammar area. |

### Session collection

`GET /api/v1/grammar/sessions` accepts the following query parameters:

| Parameter | Values | Default | Notes |
| --- | --- | --- | --- |
| `q` | string | — | Case-insensitive search across the session code. |
| `status` | `active`, `completed`, `abandoned` | — | Exact status filter. |
| `mode` | `practice`, `exam` | — | Exact mode filter. |
| `level` | string | — | Exact level filter. |
| `limit` | integer `1..100` | `20` | Maximum number of items returned. |
| `sort` | `newest`, `oldest` | `newest` | Stable ordering by `started_at`, then session id. |

The collection reads only `grammar_sessions`; it does not join questions or answers. Each item includes `code`, `mode`, `source`, `status`, `level`, `question_count`, `score`, `max_score`, `started_at`, and `completed_at`. The response is `{ items: [...] }` with no pagination metadata and no total-count query.

### Create session

Hermes generates every question, correct answer, and explanation before calling the API. The backend stores the complete session and question batch in one transaction, generates `GR-YYYYMMDD-###` with the Jakarta calendar date, and then returns a safe session representation. `correct_answer` and `explanation` are never included in the ordinary session response.

### Bulk answer flow

Hermes saves answered questions through one request to
`PUT /api/v1/grammar/sessions/:code/answers`:

```json
{
  "answers": [
    { "question_number": 6, "user_answer": "what", "result": "correct", "feedback": null },
    { "question_number": 7, "user_answer": "on", "result": "correct" }
  ]
}
```

1. Each item links to its question by `question_number`; `user_answer` is required,
   `result` and `feedback` are optional. Send only the questions being answered now.
2. Practice requires `result` on every item; exam rejects `result` and `feedback`
   because evaluation stays deferred to the evaluate endpoint.
3. `question_number` values must be unique and must belong to the session; otherwise
   the API returns `400 INVALID_GRAMMAR_ANSWERS` and persists nothing.
4. The backend upserts every supplied answer in one transaction: a new answer is
   inserted and an existing answer for the same question is replaced (the single
   answer per question assumption holds for MVP; re-answering remains possible).
5. When the mode is practice and the upsert leaves every question with an answer,
   the same transaction completes the session: `status` becomes `completed`,
   `score` becomes the weighted sum of results (`correct` = 1, `partial` = 0.5,
   `incorrect` = 0), `max_score` becomes the session question count, and
   `completed_at` is set.
6. The response is the updated session. Exam sessions never auto-complete; only
   `/evaluate` completes them.

### Practice answer flow

1. Hermes evaluates every submitted answer before calling the API.
2. Hermes sends all answered questions in one bulk request with `user_answer`,
   `result`, and optional concise `feedback`.
3. The backend rejects the whole request when any practice answer lacks `result`,
   and it completes the session automatically once the last open question has an
   answer.

### Exam answer and evaluation flow

1. Hermes sends collected answers in bulk with `user_answer` only; `result` and
   `feedback` are absent.
2. The backend stores the answers but keeps their evaluation fields null.
3. After every question is answered, Hermes evaluates the full exam.
4. Hermes calls the evaluate endpoint with every `question_number`, `result`, and
   optional feedback exactly once.
5. The backend validates that all questions and answers are present, updates all evaluations in one transaction, computes `score` as the weighted sum of results (`correct` = 1, `partial` = 0.5, `incorrect` = 0), sets response field `max_score` to the session question count, and marks the session `completed`.

Exam results cannot be written through the individual answer endpoint, and a completed session cannot accept new answers or evaluations.
