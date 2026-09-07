# Grammar

Grammar supports practice and exam sessions. Hermes generates questions, correct answers, and explanations; the API persists them and controls session state.

## Endpoints

- `GET|PATCH /api/v1/grammar/settings`
- `POST /api/v1/grammar/sessions`
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

For scheduled practice, fetch settings first, read `default_level` and exactly `daily_question_count` from the response, then create a request with `mode: "practice"` and `source: "cron"`. For on-request work use `source: "request"`. Avoid recent repetition when conversation or API-visible context makes that possible.

## Answers

- Practice: evaluate immediately, then PUT `user_answer`, `result` (`correct|partial|incorrect`), and optional concise `feedback`. Do not show the full explanation unless requested.
- Exam: PUT each `user_answer` without result/feedback. After every question is answered, evaluate all answers once through `/evaluate`; then fetch `/report` for authoritative `score`, `max_score`, and breakdown.
- Explanation requests must use the explanation endpoint. A deeper conversational explanation need not be persisted.

Use an explicit `GR-...` code and question number when provided. If a delayed answer could belong to multiple sessions or questions, ask before saving or grading. Ordinary session responses deliberately omit correct answers and explanations; never claim they came from that response.
