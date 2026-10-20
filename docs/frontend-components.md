# Frontend Component Foundation

Shared visual and interaction primitives live in `apps/web/src/components/ui`. Feature components compose them and retain domain validation, API mapping, and workflow state.

## Rules

- Reuse a global primitive when appearance and interaction are shared across features.
- Search the primitives below before adding another one. A second copy of a shared behaviour is what this document exists to prevent.
- Keep feature-specific structures and business rules under their feature component directory.
- Inputs share the same height, border, radius, focus, disabled, and invalid states.
- Every icon-only action has an accessible label.
- Prefer controlled values at the feature boundary. Components may own temporary UI state such as a dropdown query or unfinished tag draft.
- Open layers close one at a time. Escape and an outside click always reach the innermost open layer, and the layer underneath stays open.

## Actions

`Button` accepts text, an icon, or both. At least one is required by its TypeScript contract; an icon-only button also requires `aria-label`. `ButtonLink` shares the same sizes and variants for navigational actions. `IconButton` is a small wrapper over the same button foundation.

Supported variants are `primary`, `secondary`, `danger`, and `ghost`; supported sizes are `sm`, `md`, and `icon`.

`RecordActions` is the edit and delete action set of a stored record. It offers a menu or plain buttons, confirms the deletion with a dialog, and reports a failed deletion. The feature keeps the wording, the routes, and the delete call; the primitive keeps the flow. `ConfirmationDialog` is the shared confirmation it uses.

`CopyButton` copies a value and reports the result in place. `PageHeader` is the heading of a page with its optional actions.

## Fields

`Field` owns the visible label and helper/error message. `Input`, `Textarea`, `TextField`, `TextAreaField`, and `SelectField` share the global control treatment. Domain-specific composites may place the primitive input inside a unit or date wrapper, but must not duplicate its base state styling.

## Calendar picker

`DatePicker` is the shared calendar control for date selection across the frontend, including Finance reports and forms, and date-range filters in Notes and Junk. It accepts optional minimum and maximum dates, can be disabled, and supports clearing optional filter dates. Paired range controls use the other selected date as their boundary.

The `position` prop accepts `top` or `bottom` (default) to place the calendar above or below its trigger. Notes and Junk filters use `position='top'` to keep the calendar above the date fields. Horizontal placement is controlled separately by `align` (`start` or `end`).

`DateRangeFilter` pairs two date pickers into the range filter used by Notes and Junk. Each side bounds the other, and the filter reports an invalid range.

`SearchField` accepts a custom leading icon, clear label, and clear handler. `SearchForm` composes it with an optional action icon and configurable action label.

## Choice dropdown

`ChoiceDropdown` uses a discriminated `mode`:

- `single` accepts one value or `null`, shows a circular radio-style indicator, and closes after selection.
- `multiple` accepts an array, shows square checkbox-style indicators, remains open while selecting, and renders selected values as removable chips.

Both modes support searchable options, disabled options, clear behavior, full-trigger interaction, outside-click closing, and Escape. Component width is controlled by its consumer; selected chips wrap vertically without changing that assigned width.

## Tags and chips

`TagInput` accepts and emits `string[]`. A draft becomes a tag through the Add action or Enter, then appears as a removable `Chip`. It rejects empty, duplicate, over-length, and over-limit values before updating the controlled array. Notes and Junk must not serialize tags through a comma-separated text field.

`TagList` shows a fixed number of tags with a counter for the rest, and is used by Reading. `ResponsiveTags` shows as many tags as fit the given number of rows and reports the rest as a counter; Notes, Junk, and Writing use it.

`FilterChipRow` is a group of quick filters where one option is active at a time. It marks the group with a hidden legend and the active option with `aria-pressed`. `FilterChip` is the single chip it is built from.

`FilterPopover` holds the filters that wait for the reader to apply them. It closes on an outside click and on Escape, and the list page owns whether it is open.

## Lists

`ScrollTable` is the shared table for records that are wider than the page. The first column stays in place while the rest scrolls sideways, and a hint appears once the table can be scrolled. The feature keeps the columns and the rows; the primitive keeps the overflow measurement, the frozen column, the edge fade, and the hint. `scrollTableRowClassName` and `scrollTableTitleClassName` are the shared row and title cell treatments, so a table does not restate them.

`SortToggle` switches a list between the newest and the oldest record.

## Record details

`DetailPane` shows one stored record with its source, its original text, and its metadata. The feature supplies the metadata rows; the primitive keeps the layout, the source link, the original text switch, and the metadata list. `DetailRow` is one metadata row.

## Request states

`QueryError` shows the state of a failed request. A record that is gone gets its own message, every other failure can be retried. A feature that has a special failure can pass a `fallback` for it.

`ContentState` is the shared empty and error panel, `ErrorState` is the retryable failure, `CollectionSkeleton` is the loading placeholder, `Skeleton` is the single loading block, and `NavigationNotice` is the message a page shows after an action. `ProgressBar` shows a bounded value and `useTooltip` shows a short hint next to a control.

`ListEmptyState` is the empty state of a list. A filtered list offers to clear the filters, an empty list explains what will fill it. The feature keeps the wording and any action of its own.

`StatusPill` is the small badge that marks the status of a record, in an `accent` or a `warning` tone.

## Forms

`ContentForm` is the form of a stored record. The container keeps the values, the dirty check, the save flow, and the cancel button; the feature renders the fields and the validation rules.

## Settings

`SettingsLevelPicker` is the grid of CEFR levels, `SettingsNumberField` is a number with a unit, and `SettingsSummary` is the panel that shows the values a feature starts with. `LearningSettingsPage` composes them for the English learning features, and `EnglishSettingsLink` is the link to them.

## Hooks

`useListParams` keeps the browser URL as the source of truth for the filters of a list. A page declares which filters it offers, which of them wait for the reader to apply them, and which one the quick filters change. The hook keeps the applied filters, the drafts, the sort order, the search text, and a query key that ignores unrelated parameters.

`useDismissOnOutside` dismisses an open layer when the reader clicks outside it or presses Escape. It keeps the open layers in one place, so the innermost layer always closes first.

`useUnsavedChanges` warns before a reader leaves a page with unsaved changes and registers the form so the application shell can warn as well.

`useApiQuery` runs a cancellable request and exposes its loading, success, and error states.

`lib/formatting/dates.ts` holds the shared date helpers: the `YYYY-MM-DD` value of a date, the validation of a date value, and the ranges that stay inside today.

## Routes

`app/app-routes.ts` holds the table of pages behind the sign in. It is the single source of truth: the route tree and the destinations a reader may return to after signing in are both derived from it. A new page is reachable after signing in as soon as it is listed there.
