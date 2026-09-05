# Grammar

Grammar supports practice and exam sessions. Hermes generates questions, correct answers, and explanations; the API persists them and controls session state.

## Endpoints

- `GET|PATCH /api/v1/grammar/settings`
- `POST /api/v1/grammar/sessions`
- `GET|DELETE /api/v1/grammar/sessions/:code`
- `PUT /api/v1/grammar/sessions/:code/questions/:questionNumber/answer`
- `GET /api/v1/grammar/sessions/:code/questions/:questionNumber/explanation`
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
      "questionType": "fill_blank",
      "grammarArea": "tenses",
      "grammarPoint": "present perfect",
      "level": "B1",
      "questionText": "She ___ already finished.",
      "correctAnswer": "has",
      "explanation": "Use has with third-person singular in the present perfect."
    }
  ]
}
```

For scheduled practice, fetch settings first, use `defaultLevel` and exactly `dailyQuestionCount`, set `mode: "practice"` and `source: "cron"`. For on-request work use `source: "request"`. Avoid recent repetition when conversation or API-visible context makes that possible.

## Answers

- Practice: evaluate immediately, then PUT `userAnswer`, `result` (`correct|partial|incorrect`), and optional concise `feedback`. Do not show the full explanation unless requested.
- Exam: PUT each `userAnswer` without result/feedback. After every question is answered, evaluate all answers once through `/evaluate`; then fetch `/report` for authoritative score and breakdown.
- Explanation requests must use the explanation endpoint. A deeper conversational explanation need not be persisted.

Use an explicit `GR-...` code and question number when provided. If a delayed answer could belong to multiple sessions or questions, ask before saving or grading. Ordinary session responses deliberately omit correct answers and explanations; never claim they came from that response.
