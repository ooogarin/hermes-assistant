# Reading

Reading creates passages with 3–5 comprehension questions. The API stores expected answers, but ordinary material responses do not expose them.

## Endpoints

- `GET|PATCH /api/v1/reading/settings`
- `POST /api/v1/reading/materials`
- `GET /api/v1/reading/materials` lists materials; filters include `q`, `status`,
  `levels`, `genre`, `page`, `limit`, and `sort=newest|oldest`.
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
  "target_word_count": 350,
  "passage_text": "...",
  "source": "request",
  "questions": [
    { "question_text": "...", "expected_answer": "..." },
    { "question_text": "...", "expected_answer": "..." },
    { "question_text": "...", "expected_answer": "..." }
  ]
}
```

## Create Material Flow

1. Resolve `topic`, `level`, `genre`, and target length from the request. For a request
   without overrides, fetch Reading settings and use `default_level` and
   `default_word_count`; keep the stored min/max bounds in mind.
2. Treat user-provided level, length, topic, or genre as a one-off override. A Reading
   default-setting change requires an explicit request and confirmation of the exact
   current and proposed values.
3. Write a passage at the selected level and target length. Use a coherent topic and
   genre, and avoid repeating a recent topic when the available context makes that
   possible.
4. Create exactly 3–5 questions. Mix suitable question types such as main idea,
   detail, vocabulary-in-context, inference, and reference. Every question needs an
   `expected_answer`, but do not show expected answers in the initial material.
5. Send one `POST /api/v1/reading/materials` with `source=request` (or `source=cron`
   for a scheduled job), then show the returned `RD-...` code and passage/questions.

The API calculates `word_count`; do not claim an exact count from estimation when the
API response is available. The material response includes the questions without their
expected answers.

## Telegram Material Format

For a successfully created material, use this compact, scannable format. Do not add a
process narration such as “Bacaan B1 tema keuangan jadi” before the metadata, and do
not expose expected answers.

```text
✅ *RD-20260921-001*
*Judul:* A Simple Plan for Your Money
*Tipe:* Informative article
*Level:* B1
*Panjang:* 275 kata • 3 paragraf

📖 *A Simple Plan for Your Money*

<passage_text, preserving its paragraph breaks>

────────

✏️ *Pertanyaan*
1. <question_text>
2. <question_text>
3. <question_text>

────────

💡 *Level B1*
Kosakata kunci: budget, income, expenses, emergency fund, interest.
_Balas dengan nomor jawaban, misalnya `1. ...`_
```

Rules for this format:

- The first line is the API-returned `RD-...` code, not a generic success sentence.
- Use the API-returned `word_count` for `Panjang`; never estimate it. State the number
  of paragraphs only when it is directly clear from the generated or returned `passage_text`; otherwise omit the paragraph portion.
- Preserve blank lines between paragraphs. Do not put the passage in a code block.
- Use `Tipe`, `Level`, and `Panjang` in Indonesian; preserve the title, genre, passage, questions, and vocabulary in English when the material is English.
- Keep the vocabulary note short: at most five relevant words or phrases. It is a learning aid, not a second explanation of the passage.
- The ordinary response contains no endpoint, payload, internal status, tool trace, answer key, or grading claim.
- For a default preview, use the same layout but replace the first line with
  `📝 *Preview — belum disimpan*` and do not invent an `RD-...` code. For payload-only
  and full-preview requests, follow the parent skill's preview rules.

For cron, fetch settings and read `default_level`, `default_word_count`, `min_word_count`, and `max_word_count` from the response. Use those defaults in the `snake_case` create request, set `source: "cron"`, and choose a fresh topic/genre when possible. For a user request, use provided one-off overrides without changing settings unless explicitly asked; set `source: "request"`.

Submission body is `{ "answers": [{ "question_number": 1, "user_answer": "..." }] }`. Reading does not grade answers as correct/partial/incorrect in MVP. Response questions use `question_number`, `question_text`, `user_answer`, and `expected_answer`. Once all questions have answers, show expected answers by fetching the dedicated endpoint. Also fetch them when explicitly requested.

Resolve the material from an explicit `RD-...` code or an unambiguous current session. If uncertain, ask before persisting answers.

## Answer and Expected-Answer Flow

- If the user answers the current material unambiguously, collect answers by
  `question_number` and submit them through `POST /materials/:code/submissions`.
- If an answer mentions a code, use that code. If multiple materials are active and no
  code is given, ask which material the answer belongs to.
- A submission may contain one or more answered questions. Do not invent answers for
  unanswered questions.
- Reading MVP stores submissions but does not assign `correct`, `partial`, or
  `incorrect`. Do not call the result a score.
- After submission, summarize which questions were received and offer expected answers.
  Fetch `GET /materials/:code/expected-answers` only when the user asks for them or
  when all questions have been answered and the normal flow calls for showing them.
- Do not reveal an expected answer before submission unless the user explicitly asks to
  see the answer key.

If the user says `preview` or `jangan call API`, do not fetch settings, materials, or
answer keys. Use the parent skill's preview levels: default shows the proposed
passage/questions in normal Telegram chat format, `preview payload only` shows only the
complete request body (including expected answers), and `full preview` shows both plus
request details. Default/full previews are marked not saved; payload-only renders the
exact JSON body only. Never reveal expected answers in the default chat-format preview.
