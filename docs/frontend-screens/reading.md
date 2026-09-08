# Reading Screen List

> Status: List, settings, and known-code workflows implemented. Visual references: [Reading list](../frontend-design/reading-list.png), [Reading detail](../frontend-design/reading-detail.png), and [Reading settings](../frontend-design/reading-setting.png). Read [Frontend Screen Guide](../frontend-screens.md) with this document before implementing Reading screens.

## Scope

Reading helps the user practise English comprehension with generated passages and free-form answers. Persistent defaults determine the level and word-count target for routine reading materials. A user may still request a one-off level, topic, genre, or length without changing those defaults.

The first web scope is reviewing material, answering questions, viewing permitted expected answers, and changing persistent defaults. Material generation remains owned by Hermes/Telegram and the API.

## Screen map

```text
/english/reading
├── SCR-READ-001  Reading material list (design ready; API blocked)
├── /settings
│   └── SCR-READ-002  Reading settings
└── /:code
    ├── SCR-READ-003  Reading material and answer workspace
    └── /expected-answers
        └── SCR-READ-004  Expected answers (conditional)
```

| ID | Screen | Proposed route | Initial status | API status |
| --- | --- | --- | --- | --- |
| SCR-READ-001 | Reading material list | `/english/reading` | Implemented | Available |
| SCR-READ-002 | Reading settings | `/english/reading/settings` | Implemented | Available |
| SCR-READ-003 | Reading material and answer workspace | `/english/reading/:code` | Implemented for a known code | Available |
| SCR-READ-004 | Expected answers | `/english/reading/:code/expected-answers` | Implemented, conditional | Available |

Proposed web routes are frontend navigation only. They do not alter the REST API contract.

## SCR-READ-001 — Reading material list

**Purpose**  
Find a reading material and continue or review it.

**UI composition**

- Header: `Reading`, the short purpose statement `Latihan pemahaman bacaan.`, and a local `Pengaturan` action.
- Search field for topic, genre, or tag; status quick filters `Semua`, `Belum dijawab`, and `Selesai`; plus a multi-select level filter and genre filter.
- One grouped table-like list with topic, genre, level, word count/reading time, tags, created date, source, status, and stable material code.
- Selecting a row opens SCR-READ-003.

**Data contract**

- `GET /api/v1/reading/materials` supports keyword, status, `levels` as a comma-separated list, genre, page, limit, and sort parameters. The legacy single `level` parameter remains accepted.
- Search/filter state is represented in the URL. Filtering and pagination remain API-authoritative.

**Out of scope**

- Browser-side generation of passages or questions.
- Pagination before the collection API provides pagination metadata.

## SCR-READ-002 — Reading settings

**Purpose**  
Review and change the persistent defaults Hermes uses for future Reading materials.

**Entry points**

- Local `Pengaturan` action from SCR-READ-001 or SCR-READ-003.
- Direct link to `/english/reading/settings`.

**UI composition**

- Back link: `Kembali ke Reading`.
- Header: `Pengaturan Reading` and `Atur preferensi default untuk materi reading berikutnya.`
- Main form on the left; a quiet read-only `Ringkasan default` column on the right. The summary uses divider-led rows, not a stack of cards.
- `Level default`: a CEFR segmented selector, visually offering `A1`, `A2`, `B1`, `B2`, `C1`, and `C2`. It displays the current stored default level.
- `Panjang bacaan`: three integer fields—`Target (ideal)`, `Minimum`, and `Maksimum`—with the `kata` unit visible in each field.
- Helper text: `Target jumlah kata sebaiknya berada di antara minimum dan maksimum.`
- Summary rows show the stored level, target word count, minimum/maximum range, and the non-editable rule that genre and topic vary automatically.
- Supporting note: a one-off request may use a different topic, genre, level, or word count without changing these defaults.
- Primary `Simpan perubahan` action and `Terakhir diperbarui <tanggal>`.

**Interactions**

- Load existing values before the form is editable.
- Enable `Simpan perubahan` only when at least one field differs from the loaded settings and all visible values are valid.
- Require positive integers and ensure `minimum ≤ target ≤ maksimum` before submitting.
- Save with PATCH; on success, update both form values and the right-side summary, then show a short non-blocking confirmation.
- The back link with unsaved edits requests confirmation before leaving; it does not silently discard changes.

**Data contract**

```text
GET   /api/v1/reading/settings
PATCH /api/v1/reading/settings

{
  "defaultLevel": "B1",
  "defaultWordCount": 420,
  "minWordCount": 350,
  "maxWordCount": 500
}
```

- PATCH may send only changed fields; the frontend sends a complete valid changed set when more than one field is edited.
- `defaultLevel` is stored as text. The UI presents the accepted product convention of CEFR levels; it must preserve a previously stored non-CEFR value safely if one is returned.
- The API validates positive word counts. The service rejects a range where minimum exceeds maximum or target falls outside the range.
- `updatedAt` is formatted in Indonesian locale in the summary footer.

**States**

| State | Behavior |
| --- | --- |
| Loading | Preserve the two-column form and summary layout with skeleton controls and rows. |
| Ready / unchanged | Show loaded values; disable `Simpan perubahan`. |
| Dirty / valid | Show changed values and enable `Simpan perubahan`. |
| Invalid | Keep entered values visible, explain the violated range beside the fields, and disable save. |
| Saving | Disable fields and save action; retain visible values. |
| Saved | Update the summary and show a short success toast. |
| Error | Keep entered values and show safe retry copy without API internals. |

**Out of scope**

- Persistent topic, genre, tag, source, scheduling, notification, streak, or theme settings.
- Reconfiguring an already-created material from this page.

## SCR-READ-003 — Reading material and answer workspace

**Purpose**  
Read one known passage and submit one complete set of answers to its questions.

**Entry points**

- Select a material from SCR-READ-001 once its collection API exists.
- Direct link to `/english/reading/:code`.

**UI composition**

- Compact `Semua Reading` return action, the same bordered `Pengaturan` action used by the other English modules, and material metadata: code, topic, genre, level, target/actual word count, reading time if the frontend has a documented display rule, tags, and source.
- Passage column with a comfortable reading width.
- Question-and-answer column showing all stored questions in order and free-form answer fields.
- One primary `Kirim jawaban` action after the final answer field.

**Data contract**

```text
GET  /api/v1/reading/materials/:code
POST /api/v1/reading/materials/:code/submissions
```

- The detail response deliberately excludes expected answers.
- A submission must include every question exactly once. The frontend validates completeness before it submits.
- MVP permits one complete submission per material. A repeat request returns a conflict and must be shown as a safe, non-technical completed state.

## SCR-READ-004 — Expected answers

**Purpose**  
Let the user self-check stored expected answers after a submission or after an explicit request.

**Entry points**

- The post-submission completion state of SCR-READ-003.
- Direct link to `/english/reading/:code/expected-answers` when the backend permits it.

**UI composition**

- Material title and code.
- Each original question paired with its expected answer in a readable, divider-led review list.
- Explicit self-check copy; do not present a score or claim automatic grading.

**Data contract**

```text
GET /api/v1/reading/materials/:code/expected-answers
```

**Out of scope**

- Correct/incorrect, partial-credit, grade, rank, or progress calculations.
- Editing a submission after it has been sent.

## Implementation order

1. SCR-READ-002 Settings, because its API contract is complete and independent of the missing collection endpoint.
2. SCR-READ-003 for a known material code, including complete-answer validation and safe completed/conflict state.
3. SCR-READ-004 expected-answer review after the material/submission flow is verified.
4. SCR-READ-001 only after the API adds a paginated material collection contract.
