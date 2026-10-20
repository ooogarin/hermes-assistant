# Frontend follow-ups

Recorded on 2026-10-20 after the shared primitive work. Each item is a
separate, self-contained change. Nothing here blocks the next one.

## 1. Keep the list filters in one hook

**Done.** `useLearningListParams` and `usePersonalContentList` became
`useListParams`, used by the grammar, reading, writing, notes, and junk lists.

## 2. Split the learning settings page

**Done.** `learning-settings.tsx` became the page, `learning-settings-form.tsx`
the form, and `learning-settings-summary.tsx` the summary. The rendered markup
is unchanged.

## 3. Split the grammar session page

`features/grammar/session/page.tsx` is the largest page left. It holds the
session, its questions, the answer grading, and the explanation drawer. Give
each a component and keep the page as the composition. The drawer already has
its own component in `components/grammar/grammar-explanation-drawer.tsx`.

## 4. Read the frontend documents again

`docs/frontend.md` and `docs/frontend-screens.md` were written before the
shared primitives existed. Check that the structure, the filter behaviour, and
the described screens still match the application.

`docs/frontend-components.md` is up to date.

## 5. Look at the API modules

The API was never audited the way the frontend was. The modules follow the
documented contract, so the review should start with the rules in
`docs/architecture.md` and the enforced contract in
`apps/api/tests/module-contract.test.ts`.

## 6. Leave the two tag renderers alone

`TagList` shows a fixed number of tags with a counter, `ResponsiveTags` shows
as many tags as fit the given number of rows. They behave differently on
purpose, so they stay two components until a feature needs both.
