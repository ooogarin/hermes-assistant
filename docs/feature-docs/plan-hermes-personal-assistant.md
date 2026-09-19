# Hermes Personal Assistant - Project Plan

This document summarizes the MVP plan for Hermes as a personal assistant accessed through Telegram and backed by a custom REST API + PostgreSQL database.

> Status: MVP planning document. Feature-level details live in the dedicated design docs in this folder.

---

## 1. Product Goal

Hermes will be a personal assistant for daily tracking and guided learning. The primary interface is Telegram. Important long-term data is stored in the project's own PostgreSQL database, not only in Hermes memory.

Main use cases:

- track daily finance records;
- save personal notes and useful references;
- save lightweight external links/quotes/miscellaneous items into Junk;
- support English learning through General English, Grammar, Reading, and Writing;
- make the stored data reusable for future evaluation, reports, and a personal website.

Principle:

```text
Hermes memory = short-term conversational context
PostgreSQL = long-term source of truth
```

---

## 2. MVP Scope

The MVP includes seven features:

| Feature         | Purpose                                                      | Detail doc                          |
| --------------- | ------------------------------------------------------------ | ----------------------------------- |
| Finance         | Daily expense/income tracking                                | `finance-feature-design.md`         |
| General English | Short English Q&A, translation, examples, quick explanations | `general-english-feature-design.md` |
| Grammar         | Daily/on-request practice + exam mode with grading           | `grammar-feature-design.md`         |
| Reading         | Reading passages + comprehension questions                   | `reading-feature-design.md`         |
| Writing         | Writing prompts + structured feedback analysis               | `writing-feature-design.md`         |
| Notes           | Meaningful notes, insights, references, passive reminders    | `notes-feature-design.md`           |
| Junk            | Lightweight archive for URL/text-based external finds        | `junk-feature-design.md`            |

Paused, not in MVP as structured persistent features:

- Speaking
- Listening

The Telegram runtime may provide lightweight non-persistent Q&A skills for Speaking
and Listening. They do not create scores, transcripts, vocabulary records, progress,
or API/database data; they do not change this MVP scope.

Parked for Phase 2:

- Habit Tracker
- Weekly Reports
- News digest/source monitoring
- Vocabulary SRS
- Morning briefing
- OCR receipts
- Price/deal watcher

---

## 3. Platform Decisions

### Telegram

Telegram is the primary user interface. The expected setup is one Telegram group with Topics/Forum enabled.

MVP topics:

- Finance
- General English
- Grammar
- Reading
- Writing
- Notes
- Junk

Routing principle:

- User topic choice matters.
- Hermes should not over-classify Notes vs Junk; the user decides by sending to the intended topic.
- Structured English requests should route to Grammar/Reading/Writing.
- Short English Q&A stays in General English.

### Hermes Agent

Hermes is the AI assistant layer.

Hermes is responsible for:

- understanding Telegram messages;
- receiving and replying through its built-in Telegram gateway;
- running scheduled learning jobs through Hermes cron;
- extracting intent and cleaned parameters;
- generating learning materials;
- grading/evaluating where the feature requires it;
- asking clarification when target resolution is ambiguous;
- calling the backend REST API.

Hermes must not write directly to PostgreSQL.

The backend stays passive: it does not implement a Telegram adapter, Telegram webhook, or application scheduler. Hermes calls its REST endpoints with `curl` through the runtime skill in `hermes/skills/hermes-personal-assistant`.

### Backend API and Database

The backend API and PostgreSQL database are owned by this project. Deployment is deferred; local development uses a manually provisioned PostgreSQL database.

Core stack:

- TypeScript on Bun with Hono;
- PostgreSQL through native `bun:sql` and parameterized raw SQL;
- TypeScript `up` / `down` migrations;
- modular monolith boundaries: route → validator → handler → service → repository → PostgreSQL.

The REST API is the source of business validation and persistence. It will also be reusable by the personal website.

---

## 4. Architecture

MVP architecture:

```text
Telegram
  -> Hermes Agent
  -> REST API
  -> PostgreSQL

Personal Website
  -> REST API
  -> PostgreSQL
```

MCP is not part of the MVP architecture.

MCP may be added later as an adapter if Hermes tools need to be exposed in a standardized way to other AI clients. For now, direct REST API calls are simpler and better aligned with the MVP.

Non-goals:

```text
Hermes -> PostgreSQL
Hermes -> MCP -> REST API
```

---

## 5. Shared Design Conventions

### User-Facing Codes

Most user-facing entities use a stable `code` column instead of exposing internal database IDs.

Examples:

| Feature | Table/entity     | Code example      |
| ------- | ---------------- | ----------------- |
| Reading | reading material | `RD-20260726-001` |
| Writing | writing material | `WR-20260726-001` |
| Grammar | grammar session  | `GR-20260726-001` |
| Notes   | note             | `NT-20260726-001` |
| Junk    | junk item        | `JK-20260726-001` |

Finance uses `daily_number` as the stable per-date reference for Telegram/FE instead of a global `code`.

### Soft Delete

Primary feature data uses soft delete with `deleted_at` where deletion is part of user-facing behavior. Codes and finance `daily_number` values are not reused after soft delete.

### Direct API Pattern

Hermes sends cleaned parameters to the REST API.

Example:

```text
User: "ubah tag NT-20260726-001 jadi #postgres #database"

Hermes prepares:
{
  "code": "NT-20260726-001",
  "tags": ["postgres", "database"]
}

Hermes calls Notes API.
API validates and persists.
```

### Ambiguity Handling

If Hermes cannot confidently resolve the target item/session/material, it must ask for confirmation before saving, updating, deleting, or evaluating.

Examples:

- finance category ambiguity;
- grammar delayed answer with unclear session/question;
- note/junk keyword update matching multiple items;
- reading/writing answer/submission that does not clearly map to a material.

---

## 6. Feature Summary

### Finance

Finance tracks expense and income records.

Key decisions:

- default transaction type is `expense`;
- income is included in MVP but only when explicitly requested/headered;
- amount input is always interpreted as thousands;
- categories are fixed records in the `categories` table;
- ambiguous categories require confirmation before insert;
- `daily_number` is the stable per-date reference for Telegram/FE;
- `batch_id` is kept as internal metadata for records created from the same message;
- calculations happen in SQL/API, not by the LLM.

### General English

General English is a lightweight short Q&A mode.

Key decisions:

- no dedicated database table;
- no automatic persistence;
- saving from General English goes through Notes on explicit request;
- saved notes use `source_context = "general_chat"` and `source_reference = null`;
- no progress tracking or periodic summaries.

### Grammar

Grammar supports practice and exam sessions.

Key decisions:

- `mode`: `practice` or `exam`;
- `source`: `cron` or `request`;
- daily practice defaults to 5 questions;
- on-request practice can generate one or more questions without exam mode;
- exam grading is delayed until final submission;
- `code` is the user-facing grammar session reference;
- metadata uses `grammar_area + grammar_point + question_type`;
- explanations are generated with questions and shown on demand;
- deeper follow-up explanations are conversational and not stored.

### Reading

Reading generates English passages with comprehension questions.

Key decisions:

- persistent defaults with one-off overrides;
- length uses word count with default/min/max settings;
- each material has a user-facing `code`;
- each material has `genre` text and `tags`;
- expected answers are generated with the questions;
- no automatic grading in MVP;
- expected answers are shown after full answer submission or when requested.

### Writing

Writing generates prompts and analyzes user submissions.

Key decisions:

- persistent defaults with one-off overrides;
- each material has a user-facing `code`;
- `genre` is flexible text;
- tags are stored per material;
- multiple submissions are allowed for one material;
- analysis is structured JSONB;
- `estimated_level` is stored separately for querying;
- corrected version and detailed review are offered, not sent fully by default.

### Notes

Notes store meaningful personal information and references.

Key decisions:

- each note has `code`;
- `type` is fixed enum;
- `category` is flexible text;
- `source`, `source_context`, and `source_reference` are nullable;
- save first, correct later;
- corrections prefer `code`, otherwise latest note or keyword search with confirmation if ambiguous;
- reminders are passive in MVP.

### Junk

Junk stores lightweight URL/text-based external finds.

Key decisions:

- each junk item has `code`;
- title is user-provided and nullable;
- category is flexible text;
- `raw_text` preserves the original user text;
- `content_text` is the cleaned/searchable representation;
- URLs are stored in `source_url`;
- uploaded media and media metadata are not supported in MVP;
- correction behavior follows Notes.

---

## 7. Data Storage Summary

Feature-level schemas are maintained in:

- `finance-feature-design.md`
- `general-english-feature-design.md`
- `grammar-feature-design.md`
- `reading-feature-design.md`
- `writing-feature-design.md`
- `notes-feature-design.md`
- `junk-feature-design.md`

Next database step:

```text
Implement one approved feature schema at a time through ordered TypeScript migrations.
```

---

## 8. Implementation Roadmap

Recommended implementation order:

1. Complete the domain-independent backend foundation
2. Implement one approved feature schema, migration, and REST module at a time
3. Add the Hermes runtime skill and direct REST API calls
4. Configure Telegram topic routing in the Hermes gateway
5. Add end-to-end testing per feature
6. Configure scheduled jobs in Hermes cron after schedule times and Telegram topic IDs are known; add personal website integration when needed

Reasoning:

- database schema must come before API implementation;
- API must exist before Hermes can persist data;
- Telegram routing, Hermes behavior, and scheduling remain outside the passive API process.

---

## 9. Phase 2 Ideas

Phase 2 should start only after the MVP is usable and stable.

Candidates:

- Habit Tracker
- Weekly Reports
- News digest/source monitoring
- Vocabulary SRS
- Morning briefing
- OCR receipt parsing
- Price/deal watcher
- Speaking
- Listening

Weekly Reports principle:

- numeric calculations must happen in SQL/API;
- Hermes narrates verified results;
- Hermes must not calculate reports from chat history.

---

## 10. Open Technical Decisions

These can be decided during implementation:

- exact REST endpoint contracts;
- authentication between Hermes/API/website;
- deployment process and process manager;
- backup strategy for PostgreSQL;
- whether MCP should be added in a later phase.
