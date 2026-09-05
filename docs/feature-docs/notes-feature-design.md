# Notes - Detailed Design

This document focuses on the Notes feature in Hermes. Notes are personal, searchable records for insights, facts, ideas, quotes, and useful information that should be kept long-term.

> Status: MVP design. The MVP uses direct REST API calls, not MCP.

---

## 1. Goal

Notes provide a low-friction way to save important information from Telegram, with AI-assisted metadata extraction so the content can be searched and corrected later.

Good candidates for Notes:

- personal insights;
- learning notes;
- useful facts;
- quotes;
- ideas;
- passive reminders;
- content explicitly saved from another Hermes feature.

Notes are for information worth keeping. Random files/media or unclear temporary content should go to Junk instead.

---

## 2. Flow

```text
User sends a note to the Notes topic
        |
        v
Hermes extracts and suggests:
  - title
  - type
  - category
  - source
  - tags
        |
        v
Hermes calls the Notes REST API with cleaned parameters
        |
        v
API stores the note in PostgreSQL
        |
        v
Hermes replies with the saved metadata
        |
        v
User can correct the note later if needed
```

Principle:

- Notes are inserted immediately using Hermes' suggested metadata.
- Hermes does not ask for confirmation before saving by default.
- Corrections happen after saving if the user wants to adjust metadata/content.

---

## 3. Code

Each note has a user-facing `code`.

Example:

```text
NT-20260726-001
```

Rules:

- `code` must be unique.
- `code` is the stable reference key for Telegram and FE.
- Hermes can use `code` to update, delete, or show a specific note accurately.
- Search results should include `code`.
- Soft-deleted notes keep their code history; codes are not reused.

---

## 4. Type vs Category

`type` and `category` have different roles.

|                 | `type`                                                  | `category`                                                                                                        |
| --------------- | ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Meaning         | What form of note this is                               | What topic/domain the note is about                                                                               |
| Nature          | Fixed enum, closed set                                  | Soft text list                                                                                                    |
| Hermes behavior | Choose from the fixed list                              | Prefer existing categories when possible, but may suggest new ones                                                |
| Examples        | `fact`, `personal`, `news`, `quote`, `idea`, `reminder` | `Tech/Programming`, `Career`, `Personal Development`, `Finance Knowledge`, `Health`, `Life Lesson`, `Random Idea` |

Examples:

```text
"Postgres advisory lock auto-releases when the transaction ends"
-> type: fact
-> category: Tech/Programming
```

```text
"I notice I focus better in the morning than at night"
-> type: personal
-> category: Personal Development
```

### Fixed `type` Values

| Type       | Meaning                                                        |
| ---------- | -------------------------------------------------------------- |
| `fact`     | Factual/reference information from docs, articles, or learning |
| `personal` | Personal insight or reflection                                 |
| `news`     | News or current information saved for later                    |
| `quote`    | Quote from another person/source                               |
| `idea`     | Random idea worth keeping                                      |
| `reminder` | Passive reminder note; no active notification in MVP           |

`reminder` is passive in MVP. There is no `due_date`, cron reminder, or notification behavior yet.

---

## 5. Source Metadata

Notes can optionally store where they came from.

`source` means the human-readable or external source mentioned by the user:

```text
source = "postgresql.org"
source = "Clean Architecture book"
source = "YouTube video about Docker"
```

`source_context` means which Hermes feature triggered the note:

```text
source_context = "general_chat"
source_context = "reading"
source_context = "writing"
source_context = "grammar"
```

`source_reference` means the specific object code from that source feature, if any:

```text
source_context = "reading"
source_reference = "RD-20260726-001"
```

Rules:

- All source fields are nullable.
- Direct notes from the Notes topic use:

```text
source_context = null
source_reference = null
```

- Notes saved from General English use:

```text
source_context = "general_chat"
source_reference = null
```

- Notes saved from a feature object may use:

```text
source_context = "writing"
source_reference = "WR-20260726-001"
```

---

## 6. Search

Notes support two search modes:

```text
"cari catatan soal postgres"
-> full-text search over title + content + tags

"catatan tag #database"
-> direct tag filter
```

Search results should return enough data for the user to pick accurately:

```text
code
title
category
tags
created_at
```

---

## 7. Correction Behavior

Corrections are updates after a note has already been saved.

Correction examples:

```text
catatan terakhir, ganti kategori jadi Database
ubah tag NT-20260726-001 jadi #postgres #database
hapus note NT-20260726-001
ganti judul catatan postgres jadi Postgres Advisory Lock
```

Target resolution rules:

- If `code` is provided, Hermes can update/delete directly.
- If the user says "latest note" / "catatan terakhir", Hermes targets the most recently created note in the current context.
- If the user gives a keyword, Hermes searches first.
- If exactly one note matches, Hermes can update it directly.
- If multiple notes match, Hermes must ask for confirmation and show the matching codes.
- If no note matches, Hermes should say that no matching note was found.

Supported MVP corrections:

- update `title`;
- update `content`;
- update `type`;
- update `category`;
- update `source`;
- add/remove/replace `tags`;
- soft delete using `deleted_at`.

Hermes should clean and format update parameters before calling the API. The API validates and persists the update.

---

## 8. Direct REST API Responsibility

Hermes does not write directly to PostgreSQL. Hermes calls the backend REST API.

Hermes is responsible for:

- extracting metadata from user input;
- suggesting title/type/category/tags/source;
- resolving target note for correction/delete;
- formatting cleaned API parameters;
- asking confirmation when target resolution is ambiguous.

The backend API is responsible for:

- validating note payloads;
- storing notes;
- updating notes;
- soft deleting notes;
- maintaining/searching `search_vector`;
- querying notes by code, keyword, tag, or category.

Flow:

```text
Telegram -> Hermes -> REST API -> PostgreSQL
```

---

## 9. Database Schema

### `notes`

| Column             | Type                                                          | Notes                                                                        |
| ------------------ | ------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `id`               | bigserial (PK)                                                | Internal primary key.                                                        |
| `code`             | text, unique                                                  | Stable user-facing key. Example: `NT-20260726-001`.                          |
| `title`            | text                                                          | AI-suggested; user can override.                                             |
| `content`          | text                                                          | Original note content, optionally cleaned for readability.                   |
| `type`             | enum(`fact`, `personal`, `news`, `quote`, `idea`, `reminder`) | Fixed note type.                                                             |
| `category`         | text                                                          | Soft text category. Hermes should prefer existing categories when possible.  |
| `source`           | text, nullable                                                | External source/link/name when mentioned.                                    |
| `source_context`   | text, nullable                                                | Source Hermes feature, e.g. `general_chat`, `reading`, `writing`, `grammar`. |
| `source_reference` | text, nullable                                                | Source object code, e.g. `RD-20260726-001`; null when not applicable.        |
| `tags`             | text[]                                                        | Granular dynamic tags generated by Hermes and editable by user.              |
| `search_vector`    | tsvector                                                      | Trigger-maintained from title + content + tags for full-text search.         |
| `created_at`       | timestamp                                                     |                                                                              |
| `updated_at`       | timestamp                                                     |                                                                              |
| `deleted_at`       | timestamp, nullable                                           | Soft delete.                                                                 |

### Indexes

```sql
CREATE UNIQUE INDEX idx_notes_code ON notes(code);
CREATE INDEX idx_notes_search ON notes USING GIN(search_vector);
CREATE INDEX idx_notes_tags ON notes USING GIN(tags);
```

GIN indexes are enough for personal-scale PostgreSQL search. No external search engine is needed for MVP.

---

## 10. Chat Response Templates

### Save Note

```text
📝 Saved — NT-20260726-001
Title: Postgres Advisory Lock Auto-Release
Type: Fact · Category: Tech/Programming
Source: postgresql.org
Tags: #database #postgres
```

### Search

```text
User: "cari catatan soal postgres"

🔍 3 notes found:
1. NT-20260726-001 — Postgres Advisory Lock Auto-Release (26 Jul)
2. NT-20260720-001 — INDEX vs UNIQUE INDEX (20 Jul)
3. NT-20260714-001 — Why Bigserial Instead of UUID (14 Jul)
```

### Correction

```text
User: "ubah kategori NT-20260726-001 jadi Database"

✏️ Updated — NT-20260726-001
Category: Tech/Programming -> Database
```

### Ambiguous Correction

```text
User: "ubah catatan postgres jadi kategori Database"

I found 3 matching notes:
1. NT-20260726-001 — Postgres Advisory Lock Auto-Release
2. NT-20260720-001 — INDEX vs UNIQUE INDEX
3. NT-20260714-001 — Why Bigserial Instead of UUID

Which one should I update?
```

---

## 11. Deferred Ideas

These are intentionally not included in MVP:

- `due_date` and active reminder notifications for `type = reminder`;
- `is_pinned`;
- random resurfacing / "on this day";
- related notes / note linking;
- export or compilation into articles.

MVP focuses on passive note capture and search.

---

## 12. Final Design Decisions

| Decision                 | Final Choice                                                                          |
| ------------------------ | ------------------------------------------------------------------------------------- |
| Code                     | Unique `code`, e.g. `NT-20260726-001`, used as stable Telegram/FE reference           |
| Title                    | AI-suggested; user can override                                                       |
| Type                     | Fixed enum: `fact`, `personal`, `news`, `quote`, `idea`, `reminder`                   |
| Category                 | Soft text category; no category table in MVP                                          |
| Tags                     | Dynamic granular `text[]`                                                             |
| Source fields            | `source`, `source_context`, and `source_reference` are nullable                       |
| General English save     | `source_context = "general_chat"`, `source_reference = null`                          |
| Confirmation before save | None by default; save first, correct later                                            |
| Search                   | Full-text keyword search + tag filtering                                              |
| Correction target        | Prefer `code`; otherwise latest note or keyword search with confirmation if ambiguous |
| Reminder behavior        | Passive note type only; no notification/due date in MVP                               |
| Direct API               | Hermes sends cleaned parameters to REST API; API persists PostgreSQL                  |
| Delete behavior          | Soft delete using `deleted_at`                                                        |

---

## 13. MVP API Contract

The Notes API is mounted below `/api/v1/notes` and requires the internal bearer token.

Request bodies use `camelCase`; every response field is serialized recursively as `snake_case`.

| Method | Path | Purpose |
| ------ | ---- | ------- |
| `POST` | `/api/v1/notes` | Create a note. The backend generates the `code`. |
| `GET` | `/api/v1/notes` | List/search active notes. Optional filters: `q`, `tag`, `category`, and `limit` (default `20`, maximum `100`). Filters combine with AND. |
| `GET` | `/api/v1/notes/:code` | Fetch one active note. |
| `PATCH` | `/api/v1/notes/:code` | Update supplied fields. A `tags` payload replaces the full tag list. |
| `DELETE` | `/api/v1/notes/:code` | Soft delete a note. |

Codes are generated atomically by the backend in the format `NT-YYYYMMDD-###`, using the `Asia/Jakarta` calendar date. The daily suffix is sequential and codes are never reused.

The `search_vector` uses PostgreSQL's `simple` text-search configuration over title, content, and tags. A row trigger refreshes it on insert and whenever one of those source fields changes. This avoids the immutable-expression restriction on stored generated columns while supporting Indonesian and English terms without language-specific stemming.
