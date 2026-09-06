# General English Screen List

> Status: Design ready; browser integration is blocked because General English has no web/API conversation contract. Visual reference: [General English](../frontend-design/general-english.png). Read [Frontend Screen Guide](../frontend-screens.md) with this document before implementing the screen.

## Scope

General English is a lightweight short Q&A space for spontaneous English-learning questions: meaning, translation, nuance, usage, and example sentences. It is not a tracked practice flow and does not automatically persist conversation history, learning progress, or analytics.

The only persistence path is explicit save to Notes. A saved item is owned by the Notes domain with `sourceContext = general_chat` and no source reference.

## Screen map

```text
/english/general
└── SCR-GEN-001  General English Q&A workspace
    └── Save response to Notes (conditional action; no route)
```

| ID | Screen | Proposed route | Initial status | API status |
| --- | --- | --- | --- | --- |
| SCR-GEN-001 | General English Q&A workspace | `/english/general` | Design ready; integration deferred | Conversation endpoint missing |
| — | Save response to Notes | No route; action over a response | Design only | Requires an explicit save contract |

Proposed web routes are frontend navigation only. They do not alter the REST API contract.

## SCR-GEN-001 — General English Q&A workspace

**Purpose**  
Ask a short English-learning question and receive a useful, readable answer without creating a persistent learning record by default.

**Entry points**

- `General English` child item under the application `English` navigation group.
- Direct link to `/english/general`.

**UI composition**

- Header: `General English` and the purpose statement `Tanya apa saja tentang bahasa Inggris.`
- Persistent plain-language notice: `Percakapan tidak disimpan otomatis.`
- A single active question-and-answer thread. The user question appears as a quiet right-aligned bubble; the assistant answer uses a constrained, readable content surface.
- An answer may contain a short explanation, distinctions, examples, translations, and usage guidance. Preserve English material while keeping UI labels and explanatory framing in Indonesian.
- `Simpan ke Notes` is a secondary action on a completed answer, not an automatic side effect.
- Optional suggestion chips are shown only for an empty or early conversation, for example: `Arti take it for granted`, `Contoh despite`, and `Bantu terjemahkan kalimat`.
- A fixed composer at the bottom with Indonesian/English placeholder copy and an explicit send action.

**Interactions**

- Send a non-empty question through the composer. Trim whitespace and disable the send action while empty or while a request is pending.
- Selecting a suggested question places or sends that question through the same conversation flow.
- Start a new question in the same active thread without implying a durable chat history.
- Select `Simpan ke Notes` only after an answer is available. Saving requires an explicit confirmation or a compact note-preview step because the captured title, category, tags, and source need a defined contract.
- Route structured requests—Grammar exercises, Reading generation, or Writing review—to their dedicated module rather than presenting a General English answer as a completed exercise.

**Data contract and known gap**

- There is intentionally no General English database schema, REST route, conversation endpoint, or browser-safe model access in the current product.
- The initial browser must not call an LLM directly or expose the internal API key. A future authenticated backend-for-frontend or dedicated General English API contract is required before the composer can function.
- The existing Notes API can persist a note only after a future save flow defines the user-approved payload. It must set `sourceContext` to `general_chat` and `sourceReference` to `null`.
- Do not synthesize persistent history from browser storage as a substitute for the missing contract.

**States**

| State | Behavior |
| --- | --- |
| Empty | Show the notice, a few helpful suggested questions, and the composer. |
| Answering | Keep the question visible; disable only the relevant send action and use a compact response skeleton. |
| Answer ready | Render one readable answer and allow explicit save to Notes when its contract exists. |
| Save pending | Disable only the save action; preserve the answer and selected content. |
| Save success | Show a short non-blocking confirmation with the resulting Notes code when available. |
| Error | Preserve the entered question and show safe retry copy without API/model internals. |

**Out of scope**

- Persistent chat history, archive, search, replay, summaries, progress tracking, or analytics.
- Automatic Notes creation, auto-tagging without confirmation, or browser-only conversation storage.
- Formal exercises, scores, grading, or practice completion state.

## Implementation order

1. Define an authenticated General English conversation contract; do not implement a browser-direct model call.
2. Implement the single-thread Q&A workspace and safe loading/error states.
3. Define the explicit response-to-Notes payload and confirmation before enabling `Simpan ke Notes`.
