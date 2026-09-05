# Junk

Junk stores lightweight URLs, quotes, snippets, memes, and miscellaneous external finds for later search.

## Endpoints

- `POST /api/v1/junk`
- `GET /api/v1/junk` with optional `q`, `tag`, `category`, `sourceUrl`, and `limit` (1–100, default 20)
- `GET|PATCH|DELETE /api/v1/junk/:code`

Create body:

```json
{
  "title": null,
  "category": "article",
  "rawText": "original Telegram message",
  "contentText": "Clean searchable description of the item",
  "sourceUrl": "https://example.com/article",
  "tags": ["reference", "database"]
}
```

Preserve the original input in `rawText`. Put a cleaned/searchable representation in `contentText`. Store only a user-provided title; do not invent a fallback title. Prefer existing categories where practical. Uploaded media and media metadata are outside MVP.

Save immediately with suggested metadata and return the generated `JK-...` code. Patch supports `title`, `category`, `contentText`, `sourceUrl`, and a full replacement `tags` array; `rawText` is immutable.

Target resolution follows Notes: explicit code, then current latest item or keyword search; act on one match, ask for a code when multiple match, and report no match honestly. Never reclassify Junk as Notes.
