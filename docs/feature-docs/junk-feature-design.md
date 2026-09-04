# Junk - Detailed Design

This document focuses on the Junk feature in Hermes. Junk is a lightweight archive for interesting, funny, useful, or nice-to-have external content that the user wants to keep searchable.

> Status: MVP design. The MVP uses direct REST API calls, not MCP.

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

Unlike Notes, Junk titles are user-provided, not AI-generated.

Reason:

- For memes, links, posts, and other found content, the user's own title is often the easiest way to remember the item.
- AI-generated titles may become generic and less personal.

Rules:

- `title` is nullable.
- If the user provides a title/caption, Hermes stores it as `title`.
- If the user does not provide a title, Hermes leaves `title = null`.
- Hermes should not auto-generate a fallback title for MVP.

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

---

## 7. Content Text

`content_text` is the searchable text representation of the junk item.

It is not the same as `raw_text`.

- `raw_text` is the original text exactly as sent by the user.
- `content_text` is the cleaned or enriched searchable representation prepared by Hermes.

`content_text` can be built from several sources:

- user caption or description;
- quote text;
- visible text from shared content when available;
- URL title or short summary when available;
- Hermes' short description of what the URL/content is about.

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
- add/remove/replace `tags`;
- soft delete using `deleted_at`.

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

---

## 12. Database Schema

### `junk_items`

| Column          | Type                | Notes                                                                                         |
| --------------- | ------------------- | --------------------------------------------------------------------------------------------- |
| `id`            | bigserial (PK)      | Internal primary key.                                                                         |
| `code`          | text, unique        | Stable user-facing key. Example: `JK-20260726-001`.                                           |
| `title`         | text, nullable      | User-provided title. Hermes does not auto-generate fallback titles in MVP.                    |
| `category`      | text                | Soft text category. Hermes should prefer existing categories when possible.                   |
| `raw_text`      | text, nullable      | Original text exactly as sent by the user. Preserved for audit/debugging.                     |
| `content_text`  | text, nullable      | Searchable text representation from caption, quote, URL title/summary, or Hermes description. |
| `source_url`    | text, nullable      | External URL for article, post, music, video, etc.                                            |
| `tags`          | text[]              | Granular dynamic tags generated by Hermes and editable by user.                               |
| `search_vector` | tsvector            | Generated from title + content_text + category + tags for full-text search.                   |
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
- automatic link archiving/download;
- automatic Notes vs Junk classification;
- pinning, resurfacing, or related-item linking.

MVP focuses on saving, classifying, and searching lightweight URL/text-based junk items.

---

## 15. Final Design Decisions

| Decision                 | Final Choice                                                                                         |
| ------------------------ | ---------------------------------------------------------------------------------------------------- |
| Telegram topic           | Junk                                                                                                 |
| Difference from Notes    | Manual routing by Telegram topic, not AI classification                                              |
| Code                     | Unique `code`, e.g. `JK-20260726-001`, used as stable Telegram/FE reference                          |
| Title                    | User-provided and nullable; no AI fallback title                                                     |
| Category                 | Soft text category; no enum/category table in MVP                                                    |
| Tags                     | Dynamic granular `text[]`                                                                            |
| `raw_text`               | Original user text exactly as sent; preserved for audit/debugging                                    |
| `content_text`           | Searchable representation from caption, quote, URL title/summary, or Hermes description              |
| URL handling             | Store `source_url`; do not download external files                                                   |
| Uploaded media           | Not supported in MVP                                                                                 |
| Media metadata           | No `media_type`, `mime_type`, or `file_size` in MVP                                                  |
| Audio/music              | URL only; no uploaded audio/music support                                                            |
| Confirmation before save | None by default; save first, correct later                                                           |
| Correction behavior      | Same as Notes: prefer `code`, otherwise latest item or keyword search with confirmation if ambiguous |
| Search                   | Full-text keyword search + tag filtering                                                             |
| Direct API               | Hermes sends cleaned parameters to REST API; API persists PostgreSQL                                 |
| Delete behavior          | Soft delete using `deleted_at`                                                                       |
