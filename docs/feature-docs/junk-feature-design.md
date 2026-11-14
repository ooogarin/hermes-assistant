# Junk - Detailed Design

This document focuses on the Junk feature in Hermes. Junk is a lightweight archive for interesting, funny, useful, or nice-to-have external content that the user wants to keep searchable.

> Status: MVP design. The MVP uses direct REST API calls, not MCP. Capture is available from Telegram through Hermes and from the browser through the manual form or the optional AI-assisted mode.

---

## 1. Goal

Junk stores low-friction external finds and miscellaneous content such as memes, quotes, posts, article links, music links, and other things that are worth keeping but do not belong in Notes.

Junk is not for deep personal insights or structured learning records. Those should go to Notes or the relevant English Learning feature.

---

## 2. Difference from Notes

|                 | Notes                                                              | Junk                                                    |
| --------------- | ------------------------------------------------------------------ | ------------------------------------------------------- |
| Main purpose    | Meaningful insight, learning, reference, or personal reflection    | Lightweight archive of interesting/fun/external content |
| Typical source  | User's own thought or something intentionally learned              | External content found by the user                      |
| Long-term value | May become work reference, learning reference, or writing material | Nice-to-have searchable archive                         |
| Routing         | User sends to Notes topic                                          | User sends to Junk topic                                |

Hermes does not classify whether something is Notes or Junk. The user decides by sending the content to the intended Telegram topic.

---

## 3. Flow

```text
User sends text or URL to the Junk topic
        |
        v
Hermes extracts and suggests:
  - category
  - source_url
  - tags
  - content_text
        |
        v
Hermes calls the Junk REST API with cleaned parameters
  - raw_text is preserved from the original user message
        |
        v
API stores the junk item in PostgreSQL
        |
        v
Hermes replies with a short confirmation
        |
        v
User can correct the item later if needed
```

Principle:

- Junk is inserted immediately using Hermes' suggested metadata.
- Hermes does not ask for confirmation before saving by default.
- Corrections happen after saving if the user wants to adjust metadata/content.

The browser offers two deliberate create paths:

- Manual entry sends the same metadata fields as the Telegram flow through `POST /api/v1/junk`.
- The optional AI-assisted mode sends the free-form message through `POST /api/v1/junk/ai`. The API extracts the URL, reads public link metadata, asks the configured AI provider for metadata, and creates the item immediately through the same Junk service. There is no review step; corrections happen on the detail page.

The AI-assisted endpoint is browser-only. Hermes never calls it and continues to extract metadata itself.

---

## 4. Code

Each junk item has a user-facing `code`.

Example:

```text
JK-20260726-001
```

Rules:

- `code` must be unique.
- `code` is the stable reference key for Telegram and FE.
- Hermes can use `code` to update, delete, or show a specific junk item accurately.
- Search results should include `code`.
- Soft-deleted junk items keep their code history; codes are not reused.

---

## 5. Title

Junk titles may be user-provided or suggested by the optional browser AI capture. The Telegram/Hermes path still stores only a user-provided title and never invents a fallback.

Reason:

- For memes, links, posts, and other found content, the user's own title is often the easiest way to remember the item.
- The Telegram path therefore keeps user-provided titles and leaves them empty rather than inventing a generic one. The browser AI path only suggests a title grounded in the content and link metadata.

Rules:

- `title` is nullable.
- At least one of `title`, `raw_text`, `content_text`, or `source_url` must be present. Category alone is insufficient.
- On Telegram, a user-provided title/caption becomes `title`; otherwise Hermes leaves `title = null`.
- On the browser AI path, the AI proposes a concise title in the language of the message, grounded in the message and fetched link metadata, with a 300-character limit. When the AI returns null, the server uses the fetched link title when available. The AI is told not to invent facts and never to use the request text itself as the title.
- No generic fallback title is generated for the Telegram path.

---

## 6. Category

`category` is a soft text list, not an enum.

Rules:

- Hermes suggests `category` based on the content.
- Hermes should prefer existing categories when possible to avoid duplicates such as `meme`, `memes`, and `funny meme`.
- The user can override the category later.
- The category list can grow naturally without database migrations.

Initial examples:

```text
meme
video
music
post
quote
article
tool
reference
```

The canonical category vocabulary for the browser AI path, aligned with the Telegram Junk suggestions, is `article`, `image`, `meme`, `music`, `quote`, `reference`, `tool`, and `video`, defined in `apps/api/src/modules/junk/junk-category.ts`. The browser AI prompt receives this list, up to 50 existing archive categories, and common aliases such as `artikel` → `article`, `gambar` → `image`, `kutipan` → `quote`, `lagu` → `music`, and `memes` → `meme`. An AI suggestion maps to an alias, then a canonical value, then an existing category; otherwise it stays as a normalized lowercase new category. The Telegram path keeps suggesting its own soft-text category.

---

## 7. Content Text

`content_text` is the searchable text representation of the junk item.

It is not the same as `raw_text`.

- `raw_text` is the original text exactly as sent by the user.
- `content_text` is the cleaned or enriched searchable representation prepared by Hermes.

The browser derives list previews from `content_text` (normalized whitespace, at most three visible lines). There is no stored `content_preview` field and no raw-text fallback for the excerpt. Only full-page detail offers a read-only “Teks asli” switch between `content_text` and `raw_text`; the preview pane always shows `content_text`.

`content_text` can be built from several sources:

- user caption or description;
- quote text;
- visible text from shared content when available;
- URL title or short summary when available;
- Hermes' short description of what the URL/content is about.

In the browser AI path, the AI writes `content_text` from the message and fetched link metadata, in the language of the message, with a 20,000-character limit. The prompt forbids describing the request itself (`Pesan berisi tautan...` or `the user asks...`). When the AI returns null, the server falls back to the fetched link description; with no metadata and no description, the field stays null.

Examples:

```text
User sends:
"quote: Do or do not, there is no try — Yoda"

raw_text:
"quote: Do or do not, there is no try — Yoda"

content_text:
"Do or do not, there is no try — Yoda"
```

```text
User sends:
"artikel bagus soal rust" + https://example.com/rust-article

raw_text:
"artikel bagus soal rust https://example.com/rust-article"

content_text:
"Article about Rust programming. User note: artikel bagus soal rust"
```

Purpose:

- preserve the original user input through `raw_text`;
- make Junk searchable even when the title is empty;
- keep enough text context to understand the item later;
- support full-text search over links, quotes, captions, and descriptions.

---

## 8. URL and Media Handling

MVP supports URLs, not uploaded media storage.

Rules:

- If the user shares a link, store it in `source_url`.
- `source_name` is an optional natural display label, such as “YouTube” or a publication name. Keep the real URL in `source_url` for opening/copying; the name is not a second URL.
- The browser list and detail use a supplied name first, then a recognized platform name, then the hostname without `www.`. Unknown hostnames retain their domain suffix to avoid misidentification. Those screens do not fetch external metadata.
- The browser AI path stores only the first HTTP(S) URL that appears in the user message. An AI-proposed `source_url` is ignored, and `raw_text` stays exactly as sent.
- The server fetches public link metadata only for the optional AI capture path, to ground the title and description. The fetched page is not stored, downloaded, or archived.
- If the link points to music, video, article, post, or other external content, store only the URL and extracted/searchable text.
- Do not download files from external links.
- Do not support uploaded audio/music files in MVP.
- No `media_type`, `mime_type`, or `file_size` fields are needed for MVP.

If direct image/video uploads are supported later, they should be designed separately with local file storage and media metadata.

---

## 9. Search

Junk supports two search modes:

```text
"cari junk soal rust"
-> full-text search over title + content_text + category + tags

"junk tag #meme"
-> direct tag filter
```

The keyword also matches `code`, `category`, `source_name`, and `source_url` as case-insensitive substrings, so a stable code, a category word, or a source host finds the item even when the full-text tokenizer does not split it into a whole token.

Search results should return enough data for the user to pick accurately:

```text
code
title
category
tags
source_url
created_at
```

---

## 10. Correction Behavior

Correction behavior follows the same pattern as Notes.

Correction examples:

```text
junk terakhir, ganti kategori jadi Meme
ubah tag JK-20260726-001 jadi #rust #programming
hapus junk JK-20260726-001
ganti title junk rust jadi Rust Article
```

Target resolution rules:

- If `code` is provided, Hermes can update/delete directly.
- If the user says "latest junk" / "junk terakhir", Hermes targets the most recently created junk item in the current context.
- If the user gives a keyword, Hermes searches first.
- If exactly one junk item matches, Hermes can update it directly.
- If multiple junk items match, Hermes must ask for confirmation and show the matching codes.
- If no junk item matches, Hermes should say that no matching item was found.

Supported MVP corrections:

- update `title`;
- update `category`;
- update `content_text`;
- update `source_url`;
- update or clear `source_name`;
- add/remove/replace `tags`;
- soft delete using `deleted_at`.

Category and tags are trimmed and stored lowercase whenever they are created or replaced; duplicate tags are removed after normalization. Category/tag filters are normalized to lowercase at the API boundary, and repositories use exact matching against this canonical lowercase data. The browser sends filter values unchanged and relies on that boundary, so the canonical form is owned in exactly one place. Existing data is assumed to already follow this invariant; no backfill is planned. Services capitalize category and tag labels in API responses while preserving punctuation and separators, so values remain usable when sent back as filters or edits.

Hermes should clean and format update parameters before calling the API. The API validates and persists the update.

---

## 11. Direct REST API Responsibility

Hermes does not write directly to PostgreSQL. Hermes calls the backend REST API.

Hermes is responsible for:

- extracting metadata from user input;
- suggesting category/tags/content_text/source_url;
- resolving target junk item for correction/delete;
- formatting cleaned API parameters;
- asking confirmation when target resolution is ambiguous.

The backend API is responsible for:

- validating junk payloads;
- storing junk items;
- updating junk items;
- soft deleting junk items;
- maintaining/searching `search_vector`;
- querying junk by code, keyword, tag, category, or URL.

Flow:

```text
Telegram -> Hermes -> REST API -> PostgreSQL
```

The optional browser AI path is an API workflow, not a Hermes flow. The API extracts the first HTTP(S) URL from the message, reads public link metadata, calls the configured AI provider, validates the returned JSON, and composes the same create payload the Telegram path uses. The browser never receives the provider credential.

---

## 12. Database Schema

### `junk_items`

| Column          | Type                | Notes                                                                                         |
| --------------- | ------------------- | --------------------------------------------------------------------------------------------- |
| `id`            | bigserial (PK)      | Internal primary key.                                                                         |
| `code`          | text, unique        | Stable user-facing key. Example: `JK-20260726-001`.                                           |
| `title`         | text, nullable      | User-provided title. Hermes does not auto-generate fallback titles in MVP.                    |
| `category`      | text                | Soft text category, canonicalized to lowercase. Hermes should prefer existing categories when possible. |
| `raw_text`      | text, nullable      | Original text exactly as sent by the user. Preserved for audit/debugging.                     |
| `content_text`  | text, nullable      | Searchable text representation from caption, quote, URL title/summary, or Hermes description. |
| `source_url`    | text, nullable      | External URL for article, post, music, video, etc.                                            |
| `source_name`   | text, nullable      | Natural source label, trimmed nonempty text up to 200 characters. Existing rows remain null. |
| `tags`          | text[]              | Granular dynamic tags generated by Hermes and editable by user; each value is canonicalized to lowercase. |
| `search_vector` | tsvector            | Trigger-maintained from title + content_text + category + tags for full-text search.          |
| `created_at`    | timestamp           |                                                                                               |
| `updated_at`    | timestamp           |                                                                                               |
| `deleted_at`    | timestamp, nullable | Soft delete.                                                                                  |

### Indexes

```sql
CREATE UNIQUE INDEX idx_junk_items_code ON junk_items(code);
CREATE INDEX idx_junk_items_search ON junk_items USING GIN(search_vector);
CREATE INDEX idx_junk_items_tags ON junk_items USING GIN(tags);
```

GIN indexes are enough for personal-scale PostgreSQL search. No external search engine is needed for MVP.

AI-assisted capture adds no column, index, or migration. It writes through the existing `junk_items` schema.

---

## 13. Chat Response Templates

### Save Link

```text
User: "artikel bagus soal rust" + https://blog.example.com/rust

🗑️ Saved — JK-20260726-001
Title: artikel bagus soal rust
Category: article
Source: https://blog.example.com/rust
Tags: #rust #programming
```

### Save Quote

```text
User: "quote: Do or do not, there is no try — Yoda"

🗑️ Saved — JK-20260726-002
Title: -
Category: quote
Tags: #motivation #starwars
```

### Search

```text
User: "cari junk soal rust"

🔍 2 junk items found:
1. JK-20260726-001 — artikel bagus soal rust
2. JK-20260720-001 — Rust ownership meme
```

### Correction

```text
User: "ubah tag JK-20260726-001 jadi #rust #backend"

✏️ Updated — JK-20260726-001
Tags: #rust #backend
```

---

## 14. Deferred Ideas

These are intentionally not included in MVP:

- direct uploaded image/video/audio storage;
- local media file paths;
- media metadata such as `media_type`, `mime_type`, and `file_size`;
- automatic link archiving or file download (AI capture reads public metadata only);
- automatic Notes vs Junk classification;
- an AI review or edit step before saving;
- pinning, resurfacing, or related-item linking.

MVP focuses on saving, classifying, and searching lightweight URL/text-based junk items.

---

## 15. Final Design Decisions

| Decision                 | Final Choice                                                                                         |
| ------------------------ | ---------------------------------------------------------------------------------------------------- |
| Telegram topic           | Junk                                                                                                 |
| Difference from Notes    | Manual routing by Telegram topic, not AI classification                                              |
| Code                     | Unique `code`, e.g. `JK-20260726-001`, used as stable Telegram/FE reference                          |
| Title                    | Nullable; user-provided on Telegram, AI-suggested from the message and link metadata on the browser AI path; no generic fallback |
| Category                 | Soft text category; no enum/category table in MVP                                                    |
| Category vocabulary      | Canonical suggestions and aliases shared with the browser AI prompt                                  |
| Tags                     | Dynamic granular `text[]`                                                                            |
| `raw_text`               | Original user text exactly as sent; preserved for audit/debugging                                    |
| `content_text`           | Searchable representation from caption, quote, URL title/summary, or Hermes description              |
| URL handling             | Store `source_url`; do not download external files                                                   |
| Browser AI capture       | Optional; browser-only; sends free text once and inserts immediately with no review step             |
| Uploaded media           | Not supported in MVP                                                                                 |
| Media metadata           | No `media_type`, `mime_type`, or `file_size` in MVP                                                  |
| Audio/music              | URL only; no uploaded audio/music support                                                            |
| Confirmation before save | None by default; save first, correct later                                                           |
| Correction behavior      | Same as Notes: prefer `code`, otherwise latest item or keyword search with confirmation if ambiguous |
| Search                   | Full-text keyword search + tag filtering                                                             |
| Direct API               | Hermes or the browser sends cleaned parameters to the REST API; the browser AI path sends free text; API persists PostgreSQL |
| Delete behavior          | Soft delete using `deleted_at`                                                                       |

---

## 16. MVP API Contract

The Junk API is mounted below `/api/v1/junk`. Item CRUD accepts the Agent bearer token or a valid browser JWT, and browser writes require the allowed Origin. AI-assisted create requires a browser JWT.

Request bodies and every response field use `snake_case` recursively.

`source_name` is returned in list, detail, create, and update responses. POST accepts an optional nullable name (omitted → null). PATCH preserves an omitted name, replaces a provided name, or clears it when explicitly null. Blank/non-string values and names longer than 200 characters after trimming fail validation. Names are independent of URLs and do not change full-text search fields or source-URL filtering.

Migration `0008_add_junk_source_name.ts` adds the nullable column and length/nonempty constraint without a backfill. It must be applied before running the updated Junk backend. Its down migration drops the column and any saved source names. Migration execution remains a separate operator step.

| Method | Path | Purpose |
| ------ | ---- | ------- |
| `POST` | `/api/v1/junk` | Create a junk item. The backend generates the `code`. |
| `GET` | `/api/v1/junk` | List/search active items. Optional filters: `q`, `tag`, `category`, `source_url`, `source` (name or URL substring), `from`, `to`, `sort` (`newest`/`oldest`), and `limit` (default `20`, maximum `100`). Filters combine with AND. Dates use the Asia/Jakarta calendar. `q` matches title, content text, category, tags, code, and the source name/URL. |
| `GET` | `/api/v1/junk/:code` | Fetch one active junk item. |
| `PATCH` | `/api/v1/junk/:code` | Update supplied fields. A `tags` payload replaces the full tag list. `raw_text` is preserved and cannot be changed. |
| `DELETE` | `/api/v1/junk/:code` | Soft delete a junk item. |
| `POST` | `/api/v1/junk/ai` | Browser-only AI-assisted create. The API extracts the URL, reads link metadata, asks the configured AI provider for metadata, and stores the item immediately. |

Codes are generated atomically by the backend in the format `JK-YYYYMMDD-###`, using the `Asia/Jakarta` calendar date. The daily suffix is sequential and codes are never reused.

The `search_vector` uses PostgreSQL's `simple` text-search configuration over title, content text, category, and tags. A row trigger refreshes it on insert and whenever one of those source fields changes. Code, category, and the source name/URL are also matched as case-insensitive substrings through the list query. `raw_text` preserves input whitespace exactly and only HTTP(S) source URLs are accepted. Migration `0009_align_notes_junk_schema.ts` adds the minimum-content database constraint without changing existing rows; it will fail if an existing item has only a category and no title, raw text, content text, or source URL.

### AI-assisted create

`POST /api/v1/junk/ai` accepts one strict body:

```json
{
  "text": "artikel bagus soal rust https://blog.example.com/rust"
}
```

`text` must not be blank after trimming and is limited to 20,000 characters; its original whitespace is preserved in `raw_text`. The request requires a browser JWT with the allowed Origin; an Agent bearer key receives `403`, and a missing session receives `401`. A successful response is `201` with the same item shape as `POST /api/v1/junk`.

The endpoint extracts the first HTTP(S) URL from `text`, fetches public link metadata when a URL exists, and asks the configured AI provider for `title`, `category`, `content_text`, `source_url`, `source_name`, and `tags`. The prompt also receives the 50 most-used tags so related items reuse existing tags. The server uses the AI values for `title`, `category`, `content_text`, and `source_name` when present; it always sets `source_url` from the message, preserves `raw_text` exactly, and ignores `source_url` in the AI output. Missing AI values fall back to the fetched title, description, site name, or author; the rest become `null` or `[]`.

`category` maps through the shared vocabulary and aliases, then an existing archive category. `tags` are trimmed, lowercased, deduplicated, limited to 64 characters each, and capped at six; invalid entries are dropped rather than failing the item. The composed payload is validated with the normal create schema and stored through the same Junk service as the Telegram path. AI output that cannot form a valid item, or that does not match the metadata schema, returns `AI_INVALID_RESPONSE`.

AI is optional and is enabled only when `AI_BASE_URL`, `AI_API_KEY`, and `AI_MODEL` are set together; `AI_MAX_TOKENS`, `AI_TEMPERATURE`, and `AI_TIMEOUT_MS` have defaults. Provider failures return the safe `503` codes `AI_NOT_CONFIGURED`, `AI_UNAVAILABLE`, `AI_AUTH_FAILED`, `AI_RATE_LIMITED`, `AI_CONFIGURATION_ERROR`, or `AI_INVALID_RESPONSE`. Link metadata failure is not an error; capture proceeds without it. No schema migration accompanies AI capture.
