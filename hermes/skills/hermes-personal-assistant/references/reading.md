# Reading

Reading creates passages with optional 0–20 comprehension questions; the saved default starts at 3. Questions and user answers are supplements without grading. The API stores expected answers, but ordinary material responses do not expose them.

## Endpoints

- `GET|PATCH /api/v1/reading/settings`
- `POST /api/v1/reading/materials`
- `GET /api/v1/reading/materials` lists materials; filters include `q`, `reading_status=unread|read`,
  `levels`, `genre`, `limit` (maximum 100), and `sort=newest|oldest`; it returns items without pagination metadata.
- `GET /api/v1/reading/materials/:code`
- `PATCH /api/v1/reading/materials/:code/answers`
- `PATCH /api/v1/reading/materials/:code` with `reading_status: unread|read`
- `GET /api/v1/reading/materials/:code/expected-answers`

Create material body:

```json
{
  "title": "Urban gardening",
  "level": "B1",
  "genre": "informative article",
  "tags": ["environment", "cities"],
  "target_word_count": 350,
  "target_question_count": 3,
  "content_text": "...",
  "source": "request",
  "questions": [
    { "question_text": "...", "expected_answer": "..." },
    { "question_text": "...", "expected_answer": "..." },
    { "question_text": "...", "expected_answer": "..." }
  ]
}
```

## Create Material Flow

1. Resolve `title`, `level`, `genre`, and target length from the request. For a request
   without overrides, fetch Reading settings and use `default_level` and
   `default_word_count`, plus `default_question_count`; keep the stored min/max bounds in mind.
2. Treat user-provided level, length, topic, or genre as a one-off override. A Reading
   default-setting change requires an explicit request and confirmation of the exact
   current and proposed values.
3. Write a passage at the selected level and target length. Use a coherent topic and
   genre, and avoid repeating a recent topic when the available context makes that
   possible.
4. Resolve the question count from the explicit override or `default_question_count` (0–20). Preserve an explicit zero. Generate exactly that many questions; omit questions or send an empty array for zero. Mix suitable question types such as main idea,
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

<content_text, preserving its paragraph breaks>

────────

✏️ *Pertanyaan*
1. <question_text>
2. <question_text>
3. <question_text>

────────

💡 *Level B1*
Kosakata kunci: budget, income, expenses, emergency fund, interest.
_Pertanyaan opsional: boleh dijawab sebagian atau dilewati._
```

Rules for this format:

- The first line is the API-returned `RD-...` code, not a generic success sentence.
- Use the API-returned `word_count` for `Panjang`; never estimate it. State the number
  of paragraphs only when it is directly clear from the generated or returned `content_text`; otherwise omit the paragraph portion.
- Preserve blank lines between paragraphs. Do not put the passage in a code block.
- Use `Tipe`, `Level`, and `Panjang` in Indonesian; preserve the title, genre, passage, questions, and vocabulary in English when the material is English.
- Keep the vocabulary note short: at most five relevant words or phrases. It is a learning aid, not a second explanation of the passage.
- The ordinary response contains no endpoint, payload, internal status, tool trace, answer key, or grading claim.
- For a default preview, use the same layout but replace the first line with
  `📝 *Preview — belum disimpan*` and do not invent an `RD-...` code. For payload-only
  and full-preview requests, follow the parent skill's preview rules.

For cron, fetch settings and read `default_level`, `default_word_count`, `min_word_count`, `max_word_count`, and `default_question_count` from the response. Use those defaults in the `snake_case` create request, set `source: "cron"`, and choose a fresh topic/genre when possible. For a user request, use provided one-off overrides without changing settings unless explicitly asked; set `source: "request"`.

## Optional Answer and Manual-Status Flow

- Resolve the material from an explicit `RD-...` code or an unambiguous current material with questions. Ask if the target is unclear. Read status is not an answer-targeting rule.
- Save only supplied answers through `PATCH /materials/:code/answers` with `{ "answers": [{ "question_number": 1, "user_answer": "..." }] }`. The user may answer none, some, or all questions, continue later, or correct an answer. Omitted answers are preserved; explicit `user_answer: null` clears a saved answer. Do not invent missing answers.
- A material without questions has no expected/user answers or answer group. Never submit answers for it.
- Never assign correct/partial/incorrect, a score, or answer-based completion. Summarize saved answers without requiring the rest.
- Fetch reference answers only when the user explicitly requests them, independently of saved user answers. Do not automatically reveal them after saving all answers.
- Change `reading_status` only after an explicit mark-read/unread request. Use PATCH on the material with the target status. Opening/sending a passage, saving answers, and requesting references never changes this mark.
- Omitted level, target word count, and target question count resolve from settings in the API. Hermes still generates and supplies matching question content for positive counts; the API does not generate missing questions. Include `target_question_count: 0` for an explicit reading-only request. Defaults include `default_question_count`; persistent edits require an explicit request.
- Material responses include `title`, `content_text`, `reading_status`, target counts and ordered questions with nullable `user_answer`; ordinary responses exclude `expected_answer`.
- In Telegram, omit the entire Pertanyaan section and answer prompt when there are zero questions. Otherwise describe answers as optional, for example `_Boleh dijawab sebagian atau dilewati._`.

If the user says `preview` or `jangan call API`, do not fetch settings, materials, or
answer keys. Use the parent skill's preview levels: default shows the proposed
passage/questions in normal Telegram chat format, `preview payload only` shows only the
complete request body (including expected answers), and `full preview` shows both plus
request details. Default/full previews are marked not saved; payload-only renders the
exact JSON body only. Never reveal expected answers in the default chat-format preview.
