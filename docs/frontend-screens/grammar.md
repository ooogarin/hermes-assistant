# Grammar Screen List

> Status: Settings, session list, and known-code workflows implemented. Visual references: [Grammar list](../frontend-design/grammar-list.png) and [Grammar settings](../frontend-design/grammar-setting.png). Read [Frontend Screen Guide](../frontend-screens.md) with this document before implementing Grammar screens.

## Scope

Grammar provides daily practice, on-request practice, and exam sessions. Persistent defaults control only the level and number of questions for daily practice. A one-off practice or exam may change its level, grammar focus, type, and question count without changing those defaults.

The initial web scope is to update persistent defaults, open a known session, answer questions, request explanations, and review an available report. Session generation remains owned by Hermes/Telegram and the API.

## Screen map

```text
/english/grammar
├── SCR-GRAM-001  Grammar session list
├── /settings
│   └── SCR-GRAM-002  Grammar settings
└── /:code
    ├── SCR-GRAM-003  Grammar session workspace
    ├── /questions/:number/explanation
    │   └── SCR-GRAM-004  Grammar explanation
    └── /report
        └── SCR-GRAM-005  Grammar report
```

| ID | Screen | Proposed route | Initial status | API status |
| --- | --- | --- | --- | --- |
| SCR-GRAM-001 | Grammar session list | `/english/grammar` | Implemented | Available |
| SCR-GRAM-002 | Grammar settings | `/english/grammar/settings` | Implemented | Available |
| SCR-GRAM-003 | Grammar session workspace | `/english/grammar/:code` | Implemented for a known code | Available |
| SCR-GRAM-004 | Grammar explanation | `/english/grammar/:code/questions/:number/explanation` | Implemented on demand | Available |
| SCR-GRAM-005 | Grammar report | `/english/grammar/:code/report` | Implemented for evaluated sessions | Available |

Proposed web routes are frontend navigation only. They do not alter the REST API contract.

## SCR-GRAM-001 — Grammar session list

**Purpose**  
Find a session and review or inspect its result.

**UI composition**

- Header: `Grammar`, the local `Pengaturan` action, and the supporting subtitle `Latihan grammar, satu sesi pada satu waktu.`
- Search by session code, status chips, mode filter, and level filter.
- One grouped table-like list with session code, mode, level, question count, source, date, status, and score where available.
- Rows are single links with no separate action column. Selecting a row opens SCR-GRAM-003 for active or abandoned sessions and SCR-GRAM-005 for completed sessions.

**Data contract**

- `GET /api/v1/grammar/sessions` supports `q`, `status`, `mode`, `level`, `limit`, and `sort` query parameters.
- Search is case-insensitive across the session code. `status`, `mode`, and `level` use exact matches. Soft-deleted sessions are excluded.
- Each item includes `code`, `mode`, `source`, `status`, `level`, `question_count`, `score`, `max_score`, `started_at`, and `completed_at`. The response is `{ items: [...] }` with no pagination metadata.
- The list is a bounded Notes-style collection: it requests a fixed `limit`, renders every returned item, and shows a `Menampilkan <n> sesi` footer. Do not render pagination controls. The browser must not rebuild counts or status from session detail data.

## SCR-GRAM-002 — Grammar settings

**Purpose**  
Review and change the persistent defaults for daily Grammar practice.

**Entry points**

- Local `Pengaturan` action from a Grammar list or session workspace.
- Direct link to `/english/grammar/settings`.

**UI composition**

- Back link: `Kembali ke Grammar`.
- Header: `Pengaturan Grammar` with no supporting subtitle.
- Main form on the left; a quiet read-only `Ringkasan default` column on the right, using divider-led rows rather than stacked cards.
- `Level default`: CEFR segmented selector with `A1`, `A2`, `B1`, `B2`, `C1`, and `C2`.
- `Latihan harian`: one positive-integer field, `Jumlah soal per latihan`, with the `soal` unit and helper `Digunakan untuk latihan grammar dari daily practice.`
- Summary rows show default level, daily question count, and the fixed daily mode `Practice`.
- Supporting note: on-request practice and exam can use a different level, grammar area, grammar point, question type, or question count without changing the default.
- Primary `Simpan perubahan` action and `Terakhir diperbarui <tanggal>`.

**Interactions**

- Load existing values before editing.
- Enable save only when at least one setting is changed and the question count is an integer from 1 through 100.
- Save with PATCH; on success, refresh the form and the right-side summary, then show a short non-blocking confirmation.
- A back action with unsaved changes requests confirmation before leaving.

**Data contract**

```text
GET   /api/v1/grammar/settings
PATCH /api/v1/grammar/settings

{
  "defaultLevel": "B1",
  "dailyQuestionCount": 5
}
```

- PATCH may send only changed fields.
- `defaultLevel` is stored as text. The UI uses the product's CEFR convention but must safely preserve an existing non-CEFR value returned by the API.
- `dailyQuestionCount` must be an integer from 1 through 100.
- `updatedAt` is formatted in Indonesian locale.

**States**

| State | Behavior |
| --- | --- |
| Loading | Preserve the two-column layout with skeleton selector, input, and summary rows. |
| Ready / unchanged | Show loaded values; disable save. |
| Dirty / valid | Enable save. |
| Invalid | Keep the entered value, show concise field feedback, and disable save. |
| Saving | Disable the form and preserve its values. |
| Saved | Refresh summary and show a short success toast. |
| Error | Keep entered values and offer retry without exposing API internals. |

**Out of scope**

- Persistent grammar-area, grammar-point, question-type, mode, schedule-time, notification, streak, or theme settings.

## SCR-GRAM-003 — Grammar session workspace

**Purpose**  
Review a known practice or exam session and understand its current state.

**Data contract**

```text
GET /api/v1/grammar/sessions/:code
```

- Ordinary session detail deliberately excludes correct answers and full explanations.
- The web screen is read-only. Answering happens through Hermes/Telegram: practice answers are evaluated immediately per question, and exam answers are stored unevaluated until the complete exam is evaluated.
- Practice grading and final exam evaluation remain owned by Hermes because the API requires caller-supplied evaluation results; the frontend does not infer authoritative correctness. When a session completes, the screen shows its stored result and links to SCR-GRAM-005.

## SCR-GRAM-004 — Grammar explanation

**Purpose**  
Read the stored explanation for one explicitly requested question.

**Data contract**

```text
GET /api/v1/grammar/sessions/:code/questions/:questionNumber/explanation
```

- Present the question, grammar area, grammar point, and explanation in a constrained reading layout.
- Do not reveal explanations automatically for every unanswered question.

## SCR-GRAM-005 — Grammar report

**Purpose**  
Review the score and grammar-area breakdown of an evaluated session.

**Data contract**

```text
GET /api/v1/grammar/sessions/:code/report
```

- Lead with score and completion state, then divider-led grammar-area breakdown rows.
- Do not show a report for an active or unevaluated session as though it were complete.

## Implementation order

1. SCR-GRAM-002 Settings, because its API contract is complete and independent of the missing collection endpoint.
2. SCR-GRAM-003 for a known session code, including distinct practice and exam states.
3. SCR-GRAM-004 explanations and SCR-GRAM-005 reports after their session states are verified.
4. SCR-GRAM-001 once the collection endpoint became available. Implemented.
