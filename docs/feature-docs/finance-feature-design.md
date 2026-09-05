# Finance - Detailed Design

This document focuses on the Finance feature for Hermes: daily expense and income tracking through Telegram, backed by the REST API and PostgreSQL.

> Status: MVP design. The MVP uses direct REST API calls, not MCP.

---

## 1. Input Format

The user can send free-form text, either as a single transaction or multiple transaction lines in one message.

General structure:

```text
[optional date header, format DD-MM-YYYY]
[optional type header: "pemasukan" / "income" / "masuk"]
amount, description[, extra note]
amount, description[, extra note]
...
```

Example:

```text
14-07-2026
12, sarapan di warung A, free es teh
23, kopi
54, kopi + makan malam, nongkrong kafe
```

### Amount Rules

- `12` means Rp12,000.
- `12,5` means Rp12,500. A comma attached to the number is treated as a decimal separator.
- All numbers are always interpreted as thousands. Example: `12000` means Rp12,000,000, not Rp12,000.
- A comma followed by a space is treated as a field separator: `12, description`.
- This rule avoids ambiguity: decimal commas are attached to the number, field separators are followed by a space.

### Date Header

- If there is no date header, the transaction date defaults to today.
- If there is a date header, it applies to all transaction lines in that message.
- Scope is per message. There is no carry-over state between Telegram messages. If the user wants to input a different date, they are expected to send a separate message. Blank-line date overrides inside one message may be supported later, but they are not the main pattern.

### Type Header

- Default type is always `expense`.
- Headers like `pemasukan`, `income`, or `masuk` switch the message type to `income`.
- Scope is per message only. Each new message resets to the default `expense` type.

### Semantic Extraction

Because user input is not always positionally consistent, Hermes should extract `name`, `location`, and `note` semantically instead of relying on rigid comma-position rules.

| Input                                    | name               | location | note           |
| ---------------------------------------- | ------------------ | -------- | -------------- |
| `12, sarapan di warung A, free es teh`   | sarapan            | warung A | free es teh    |
| `54, kopi + makan malam, nongkrong kafe` | kopi + makan malam | _(null)_ | nongkrong kafe |
| `23, kopi`                               | kopi               | _(null)_ | _(null)_       |

---

## 2. Categories and Ambiguity

- Categories are a fixed list stored in the `categories` table. They are not hardcoded enums and transaction rows do not store free-text category names.
- Transactions store `category_id` as a foreign key to `categories.id`.
- Hermes auto-classifies transactions based on `name`, description, and `categories.description`.
- If Hermes is unsure about the category, `name`, or transaction interpretation, it must hold the transaction and ask the user for confirmation before inserting it.
- `original_category_id` is not stored. If the category is wrong, the user can update it manually; MVP does not track classification accuracy.

Ambiguous category example:

```text
200, hadiah ulang tahun teman
```

This could be `Belanja`, `Hiburan`, `Hadiah/Donasi`, or `Lainnya`. Hermes must ask the user to choose before inserting.

Ambiguous transaction interpretation example:

```text
54, kopi + makan malam
```

By default, this remains one transaction with `name = "kopi + makan malam"`. If Hermes thinks the input may need splitting or the meaning is unclear, it must ask for confirmation instead of splitting automatically.

---

## 3. Database Schema

### `transactions`

| Column         | Type                      | Notes                                                                                                                                 |
| -------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `id`           | `bigserial` (PK)          | Auto-increment primary key, not UUID. See section 5.                                                                                  |
| `batch_id`     | uuid                      | Same value for all transaction rows created from one message/submit. Internal metadata only.                                          |
| `type`         | enum(`expense`, `income`) | Default input is `expense`; `income` only applies when the user explicitly uses an income header/request.                             |
| `amount`       | integer                   | Amount in Rupiah after shorthand parsing.                                                                                             |
| `category_id`  | FK -> `categories.id`     | Required for final insertion. Ambiguous transactions are held before insert.                                                          |
| `name`         | text                      | Short semantic transaction name.                                                                                                      |
| `location`     | text, nullable            | Null when not mentioned.                                                                                                              |
| `note`         | text, nullable            | Additional details.                                                                                                                   |
| `date`         | date                      | Transaction date, which may differ from submit date.                                                                                  |
| `daily_number` | integer                   | Stable number scoped by `date`; used as the FE/Telegram reference key. Never reused after soft delete.                                |
| `raw_text`     | text                      | Full original message text. All rows from the same message share identical `raw_text`. Useful for audit, debugging, and reprocessing. |
| `created_at`   | timestamp                 | Creation time.                                                                                                                        |
| `updated_at`   | timestamp                 | Last correction/update time.                                                                                                          |
| `deleted_at`   | timestamp, nullable       | Soft delete. Historical data is preserved.                                                                                            |

### `categories`

| Column        | Type                      | Notes                                                                                                    |
| ------------- | ------------------------- | -------------------------------------------------------------------------------------------------------- |
| `id`          | serial (PK)               | Internal primary key referenced by `transactions.category_id`.                                           |
| `code`        | text, unique              | Stable identifier for code, prompts, APIs, and seed data. Examples: `food_drink`, `transport`, `salary`. |
| `name`        | text                      | User-facing category name. Example: `Makanan & Minuman`.                                                 |
| `description` | text                      | Category scope description used by Hermes for classification.                                            |
| `type`        | enum(`expense`, `income`) | Expense and income categories have different category sets.                                              |
| `is_active`   | boolean                   | Categories can be disabled without deleting old transaction history.                                     |

Initial seed example:

| code            | name              | type      | description                                                                      |
| --------------- | ----------------- | --------- | -------------------------------------------------------------------------------- |
| `food_drink`    | Makanan & Minuman | `expense` | Food, drinks, coffee, snacks, restaurants, warungs, cafes.                       |
| `transport`     | Transportasi      | `expense` | Ride-hailing, taxi, fuel, parking, tolls, public transport.                      |
| `shopping`      | Belanja           | `expense` | Personal items, clothes, accessories, non-routine needs.                         |
| `bills`         | Tagihan           | `expense` | Electricity, internet, phone credit, subscriptions, installments, routine bills. |
| `entertainment` | Hiburan           | `expense` | Movies, games, concerts, hangouts, recreation.                                   |
| `health`        | Kesehatan         | `expense` | Medicine, doctor visits, vitamins, checkups, medical needs.                      |
| `education`     | Pendidikan        | `expense` | Courses, books, classes, learning tools.                                         |
| `gift_donation` | Hadiah/Donasi     | `expense` | Gifts, special treats, donations, contributions.                                 |
| `other_expense` | Lainnya           | `expense` | Expenses that do not fit any other category.                                     |
| `salary`        | Gaji              | `income`  | Monthly salary or stable income.                                                 |
| `freelance`     | Freelance         | `income`  | Project payments, services, or freelance work.                                   |
| `bonus`         | Bonus             | `income`  | Bonuses, THR, incentives, commissions.                                           |
| `refund`        | Refund            | `income`  | Refunds or reimbursements.                                                       |
| `other_income`  | Lainnya           | `income`  | Income that does not fit any other income category.                              |

---

## 4. Reference Numbers for Chat and FE

There are two different numbers with different purposes:

|               | `daily_number`                                                                     | `display_number`                                           |
| ------------- | ---------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| Stored in DB? | Yes                                                                                | No, computed on demand                                     |
| Stable?       | Yes, permanent, never changed or reused                                            | No, changes after delete/insert and always stays gapless   |
| Purpose       | Main stable reference key for FE/Telegram per date, e.g. "Transaction #3, 14 July" | Chat convenience: user sees compact numbering like 1, 2, 3 |
| Query         | Stored column                                                                      | `ROW_NUMBER() OVER (ORDER BY id)`                          |

Simulation:

```text
4 transactions today -> daily_number #1, #2, #3, #4 -> display_number 1, 2, 3, 4
Delete display #2, which maps to daily_number #2
-> remaining daily_number #1, #3, #4 -> display_number 1, 2, 3
Insert a new transaction
-> daily_number #5 -> display_number 1, 2, 3, 4
```

### Resolving "edit/delete row 2"

Hermes must always query the latest transaction list and map the user-facing number before executing an update/delete. It must not rely only on chat memory, because data may have changed since the last displayed list.

For FE and Telegram, `daily_number` is the stable key. `display_number` is only a temporary compact display number.

```sql
SELECT
  ROW_NUMBER() OVER (ORDER BY id) AS display_number,
  id,
  daily_number,
  name,
  amount,
  category_id
FROM transactions
WHERE date = $1
  AND deleted_at IS NULL
ORDER BY id;
```

---

## 5. Insert Flow

Principle: one `SELECT MAX(daily_number)` plus one bulk `INSERT` per batch, wrapped in a database transaction. Do not insert line by line with one round trip per row.

```javascript
// Pseudo-code, Node + Prisma
await prisma.$transaction(async (tx) => {
  // Advisory lock per date to avoid race conditions when two messages for the
  // same date arrive at the same time.
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${dateStr}))`;

  const { _max } = await tx.transaction.aggregate({
    where: { date: dateObj },
    _max: { daily_number: true },
  });

  let nextNumber = (_max.daily_number ?? 0) + 1;

  const payload = parsedItems.map((item) => ({
    ...item,
    date: dateObj,
    daily_number: nextNumber++,
    batch_id: batchId,
  }));

  await tx.transaction.createMany({ data: payload });
});
```

Why `bigserial` instead of UUID for `id`:

- `display_number` uses `ORDER BY id`, so insertion order must be reliable. Auto-increment IDs guarantee this better than `created_at`, which can collide during batch inserts.
- This is a personal single-user VPS system, so distributed UUID advantages are not needed for the primary key.

---

## 6. Batch Deletion

- `batch_id` is kept as internal metadata to group transactions from one message/submit.
- `batch_id` is not shown to the user.
- The main delete/edit flow uses `daily_number` or resolved display numbers.
- A single-item delete can run immediately after Hermes resolves the latest target.
- Multi-item delete, old-batch delete, or large/sensitive updates require user confirmation before execution.
- "Delete what I just added" can use the latest `batch_id` from session context if this flow is added later.

---

## 7. Queries and Summaries

Principle: all numeric calculations must happen in SQL/API. The LLM only prepares query parameters and narrates final numbers.

```text
User: "total pengeluaran minggu ini?"
-> Hermes prepares date range and filters
-> Hermes calls the finance summary REST API
-> API/SQL calculates SUM
-> Hermes narrates the verified numbers
```

Default query behavior:

- "total hari ini" means total expenses today.
- Income is included only when the user explicitly asks for income.
- Net balance is calculated only when the user explicitly asks for net balance.

---

## 8. Chat Response Templates

### Normal Batch

```text
✅ 3 transaksi tercatat — 14 Jul 2026

1. Rp12.000 · Sarapan · Makanan & Minuman
   📍 warung A · 📝 free es teh
2. Rp23.000 · Kopi · Makanan & Minuman
3. Rp54.000 · Kopi + Makan Malam · Makanan & Minuman
   📝 nongkrong kafe

Total: Rp89.000
```

### Ambiguous Category

```text
❓ 1 transaksi butuh konfirmasi kategori:

"beli hadiah ulang tahun temen" — Rp200.000
Masuk kategori apa: Hiburan / Belanja / Hadiah/Donasi / Lainnya?
```

### Correction

```text
✏️ Diupdate: Kopi (Rp23.000)
Makanan & Minuman → Transportasi
```

### Income

```text
💰 1 pemasukan tercatat — 26 Jul 2026

1. Rp5.000.000 · Gaji Bulanan · Gaji
```

### Aggregate Query

```text
📊 Pengeluaran 21-26 Jul 2026: Rp340.000

Makanan & Minuman   Rp210.000
Transportasi        Rp80.000
Hiburan             Rp50.000
```

---

## 9. Final Design Decisions

| Decision                       | Final Choice                                                                                            |
| ------------------------------ | ------------------------------------------------------------------------------------------------------- |
| Categories                     | Fixed list in `categories`; ambiguity requires confirmation before insert                               |
| Account/payment tracking       | Not included in MVP                                                                                     |
| Amount parsing                 | Always interpreted as thousands: `12` -> Rp12,000, `12000` -> Rp12,000,000                              |
| Income header scope            | Per message; no carry-over                                                                              |
| Date override                  | Per message                                                                                             |
| Income                         | Included in MVP, only when explicitly requested/headered                                                |
| Combined items                 | Remain one transaction; ask for confirmation if interpretation is ambiguous                             |
| Primary key                    | `bigserial` auto-increment                                                                              |
| User-facing reference number   | `daily_number` is the stable FE/Telegram key; `display_number` is temporary gapless display             |
| Original category tracking     | Not stored                                                                                              |
| Delete behavior                | Soft delete using `deleted_at`                                                                          |
| Delete/correction confirmation | Single item can execute after resolving target; multi-item/old-batch/large changes require confirmation |
| Query default                  | "total hari ini" means total expenses; income/net balance must be requested explicitly                  |
| Batch insert                   | 1x max lookup + 1x bulk insert inside a transaction with advisory lock per date                         |

---

## 10. MVP API Contract

The Finance API is mounted below `/api/v1/finance` and requires the internal bearer token.

Request bodies use `camelCase`; every response field is serialized recursively as `snake_case`.

| Method | Path | Purpose |
| ------ | ---- | ------- |
| `POST` | `/api/v1/finance/transactions` | Create one or more final, category-resolved transactions in one batch. The backend creates the internal `batch_id` and each `daily_number`. |
| `GET` | `/api/v1/finance/transactions?date=YYYY-MM-DD` | List active transactions for one date, ordered by insertion. |
| `GET` | `/api/v1/finance/transactions/:date/:dailyNumber` | Fetch one active transaction by its date and stable daily number. |
| `PATCH` | `/api/v1/finance/transactions/:date/:dailyNumber` | Update amount, category, name, location, or note. Transaction date, type, raw text, and daily number are immutable in MVP. |
| `DELETE` | `/api/v1/finance/transactions/:date/:dailyNumber` | Soft delete one transaction. |
| `GET` | `/api/v1/finance/categories?type=expense` | List active categories; `type` is optional. |
| `GET` | `/api/v1/finance/summary?from=YYYY-MM-DD&to=YYYY-MM-DD&mode=expense` | Return SQL-calculated expense, income, or net totals and category breakdown. |

The batch-create payload contains values already cleaned by Hermes. `amount` is an integer amount in Rupiah, not the Telegram shorthand: `12` has already become `12000` before the API is called. Each item uses `categoryCode`; database category IDs remain internal.

```json
{
  "date": "2026-07-14",
  "type": "expense",
  "rawText": "12, sarapan di warung A\n23, kopi",
  "transactions": [
    {
      "amount": 12000,
      "categoryCode": "food_drink",
      "name": "Sarapan",
      "location": "warung A",
      "note": null
    }
  ]
}
```

Response field `daily_number` is an integer shown without zero-padding, for example `3`; the stable route reference is `/api/v1/finance/transactions/2026-07-14/3`. Response field `display_number` is a temporary sequential integer in a date list and can change after insertions or deletions.
