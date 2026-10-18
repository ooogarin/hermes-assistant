# Grammar — Inline Explanation Drawer (Replacement for SCR-GRAM-004)

> Date: 2026-10-18. Status: **implemented**. The data-sourcing decision in Section 4 was
> resolved as a hybrid: practice keeps the single-question endpoint, a completed exam
> embeds explanations in the session response. Section 7 records the final answers.
> This document is kept as the handoff record; the current behavior lives in
> `docs/frontend-screens/grammar.md` and `docs/feature-docs/grammar-feature-design.md`.
>
> Screen IDs were renumbered when this shipped: the former `SCR-GRAM-004` explanation screen
> is gone, and the report became `SCR-GRAM-004` (previously `SCR-GRAM-005`). References to
> `SCR-GRAM-004` below describe the pre-change numbering.

## 1. Problem

The Grammar session workspace (`SCR-GRAM-003`) shows the stored answer and the result banner
for the selected question. To read that question's explanation, the user must follow a
`Lihat penjelasan` link that **navigates to a separate page** (`SCR-GRAM-004`). This has two
drawbacks:

1. It leaves the workspace and fetches the explanation as its own page.
2. Going back returns to the session workspace on **question 1**, not the question the user
   was reading (the workspace opens on the first question and its selection is not in the URL).

The user wants the explanation to live **on the question page itself**, hidden behind a
collapsible **drawer** that can be opened and closed in place. The separate explanation page
and its per-question navigation should go away.

## 2. Desired behavior

- The explanation is a collapsible drawer inside the workspace question card, below the
  result banner.
- The drawer is closed by default and toggled by a button (for example `Lihat penjelasan`
  / `Sembunyikan penjelasan`).
- Opening/closing does not navigate and does not lose the current question.
- The drawer is only offered for questions that already have an evaluation result
  (existing gating rule: `answer.result !== null`).
- The drawer shows only the explanation text. The question text, stored answer, result banner,
  and feedback already render in the workspace, so the drawer does not repeat them.

```text
┌─────────────────────────────────────────────┐
│ Soal 3 dari 5                               │
│ Tenses · Past Perfect                       │
│                                             │
│  By the time we arrived, the movie ______    │
│  (already / start).                         │
│                                             │
│  Jawaban tersimpan: "had already started"  │
│  ✓ Benar   Bagus, polanya tepat.            │
│                                             │
│  [ Lihat penjelasan ▾ ]                     │
│  ┌───────────────────────────────────────┐  │
│  │ Penjelasan                           │  │
│  │ Gunakan had + past participle ...    │  │
│  └───────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

## 3. Behavior before the change (as implemented on 2026-10-18)

This section records the pre-change state for reference. Section 7 lists what replaced it.

### 3.1 Frontend

- Workspace: `apps/web/src/features/grammar/session/page.tsx`
  - Renders one question at a time in a two-column layout.
  - The result banner is shown only when `resultMeta !== null` and contains the explanation
    link:
    ```tsx
    <Link
      className='ml-auto text-sm font-semibold underline-offset-2 hover:underline'
      to={`/english/grammar/${session.code}/questions/${question.questionNumber}/explanation`}
    >
      Lihat penjelasan
    </Link>
    ```
  - Question selection is component state (`useState`), not URL state, and defaults to the
    first question.
- Explanation page: `apps/web/src/features/grammar/explanation/page.tsx`
  - Back link `Kembali ke sesi` to `/english/grammar/:code`.
  - Shows `Soal N`, `area · point`, the question text, and a `Penjelasan` section.
- Route: `apps/web/src/app/routes.tsx`
  - `english/grammar/:code/questions/:number/explanation` → `GrammarExplanationPage`.
- API client: `apps/web/src/features/grammar/grammar-api.ts`
  - `grammarExplanationSchema` → `{ questionNumber, questionText, grammarArea, grammarPoint, explanation }`.
  - `getGrammarExplanation(code, questionNumber)`.

### 3.2 Backend

- Route: `apps/api/src/modules/grammar/grammar.route.ts`
  - `GET /sessions/:code/questions/:question_number/explanation` → `grammarHandler.getExplanation`.
- Handler: `apps/api/src/modules/grammar/grammar.handler.ts` → `getExplanation`.
- Service: `apps/api/src/modules/grammar/grammar.service.ts` → `getExplanation`, `toGrammarExplanation`.
- Repository: `apps/api/src/modules/grammar/grammar.repository.ts` →
  `getOneExplanationByCodeAndQuestionNumber`, which selects **only** `grammar_questions`
  columns:
  ```
  question_number, question_text, grammar_area, grammar_point, explanation
  ```
  It does **not** join `grammar_answers`, so it exposes no stored answer or result.
- Types: `apps/api/src/modules/grammar/grammar.types.ts` → `GrammarExplanation`, `GrammarExplanationRow`.
- Session detail (`GET /sessions/:code`) returns every question including its `answer`
  (`user_answer`, `result`, `feedback`) but deliberately excludes explanations and
  `correct_answer`.
- API tests: `apps/api/tests/grammar-api.test.ts` (the `explanation` fixture and the
  `returns an explanation through its dedicated endpoint` test).

### 3.3 Documented screens

- `docs/frontend-screens/grammar.md` describes `SCR-GRAM-004` as a separate screen and
  `docs/feature-docs/grammar-feature-design.md` holds the feature design.

## 4. Data-sourcing options (resolved: hybrid)

Because the workspace already renders the answer/result/feedback, the drawer only needs the
**explanation text**. The question was how to obtain it without fetching one explanation per
question as the user opens it. The adopted answer keeps option a for practice and applies an
exam-only version of option c, so neither list below is the final design.

| Option | Approach | Backend change | Per-question fetch |
| --- | --- | --- | --- |
| **a. Lazy + cache** | Fetch `GET /sessions/:code/questions/:number/explanation` the first time a drawer is opened; cache the text in workspace memory | none | yes, once per question opened |
| **b. Batch** | Add `GET /sessions/:code/explanations` returning explanations for evaluated questions; workspace fetches once | yes | no |
| **c. Embed in session** | `GET /sessions/:code` also returns explanations for evaluated questions | yes | no (single call) |

Notes:

- The proposal recommended **b**. It was not adopted: a completed exam already has every
  explanation available at once, so embedding them in the session response avoids both the
  extra endpoint and the per-question fetches for that mode.
- For **c**, the backend returns explanations only for a completed exam session, so
  unevaluated exam explanations cannot leak over the network; the frontend gating alone is
  not sufficient.
- The adopted hybrid keeps option **a** for practice, where answers are evaluated one at a
  time and a session may never complete.
- The single-question endpoint is additionally gated on the question's own evaluation
  result, which also covers option a.

## 5. Impact by option

The subsections below describe the options as they were evaluated. Section 7 records what was
actually built.

### 5.1 Option a

- Frontend only:
  - Add a small in-memory cache (for example `useRef<Map<number, string>>` or component state).
  - On drawer open, call `getGrammarExplanation(session.code, question.questionNumber)` if not cached.
  - Show a loading and error affordance inside the drawer.
- No backend change.
- The separate explanation route/page can still be removed.

### 5.2 Option b

- Backend:
  - New repository query: select `question_number`, `explanation` from `grammar_questions`
    joined to `grammar_answers`, filtered by `code`, `grammar_answers.result IS NOT NULL`,
    and `deleted_at IS NULL`.
  - New service function, handler, and route `GET /sessions/:code/explanations`.
  - New type, for example `GrammarSessionExplanations = { items: Array<{ question_number: number; explanation: string }> }`.
  - API test for the new endpoint.
- Frontend:
  - Add a schema and `getGrammarSessionExplanations(code)` in `grammar-api.ts`.
  - Workspace fetches session + explanations (for example `Promise.all`) and maps by
    question number.

### 5.3 Option c

- Backend:
  - Extend the session detail query to include `explanation` (evaluated questions only) and
    update `GrammarSession`/`GrammarQuestion` types + mapping.
  - Update the session detail API test.
- Frontend:
  - Add `explanation` to `grammarQuestionSchema`.
- Changes a deliberate exclusion in the existing session contract, so update the feature
  design accordingly.

### 5.4 Shared frontend work (all options)

- `apps/web/src/features/grammar/session/page.tsx`
  - Replace the `Lihat penjelasan` link with a toggle button.
  - Render the drawer below the result banner; default closed; reset/keep state sensibly when
    switching questions.
  - Offer the drawer only when `resultMeta !== null`.
- `apps/web/src/features/grammar/explanation/page.tsx`
  - Remove (drawer replaces it), unless the maintainer wants to keep a deep-link fallback.
- `apps/web/src/app/routes.tsx`
  - Remove the `.../questions/:number/explanation` route if the page is removed.
- `apps/web/src/features/grammar/grammar-api.ts`
  - Keep or remove `getGrammarExplanation` depending on the chosen option and on whether the
    route stays.
- Tests: `apps/web/src/features/grammar/grammar.test.tsx` — add drawer open/close behavior and
  keep the explanation gating assertions.
- Docs: update `docs/frontend-screens/grammar.md` (`SCR-GRAM-004`) and
  `docs/feature-docs/grammar-feature-design.md`.

## 6. Constraints (repository rules)

- Web is a read-only monitor; the only frontend write is the Grammar settings update. No
  answering or session mutation from the drawer.
- Correct answers stay hidden on web. The explanation is only shown for evaluated questions.
- Keep the boundary: route → validator → handler → service → repository. Parameterized raw SQL
  only. Validate external input with Zod.
- Do not create additional docs or scripts beyond what is requested.
- Preserve the workspace conventions already in place: shared session header, `Soal | Laporan`
  tabs, and the side session summary.

## 7. Resolved questions

1. **Data sourcing**: hybrid. Practice reads `GET /sessions/:code/questions/:number/explanation`
   lazily and caches the text; a completed exam embeds every explanation in
   `GET /sessions/:code`. Option b was not adopted, and option c applies only to exams.
2. **Separate route**: removed. The web route and page
   (`/english/grammar/:code/questions/:number/explanation`) no longer exist. The REST
   endpoint stays because Hermes uses it.
3. **Workspace link**: replaced by the drawer toggle. The workspace never links to a
   separate explanation screen.

Additional decisions taken while implementing:

- The single-question endpoint returns `409 GRAMMAR_EXPLANATION_NOT_AVAILABLE` until the
  question is evaluated, so an unfinished exam cannot leak answers over the network.
- A session response embeds explanations only when `mode = exam` and `status = completed`.
  Practice responses always carry `explanation: null`.
- Answer writes never return explanations, because the write path only runs while a
  session is still `active`.
- Question selection stays in component state; it was not moved into the URL.

## 8. Acceptance criteria

- The explanation can be opened and closed inline in the workspace without changing the
  selected question or navigating away.
- The drawer is offered only for questions with an evaluation result.
- Correct answers remain hidden.
- A completed exam opens its drawer without a per-question explanation request; practice
  performs at most one request per question and reuses the cached text afterwards.
- Unavailable or failed explanation data shows a clear, non-blocking state inside the drawer.
- Tests cover drawer open/close and the gating rule; lint, typecheck, and web tests pass.
