# Reading Screens

> Status: The approved Reading redesign is implemented. Reference: [Reading list and detail](../frontend-design/reading-approved.png). Read the shared [Frontend Screen Guide](../frontend-screens.md) and [Reading feature design](../feature-docs/reading-feature-design.md) for domain rules.

## List — `/english/reading`

- The header shows Reading and Pengaturan. The search bar, Filter popover (levels/genre), and newest/oldest selector follow the Notes/Junk controls. Quick status chips are Semua, Belum dibaca, and Sudah dibaca.
- The list has five columns: Judul / Cuplikan, Genre, Level, Tags, Tanggal disimpan. Manual status sits beside the title. The title/excerpt link opens full detail directly, with no side-panel. Narrow viewports scroll the table horizontally as Notes/Junk do.
- `GET /api/v1/reading/materials` applies search, levels, genre, reading_status, limit 100, and sort. Filter state is represented in the URL, with no page or old answer-based status parameters.
- The footer is `Menampilkan N bacaan` based only on the returned `items.length`. There are no pagination controls or total-count requests.
- Loading keeps the list structure; error supports retry; empty/no-results preserves filters and offers reset where useful.

## Detail — `/english/reading/:code`

- Kembali ke Reading and Pengaturan sit above a full detail surface matching Notes/Junk. The title and mark-read action share the same header row. The button alternates Tandai sudah dibaca / Tandai belum dibaca based on the saved manual status.
- The text is the primary content at full available reading width. Level, genre, and actual word count appear below the title; code/copy, saved date, source, and tags sit below the article.
- If questions exist, Pertanyaan opsional appears as a collapsed section below the article. It can be opened/closed by keyboard or pointer. A reading-only material omits this section.
- Answer fields permit none, some, or all answers without grading. Simpan jawaban is enabled only for changed values and sends a subset through `PATCH /materials/:code/answers`. Blank fields clear previously saved answers with explicit null. Omitted questions keep their saved values.
- Saves remain editable. Pending states disable competing writes and preserve input; failed requests keep input and show safe retry copy. Success messages confirm answer saves or manual status changes independently.
- Lihat jawaban acuan is an explicit action inside the question section and is available before any answers are saved. No action automatically changes the reading mark.
- `GET /materials/:code` provides title/content_text, effective targets, questions/user answers, manual status, source/tags, and timestamps. Components use contentText, following Notes style.

## Settings — `/english/reading/settings`

- Reuse the Learning settings layout: default level, word target/min/max, a quiet defaults summary, and Simpan perubahan. Add Jumlah soal default under Pertanyaan opsional.
- The count accepts integer 0–20; zero creates future reading-only material. Existing material snapshots are unchanged by settings edits. Word counts remain positive and satisfy minimum ≤ target ≤ maximum.
- `GET/PATCH /settings` uses snake_case API fields: default_level, default_word_count, min_word_count, max_word_count, default_question_count. Frontend fields follow the existing camelCase view-model style.
- Save is enabled only for valid changes. Loading/error/pending/success and unsaved-back confirmation follow the shared settings behavior.

## Reference answers — `/english/reading/:code/expected-answers`

- Show each question and its stored reference answer without score or correctness labels.
- The dedicated GET endpoint is available independently of user answers. A reading-only material shows an explicit empty state.

Generation remains owned by Hermes/Telegram. The frontend does not generate material or infer read status.
