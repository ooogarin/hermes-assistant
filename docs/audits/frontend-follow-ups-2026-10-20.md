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

**Done.** `features/grammar/session/page.tsx` became the page, the workspace,
the question panel, the question list, and the session details, each in its own
file. The rendered markup is unchanged.

## 4. Read the frontend documents again

**Done.** `docs/frontend.md` no longer claims that Notes is read-only, that the
Finance daily list can correct or delete a stored transaction, or that the
Reading list paginates. `docs/frontend-implementation-plan.md` no longer
claims a confirmed delete flow for Finance. The screen specifications in
`docs/frontend-screens/` were checked and still match the application.

`docs/frontend-components.md` is up to date.

## 5. Look at the API modules

**Done.** The audit is in
[api-modules-audit-2026-10-20.md](api-modules-audit-2026-10-20.md). The rules
that the repository enforces hold. The open work is the drift from the Notes
reference, the duplication between Notes and Junk, and the two places where a
contract or a service interface is missing.

## 6. Leave the two tag renderers alone

`TagList` shows a fixed number of tags with a counter, `ResponsiveTags` shows
as many tags as fit the given number of rows. They behave differently on
purpose, so they stay two components until a feature needs both.
