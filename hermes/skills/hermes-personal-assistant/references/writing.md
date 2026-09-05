# Writing

Writing creates prompts and stores structured feedback for multiple drafts per material.

## Endpoints

- `GET|PATCH /api/v1/writing/settings`
- `POST /api/v1/writing/materials`
- `GET /api/v1/writing/materials/:code`
- `POST /api/v1/writing/materials/:code/submissions`
- `GET /api/v1/writing/materials/:code/submissions/:submissionNumber`
- `GET /api/v1/writing/materials/:code/submissions/:submissionNumber/corrected-text`

Material body fields are `topic`, `promptText`, `level`, `genre`, `tags`, `targetWordCount`, and `source` (`cron|request`). For cron, fetch settings first, use defaults, set `source: "cron"`, and rotate topic/genre when possible. User-supplied level or length is a one-off override unless they explicitly update settings.

Resolve the target from an explicit `WR-...` code or unambiguous active material before analyzing a draft. Ask if uncertain.

Submission body fields:

```json
{
  "originalText": "...",
  "estimatedLevel": "B1",
  "analysis": {
    "summary": {
      "overallFeedback": "...",
      "strengths": ["..."],
      "priorityImprovements": ["..."]
    },
    "grammar": {
      "errorCount": 1,
      "items": [
        {
          "original": "...",
          "corrected": "...",
          "errorType": "...",
          "explanation": "..."
        }
      ]
    },
    "correctedText": "...",
    "vocabulary": {
      "repeatedWords": [{ "word": "...", "count": 2, "suggestions": ["..."] }],
      "betterPhrases": [{ "original": "...", "suggestions": ["..."] }],
      "newUsefulWords": [{ "word": "...", "meaning": "...", "example": "..." }]
    },
    "structure": { "feedback": "...", "suggestions": ["..."] },
    "topicAdherence": { "status": "aligned", "notes": "..." },
    "genreAdherence": { "status": "aligned", "notes": "..." },
    "nextSteps": ["..."]
  }
}
```

Topic status: `aligned|partially_aligned|off_topic`. Genre status: `aligned|partially_aligned|not_aligned`.

After saving, show the concise summary and next steps first. Offer detailed review and the corrected version; do not send the full corrected text by default. Fetch corrected text from its dedicated endpoint only when requested.
