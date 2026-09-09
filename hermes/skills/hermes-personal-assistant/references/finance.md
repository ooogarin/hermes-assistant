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

## Endpoints

- `GET /api/v1/finance/categories` with optional query `type=expense|income`.
- `POST /api/v1/finance/transactions` creates 1–100 transactions.
- `GET /api/v1/finance/transactions` requires query `date=YYYY-MM-DD`.
- `GET|PATCH|DELETE /api/v1/finance/transactions/:date/:daily_number` targets a stable daily reference.
- `GET /api/v1/finance/summary` requires `from`, `to`, and optional `mode=expense|income|net`.

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

In API responses, `daily_number` is stable for a date; `display_number` is temporary and may change. When the user refers to a displayed number or “latest”, fetch the current list for that date immediately before the mutation and map it to `daily_number`. The route parameter remains the numeric value itself. A single clearly resolved deletion may run immediately. Ask when multiple candidates remain.

For reports, call `/summary` and narrate returned totals. Never sum chat messages yourself.
