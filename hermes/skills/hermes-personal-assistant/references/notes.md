# Notes

Notes store meaningful facts, ideas, quotes, reminders, news, and personal information for long-term search.

## Endpoints

- `POST /api/v1/notes`
- `GET /api/v1/notes` with optional `q`, `tag`, `category`, and `limit` (1–100, default 20)
- `GET|PATCH|DELETE /api/v1/notes/:code`

Create body:

```json
{
  "title": "PostgreSQL indexing note",
  "content": "Use a partial index when queries consistently filter the same predicate.",
  "type": "fact",
  "category": "database",
  "source": null,
  "source_context": "general_chat",
  "source_reference": null,
  "tags": ["postgresql", "index"]
}
```

Allowed `type`: `fact`, `personal`, `news`, `quote`, `idea`, `reminder`. `category` is flexible; prefer an existing category when a search reveals a good match. `tags` is the full replacement list on patch.

Save immediately with useful cleaned metadata; confirmation is not required by default. Return the generated `NT-...` code. Reminders are passive records in MVP: never create a scheduled notification from a note unless the user separately requests a Hermes cron job.

## Target Resolution

- Explicit code → operate directly after fetching it when context is useful.
- “Latest note” → list current notes and target the newest result.
- Keyword → search first.
- Exactly one match → operate directly.
- Multiple matches → show concise titles and codes, then ask the user to choose.
- No match → report that nothing matched.

Never move a message between Notes and Junk by inference; topic choice is authoritative.
