# Notes

Notes store meaningful facts, ideas, quotes, reminders, news, and personal information for long-term search.

## When Notes Is the Right Destination

Use Notes for information the user intentionally wants to keep as a meaningful,
searchable record: an insight, fact, idea, quote, learning point, personal reflection,
news item, or passive reminder. Do not store ordinary conversation automatically.

The Telegram topic is authoritative. If the user sends content in Notes, keep it in
Notes even when it resembles Junk. If the user sends content in Junk, do not move it to
Notes by semantic judgment.

## Create Flow

1. Preserve the user's meaning while cleaning obvious formatting noise.
2. Choose exactly one allowed `type`: `fact`, `personal`, `news`, `quote`, `idea`, or
   `reminder`.
3. Create a short useful title, not a vague title such as `Note` or `Important`.
4. Choose a searchable category and a small set of specific tags. Prefer the user's
   wording and existing categories when available; do not invent a category lookup
   endpoint because categories are flexible text in this MVP.
5. Fill source metadata only when the source or originating feature is known.
6. Save immediately by default with `POST /api/v1/notes`, then report the returned
   `NT-...` code.

Suggested mapping:

| Input | Type | Example category |
| --- | --- | --- |
| Technical fact or rule | `fact` | `Tech/Programming` |
| Personal reflection | `personal` | `Personal Development` |
| Idea to revisit | `idea` | `Product Idea` |
| Quote | `quote` | `Books` or `Motivation` |
| Passive reminder | `reminder` | `Personal` |

`reminder` is only a passive record. Never create a notification or Hermes cron job
from it without a separate explicit scheduling request.

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

## Search, Update, and Delete Flow

- `"cari catatan soal postgres"` → `GET /api/v1/notes?q=postgres`.
- `"catatan tag #database"` → `GET /api/v1/notes?tag=database`.
- Combine `q`, `tag`, `category`, and `limit` only when each filter is explicit or
  clearly implied by the request.
- Search results should include code, title, category, tags, and date so the user can
  choose accurately.
- Explicit `NT-...` is the preferred mutation target. Fetch it before a correction or
  delete when current context matters.
- `latest note` means the newest active result from the API, not the newest message in
  chat history.
- A keyword update/delete may execute only when exactly one item matches. With multiple
  matches, show concise codes/titles and ask the user to choose. With no match, report
  that honestly.
- PATCH only the fields the user asked to change. A tags patch replaces the complete
  tag list, so first preserve existing tags when the user asks to add/remove one tag.
- DELETE is a soft delete. Never claim permanent physical removal.

When the user requests a preview, show the proposed cleaned payload and endpoint but do
not search for an existing note or call the API. A preview does not receive an `NT-...`
code.
