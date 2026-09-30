# Frontend Component Foundation

Shared visual and interaction primitives live in `apps/web/src/components/ui`. Feature components compose them and retain domain validation, API mapping, and workflow state.

## Rules

- Reuse a global primitive when appearance and interaction are shared across features.
- Keep feature-specific structures and business rules under their feature component directory.
- Inputs share the same height, border, radius, focus, disabled, and invalid states.
- Every icon-only action has an accessible label.
- Prefer controlled values at the feature boundary. Components may own temporary UI state such as a dropdown query or unfinished tag draft.

## Actions

`Button` accepts text, an icon, or both. At least one is required by its TypeScript contract; an icon-only button also requires `aria-label`. `ButtonLink` shares the same sizes and variants for navigational actions. `IconButton` is a small wrapper over the same button foundation.

Supported variants are `primary`, `secondary`, `danger`, and `ghost`; supported sizes are `sm`, `md`, and `icon`.

## Fields

`Field` owns the visible label and helper/error message. `Input`, `Textarea`, `TextField`, `TextAreaField`, and `SelectField` share the global control treatment. Domain-specific composites may place the primitive input inside a unit or date wrapper, but must not duplicate its base state styling.

## Calendar picker

`DatePicker` is the shared calendar control for date selection across the frontend, including Finance reports and forms, and date-range filters in Notes and Junk. It accepts optional minimum and maximum dates, can be disabled, and supports clearing optional filter dates. Paired range controls use the other selected date as their boundary.

The `position` prop accepts `top` or `bottom` (default) to place the calendar above or below its trigger. Notes and Junk filters use `position='top'` to keep the calendar above the date fields. Horizontal placement is controlled separately by `align` (`start` or `end`).

`SearchField` accepts a custom leading icon, clear label, and clear handler. `SearchForm` composes it with an optional action icon and configurable action label.

## Choice dropdown

`ChoiceDropdown` uses a discriminated `mode`:

- `single` accepts one value or `null`, shows a circular radio-style indicator, and closes after selection.
- `multiple` accepts an array, shows square checkbox-style indicators, remains open while selecting, and renders selected values as removable chips.

Both modes support searchable options, disabled options, clear behavior, full-trigger interaction, outside-click closing, and Escape. Component width is controlled by its consumer; selected chips wrap vertically without changing that assigned width.

## Tags and chips

`TagInput` accepts and emits `string[]`. A draft becomes a tag through the Add action or Enter, then appears as a removable `Chip`. It rejects empty, duplicate, over-length, and over-limit values before updating the controlled array. Notes and Junk must not serialize tags through a comma-separated text field.

`TagList` provides the shared read-only tag presentation used across Notes, Junk, Reading, and Writing.
