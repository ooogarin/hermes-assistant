# Finance

Use Finance for expenses, income, transaction corrections/deletions, category lookup, and summaries.

## Interpretation

- Default type is `expense`; use `income` only when explicit.
- Interpret an amount entered in the Telegram shorthand as thousands of Rupiah before calling the API. Example: `12` becomes `12000`.
- Extract `name`, `location`, and `note` semantically, not by comma position.
- Fetch `GET /categories?type=...` and classify using category name and description.
- If category, name, amount, type, or whether to split an item is genuinely ambiguous, ask before inserting.
- One message may create a batch, but each item must be final and category-resolved.
- Date scope is per message. Use the current Jakarta date when the user does not specify a date.

## Normalize the User Message

Interpret the message in this order:

1. Read an optional date header such as `14-07-2026`; apply it to every line in the
   message only. Without a header, use the current `Asia/Jakarta` date.
2. Read an optional type header such as `pemasukan`, `income`, or `masuk`. Without one,
   use `expense`. Never carry a date or type into the next Telegram message.
3. Parse each transaction line. A number followed by a comma and a space starts the
   description; a decimal comma attached to the number is part of the amount.
4. Convert shorthand amounts before preparing JSON: `12` means `12000`, `12,5` means
   `12500`, and `12000` means `12000000` under the project's thousands rule.
5. Extract `name`, `location`, and `note` semantically. Do not split a combined phrase
   such as `kopi + makan malam` unless the user clearly requests separate items.

Use the original complete message as `raw_text`. Do not silently normalize or rewrite
`raw_text`; normalization belongs in the individual transaction fields.

## Create Flow

For a normal create request:

1. Parse all lines and prepare a short interpretation before calling the API.
2. Fetch active categories with the requested type (`expense` or `income`).
3. Match each transaction using category `name` and `description`, not only the
   category code. Do not use an expense category for income or vice versa.
4. Ask one focused question if amount, type, date, split behavior, name, or category
   remains ambiguous. Do not create a partial batch.
5. Send one `POST /api/v1/finance/transactions` containing all final items. Use one
   batch payload; do not issue one POST per line.
6. Use the returned transaction data for daily numbers, category labels, and totals.
   Do not invent a daily number or recalculate an authoritative report from chat.

Example interpretation:

```text
Input:
14-07-2026
12, sarapan di warung A, free es teh
23, kopi

Request:
{
  "date": "2026-07-14",
  "type": "expense",
  "raw_text": "14-07-2026\n12, sarapan di warung A, free es teh\n23, kopi",
  "transactions": [
    {
      "amount": 12000,
      "category_code": "food_drink",
      "name": "sarapan",
      "location": "warung A",
      "note": "free es teh"
    },
    {
      "amount": 23000,
      "category_code": "food_drink",
      "name": "kopi",
      "location": null,
      "note": null
    }
  ]
}
```

## Read and Report Flow

- `"tampilkan transaksi hari ini"` → `GET /api/v1/finance/transactions?date=<today>`.
- `"total pengeluaran minggu ini"` → `GET /api/v1/finance/summary` with the Jakarta
  date range and the default `mode=expense`.
- `"saldo bersih"` or `"net"` → use `mode=net`; do not substitute expense total.
- Income is excluded from an expense report unless the user explicitly requests
  income or net balance.
- Use returned `expense_total`, `income_total`, `net_total`, and `by_category` exactly.
  The LLM may format amounts for readability but must not perform the authoritative
  aggregation itself.
- `"ringkasan harian"` → use `GET /api/v1/finance/summary/daily` when the user wants
  one total row per date rather than one aggregate for the whole range.

For a daily list, show the stable `daily_number`, date, amount, name, and category. If
the user says “row 2” or “nomor 2”, treat it as a temporary `display_number` and fetch
the current list before mutating anything.

## Update and Delete Flow

- Explicit `date + daily_number` → fetch that stable target when useful, then patch or
  soft-delete it.
- `"ubah transaksi nomor 2 hari ini"` → list that date, map `display_number=2` to its
  current `daily_number`, then ask only if the mapping is not unique.
- `"ubah yang terakhir"` → first list the relevant date and identify one current
  target; do not use an old chat reference.
- A PATCH may contain only `amount`, `category_code`, `name`, `location`, and `note`.
  Date, type, raw text, and daily number cannot be changed through this MVP.
- For a clear single-item PATCH or DELETE, resolve the current target and proceed
  without an extra confirmation. For multiple items, an old batch, a broad request, or
  a large or sensitive change, show every affected stable `date + daily_number`, the
  intended effect, and wait for explicit confirmation.

After a successful mutation, report the stable date/daily-number reference. A failed
or ambiguous mutation must not be described as completed.

## Telegram Output Format

Keep normal Finance responses compact and structured. Do not narrate the parsing or
API process. Use the API-returned values for the final result.

For a successful create:

```text
✅ *Transaksi tersimpan*
*Tanggal:* 21 September 2026
*Jenis:* Pengeluaran
*Total:* Rp23.000

1. *#1* Sarapan — Rp23.000
   Kategori: Food & Drink
   Lokasi: KR Kopi

_Referensi: 2026-09-21 / #1_
```

For multiple transactions, show one numbered item per transaction and put the total
after the list. Omit `Lokasi`, `Catatan`, or other empty fields. Never invent a stable
daily number; use the number returned by the API.

For a list, use `📋 *Transaksi — <tanggal>*` and show one compact item per result.
For a summary, use `📊 *Ringkasan Keuangan*`, then show the period, mode, returned
total, and returned category breakdown. Use only values returned by the API; omit a
field that is not returned instead of calculating or guessing it. After a PATCH or
DELETE, show the concise result and stable `date / daily_number` reference. When the
operation requires confirmation, show the target and intended effect first.

## Preview-Only Finance Requests

If the user explicitly says not to call or read/write the API, show a preview and stop.
Do not fetch categories, current transactions, daily numbers, or summaries. Do not call
`api.sh` through another route.

For a new transaction preview, use the preview rendering rules in the parent skill:

- default `preview`: show `Interpretasi:` followed only by interpreted transaction
  fields whose values are present; omit null/empty fields and all request diagnostics;
- `preview payload only`: show only the complete JSON request body;
- `full preview`: show the Telegram-formatted transaction plus the method, endpoint,
  assumptions, unresolved values, and JSON request body.

The exact payload-only body contains the complete request fields required by the API.
Full preview may additionally explain:

- the amount conversion when shorthand thousands of Rupiah was used;
- category assumptions that still need API verification;
- the explicit authorization needed to execute it after preview.

Example:

```text
User:
"preview 23, kopi nescafe"

Hermes:
"Interpretasi:
- Tanggal: 2026-09-19
- Jenis: expense
- Jumlah: 23.000
- Nama: kopi nescafe
- Kode Kategori: food_drink"
```

Do not append `Preview saja`, `tidak ada API dipanggil`, `Belum tersimpan`, an
execution instruction, the `23 × Rp1.000` calculation, null `location`/`note` fields,
or category-verification commentary to this default rendering. Those request details
belong only to full preview, while the exact body belongs to payload-only or full preview.

When the user later explicitly authorizes execution, fetch and verify the category and
then follow the normal create flow. A preview is not an API success response and must
never receive a Finance daily number.

## Endpoints

- `GET /api/v1/finance/categories` with optional query `type=expense|income`.
- `POST /api/v1/finance/transactions` creates 1–100 transactions.
- `GET /api/v1/finance/transactions` requires query `date=YYYY-MM-DD`.
- `GET|PATCH|DELETE /api/v1/finance/transactions/:date/:daily_number` targets a stable daily reference.
- `GET /api/v1/finance/summary` requires `from`, `to`, and optional `mode=expense|income|net`.
- `GET /api/v1/finance/summary/daily` requires `from` and `to` for one row per date.

Create body:

```json
{
  "date": "2026-09-05",
  "type": "expense",
  "raw_text": "kopi 25 di kantor",
  "transactions": [
    {
      "amount": 25000,
      "category_code": "food_drink",
      "name": "kopi",
      "location": "kantor",
      "note": null
    }
  ]
}
```

Patch supports only `amount`, `category_code`, `name`, `location`, and `note`. Date, type, raw text, and daily number are immutable.

## Target Resolution

In API responses, `daily_number` is stable for a date; `display_number` is temporary
and may change. When the user refers to a displayed number or “latest”, fetch the
current list for that date immediately before the mutation and map it to
`daily_number`. The route parameter remains the numeric value itself. Proceed with a
clear single-item request after resolving the target. For multiple items, an old batch,
a broad request, or a large or sensitive change, show the affected targets and wait
for explicit confirmation.

For reports, call `/summary` and narrate returned totals. Never sum chat messages yourself.
