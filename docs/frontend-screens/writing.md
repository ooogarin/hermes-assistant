# Writing Screen List

> Status: Implemented against the independent submission API. Analysis is requested only through a direct Telegram command; the web CTA is inactive. Visual references: [Writing list](../frontend-design/writing-list.png), [Writing prompt](../frontend-design/writing-insert.png), [Writing feedback](../frontend-design/writing-result.png), and [Writing settings](../frontend-design/writing-setting.png). Read [Frontend Screen Guide](../frontend-screens.md) with this document.

## Scope

The [Writing submission contract](../feature-docs/writing-submission-contract.md) owns the API rules. The web supports free writing and responses to Hermes prompts, saving without analysis, reviewing existing feedback, and correcting estimated metadata. Prompt generation and AI analysis remain owned by Hermes/Telegram.

## Screen map

| Screen | Route | Purpose |
| --- | --- | --- |
| Tulisan | `/english/writing` | Browse free and prompted submissions |
| Tulis bebas | `/english/writing/new` | Save text without a material |
| Prompt | `/english/writing/materials` | Browse generated materials |
| Prompt workspace | `/english/writing/materials/:code` | Write a response and browse its submissions |
| Submission detail | `/english/writing/submissions/:code` | Read original text, estimates, and analysis status |
| Edit submission | `/english/writing/submissions/:code/edit` | Edit unlocked text and estimated metadata |
| Feedback | `/english/writing/submissions/:code/feedback` | Review stored analysis |
| Corrected text | `/english/writing/submissions/:code/corrected-text` | Read the corrected version on demand |
| Settings | `/english/writing/settings` | Update persistent prompt defaults |

Material routes use `WR` codes. Submission routes use independent `WS` codes. Login return destinations recognize all these routes. There are no numeric submission routes.

## Visual consistency

Writing follows the Notes/Junk component patterns: a shared page header and primary add action,
search with a filter popover and sort control, status chips, and a bordered white collection.
Rows use aligned columns, a sticky title/excerpt column, responsive tags, and the same hover
and keyboard focus treatment. Horizontal overflow stays inside the collection, with a hint
and keyboard access when scrolling is needed. The footer shows only the number of items;
there are no pagination controls.

Detail, feedback, and form surfaces use the same border, radius, spacing, and typography as
Notes/Junk. Metadata appears in labeled rows. Forms reuse the shared dropdown, tag input,
fields, and save/cancel buttons. Writing retains its separate Tulisan and Prompt navigation.

## Collections

### Tulisan

- The main Writing page has `Tulisan` and `Prompt` navigation, a `Tulis bebas` action, and local settings.
- `GET /api/v1/writing/submissions` provides search, analysis status, writing type, and sort. Search/filter/sort state is represented in the URL. The UI loads all matching results by collecting API pages of up to 100 items; a failed page shows an error instead of an incomplete collection.
- Rows show estimated topic when available, otherwise the submission code, followed by the original-text excerpt, writing type, word count, creation date, available estimates, and analysis status.
- Analysis status appears as a rounded badge beside the title, matching Reading: green for analyzed and amber for not analyzed. Genre and level have separate columns.
- Rows always open the submission's `WS` detail. Missing estimates are never copied from a material.
- Empty collections offer free writing. Empty search results retain filters and offer `Hapus filter`.

### Prompt

- `GET /api/v1/writing/materials` provides search, status, CEFR levels, genre, and sort. The UI collects all API pages and displays one list without pagination controls.
- Rows show topic, criteria, date, tags, saved/analyzed counts, and material status. They always open the material workspace.
- Status labels are `Belum ada tulisan` (`unsubmitted`), `Belum dianalisis` (`submitted`), and `Ada analisis` (`reviewed`). A reviewed material can still contain unanalyzed submissions, shown by the separate counts.

## Compose and save

- Free writing opens a composer without loading or generating a material.
- A material workspace shows its prompt and criteria in a detail panel above the composer. Criteria are guidance; writing outside them does not block saving.
- A material's submissions are loaded using `GET /submissions?material_code=WR-...`, collecting every API page in newest-first order. The history uses the same table and item-count footer as the main list.
- `POST /api/v1/writing/submissions` sends only `original_text` and, for prompted writing, `material_code`.
- Preserve the exact original text, including whitespace and line breaks. The local word count is informational; the API returns the authoritative count.
- Disable save for blank text, and limit text to 100,000 characters. Keep the draft while saving or after failure; allow retry.
- On success, navigate to the returned `WS` detail and show a short success notice. Saving does not request analysis.
- The composer registers unsaved changes; its back action confirms before discarding.

## Submission detail and editing

- `GET /api/v1/writing/submissions/:code` supplies original text, nullable estimates, creation date, word count, analysis status, and optional feedback.
- Show `Belum diestimasi` for null topic, genre, tags, and level. An explicitly empty tags array displays `Tanpa tag`.
- Prompted writing links to its material; free writing is identified without a synthetic prompt.
- Before analysis, show `Edit tulisan` and an inactive `Analisis tulisan` button. Explain Telegram availability and offer copying the `WS` code. The web does not start or queue analysis.
- After analysis, offer feedback and `Edit metadata`. Original text is locked; estimates remain editable.
- The edit form uses `PATCH /submissions/:code`, sending only changed fields. It does not send code, material association, word count, analysis, or timestamps.
- Topic and genre cannot be cleared after filling; level uses CEFR choices. Tags can be changed to `[]`. Unchanged null metadata stays omitted.
- Metadata corrections do not change feedback or analysis status.
- If analysis finishes while a text edit is open, handle `WRITING_SUBMISSION_TEXT_LOCKED` by keeping the unsaved text visible, marking it locked, and allowing subsequent metadata-only edits.
- Save failures preserve entered values. Back/cancel actions confirm before discarding changes.

## Feedback and corrected text

- Feedback reads the same `GET /submissions/:code` result. When analysis is null, show an unanalyzed state and a link to the original writing.
- Lead with overall feedback, word count, estimated level, and analysis date. Follow with strengths, priorities, grammar, vocabulary, structure, and next steps; no overall score is invented.
- Show a concise `Kesesuaian dengan prompt` section only when `prompt_adherence` is present. Free writing has no adherence section.
- `GET /submissions/:code/corrected-text` loads corrected text only on its dedicated page. Preserve line breaks and a comfortable reading width; keep the original writing unchanged.
- A `WRITING_SUBMISSION_NOT_ANALYZED` response shows an unanalyzed state. Missing submissions have a safe not-found state; other read failures offer retry.

## SCR-WRITE-002 — Writing settings

**Purpose**  
Review and change the persistent defaults Hermes uses for future Writing prompts.

**Entry points**

- Local `Pengaturan` action from a Writing list or workspace.
- Direct link to `/english/writing/settings`.

**UI composition**

- Back link: `Kembali ke Writing`.
- Header: `Pengaturan Writing` with no supporting subtitle.
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
  "default_level": "B1",
  "default_word_count": 200,
  "min_word_count": 150,
  "max_word_count": 250
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
