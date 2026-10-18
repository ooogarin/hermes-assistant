# Grammar Screen List

> Status: Settings, session list, and known-code workflows implemented. Visual references: [Grammar list](../frontend-design/grammar-list.png) and [Grammar settings](../frontend-design/grammar-setting.png). Read [Frontend Screen Guide](../frontend-screens.md) with this document before implementing Grammar screens.

## Scope

Grammar provides daily practice, on-request practice, and exam sessions. Persistent defaults control only the level and number of questions for daily practice. A one-off practice or exam may change its level, grammar focus, type, and question count without changing those defaults.

The initial web scope is to update persistent defaults, open a known session, read explanations, and review an available report. Session generation remains owned by Hermes/Telegram and the API.

## Screen map

```text
/english/grammar
├── SCR-GRAM-001  Grammar session list
├── /settings
│   └── SCR-GRAM-002  Grammar settings
└── /:code
    ├── SCR-GRAM-003  Grammar session workspace
    │   └── Inline explanation drawer
    └── /report
        └── SCR-GRAM-004  Grammar report
```

| ID | Screen | Proposed route | Initial status | API status |
| --- | --- | --- | --- | --- |
| SCR-GRAM-001 | Grammar session list | `/english/grammar` | Implemented | Available |
| SCR-GRAM-002 | Grammar settings | `/english/grammar/settings` | Implemented | Available |
| SCR-GRAM-003 | Grammar session workspace | `/english/grammar/:code` | Implemented for a known code | Available |
| SCR-GRAM-004 | Grammar report | `/english/grammar/:code/report` | Implemented for evaluated sessions | Available |

Proposed web routes are frontend navigation only. They do not alter the REST API contract.

## SCR-GRAM-001 — Grammar session list

**Purpose**  
Find a session and review or inspect its result.

**UI composition**

- Header: `Grammar` and the local `Pengaturan` action, with no supporting subtitle.
- Search by session code, status chips, mode filter, and level filter.
- One grouped table-like list with session code, mode, date, level, source, status, and score where available.
- Rows are single links with no separate action column. Selecting a row always opens SCR-GRAM-003, where the workspace and its report are two tabs.

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
GET /api/v1/grammar/sessions/:code/questions/:questionNumber/explanation
```

- Session detail never includes `correct_answer`. It includes `explanation` only for a completed exam session; practice responses always carry `explanation: null`.
- The web screen is read-only. Answering happens through Hermes/Telegram: practice answers are evaluated immediately per question, and exam answers are stored unevaluated until the complete exam is evaluated.
- Practice grading and final exam evaluation remain owned by Hermes because the API requires caller-supplied evaluation results; the frontend does not infer authoritative correctness. When a session completes, the screen shows its stored result and its report becomes available.
- The workspace and its report are two tabs, `Soal` and `Laporan`, shown under the header. The `Laporan` tab stays visible but inactive with an explanatory tooltip until the session is completed; both tabs return to the list through `Semua Grammar`.
- The layout is two columns: the main column holds one question at a time, and the side column holds the question list above the session summary.
- The header shows the mode and focus as its title. The session code sits in the side session summary with a copy action, together with the other session metadata (level, question count, date, source, and status).
- The workspace opens on the first question. `Sebelumnya` and `Berikutnya` sit inside the side question-list card, which shows each question as a number box whose background color marks its stored result; users can also pick a question directly from the list.
- The saved answer is shown as read-only quoted text, and an evaluated question shows a colored result banner with its feedback.
- Question type, grammar area, and grammar point are displayed in title case even though the API stores them in lowercase.
- A completed session shows its stored score in the side session summary.

### Inline explanation drawer

The stored explanation opens in a collapsible drawer inside the question card instead of a separate page, so reading it never navigates or changes the selected question.

- The result banner holds a `Lihat penjelasan` / `Sembunyikan penjelasan` toggle with `aria-expanded` and `aria-controls`. The drawer is closed by default.
- The toggle is offered only for questions that already have an evaluation result (`answer.result !== null`), so exam explanations stay hidden until the exam is evaluated.
- The drawer shows only the explanation text; the question text, saved answer, result banner, and feedback already render in the workspace.
- Explanation source depends on the mode. A completed exam uses the `explanation` embedded in the session response and opens instantly. Practice always reads the single-question endpoint on first open, then caches the text in workspace memory so reopening is instant.
- A failed explanation request shows a non-blocking message with a `Coba lagi` action inside the drawer; the rest of the workspace stays usable.
- Opening or closing the drawer does not change the selected question, and switching questions closes it.

### Explanation availability

`GET /api/v1/grammar/sessions/:code/questions/:questionNumber/explanation` returns the stored explanation only after that question has been evaluated. Requesting it earlier returns `409 GRAMMAR_EXPLANATION_NOT_AVAILABLE`; an unknown session or question returns `404`. Correct answers are never returned.

## SCR-GRAM-004 — Grammar report

**Purpose**  
Review the score and grammar-area breakdown of an evaluated session.

**Data contract**

```text
GET /api/v1/grammar/sessions/:code/report
```

- Main column: a `Breakdown per area` table with `Area`, `Benar`, `Sebagian`, `Salah`, and `Proporsi` columns. Each row shows the area name, the stored counts, a segmented proportion bar (correct, partial, incorrect), and the weighted proportion as a rounded percentage.
- Side column: a `Ringkasan hasil` summary with the stored score, the correct, partial, and incorrect question counts, and the answered count.
- The screen does not repeat the score as a standalone hero card, and it does not offer write actions such as starting practice or closing the session.
- Reach the report through the `Laporan` tab of SCR-GRAM-003. Its back link returns to the session list.
- Do not show a report for an active or unevaluated session as though it were complete; in that state the screen explains that the report is not yet available.

## Implementation order

1. SCR-GRAM-002 Settings, because its API contract is complete and independent of the missing collection endpoint.
2. SCR-GRAM-003 for a known session code, including distinct practice and exam states.
3. The inline explanation drawer inside SCR-GRAM-003, replacing the former separate explanation screen.
4. SCR-GRAM-004 reports after session states are verified.
5. SCR-GRAM-001 once the collection endpoint became available. Implemented.
