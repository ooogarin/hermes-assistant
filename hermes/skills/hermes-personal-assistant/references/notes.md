# Notes

Notes store meaningful facts, ideas, quotes, reminders, news, and personal information for long-term search.

## When Notes Is the Right Destination

Use Notes for information the user intentionally wants to keep as a meaningful,
searchable record: an insight, fact, idea, quote, learning point, personal reflection,
news item, or passive reminder. Do not store ordinary conversation automatically.

The Telegram topic is authoritative. If the user sends content in Notes, keep it in
Notes even when it resembles Junk. If the user sends content in Junk, do not move it to
Notes by semantic judgment.

## Telegram Output Format

Use a compact card for a saved note:

```text
✅ *NT-20260921-001*
*Judul:* PostgreSQL indexing note
*Tipe:* Fact
*Kategori:* Database
*Tag:* postgresql, index

📝 Use a partial index when queries consistently filter the same predicate.
```

For search results, use `🔎 *Hasil Pencarian Catatan*` and show one concise item per
result with its code, title, category, tags, and date. If exactly one result is
resolved for a later mutation, show its code and the proposed change before waiting
for confirmation. Do not include payloads, endpoint names, internal status, or full
raw text unless the user asks for them.

## Create Flow

1. Preserve the user's meaning while cleaning obvious formatting noise.
2. Choose exactly one allowed `type`: `fact`, `personal`, `news`, `quote`, `idea`, or
   `reminder`.
3. Create a short useful title, not a vague title such as `Note` or `Important`.
4. Choose a searchable category and a small set of specific tags. Prefer the user's
   wording and existing categories when available; do not invent a category lookup
   endpoint because categories are flexible text in this MVP.
5. Fill `source_name` for a natural source label and `source_url` for an HTTP(S) link when known. Keep `source_context` and `source_reference` for the originating Hermes feature. Preserve the exact original message as `raw_text` when available.
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
- `GET /api/v1/notes` with optional `q`, `type`, `tag`, `category`, `source`, `from`, `to`, `sort` (`newest` or `oldest`), and `limit` (1–100, default 20)
- `GET|PATCH|DELETE /api/v1/notes/:code`

Create body:

```json
{
  "title": "PostgreSQL indexing note",
  "content_text": "Use a partial index when queries consistently filter the same predicate.",
  "raw_text": "original Telegram message",
  "type": "fact",
  "category": "database",
  "source_name": null,
  "source_url": null,
  "source_context": "general_chat",
  "source_reference": null,
  "tags": ["postgresql", "index"]
}
```

Allowed `type`: `fact`, `personal`, `news`, `quote`, `idea`, `reminder`. Keep category and tags lowercase; preserve punctuation such as hyphens. `raw_text` is optional and immutable after creation. `tags` is the full replacement list on patch.

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
- Combine `q`, `tag`, `category`, `source`, date range, sort, and `limit` only when each filter is explicit or
  clearly implied by the request.
- Search results should include code, title, category, tags, and date so the user can
  choose accurately.
- Explicit `NT-...` is the preferred mutation target. Fetch it before a correction or
  delete when current context matters.
- `latest note` means the newest active result from the API, not the newest message in
  chat history.
- After a keyword or latest-note lookup resolves exactly one item, show its `NT-...`
  code and the intended PATCH or DELETE, then wait for explicit confirmation. With
  multiple matches, show concise codes/titles and ask the user to choose. With no match, report that honestly.
- PATCH only the fields the user asked to change. A tags patch replaces the complete
  tag list, so first preserve existing tags when the user asks to add/remove one tag.
- DELETE is a soft delete. Never claim permanent physical removal.

When the user requests a preview, follow the parent skill's three preview levels. The
default response shows the proposed note in normal Telegram chat format; `preview
payload only` shows only the cleaned JSON payload; `full preview` adds the method,
endpoint, assumptions, and unresolved values. Do not search for an existing note or
call the API. A preview does not receive an `NT-...` code.
