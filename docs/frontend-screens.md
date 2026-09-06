# Hermes Frontend Screen Guide

> Status: Design baseline. This document defines cross-cutting screen conventions before module-specific screen specifications are written.

## 1. Purpose

The Hermes web frontend is a read-oriented workspace for reviewing reports, saved information, and English-learning material. It presents data returned by the API; durable data, financial calculations, learning evaluation, and aggregation remain owned by the API and PostgreSQL.

This document provides a shared screen language so new module screens feel like one product. It does not define module-specific fields, workflows, or API behavior; those belong in the applicable feature design and future screen specifications.

## 2. Visual baseline

The accepted visual direction is calm, spacious, and typography-led:

- Warm off-white page background with dark slate text.
- Emerald is the single primary accent for active navigation, primary actions, selected rows, and positive feedback.
- Use thin neutral borders and spacing to separate content. Shadows are exceptional, not a default.
- Use 12px rounded surfaces for grouped content; controls may use 8px rounding when visually appropriate.
- Avoid a dashboard made of many unrelated cards, cards inside cards, large illustrations, decorative gradients, and dense information grids.
- Body copy must remain comfortable to read; long-form text should use a constrained reading width.
- Use an icon library for functional icons. Do not create custom decorative iconography for MVP.

## 3. Application shell

Desktop uses a persistent left sidebar. It contains product-level destinations only; list, detail, settings, and report pages remain within each destination rather than becoming additional global navigation items.

```text
Hermes
├── Ringkasan
├── Finance
├── English
│   ├── General English
│   ├── Grammar
│   ├── Reading
│   └── Writing
├── Notes
└── Junk
```

### Navigation behavior

- `English` is an expandable group.
- When an English child is active, the group is expanded and the active child receives the primary visual indicator.
- A top-level active item uses a restrained tinted background plus an emerald leading indicator.
- Detail pages retain their parent item as active and provide an explicit back link within content.
- On narrow screens, the sidebar becomes a dismissible drawer. The hierarchy and active states remain unchanged.

## 4. Reusable screen patterns

### List screen

Use for collections such as saved items, materials, prompts, and sessions.

- Header: destination name, short purpose statement, optional local settings action.
- Controls: search first, then only the filters relevant to the collection.
- Content: one grouped list or table surface, with lightweight row separators.
- Rows: title or primary label first; metadata follows in a predictable order; state and stable reference code remain visible when useful.
- Navigation: selecting a row opens its detail screen. The selected row may receive an emerald leading indicator.
- Pagination appears only when the API provides a paginated collection.

### Detail and workspace screen

Use for a single material, item, conversation, or in-progress exercise.

- Start with a back link, clear title, stable reference code where applicable, and a compact metadata line.
- Keep one primary task dominant: reading, writing, answering, or reviewing.
- Supporting information belongs in a quiet secondary column only when it helps the task. Do not turn every datum into a card.
- Actions should follow task completion: submit, save, view explanation, or return to the parent list.

### Report and review screen

Use for Finance summaries, completed exams, and writing feedback.

- Lead with the single most important result, followed by a concise explanation.
- Use grouped breakdown rows and proportional bars when comparison is needed.
- Do not add gamification, rankings, trends, or a large chart unless the relevant feature design explicitly requires them.
- Put optional detail—such as explanations or corrected text—behind a clear secondary action or local tab.

### Lightweight Q&A screen

Use for short, non-persistent conversations.

- One active conversation only; do not imply durable chat history where none exists.
- Keep the composer fixed at the bottom of the content area.
- Show optional suggested questions only when they help an empty or early conversation.
- State clearly when content is not stored automatically; show an explicit save action only when the feature supports it.

## 5. Shared states

Every data-backed screen must define its state before implementation.

| State | Visual behavior | User action |
| --- | --- | --- |
| Loading | Preserve the final layout with subtle skeleton rows or blocks; avoid a full-page spinner. | None required. |
| Initial empty | Explain that no content exists yet without inventing a browser-only creation flow. | Provide an action only when the feature supports one. |
| No results | Keep the search/filter context visible. Use a small message inside the normal collection surface. | Clear or adjust search/filter. |
| Recoverable error | Keep selected context, such as a date range or filter, visible. Use safe plain-language copy. | Retry. |
| Submit pending | Disable only the relevant action and keep entered data visible. | Wait or cancel when safe. |
| Success | Show a short, non-blocking toast. | None required. |
| Delete confirmation | Use a small explicit dialog naming the affected item. | Cancel or confirm delete. |

### Safe error copy

Client-visible errors must be action-oriented and must not expose API keys, SQL, connection details, status internals, or stack traces. Example:

```text
Laporan belum dapat dimuat
Periksa koneksi lalu coba lagi.
```

## 6. Interaction and content rules

- Use stable public codes in list and detail screens when the domain has them; never expose internal database IDs.
- Persisted values come from the API. The frontend may format data but does not calculate authoritative totals, scores, or evaluation results.
- Use Indonesian for navigation, labels, actions, and feedback. Preserve English material where it is the learning content.
- Format currency in Rupiah and dates in the Indonesian locale.
- Put destructive actions behind confirmation. Soft deletion remains an API/domain behavior; the frontend describes the action plainly without exposing database implementation details.
- Avoid controls that imply unimplemented behavior, such as automatic progress tracking, uploads, direct media storage, or persistent history when the feature design defers them.

## 7. Accessibility and responsive behavior

- Every interactive element must have a visible label, keyboard focus state, and accessible name.
- Do not rely on color alone for active, correct, partial, incorrect, or destructive states; pair it with text or an icon label.
- Maintain readable contrast for muted text, borders, selected rows, and disabled controls.
- Do not use hover as the only way to reveal a critical action or status.
- On narrow viewports, collapse the sidebar into a drawer, stack secondary panels below the primary task, and preserve action order.
- Long passages, feedback, and user-entered text must wrap without horizontal scrolling.

## 8. Screen specification template

Every future module screen specification should use this format:

```md
### SCR-<AREA>-<NUMBER> — <Screen name>

**Purpose**
One sentence describing the user outcome.

**Route**
Proposed web route. This is not an API contract.

**Entry points**
Where the user opens the screen.

**UI composition**
- Header
- Primary content
- Supporting content
- Actions

**Data contract**
API data required, formatting rules, and any known API gap.

**States**
Loading, empty/no-result, error, pending, success, and destructive confirmation as applicable.

**Responsive and accessibility notes**
Only screen-specific exceptions to the shared rules above.

**Out of scope**
Behavior deliberately not included in this screen.
```

## 9. Documentation sequence

1. Keep this guide as the shared baseline.
2. Add module-specific screen specifications only after their feature behavior and API availability are confirmed. Current specifications are [Finance](frontend-screens/finance.md), [Notes](frontend-screens/notes.md), [Junk](frontend-screens/junk.md), [General English](frontend-screens/general-english.md), [Reading](frontend-screens/reading.md), [Grammar](frontend-screens/grammar.md), and [Writing](frontend-screens/writing.md).
3. Update the relevant feature design, API contract, and this guide together when a screen requires a behavior or data change.
4. Implement shared UI primitives before composing module screens.
