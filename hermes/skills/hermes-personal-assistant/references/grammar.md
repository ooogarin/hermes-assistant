# Grammar

Grammar supports practice and exam sessions. Hermes generates questions, correct answers, and explanations; the API persists them and controls session state.

## Endpoints

- `GET|PATCH /api/v1/grammar/settings`
- `POST /api/v1/grammar/sessions`
- `GET /api/v1/grammar/sessions` lists sessions; filters include `q`, `status`, `mode`,
  `level`, `page`, `limit`, and `sort=newest|oldest`.
- `GET|DELETE /api/v1/grammar/sessions/:code`
- `PUT /api/v1/grammar/sessions/:code/questions/:question_number/answer`
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
`grammar B2 10 soal`. Update settings only when the user explicitly says to change the
default.

For scheduled practice, fetch settings first, read `default_level` and exactly `daily_question_count` from the response, then create a request with `mode: "practice"` and `source: "cron"`. For on-request work use `source: "request"`. Avoid recent repetition when conversation or API-visible context makes that possible.

## Answers

- Practice: evaluate immediately, then PUT `user_answer`, `result` (`correct|partial|incorrect`), and optional concise `feedback`. Do not show the full explanation unless requested.
- Exam: PUT each `user_answer` without result/feedback. After every question is answered, evaluate all answers once through `/evaluate`; then fetch `/report` for authoritative `score`, `max_score`, and breakdown.
- Explanation requests must use the explanation endpoint. A deeper conversational explanation need not be persisted.

For practice, the order is: evaluate the answer in context, save it immediately, then
send concise feedback. For an exam, save answers without results during collection and
send exactly one evaluation request after all answers have been received.

An ordinary answer message such as `went` is not enough when more than one active
session/question could match. Ask for `GR-...` and the question number before calling
the API.

## Settings and Session Commands

- `"setting grammar saya"` → `GET /api/v1/grammar/settings`.
- `"ubah default grammar ke B2"` → update only `default_level` through `PATCH`.
- `"jadikan latihan harian 10 soal"` → update only `daily_question_count` through
  `PATCH` after confirming that the user means the persistent default.
- `"tampilkan sesi grammar aktif"` → list sessions with `status=active`.
- `"hapus sesi GR-..."` → fetch/resolve the explicit code, then soft-delete it with
  `DELETE`; do not delete based on a vague title.

When the user says `preview` or `jangan call API`, do not read settings or session
state. Show the proposed mode, level, question count, and a sample/request payload, and
mark the session as not created.

Use an explicit `GR-...` code and question number when provided. If a delayed answer could belong to multiple sessions or questions, ask before saving or grading. Ordinary session responses deliberately omit correct answers and explanations; never claim they came from that response.
