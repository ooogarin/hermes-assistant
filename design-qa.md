# Frontend Design QA

## Comparison target

- Source visual truth: `docs/frontend-design/finance-daily.png` and `docs/frontend-design/finance-range.png`.
- Implementation captures: in-app browser captures of `http://127.0.0.1:5174/finance?date=2026-09-06` and `http://127.0.0.1:5174/finance/report?from=2026-09-01&to=2026-09-06`.
- Viewport: 1487 × 1058 CSS px for desktop and 390 × 844 CSS px for responsive validation.
- Pixels and density: both source images are 1487 × 1058 px; implementation desktop captures used the same CSS size at device scale factor 1, so no density normalization was needed.
- State: populated daily view for 6 Sep 2026 and populated range view for 1–6 Sep 2026, using local QA responses matching the reference content. Empty daily data and unavailable daily-aggregate API states were also checked against the documented behavior.

## Evidence

- Full-view comparison: each source PNG and its matching live route were rendered side by side at equal dimensions in one local comparison canvas. Page structure, hierarchy, totals, table/list composition, category grouping, palette, borders, and responsive ordering were compared together.
- Focused comparison: the transaction table, daily aggregate rows, category totals, percentages, progress bars, date controls, and signed Rupiah values remained legible in the combined view, so a separate crop was not required.
- Interactions checked: previous/next date behavior, date inputs, Daily → Range link, Range → Daily row link, future-date limit, loading, empty, error, and API-capability-unavailable states.
- Browser checks: mobile document width equaled viewport width (390 px); no horizontal overflow. No application console errors were observed.

## Required fidelity surfaces

- Fonts and typography: existing Hermes font tokens and hierarchy are retained; weights, wrapping, compact labels, and signed values match the intended emphasis.
- Spacing and layout: summary strip, dominant list, secondary category column, row rhythm, border radii, and responsive stacking match the reference composition.
- Colors and tokens: existing neutral, primary green, danger red, borders, and subtle surfaces map cleanly to the reference without new one-off colors.
- Image and asset fidelity: the Finance screens contain no required raster product imagery. Interface icons use the existing Lucide dependency; the shared Hermes shell remains unchanged.
- Copy and content: titles, descriptions, labels, empty/error messages, transaction fields, category groups, and Indonesian formatting follow `finance.md`.

## Findings

No actionable P0, P1, or P2 differences remain.

- P3: the shared shell uses the existing text-only Hermes brand and keeps the English group collapsed when inactive, while the references show a brand mark and expanded English links. This is an intentional shared-foundation constraint and is outside the Finance-only change.
- P3: the range reference presents one combined range control and a `Net` select. The implementation uses two explicitly labelled native date fields because `finance.md` requires distinct accessible start/end labels and does not define a mode interaction.

## Comparison history

1. Initial populated daily comparison found a P1 table overflow: the amount column was clipped because fixed column minimums exceeded the primary panel width.
2. Fixed the transaction grid widths, gave the flow column sufficient room, and normalized visible time separators to `HH:mm`.
3. Post-fix desktop comparison showed all six columns and long values inside the panel. The 390 px pass confirmed stacked rows without horizontal overflow.
4. Increased summary and list-row vertical padding to align the information density with both references. The final combined daily and range comparisons found no remaining P0/P1/P2 issue.

## Implementation checklist

- [x] Daily route, date navigation, transactions, totals, and two category groups.
- [x] Range route, validated range inputs, totals, category groups, and daily-row navigation.
- [x] Honest unavailable state for the proposed daily aggregate endpoint.
- [x] Loading, empty, retryable error, responsive, keyboard, and accessible-name coverage.
- [x] Type check, automated tests, production build, and browser visual QA.

## Follow-up polish

- Revisit the shared brand mark and navigation expansion behavior when the application shell is implemented across all features.

final result: passed

---

# Writing Design QA

## Comparison target

- Source visual truth: `docs/frontend-design/writing-setting.png`, `writing-insert.png`, `writing-result.png`, and `writing-list.png`.
- Implementation routes: `http://localhost:5173/english/writing`, `/english/writing/settings`, `/english/writing/:code`, `/english/writing/:code/submissions/:submissionNumber`, and the nested corrected-text route.
- Same-canvas comparison: the 1488 × 1058 settings reference and live implementation were normalized to matching 670 × 476 px frames in the in-app Browser.
- Responsive inspection: the live settings page was captured at the 733 px-wide in-app Browser viewport.

## Evidence

- The settings reference and implementation were viewed together for shell proportions, header hierarchy, CEFR selector, word-count controls, divider-led summary, palette, and spacing.
- The live page loaded the API values (`A1`, target 150, minimum 120, maximum 180) and kept save disabled while unchanged.
- The responsive capture showed the six level options and three numeric inputs without horizontal overflow; the summary stacks below the form.
- Known-code prompt, structured feedback, and corrected-text components were checked against their references and use runtime-validated response schemas.
- The submission-number route parameter was corrected internally without changing the public URL shape; the live endpoint now reaches the service and returns the expected safe not-found response instead of validation failure.

## Findings

No actionable P0, P1, or P2 differences remain on the implemented API-backed surfaces.

- P3: the populated list reference cannot be implemented because no collection/search/filter/pagination endpoint exists.
- P3: the prompt's primary submit action is intentionally unavailable. The current API requires authoritative estimated level and full analysis in the same POST request, which must not be fabricated in the browser.
- P3: the local database contains no Writing material or submission, so populated prompt/result browser captures were unavailable; their live not-found states and source-guided components were verified.

## Implementation checklist

- [x] Shared Reading/Writing settings component with feature-specific labels and API functions.
- [x] Runtime-validated Writing settings, material, submission, analysis, and corrected-text mappings.
- [x] Responsive prompt composer with live word count and explicit contract-blocked submission state.
- [x] Structured feedback and corrected-text routes with loading, not-found, and retryable-error states.
- [x] Same-canvas settings comparison, responsive browser inspection, type check, production build, and diff validation.

final result: passed

---

# Reading Design QA

## Comparison target

- Source visual truth: `docs/frontend-design/reading-setting.png`, `reading-detail.png`, and `reading-list.png`.
- Implementation routes: `http://localhost:5173/english/reading`, `/english/reading/settings`, `/english/reading/:code`, and `/english/reading/:code/expected-answers`.
- Same-canvas comparison: the 1488 × 1058 settings reference and live implementation were normalized to matching 670 × 476 px frames in the in-app Browser.
- Responsive inspection: the live settings page was also captured at the 733 px-wide in-app Browser viewport.

## Evidence

- The settings reference and implementation were viewed together for shell proportions, hierarchy, segmented level selector, word-count fields, divider-led summary, colors, and spacing.
- The live page loaded the current API settings (`A1`, target 300, minimum 250, maximum 350) and kept save disabled while unchanged.
- The responsive capture confirmed the level selector and three numeric inputs remain usable without horizontal overflow; the summary moves below the form.
- Detail, submission, and expected-answer routes use runtime-validated API payloads and explicit loading, not-found, retry, validation, pending, completed, and conflict states.

## Findings

No actionable P0, P1, or P2 differences remain on the implemented API-backed surfaces.

- P3: the design contains a populated Reading collection, but the API still has no list/search/filter/pagination endpoint and material responses do not include collection metadata. `/english/reading` therefore presents an explicit unavailable state instead of fabricated browser data.
- P3: no Reading material exists in the local API database, so populated detail visual QA was limited to source-guided component review; the live route's not-found state was verified instead.

## Implementation checklist

- [x] Runtime-validated settings, material, submission, and expected-answer API mappings.
- [x] Settings load-before-edit, dirty/valid checks, unsaved-back confirmation, save state, and synchronized summary.
- [x] Known-code passage workspace, complete-answer validation, one-time submission handling, and self-check review.
- [x] Responsive layouts, semantic controls, error states, type check, production build, and same-canvas visual QA.
- [x] Honest collection-unavailable state without mock records or client-side partial filtering.

final result: passed

---

# Junk Design QA

## Comparison target

- Source visual truth: `docs/frontend-design/junk-list.png` at 1487 × 1058 px.
- Implementation captures: in-app Browser views of `http://localhost:5173/junk`, `http://localhost:5173/junk?preview=JK-20260906-001`, and `http://localhost:5173/junk/JK-20260906-001`.
- Desktop comparison: source and implementation both rendered at 1487 × 1058 CSS px and normalized to 687 × 489 px in one browser canvas, at device scale factor 1.
- Responsive inspection: 735 px-wide in-app Browser viewport.
- State: API-backed populated list, advanced filter open, applied category filter, selected preview, and standalone detail.

## Evidence

- Full-view comparison: the source and live populated preview route were placed in the same browser canvas. The shell, header, search/filter hierarchy, quick-category chips, table-like list, selected row, supporting pane, borders, and neutral/green palette were compared together.
- Focused comparison: direct browser captures kept the search controls, filter popover, compact preview title/actions, source link, description, tags, and metadata readable without comparison scaling.
- Interactions checked: keyword form availability, filter open/dismiss, category entry and apply, active-filter count, quick-category controls, list selection, preview close, standalone-detail navigation, return link, and safe external source link.
- API check: the live list loaded the current `/api/v1/junk?limit=100` response and the exact `category=Quotes` filter retained the matching record.
- Responsive check: toolbar controls stack cleanly, the popover stays within the viewport, preview becomes primary content below `xl`, and no persistent control is clipped.

## Required fidelity surfaces

- Fonts and typography: existing Hermes font tokens preserve the reference's compact table labels, dark title hierarchy, muted excerpts, and readable detail copy.
- Spacing and layout: the full-width list and conditional supporting pane follow the latest cross-feature layout decision. Table columns, row separators, preview padding, and detail sections retain the reference rhythm.
- Colors and tokens: neutral surfaces, subtle borders, selected-row green, green tags/links, and category-specific accent colors use existing tokens or Tailwind semantic colors.
- Image and asset fidelity: Junk requires no raster content imagery. Category and external-link controls use the existing Lucide icon library; no handcrafted icons or placeholder assets were introduced.
- Copy and content: page copy follows `docs/frontend-screens/junk.md`. Nullable titles use a display-only fallback, source URLs remain external links, and `rawText` is not exposed.

## Comparison history

1. P1: the route initially rendered only the generic feature placeholder. Replaced it with API-backed list, preview, and standalone-detail pages.
2. P1: a permanently reserved detail column would recreate the empty-space problem resolved in Notes. The list now fills the page until `preview` is selected, then shrinks beside the supporting pane.
3. P2: duplicating the Notes search markup would risk control drift. Extracted a shared `SearchForm` and shared `FilterChip`, then used them in both Notes and Junk.
4. Post-fix same-canvas and focused browser checks found no remaining P0, P1, or P2 issue.

## Findings

No actionable P0, P1, or P2 differences remain.

- P3: the visual reference contains ten illustrative rows, while the local source-of-truth API currently contains one record. The implementation intentionally renders the real API collection rather than shipping mock content.
- P3: Filter and Sort controls are present because the accepted screen specification and current shared toolbar standard are newer than the simpler search-only reference toolbar. Unsupported date and oldest-first controls remain visibly unavailable.

## Implementation checklist

- [x] Runtime-validated Junk list/detail API mapping.
- [x] Full-width list, query-backed preview, and standalone detail routes.
- [x] Keyword, category, tag, and exact source-URL filters.
- [x] Safe nullable-title fallback, external source handling, tags, dates, codes, and hidden raw text.
- [x] Loading, empty, no-result, not-found, and retryable-error states.
- [x] Shared search/filter primitives, responsive behavior, TypeScript check, production build, browser interaction checks, and visual QA.

final result: passed

---

# Notes Design QA

## Comparison target

- Source visual truth: `docs/frontend-design/notes-list.png` plus the user revision captures `codex-clipboard-ef2566fa-194c-475b-b40f-6b2895dc3abb.png`, `codex-clipboard-a1cd2404-1758-4a9d-9ff9-870ca4ac3f1b.png`, and `codex-clipboard-548c675d-f983-4747-9a1d-85fcc48839ab.png` under `/var/folders/v3/vvxrhz8d3zsdqq_14s9qhl8r0000gn/T/`.
- Implementation screenshots: in-app Browser captures of `http://localhost:5173/notes`, `http://localhost:5173/notes?preview=NT-20260906-002`, and `http://localhost:5173/notes/NT-20260906-002` displayed during this QA run.
- Desktop viewport: 1487 × 1058 CSS px at device scale factor 1. Mobile viewport: 390 × 844 CSS px at device scale factor 1.
- Latest source pixels: toolbar 1538 × 328, standalone detail 2288 × 620, and preview 814 × 824. The focused comparison normalized the 1200 px desktop implementation viewport to a 687 px display width and the 814 px preview implementation to 407 px, matching the corresponding displayed reference widths.
- State: populated list-only screen, selected preview, and standalone detail without its former page header.

## Evidence

- Full-view comparison: the original Notes reference and desktop implementation were inspected at the same 1487 × 1058 viewport for shell, typography, list rows, selected state, and preview proportions.
- Focused comparison: a same-canvas browser page rendered each latest source directly with the matching live route. The toolbar implementation used a 1200 px desktop iframe normalized to the comparison width; the preview used an 814 px live viewport normalized to 407 px. Control heights, horizontal fill, title/action alignment, metadata order, and card width were readable together.
- Layout measurements: the list measured 1119 px before selection, 706.5 px with the preview open, and 1119 px after close. Expanding the preview navigated to `/notes/NT-20260906-002`, where no list surface remained.
- Interaction checks: search submission, clear action, quick type selection, advanced type selection, category/tag input focus, filter reset/apply/dismiss, preview open/close, and standalone detail navigation.
- API check: `GET /api/v1/notes?type=fact&limit=100` returned 200 and every returned record had type `fact`.
- Responsive check: the revised list, preview, and standalone detail were inspected at the in-app Browser's 735 px-wide viewport. Controls stacked without overflow, preview actions remained visible, and the standalone detail card filled the padded content frame.

## Required fidelity surfaces

- Fonts and typography: existing Hermes typography tokens retain the reference hierarchy, wrapping, metadata weight, and compact control labels.
- Spacing and layout: the application content frame no longer has a 96 rem width cap. The toolbar fills its row, its three controls share a 48 px height, and the search group absorbs the remaining width. The preview title shares its top row with the actions, eliminating the former empty control-only area.
- Colors and tokens: the established neutral surfaces, ink text, emerald active states, borders, focus ring, and subtle selection fill remain consistent with the supplied references.
- Image and asset fidelity: Notes has no raster content assets; functional controls use the project's existing Lucide icon system rather than approximate text glyphs or custom drawings.
- Copy and content: the redundant standalone detail header was removed. Detail metadata now reads `Fact · Tech/Programming · 6 Sep 2026 · NT-20260906-002`, with the type retaining its semantic green color.

## Comparison history

1. P1: the previous list route reserved the right detail track before any note was selected. The revised layout now keeps the list at 1119 px and only creates the 706.5 px + preview tracks after selection.
2. P1: the focused search input inherited an inner outline that collided with the search and clear icons. Focus styling now belongs to the whole search group, and the clear action has a dedicated 32 px hit area.
3. P2: the search action had insufficient inset spacing. The search group now uses an internal 6 px inset and a separately padded button matching the reference composition.
4. P2: the advanced filter was anchored to the toolbar edge and type chips were disabled. It is now centered beneath its trigger, dismissible, and type chips call a validated server-side filter.
5. Post-fix combined and focused comparisons found no remaining P0, P1, or P2 difference.
6. P1: the latest review found a capped content frame and a fixed desktop search width, leaving unused horizontal space. The frame cap was removed and search now flexes across the remaining toolbar width.
7. P2: Filter was 44 px high while search and sorter differed. Search, Filter, and Sort are now explicitly 48 px high in the desktop row.
8. P1: standalone detail repeated a large page header and retained a narrow 4xl card. The header was removed and the detail surface now uses the full content width.
9. P2: preview actions occupied their own row above the note, creating a large blank region. Title and actions now share the first row, followed immediately by the combined metadata line. Post-fix browser inspection found no remaining P0, P1, or P2 issue.

## Findings

No actionable P0, P1, or P2 differences remain.

- P3: source and date-range fields remain disabled native inputs because their query contracts do not yet exist. Their unavailable state is explicitly communicated in the UI.
- P3: the standalone page retains a compact `Kembali ke Notes` link for clear navigation even though the large detail header has been removed.

## Implementation checklist

- [x] Full-width application frame and toolbar, query-backed preview state, and standalone `/notes/:code` detail route without a redundant page header.
- [x] Runtime-validated Notes list/detail API mapping.
- [x] Keyword, type, category, and tag filtering; loading, empty, not-found, and retryable-error states.
- [x] Equal-height toolbar controls, compact preview header, combined colored metadata, responsive behavior, and accessible controls.
- [x] Biome check, TypeScript check, production build, browser interaction checks, and visual QA.

final result: passed
