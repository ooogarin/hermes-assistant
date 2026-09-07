# Writing

Writing creates prompts and stores structured feedback for multiple drafts per material.

## Endpoints

- `GET|PATCH /api/v1/writing/settings`
- `POST /api/v1/writing/materials`
- `GET /api/v1/writing/materials/:code`
- `POST /api/v1/writing/materials/:code/submissions`
- `GET /api/v1/writing/materials/:code/submissions/:submission_number`
- `GET /api/v1/writing/materials/:code/submissions/:submission_number/corrected-text`

Material body fields are `topic`, `prompt_text`, `level`, `genre`, `tags`, `target_word_count`, and `source` (`cron|request`). For cron, fetch settings first, use defaults, set `source: "cron"`, and rotate topic/genre when possible. User-supplied level or length is a one-off override unless they explicitly update settings.

Settings and material responses use fields such as `default_level`, `default_word_count`, `prompt_text`, `target_word_count`, and `is_override`. Submission responses recursively use snake_case, including `submission_number`, `word_count`, `estimated_level`, `corrected_text`, `overall_feedback`, and `next_steps`.

Resolve the target from an explicit `WR-...` code or unambiguous active material before analyzing a draft. Ask if uncertain.

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
