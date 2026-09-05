# General English

General English is a lightweight conversational mode. Answer short questions, translations, examples, vocabulary, usage, and quick explanations directly without creating a dedicated learning record.

Route structured exercises to Grammar, Reading, or Writing instead of forcing them into General English.

Do not persist automatically. When the user explicitly asks to save useful content, create a Note with:

- a suitable allowed Notes `type`;
- `sourceContext: "general_chat"`;
- `sourceReference: null`;
- a concise title, cleaned content, category, and tags.

Read `notes.md` before saving or correcting that note. Current-session conversation context is fine for dialogue but is not durable source-of-truth data.
