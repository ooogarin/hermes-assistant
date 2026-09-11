# Finance Screen List

> Status: Finance daily, range, create, and edit flows are implemented. Read [Frontend Screen Guide](../frontend-screens.md) with this document before changing Finance screens.

## Scope

Finance supports reviewing summaries and transactions, manually adding one or more transactions in a batch, and correcting mutable transaction fields. Hermes/Telegram remains the primary capture flow. The browser formats API data and may derive presentational proportions from returned totals; transaction totals and category aggregation remain API-owned.

## Screen map

```text
/finance?date=YYYY-MM-DD
└── SCR-FIN-001  Daily view

/finance/report?from=YYYY-MM-DD&to=YYYY-MM-DD
└── SCR-FIN-002  Range view

/finance/new?date=YYYY-MM-DD
└── SCR-FIN-003  Create transaction

/finance/transactions/:date/:dailyNumber/edit
└── SCR-FIN-004  Edit transaction

/finance?date=YYYY-MM-DD
└── SCR-FIN-005  Delete transaction dialog
```

| ID | Screen | Proposed route | Initial status | API status |
| --- | --- | --- | --- | --- |
| SCR-FIN-001 | Daily view | `/finance?date=YYYY-MM-DD` | Implemented | Available |
| SCR-FIN-002 | Range view | `/finance/report?from=YYYY-MM-DD&to=YYYY-MM-DD` | Implemented | Available |
| SCR-FIN-003 | Create transaction | `/finance/new?date=YYYY-MM-DD` | Implemented | Available |
| SCR-FIN-004 | Edit transaction | `/finance/transactions/:date/:dailyNumber/edit` | Implemented | Available |
| SCR-FIN-005 | Delete transaction dialog | Daily view overlay | Deferred pending an explicit action placement | Available |

## SCR-FIN-001 — Daily view

**Purpose**
Review every recorded transaction and the income/expense distribution for one selected date.

**Entry points**

- Top-level `Finance` item in the application sidebar.
- A date row from Range view.
- Direct link to `/finance?date=YYYY-MM-DD`.

**Date behavior**

- The selected date defaults to today in the user's local date context.
- The header provides previous-day, next-day, and a shared calendar-popover date picker; selecting a day updates the URL-backed report immediately.
- Do not allow a date after today.
- `Lihat laporan periode` opens Range view while retaining the selected date as useful context for its range picker.

**UI composition**

- Header: `Finance` with no supporting subtitle.
- A control row below the header places previous/date/next navigation on the left and `Laporan periode` plus the primary `Tambah transaksi` action on the right.
- A full-width horizontal summary presents `Pengeluaran`, `Pemasukan`, and `Selisih`; the third value also explains that it is pemasukan minus pengeluaran.
- Primary section: a read-only transaction list for the selected date. Each row shows the transaction name, optional note and location, category, flow (`Pemasukan` or `Pengeluaran`), and right-aligned Rupiah amount. Missing optional text uses a quiet dash rather than a raw null value.
- Supporting section: `Ringkasan kategori`, visibly split into `Pengeluaran` and `Pemasukan`. Each group shows category, total, and its percentage of that flow's total.
- The transaction list is the dominant left column and category summary is the narrower right column. On narrow screens, the summary, transaction list, and category summary stack in that order.
- No pagination in this version.

**Interactions**

- Changing the date replaces both the transaction list and the daily summary, and cancels previous in-flight requests.
- `Tambah transaksi` opens the manual create route while retaining the selected date.
- Transaction rows remain visually stable on hover; the report table does not replace nominal values with hidden actions.

**Data contract**

```text
GET /api/v1/finance/transactions?date=YYYY-MM-DD
GET /api/v1/finance/summary?from=YYYY-MM-DD&to=YYYY-MM-DD&mode=net
```

- `transactions` supplies the individual list for the selected date.
- `summary` with the same `from` and `to` supplies `expenseTotal`, `incomeTotal`, `netTotal`, and `byCategory` for both transaction types.
- Split `byCategory` by `category.type` into the income and expense groups; do not request or invent browser-only category data.
- A displayed category percentage is a non-authoritative visual ratio of the API category total to its API flow total. Show one decimal in Indonesian locale and omit the proportional bar when its flow total is zero.
- Use `dailyNumber` as the stable public transaction reference. `displayNumber` is presentation ordering only; never expose internal database IDs, batch IDs, SQL details, or the internal API key.

**States**

| State | Behavior |
| --- | --- |
| Loading | Preserve daily totals, list rows, and summary groups with skeletons. |
| Ready | Show the selected-date transactions and summary groups. |
| No transactions | Show zero totals, a quiet empty transaction-list state, and empty income/expense category groups. |
| Recoverable error | Keep the selected date visible and provide `Coba lagi`. |

**Responsive and accessibility notes**

- Keep date navigation and the date picker keyboard operable with clear accessible labels.
- On narrow screens, stack totals, then transactions, then category summary; do not hide flow labels behind color alone.
- Long transaction names, locations, and Rupiah values must wrap without horizontal page scrolling.
- Desktop table columns use fluid widths within the dominant panel so the nominal header and values remain visible when the sidebar is expanded.
- Each proportional bar has a visible category label, numeric total, and percentage.

**Out of scope**

- Budgets, goals, trends, charts, comparisons, account balances, and payment-method tracking.

## SCR-FIN-002 — Range view

**Purpose**
Compare total income, expense, and net balance for every date in a selected range, then identify category distribution for that entire period.

**Entry points**

- `Lihat laporan periode` from Daily view.
- Direct link to `/finance/report?from=YYYY-MM-DD&to=YYYY-MM-DD`.

**Date-range behavior**

- The page requires a valid inclusive `from` and `to` date range.
- The first implementation may prefill the current calendar month; the exact default should be shared with the API/date-convention design before implementation.
- Do not allow future dates or an end date before the start date.
- Changing the range replaces both the daily aggregate list and the whole-period category summary, and cancels previous in-flight requests.

**UI composition**

- Header: `Laporan Finance` with no supporting subtitle.
- A control row below the header places the inclusive date range on the left and a return action to Daily view on the right.
- Compact period totals: `Pengeluaran`, `Pemasukan`, and `Saldo bersih` for the complete selected range.
- Primary section: one daily aggregate row per date, with date, total expense, total income, and net balance. This is deliberately not an individual transaction list.
- Supporting section: `Ringkasan kategori` for the complete range, visibly split into `Pengeluaran` and `Pemasukan`; each row shows category, total, and percentage of that flow's total.
- Selecting a daily aggregate row opens Daily view for that exact date.
- No pagination in this version.

**Data contract**

Period summary:

```text
GET /api/v1/finance/summary?from=YYYY-MM-DD&to=YYYY-MM-DD&mode=net
```

- This existing endpoint supplies the period totals and complete-range `byCategory` data.

Daily aggregate list:

```text
GET /api/v1/finance/summary/daily?from=YYYY-MM-DD&to=YYYY-MM-DD
```

- Its response provides one row per active transaction date with `date`, `expense_total`, `income_total`, and `net_total`.
- Dates with no active transactions are omitted. The screen does not infer missing dates in the browser.
- Once this endpoint exists, all authoritative daily and period totals still come from the API. The browser only formats values and derives display-only category percentages from returned totals.

**States**

| State | Behavior |
| --- | --- |
| Loading | Preserve period totals, daily aggregate rows, and summary groups with skeletons. |
| Ready | Show one aggregate row for each API-returned date and the complete-range category summary. |
| No activity | Show zero period totals, a quiet no-activity state, and empty category groups while retaining the selected range. |
| Recoverable error | Keep the selected range visible and provide `Coba lagi`. |

**Responsive and accessibility notes**

- The shared calendar picker gives the start and end dates explicit accessible labels, enforces their min/max relationship, and supports keyboard dismissal.
- Preserve date, expense, income, and net labels when the aggregate list becomes a stacked narrow-screen layout.
- A row opening Daily view is a semantic link or button with the selected date in its accessible name.
- Net balance uses text and currency value; color is supplementary only.

**Out of scope**

- Individual transactions inside Range view; Daily view owns that detail.
- Charts, trend analysis, comparisons with previous periods, budgets, forecasts, and export.

## SCR-FIN-003 — Create transaction

**Purpose**
Add one or more transactions of the same type and date from the browser.

**UI and behavior**

- The optional `date` query preselects a safe non-future date; otherwise the form uses today.
- Date, type, and required source text apply to the complete batch.
- Each transaction captures a positive Rupiah amount, matching category, name, optional location, and optional note.
- The user can add or remove transaction rows, with a minimum of one and the API maximum of 100.
- Changing the transaction type clears every selected category and reloads categories for the selected type.
- The form sends the API batch contract directly and never fabricates `rawText`.
- Save remains unavailable until required fields are valid. Cancel and navigation protect unsaved changes.
- Success returns to Daily view for the created transaction date and shows a short status notice.

**Data contract**

```text
GET  /api/v1/finance/categories?type=expense|income
POST /api/v1/finance/transactions
```

## SCR-FIN-004 — Edit transaction

**Purpose**
Correct mutable fields on an existing transaction.

**UI and behavior**

- The route loads the transaction by its public date and daily number.
- Date, type, and original source text are immutable and shown only as context where useful.
- Amount, category, name, location, and note are editable. The request contains changed fields only.
- Save remains unavailable when the form is unchanged or invalid. Cancel and navigation protect unsaved changes.
- Success returns to Daily view for the transaction date and shows a short status notice.

**Data contract**

```text
GET   /api/v1/finance/transactions/:date/:dailyNumber
GET   /api/v1/finance/categories?type=expense|income
PATCH /api/v1/finance/transactions/:date/:dailyNumber
```

## SCR-FIN-005 — Delete transaction dialog

**Status**
Deferred until an explicit, non-hover action placement is selected for the transaction table or detail flow.

**Preserved contract**

- The backend delete operation remains available.
- Do not reintroduce actions that replace nominal values or appear unexpectedly when a row is hovered.
- When this flow is resumed, the confirmation dialog must name the transaction, prevent duplicate submission, and return safely to its report context.

```text
DELETE /api/v1/finance/transactions/:date/:dailyNumber
```

## Implementation order

1. Daily and Range views.
2. Shared transaction fields, batch-create form, and category loading.
3. Create and edit routes.
4. Select an explicit action placement before reconnecting confirmed deletion to Daily view.
