# Writing Screen List

> Status: Settings and API-backed known-code review screens implemented; material-list and browser-originated submission remain blocked by missing API contracts. Visual references: [Writing list](../frontend-design/writing-list.png), [Writing prompt](../frontend-design/writing-insert.png), [Writing feedback](../frontend-design/writing-result.png), and [Writing settings](../frontend-design/writing-setting.png). Read [Frontend Screen Guide](../frontend-screens.md) with this document before implementing Writing screens.

## Scope

Writing helps the user practise active English production with generated prompts and structured feedback. Persistent defaults control the routine level and word-count range. One-off requests may use another topic, genre, level, or target word count without changing the saved defaults.

The initial web scope is to update persistent defaults, open a known writing prompt, submit a draft, review stored feedback, and read corrected text. Prompt generation remains owned by Hermes/Telegram and the API.

## Screen map

```text
/english/writing
├── SCR-WRITE-001  Writing material list (design ready; API blocked)
├── /settings
│   └── SCR-WRITE-002  Writing settings
└── /:code
    ├── SCR-WRITE-003  Writing prompt and draft workspace
    └── /submissions/:number
        ├── SCR-WRITE-004  Writing feedback review
        └── /corrected-text
            └── SCR-WRITE-005  Corrected text
```

| ID | Screen | Proposed route | Initial status | API status |
| --- | --- | --- | --- | --- |
| SCR-WRITE-001 | Writing material list | `/english/writing` | Unavailable state implemented; integration deferred | List endpoint missing |
| SCR-WRITE-002 | Writing settings | `/english/writing/settings` | Implemented | Available |
| SCR-WRITE-003 | Writing prompt and draft workspace | `/english/writing/:code` | Prompt/composer implemented; submit unavailable | Submission command missing |
| SCR-WRITE-004 | Writing feedback review | `/english/writing/:code/submissions/:number` | Implemented for a known submission | Available |
| SCR-WRITE-005 | Corrected text | `/english/writing/:code/submissions/:number/corrected-text` | Implemented on demand | Available |

Proposed web routes are frontend navigation only. They do not alter the REST API contract.

## SCR-WRITE-001 — Writing material list

**Purpose**  
Find a writing prompt and start, continue, or review a draft.

**UI composition**

- Header: `Writing`, purpose statement, and local `Pengaturan` action.
- Search, status chips, level filter, and genre filter.
- One grouped table-like list with topic/prompt, genre, level, target word count, tags, date, source, status, code, and draft count.
- Selecting a row opens SCR-WRITE-003 or its latest submission review.

**Known API limitation**

- The current API has no `GET /api/v1/writing/materials` collection endpoint, search/filter parameters, or pagination metadata. Do not implement this visual list with incomplete client-side data or browser-only mock records. Its controls remain design-only until the collection contract exists.

## SCR-WRITE-002 — Writing settings

**Purpose**  
Review and change the persistent defaults Hermes uses for future Writing prompts.

**Entry points**

- Local `Pengaturan` action from a Writing list or workspace.
- Direct link to `/english/writing/settings`.

**UI composition**

- Back link: `Kembali ke Writing`.
- Header: `Pengaturan Writing` and `Atur preferensi default untuk materi writing berikutnya.`
- Main form on the left; a quiet read-only `Ringkasan default` column on the right, using divider-led rows rather than stacked cards.
- `Level default`: CEFR segmented selector with `A1`, `A2`, `B1`, `B2`, `C1`, and `C2`.
- `Panjang tulisan`: positive-integer fields for `Target (ideal)`, `Minimum`, and `Maksimum`, each with a visible `kata` unit.
- Helper: `Target jumlah kata sebaiknya berada di antara minimum dan maksimum.`
- Summary rows show stored level, target, minimum/maximum range, and the non-editable rule that genre and topic vary automatically.
- Supporting note: a one-off request may use a different topic, genre, level, or word count without changing these defaults.
- Primary `Simpan perubahan` action and `Terakhir diperbarui <tanggal>`.

**Interactions**

- Load existing values before editing.
- Enable save only when a value changed, all word-count fields are positive integers, and `minimum ≤ target ≤ maksimum`.
- Save with PATCH; on success, refresh form and summary values and show a short non-blocking confirmation.
- A back action with unsaved changes requests confirmation before leaving.

**Data contract**

```text
GET   /api/v1/writing/settings
PATCH /api/v1/writing/settings

{
  "defaultLevel": "B1",
  "defaultWordCount": 200,
  "minWordCount": 150,
  "maxWordCount": 250
}
```

- PATCH may send only changed fields.
- `defaultLevel` is stored as text. The UI uses the product's CEFR convention but safely preserves a returned non-CEFR value.
- The API validates positive word counts. The service rejects a range where minimum exceeds maximum or target falls outside the range.
- `updatedAt` is formatted in Indonesian locale.

**States**

| State | Behavior |
| --- | --- |
| Loading | Preserve the two-column layout with skeleton selector, fields, and summary rows. |
| Ready / unchanged | Show loaded values; disable save. |
| Dirty / valid | Enable save. |
| Invalid | Keep the entered values, explain the violated range, and disable save. |
| Saving | Disable the form and preserve values. |
| Saved | Refresh summary and show a short success toast. |
| Error | Keep entered values and offer retry without API internals. |

**Out of scope**

- Persistent topic, genre, tag, feedback-style, schedule, notification, streak, or theme settings.

## SCR-WRITE-003 — Writing prompt and draft workspace

**Purpose**  
Read one known prompt and submit a draft for analysis.

**Data contract**

```text
GET  /api/v1/writing/materials/:code
POST /api/v1/writing/materials/:code/submissions
```

- Present prompt text, topic, genre, level, target word count, tags, and stable material code.
- The draft composer preserves entered content while saving. The frontend can show a non-authoritative live word count, while the API returns the authoritative saved count.
- A material may have multiple submissions; do not imply a single-attempt limit.

**Known API limitation**

- The current POST schema requires `originalText`, `estimatedLevel`, and a complete structured `analysis` in one request. A browser cannot author authoritative feedback. The composer therefore preserves the draft and shows its word count, but keeps submission unavailable until the API exposes a command that accepts `originalText` and owns the analysis workflow.

## SCR-WRITE-004 — Writing feedback review

**Purpose**  
Review the structured analysis stored for one submitted draft.

**Data contract**

```text
GET /api/v1/writing/materials/:code/submissions/:submissionNumber
```

- Lead with overall feedback, estimated level, and word count, then use restrained sections for strengths, priority improvements, grammar, vocabulary, structure, topic/genre adherence, and next steps.
- Do not calculate an overall score; the domain provides qualitative analysis, not a score.

## SCR-WRITE-005 — Corrected text

**Purpose**  
Read the corrected version of one submitted draft on demand.

**Data contract**

```text
GET /api/v1/writing/materials/:code/submissions/:submissionNumber/corrected-text
```

- Use a comfortable reading width and preserve line breaks.
- Keep corrected text behind a clear local action from feedback review; do not replace the original draft silently.

## Implementation order

1. SCR-WRITE-002 Settings, because its API contract is complete and independent of the missing collection endpoint.
2. SCR-WRITE-003 for a known material code, including draft preservation while saving.
3. SCR-WRITE-004 feedback review and SCR-WRITE-005 corrected text after submission data is verified.
4. SCR-WRITE-001 only after the API adds a paginated material collection contract.
