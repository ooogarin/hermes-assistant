# Writing

Writing supports generated prompts and independent free writing. Saving a submission
and analyzing it are separate actions. Hermes generates prompts and feedback; the API
stores them.

## Endpoints

All paths are below `/api/v1/writing`:

- `GET|PATCH /settings`
- `POST /materials`
- `GET /materials` — optional filters: `q`, `status`, `level` or `levels`, `genre`,
  `page`, `limit`, `sort=newest|oldest`. Do not send both `level` and `levels`.
- `GET /materials/:code`
- `POST /submissions`
- `GET /submissions` — optional filters: `q`, `material_code`,
  `writing_type=free|prompted`, `analysis_status=not_analyzed|analyzed`, `page`,
  `limit`, `sort=newest|oldest`. `material_code` cannot be combined with
  `writing_type=free`.
- `GET /submissions/:code`
- `PATCH /submissions/:code`
- `PATCH /submissions/:code/analysis` — Agent authentication only.
- `GET /submissions/:code/corrected-text`

Responses use snake_case. Submission identity is its `WS-YYYYMMDD-NNN` code; never use
or invent a submission number. Material identity is its `WR-YYYYMMDD-NNN` code.

## Create a prompt

1. Read settings for a daily or default-based prompt. Use `default_level` and
   `default_word_count`; respect the configured minimum and maximum. A requested
   one-off length may be outside that range. Persistent changes require an explicit
   settings-change request and confirmation of the exact proposed values.
2. Daily prompts use defaults and `source: "cron"`. By-request prompts use the user's
   requested criteria and `source: "request"`. One-off criteria do not change defaults.
3. Generate a clear prompt with topic, task, genre/register, level, and target word
   count. Rotate topic and genre when recent context allows.
4. Create a material with `POST /materials`, then show the returned `WR-...` code and
   prompt. Do not create a submission when generating the prompt.

Material request body:

```json
{
  "topic": "Food",
  "prompt_text": "Describe a meal that is important to you and explain why.",
  "level": "B1",
  "genre": "journal",
  "tags": ["food", "personal experience"],
  "target_word_count": 150,
  "source": "request"
}
```

For cron jobs, fetch settings before generating the prompt. Do not create or deliver a
prompt if the requested values or settings needed for a valid body are unavailable.

## Save a submission

1. Save the user's writing as soon as they submit it. Preserve `original_text` exactly;
   the API calculates `word_count`.
2. For a response to a prompt, use an explicit `WR-...` code or unambiguous current
   context. Ask if the target is unclear. For free writing, send `material_code: null`
   or omit it; do not attach it to an unanswered prompt.
3. Call `POST /submissions` with only `material_code` and `original_text`. Do not send
   estimates or analysis at creation. They are null until supplied later.
4. Show the returned `WS-...` code. Do not analyze automatically; wait until the user
   explicitly asks for analysis.

Request examples:

```json
{
  "material_code": "WR-20261006-001",
  "original_text": "I had dinner with my family last Sunday."
}
```

```json
{
  "material_code": null,
  "original_text": "I played football yesterday."
}
```

If a save response is uncertain, read the submission list or relevant record before
retrying. Do not create a duplicate submission.

## Analyze a submission

Analysis is optional and starts only after the user directly asks in Telegram. The API
does not trigger or queue AI analysis; the web analysis button is inactive.

1. Resolve the `WS-...` code from the user's request or clear conversation context. Ask
   if more than one submission could match.
2. Fetch `GET /submissions/:code`. If it has a `material_code`, also fetch that
   material to compare the writing with its prompt.
3. Analyze the saved text and estimate all four fields from the writing itself:
   `estimated_topic`, `estimated_genre`, `estimated_tags`, and `estimated_level`.
   Use CEFR values A1, A2, B1, B2, C1, or C2 for the level.
4. Prepare the complete feedback object and save it once with
   `PATCH /submissions/:code/analysis`. Do not resend the original text. Analysis
   results are immutable after the first successful save.
5. Show a concise summary, strengths, priority improvements, and next steps. Do not
   include the full corrected text unless requested.

The analysis body requires all four estimates and the complete `analysis` object:

```json
{
  "estimated_topic": "Sports",
  "estimated_genre": "journal",
  "estimated_tags": ["football", "exercise"],
  "estimated_level": "B1",
  "analysis": {
    "summary": {
      "overall_feedback": "The main idea is clear.",
      "strengths": ["The sequence is easy to follow."],
      "priority_improvements": ["Add more detail about the match."]
    },
    "grammar": { "error_count": 0, "items": [] },
    "corrected_text": "I played football yesterday.",
    "vocabulary": {
      "repeated_words": [],
      "better_phrases": [],
      "new_useful_words": []
    },
    "structure": { "feedback": "The sequence is easy to follow.", "suggestions": [] },
    "prompt_adherence": null,
    "next_steps": ["Describe one moment from the match."]
  }
}
```

For free writing, `prompt_adherence` must be `null`. For prompted writing, it must be
an object with `status` set to `aligned`, `partially_aligned`, or `not_aligned`, and a
short `notes` explanation. Briefly mention a prompt mismatch in the analysis; for
example, a sports essay submitted for a food prompt is still analyzed normally, with
the estimated topic set to sports and adherence marked `not_aligned`.

`grammar.error_count` must equal the number of `grammar.items`. The rest of `analysis`
contains `summary`, `grammar`, `corrected_text`, `vocabulary`, `structure`,
`prompt_adherence`, and `next_steps` with the shapes shown above. The API rejects
unknown fields.

If feedback generation fails, keep the saved submission and analyze that same `WS-...`
later. If the analysis request's outcome is uncertain, fetch the submission first. If
`analysis_status` is already `analyzed`, show the saved result; do not retry the write.

## Edit and retrieve a submission

- `PATCH /submissions/:code` accepts `original_text` and/or any of the four estimated
  metadata fields. Send at least one field.
- Text may be edited only before analysis. After analysis, a patch containing
  `original_text` is rejected with `409 WRITING_SUBMISSION_TEXT_LOCKED`, even if it
  repeats the same text. Estimated metadata remains user-editable after analysis.
- An analysis result cannot be cleared or replaced. A repeated result write returns
  `409 WRITING_SUBMISSION_ALREADY_ANALYZED`.
- `analysis_status` is computed: `not_analyzed` when `analysis` is null, otherwise
  `analyzed`.
- Fetch the submission for its current status and metadata. For material lists,
  `unsubmitted` means no active submissions, `submitted` means submissions exist but
  none is analyzed, and `reviewed` means at least one is analyzed.
- Fetch `GET /submissions/:code/corrected-text` only when the user requests the full
  corrected version. It returns `409 WRITING_SUBMISSION_NOT_ANALYZED` if no analysis
  exists.

For a created prompt, show its `WR-...` code, topic/title, genre, level, target word
count, and prompt. For a saved submission, show its `WS-...` code. In feedback, use
concise sections such as `📝 *Ringkasan*`, `💪 *Kekuatan*`, `🎯 *Prioritas Perbaikan*`,
and `➡️ *Langkah Berikutnya*`; omit empty sections.

## Settings and preview

- `"setting writing saya"` → `GET /settings`.
- Update settings only for an explicit persistent-change request. Show current and
  proposed values and get confirmation before calling `PATCH /settings`.
- In preview mode, do not read or write settings/materials/submissions. Follow the
  parent skill's preview levels: default shows the proposed prompt in Telegram format,
  `preview payload only` shows only the exact request body, and `full preview` shows
  both plus request details. Default/full previews state that nothing was created or
  saved; payload-only renders the JSON body only.
