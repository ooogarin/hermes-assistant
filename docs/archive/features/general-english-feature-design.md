# English Learning - General English - Detailed Design

This document focuses on the General English sub-skill in Hermes English Learning. General English is intentionally lightweight: it is a short Q&A mode and does not need its own database schema.

> Status: MVP design. No new database tables.

---

## 1. Goal

General English is a free-form short Q&A mode for English learning questions that do not need a structured practice flow.

Example use cases:

- Ask the meaning of a word or phrase.
- Ask a quick grammar question.
- Ask for translation help.
- Ask for example sentences.
- Ask about nuance, tone, or usage.
- Have a short English-learning discussion that does not need tracking.

This mode is not intended for progress tracking or formal exercises.

---

## 2. Routing Boundaries

Hermes should answer directly in General English when the user asks a short, spontaneous question.

Examples that stay in General English:

```text
What is the difference between "although" and "even though"?
What does "take it for granted" mean?
Translate this sentence into English.
Give me 3 example sentences with "despite".
```

Hermes should route structured practice requests to the dedicated feature instead:

| User intent                                | Route to                          |
| ------------------------------------------ | --------------------------------- |
| "Give me grammar exercises"                | Grammar                           |
| "Generate a A1 reading passage"            | Reading                           |
| "Correct this essay" / "Review my writing" | Writing                           |
| "Start a speaking/listening practice"      | Future Speaking/Listening feature |

Principle:

- General English = short Q&A and quick explanations.
- Grammar/Reading/Writing = structured learning flows with their own data model.

---

## 3. Flow

```text
User asks a short English-learning question
        |
        v
Hermes answers directly
        |
        v
No automatic database write
        |
        v
Optional: user says "catat ini" / "save this" / "masukkan ke notes"
        |
        v
Hermes saves the relevant content through the Notes API
```

---

## 4. Persistence

Default behavior:

- General English conversations are not automatically stored in the project database.
- Hermes may rely on its own short-term conversation context during the current session.
- General English does not create progress data, summaries, or analytics.

On-request save:

- If the user explicitly asks to save something, Hermes creates a note using the Notes feature.
- No separate General English table is created.
- Notes created from General English should use:

```text
source_context = "general_chat"
source_reference = null
```

This is intentionally simple because saving General English conversations is expected to be rare.

---

## 5. Rejected Decisions

These were considered but intentionally not included:

- Periodic weekly/monthly topic summaries from General English chat history.
- A dedicated `general_summaries` table.
- Automatic tracking of common questions or learning trends from General English.

Reason: General English is meant to be a lightweight short Q&A space, not a tracked learning module.

---

## 6. Final Design Decisions

| Decision               | Final Choice                                                |
| ---------------------- | ----------------------------------------------------------- |
| New database schema    | None                                                        |
| Default persistence    | Not stored automatically                                    |
| On-request persistence | Reuse Notes through the Notes API                           |
| Notes marker           | `source_context = "general_chat"`                           |
| Notes source reference | `source_reference = null`                                   |
| Progress tracking      | Not included                                                |
| Periodic summaries     | Not included                                                |
| Main role              | Short Q&A, quick explanation, translation, nuance, examples |
