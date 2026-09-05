# Reading

Reading creates passages with 3–5 comprehension questions. The API stores expected answers, but ordinary material responses do not expose them.

## Endpoints

- `GET|PATCH /api/v1/reading/settings`
- `POST /api/v1/reading/materials`
- `GET /api/v1/reading/materials/:code`
- `POST /api/v1/reading/materials/:code/submissions`
- `GET /api/v1/reading/materials/:code/expected-answers`

Create material body:

```json
{
  "topic": "Urban gardening",
  "level": "B1",
  "genre": "informative article",
  "tags": ["environment", "cities"],
  "targetWordCount": 350,
  "passageText": "...",
  "source": "request",
  "questions": [
    { "questionText": "...", "expectedAnswer": "..." },
    { "questionText": "...", "expectedAnswer": "..." },
    { "questionText": "...", "expectedAnswer": "..." }
  ]
}
```

For cron, fetch settings and read `default_level`, `default_word_count`, `min_word_count`, and `max_word_count` from the response. Use those defaults in the camelCase create request, set `source: "cron"`, and choose a fresh topic/genre when possible. For a user request, use provided one-off overrides without changing settings unless explicitly asked; set `source: "request"`.

Submission body is `{ "answers": [{ "questionNumber": 1, "userAnswer": "..." }] }`. Reading does not grade answers as correct/partial/incorrect in MVP. Response questions use `question_number`, `question_text`, `user_answer`, and `expected_answer`. Once all questions have answers, show expected answers by fetching the dedicated endpoint. Also fetch them when explicitly requested.

Resolve the material from an explicit `RD-...` code or an unambiguous current session. If uncertain, ask before persisting answers.
