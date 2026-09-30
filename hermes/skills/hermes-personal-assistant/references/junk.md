# Junk

Junk stores lightweight URLs, quotes, snippets, memes, and miscellaneous external finds for later search.

## When Junk Is the Right Destination

Junk is a low-friction archive for external finds and miscellaneous items: links,
quotes, posts, videos/music URLs, memes, snippets, and references that are worth
searching later but are not meaningful personal notes or structured learning records.

The user chooses Notes versus Junk by the Telegram topic. Never reclassify an item based
on its content. Do not turn a URL into a Note just because it looks educational.

## Telegram Output Format

Use a compact card for a saved item:

```text
✅ *JK-20260921-001*
*Judul:* PostgreSQL indexing guide
*Kategori:* Article
*Tag:* reference, database
*URL:* https://example.com/article

📝 Clean searchable description of the item.
```

If there is no title, write `*Judul:* Tanpa judul`. For search results, use
`🔎 *Hasil Pencarian Junk*` and show one concise item per result with code, title,
category, tags, URL, and date. For a resolved PATCH or DELETE target, show the code
and intended effect before waiting for confirmation. Do not expose payloads, endpoint
names, internal status, or raw diagnostic output by default.

## Create Flow

1. Preserve the complete incoming message exactly as `raw_text`.
2. Extract the first valid HTTP(S) URL into `source_url` when one is present. Keep it
   as a URL only; do not download or archive the external file.
3. Use a user-provided title/caption as `title`. If none was provided, keep `title` as
   `null`; do not invent an AI fallback title.
4. Suggest one practical lowercase `category` such as `article`, `video`, `music`,
   `meme`, `quote`, `tool`, or `reference`.
5. Build concise `content_text` from the user's caption, quote, and available visible
   context. Do not pretend to know the content of a URL that was not inspected.
6. Add a small set of distinct lowercase searchable tags and save immediately with `POST /api/v1/junk`. Supply at least one of title, raw text, content text, or source URL.
7. Return the generated `JK-...` code and the key metadata only.

For an item with no URL, `source_url` is `null`. For uploaded media, preserve only the
text/caption supported by the MVP and explain that media storage is not available.

## Endpoints

- `POST /api/v1/junk`
- `GET /api/v1/junk` with optional `q`, `tag`, `category`, `source`, `source_url`, `from`, `to`, `sort` (`newest` or `oldest`), and `limit` (1–100, default 20)
- `GET|PATCH|DELETE /api/v1/junk/:code`

Create body:

```json
{
  "title": null,
  "category": "article",
  "raw_text": "original Telegram message",
  "content_text": "Clean searchable description of the item",
  "source_url": "https://example.com/article",
  "source_name": "Example Journal",
  "tags": ["reference", "database"]
}
```

Preserve the original input, including whitespace, in `raw_text`. Put a cleaned/searchable representation in `content_text`. Store only a user-provided title; do not invent a fallback title. Use `source_name` for a natural label when known. Prefer existing categories where practical. Uploaded media and media metadata are outside MVP.

Save immediately with suggested metadata and return the generated `JK-...` code. Patch supports `title`, `category`, `content_text`, `source_url`, `source_name`, and a full replacement `tags` array; `raw_text` is immutable.

Target resolution follows Notes: explicit code, then current latest item or keyword search. After one match, show the `JK-...` code and intended mutation, then wait for
explicit confirmation; ask for a code when multiple match, and report no match honestly. Never reclassify Junk as Notes.

## Search, Update, and Delete Flow

- `"cari junk soal rust"` → `GET /api/v1/junk?q=rust`.
- `"junk tag #meme"` → `GET /api/v1/junk?tag=meme`.
- Use `category`, `source_url`, and `limit` only when requested or clearly specified.
- Search results should include code, title (or `tanpa judul`), category, tags, URL,
  and date.
- Explicit `JK-...` is the preferred mutation target. Otherwise search a keyword or
  resolve the latest active item through the API.
- A keyword correction/delete requires one resolved match plus explicit confirmation
  after showing its code and intended effect. For multiple matches, show codes and titles and ask the user to choose.
- PATCH supports `title`, `category`, `content_text`, `source_url`, `source_name`, and a full
  replacement `tags` array. `raw_text` is immutable.
- DELETE is a soft delete; do not describe it as permanent file removal.

When the user requests a preview, follow the parent skill's three preview levels.
The default response shows the proposed metadata in normal Telegram chat format,
`preview payload only` shows only the JSON body, and `full preview` shows both plus
request details. Do not call the API or inspect the source URL. A preview does not
receive a `JK-...` code.
