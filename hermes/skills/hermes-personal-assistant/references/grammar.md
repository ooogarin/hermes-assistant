# Grammar

Grammar supports practice and exam sessions. Hermes generates questions, correct answers, and explanations; the API persists them and controls session state.

## Endpoints

- `GET|PATCH /api/v1/grammar/settings`
- `POST /api/v1/grammar/sessions`
- `GET /api/v1/grammar/sessions` lists sessions; filters include `q`, `status`, `mode`,
  `level`, `page`, `limit`, and `sort=newest|oldest`.
- `GET|DELETE /api/v1/grammar/sessions/:code`
- `PUT /api/v1/grammar/sessions/:code/answers`
- `GET /api/v1/grammar/sessions/:code/questions/:question_number/explanation`
- `POST /api/v1/grammar/sessions/:code/evaluate`
- `GET /api/v1/grammar/sessions/:code/report`

Create session body:

```json
{
  "mode": "practice",
  "source": "request",
  "level": "B1",
  "questions": [
    {
      "question_type": "fill_blank",
      "grammar_area": "tenses",
      "grammar_point": "present perfect",
      "level": "B1",
      "question_text": "She ___ already finished.",
      "correct_answer": "has",
      "explanation": "Use has with third-person singular in the present perfect."
    }
  ]
}
```

## Create Session Flow

1. Identify `mode`: use `practice` for guided learning and `exam` only when the user
   asks for an exam or delayed grading.
2. Identify `level`, question count, and any requested `grammar_area`,
   `grammar_point`, or `question_type`. If level or daily count is not specified for a
   default-based request, first read Grammar settings.
3. Generate every question before creating the session. Each question needs exactly one
   `question_type`, `grammar_area`, `grammar_point`, `level`, `question_text`,
   `correct_answer`, and `explanation`.
4. Make questions answerable and unambiguous. For open-ended questions, make
   `correct_answer` a grading criterion rather than pretending there is only one valid
   sentence.
5. Avoid repeating the same recent grammar point when the current session/history makes
   that visible. Do not reveal `correct_answer` or the full `explanation` in the initial
   question message.
6. Create one session with `POST /api/v1/grammar/sessions`, then show the returned
   `GR-...` code, mode, level, count, and questions.

Do not change persistent settings when the user gives a one-off request such as
`grammar B2 10 soal`. A default-setting change requires the user to request it, then
to confirm the exact current and proposed values after Hermes presents them.

## Telegram Output Format

For a created session, use this structure and do not reveal `correct_answer` or the
full `explanation`:

```text
✅ *GR-20260921-001*
*Mode:* Latihan
*Level:* B1
*Jumlah soal:* 5
*Grammar point:* Simple present

✏️ *Soal*
1. She ___ to work every day.
2. ...

────────

_Balas dengan nomor jawaban, misalnya `1. goes`._
```

For a listing, use `📋 *Sesi Grammar*` and show each session's code, mode, level,
question count, and status as one compact item. For practice feedback, show the
result, a concise correction, and short feedback; reveal the full explanation only
when requested. For a completed exam/report, show the API-returned score and summary
without reproducing the internal payload.

For scheduled practice, fetch settings first, read `default_level` and exactly `daily_question_count` from the response, then create a request with `mode: "practice"` and `source: "cron"`. For on-request work use `source: "request"`. Avoid recent repetition when conversation or API-visible context makes that possible.

## Answers

Answers are saved through one bulk endpoint. Every item links to its question by
`question_number`; send only the questions being answered now.

```json
{
  "answers": [
    { "question_number": 1, "user_answer": "went", "result": "correct", "feedback": null },
    { "question_number": 2, "user_answer": "go", "result": "incorrect", "feedback": "Use went." }
  ]
}
```

- Practice: evaluate every submitted answer first, then send one `PUT` with
  `user_answer`, `result` (`correct|partial|incorrect`), and optional concise
  `feedback` for each. Do not show the full explanation unless requested. When the
  last open question of a practice session is answered, the API marks the session
  `completed` with its score.
- Exam: send the same `PUT` without `result` or `feedback` (answers stay
  unevaluated). After every question is answered, evaluate all answers once through
  `/evaluate`; then fetch `/report` for authoritative `score`, `max_score`, and
  breakdown.
- The session `score` is weighted: `correct` counts 1, `partial` counts 0.5, and
  `incorrect` counts 0, so a score can be a decimal such as `1.5`. `max_score`
  equals the session question count.
- Answering in waves is supported: each `PUT` may contain any subset of questions,
  and re-sending a question replaces its saved answer.
- `400 INVALID_GRAMMAR_ANSWERS` means a `question_number` is unknown to the session
  or duplicated; do not retry the same body, resolve the session state instead.
- Explanation requests must use the explanation endpoint. A deeper conversational
  explanation need not be persisted.

For practice, the order is: evaluate the answers in context, save them in one
request, then send concise feedback. For an exam, save answers without results
during collection and send exactly one evaluation request after all answers have
been received.

An ordinary answer message such as `went` is not enough when more than one active
session/question could match. Ask for `GR-...` and the question number before calling
the API.

## Settings and Session Commands

- `"setting grammar saya"` → `GET /api/v1/grammar/settings`.
- `"ubah default grammar ke B2"` → show the current and proposed `default_level`,
  then PATCH only after explicit confirmation.
- `"jadikan latihan harian 10 soal"` → update only `daily_question_count` through
  `PATCH` after confirming that the user means the persistent default.
- `"tampilkan sesi grammar aktif"` → list sessions with `status=active`.
- `"hapus sesi GR-..."` → fetch/resolve the explicit code, show the target, then
  soft-delete it with `DELETE` only after explicit confirmation; do not delete based
  on a vague title.

When the user says `preview` or `jangan call API`, do not read settings or session
state. Use the parent skill's preview levels: default shows the proposed exercise in
normal Telegram chat format, `preview payload only` shows only the request body, and
`full preview` shows both plus request details. Default/full previews mark the session
as not created; payload-only renders the exact JSON body only.

Use an explicit `GR-...` code and question number when provided. If a delayed answer could belong to multiple sessions or questions, ask before saving or grading. Ordinary session responses deliberately omit correct answers and explanations; never claim they came from that response.
