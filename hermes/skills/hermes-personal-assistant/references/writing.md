# Writing

Writing creates prompts and stores structured feedback for multiple drafts per material.

## Endpoints

- `GET|PATCH /api/v1/writing/settings`
- `POST /api/v1/writing/materials`
- `GET /api/v1/writing/materials` lists materials; filters include `q`, `status`,
  `levels`, `genre`, `page`, `limit`, and `sort=newest|oldest`.
- `GET /api/v1/writing/materials/:code`
- `POST /api/v1/writing/materials/:code/submissions`
- `GET /api/v1/writing/materials/:code/submissions/:submission_number`
- `GET /api/v1/writing/materials/:code/submissions/:submission_number/corrected-text`

Material body fields are `topic`, `prompt_text`, `level`, `genre`, `tags`, `target_word_count`, and `source` (`cron|request`). For cron, fetch settings first, use defaults, set `source: "cron"`, and rotate topic/genre when possible. User-supplied level or length is a one-off override unless they explicitly update settings.

## Create Prompt Flow

1. Read Writing settings for a default-based request. Use `default_level` and
   `default_word_count`, while respecting the configured min/max unless the user
   explicitly requests a one-off length outside those bounds.
2. Treat requested topic, level, genre, and length as one-off values. Do not change
   persistent settings unless the user explicitly asks to update defaults.
3. Generate a prompt with a clear task, audience/purpose when relevant, genre/register,
   level, and target word count. Rotate topic and genre when recent context allows it.
4. Create the material through `POST /api/v1/writing/materials` with `source=request`
   or `source=cron`. Show the returned `WR-...` code and prompt.

Do not create a submission while generating a prompt. A material can have multiple
submissions, so a revised draft should use the same material code and receive the next
submission number from the API.

Settings and material responses use fields such as `default_level`, `default_word_count`, `prompt_text`, `target_word_count`, and `is_override`. Submission responses recursively use snake_case, including `submission_number`, `word_count`, `estimated_level`, `corrected_text`, `overall_feedback`, and `next_steps`.

Resolve the target from an explicit `WR-...` code or unambiguous active material before analyzing a draft. Ask if uncertain.

## Submission Flow

1. Resolve the material by explicit code first; otherwise use the latest unsubmitted
   material only when it is unambiguous. Do not attach a draft to an old prompt from
   chat memory alone.
2. Preserve the user's `original_text` exactly. Estimate its CEFR level as
   `estimated_level` and let the API calculate `word_count`.
3. Produce the complete structured `analysis`: summary, grammar, vocabulary,
   structure, topic adherence, genre adherence, corrected text, and next steps. Use
   only the allowed statuses: `aligned|partially_aligned|off_topic` for topic and
   `aligned|partially_aligned|not_aligned` for genre.
4. Send one `POST /api/v1/writing/materials/:code/submissions` containing the original
   text, estimated level, and analysis.
5. Show the concise summary, strengths, priority improvements, and next steps first.
   Do not send the full corrected text unless requested.

For a follow-up such as `tampilkan feedback lengkap WR-...` fetch the submission. For
`kirim versi perbaikannya WR-...` fetch the dedicated corrected-text endpoint. A
submission number must be explicit or returned by the API; never invent one.

## Settings and Preview

- `"setting writing saya"` → `GET /api/v1/writing/settings`.
- Explicit default changes use `PATCH /api/v1/writing/settings`; one-off requests do
  not change defaults.
- `status=unsubmitted` is useful for finding a prompt awaiting a draft; `status=reviewed`
  means the material has at least one active submission.
- In preview mode, do not read settings or material state. Show the proposed prompt
  payload or submission analysis shape and state that nothing was created or saved.

Submission body fields:

```json
{
  "original_text": "...",
  "estimated_level": "B1",
  "analysis": {
    "summary": {
      "overall_feedback": "...",
      "strengths": ["..."],
      "priority_improvements": ["..."]
    },
    "grammar": {
      "error_count": 1,
      "items": [
        {
          "original": "...",
          "corrected": "...",
          "error_type": "...",
          "explanation": "..."
        }
      ]
    },
    "corrected_text": "...",
    "vocabulary": {
      "repeated_words": [{ "word": "...", "count": 2, "suggestions": ["..."] }],
      "better_phrases": [{ "original": "...", "suggestions": ["..."] }],
      "new_useful_words": [{ "word": "...", "meaning": "...", "example": "..." }]
    },
    "structure": { "feedback": "...", "suggestions": ["..."] },
    "topic_adherence": { "status": "aligned", "notes": "..." },
    "genre_adherence": { "status": "aligned", "notes": "..." },
    "next_steps": ["..."]
  }
}
```

Topic status: `aligned|partially_aligned|off_topic`. Genre status: `aligned|partially_aligned|not_aligned`.

After saving, show the concise summary and next steps first. Offer detailed review and the corrected version; do not send the full corrected text by default. Fetch corrected text from its dedicated endpoint only when requested.
