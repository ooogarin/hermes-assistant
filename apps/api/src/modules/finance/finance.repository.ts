import { getDatabaseClient } from '../../core/database/client';
import type { DatabaseReservedConnection } from '../../core/database/database.types';
import type {
  DailyNumberRow,
  FinanceDailySummaryQuery,
  FinanceDailySummaryRow,
  FinanceSummaryCategoryRow,
  FinanceSummaryTotalsRow,
  FinanceTransactionInsertPayload,
  FinanceTransactionRow,
  FinanceTransactionUpdatePayload,
  SummaryMode,
  TransactionType,
} from './finance.types';

export const getLastDailyNumberByDateForUpdate = async (
  date: string,
  trx: DatabaseReservedConnection,
): Promise<DailyNumberRow> => {
  await trx`
    SELECT
      pg_advisory_xact_lock(hashtext(${date}))
  `;

  const [row] = await trx<DailyNumberRow[]>`
    SELECT
      MAX(daily_number) AS daily_number
    FROM transactions
    WHERE date = ${date}::DATE
  `;

  if (row === undefined) {
    throw new Error('Daily transaction number query did not return a row.');
  }

  return row;
};

export const insertAll = async (
  batchId: string,
  date: string,
  type: TransactionType,
  raw_text: string,
  payloads: FinanceTransactionInsertPayload[],
  trx: DatabaseReservedConnection,
): Promise<FinanceTransactionRow[]> => {
  const amounts = payloads.map((payload) => payload.amount);
  const categoryIds = payloads.map((payload) => payload.category_id);
  const dailyNumbers = payloads.map((payload) => payload.daily_number);
  const names = payloads.map((payload) => payload.name);
  const locations = payloads.map((payload) => payload.location);
  const notes = payloads.map((payload) => payload.note);

  const rows = await trx<FinanceTransactionRow[]>`
    WITH inserted AS (
      INSERT INTO transactions (
        batch_id,
        type,
        amount,
        category_id,
        name,
        location,
        note,
        date,
        daily_number,
        raw_text
      )
      SELECT
        ${batchId}::UUID,
        ${type}::transaction_type,
        payload.amount,
        payload.category_id,
        payload.name,
        payload.location,
        payload.note,
        ${date}::DATE,
        payload.daily_number,
        ${raw_text}
      FROM UNNEST(
        ${trx.array(amounts, 'INTEGER')},
        ${trx.array(categoryIds, 'INTEGER')},
        ${trx.array(dailyNumbers, 'INTEGER')},
        ${trx.array(names, 'TEXT')},
        ${trx.array(locations, 'TEXT')},
        ${trx.array(notes, 'TEXT')}
      ) AS payload(
        amount,
        category_id,
        daily_number,
        name,
        location,
        note
      )
      RETURNING
        id,
        daily_number,
        type,
        amount,
        name,
        location,
        note,
        date,
        raw_text,
        category_id,
        created_at,
        updated_at
    ), numbered AS (
      -- The data-modifying CTE shares a snapshot, so add the inserted batch order to prior active rows.
      SELECT
        id,
        (
          (
            SELECT
              COUNT(*)
            FROM transactions
            WHERE date = ${date}::DATE
              AND deleted_at IS NULL
          ) + ROW_NUMBER() OVER (
            ORDER BY
              id
          )
        )::INTEGER AS display_number
      FROM inserted
    )
    SELECT
      inserted.id,
      inserted.daily_number,
      numbered.display_number,
      inserted.type,
      inserted.amount,
      inserted.name,
      inserted.location,
      inserted.note,
      inserted.date,
      inserted.raw_text,
      categories.code AS category_code,
      categories.name AS category_name,
      categories.description AS category_description,
      categories.type AS category_type,
      inserted.created_at,
      inserted.updated_at
    FROM inserted
    JOIN numbered ON numbered.id = inserted.id
    JOIN categories ON categories.id = inserted.category_id
    ORDER BY
      inserted.id ASC
  `;

  return rows;
};

export const getOneByDateAndDailyNumber = async (
  date: string,
  daily_number: number,
): Promise<FinanceTransactionRow | null> => {
  const database = getDatabaseClient();

  const [row] = await database<FinanceTransactionRow[]>`
    WITH numbered AS (
      SELECT
        transactions.id,
        transactions.daily_number,
        transactions.type,
        transactions.amount,
        transactions.name,
        transactions.location,
        transactions.note,
        transactions.date,
        transactions.raw_text,
        transactions.category_id,
        transactions.created_at,
        transactions.updated_at,
        ROW_NUMBER() OVER (
          ORDER BY
            id
        )::INTEGER AS display_number
      FROM transactions
      WHERE date = ${date}::DATE
        AND deleted_at IS NULL
    )
    SELECT
      numbered.id,
      numbered.daily_number,
      numbered.display_number,
      numbered.type,
      numbered.amount,
      numbered.name,
      numbered.location,
      numbered.note,
      numbered.date,
      numbered.raw_text,
      categories.code AS category_code,
      categories.name AS category_name,
      categories.description AS category_description,
      categories.type AS category_type,
      numbered.created_at,
      numbered.updated_at
    FROM numbered
    JOIN categories ON categories.id = numbered.category_id
    WHERE numbered.daily_number = ${daily_number}
  `;

  return row === undefined ? null : row;
};

export const getAllByDate = async (date: string): Promise<FinanceTransactionRow[]> => {
  const database = getDatabaseClient();

  const rows = await database<FinanceTransactionRow[]>`
    SELECT
      transactions.id,
      transactions.daily_number,
      ROW_NUMBER() OVER (
        ORDER BY
          transactions.id
      )::INTEGER AS display_number,
      transactions.type,
      transactions.amount,
      transactions.name,
      transactions.location,
      transactions.note,
      transactions.date,
      transactions.raw_text,
      categories.code AS category_code,
      categories.name AS category_name,
      categories.description AS category_description,
      categories.type AS category_type,
      transactions.created_at,
      transactions.updated_at
    FROM transactions
    JOIN categories ON categories.id = transactions.category_id
    WHERE transactions.date = ${date}::DATE
      AND transactions.deleted_at IS NULL
    ORDER BY
      transactions.id ASC
  `;

  return rows;
};

export const updateOneByDateAndDailyNumber = async (
  date: string,
  daily_number: number,
  input: FinanceTransactionUpdatePayload,
): Promise<FinanceTransactionRow | null> => {
  const database = getDatabaseClient();

  const [row] = await database<FinanceTransactionRow[]>`
    WITH updated AS (
      UPDATE transactions
      SET
        amount = CASE WHEN ${input.amount !== undefined} THEN ${input.amount ?? 0}::INTEGER ELSE amount END,
        category_id = CASE WHEN ${input.category_id !== undefined} THEN ${input.category_id ?? 0}::INTEGER ELSE category_id END,
        name = CASE WHEN ${input.name !== undefined} THEN ${input.name ?? ''}::TEXT ELSE name END,
        location = CASE WHEN ${input.location !== undefined} THEN ${input.location ?? null}::TEXT ELSE location END,
        note = CASE WHEN ${input.note !== undefined} THEN ${input.note ?? null}::TEXT ELSE note END,
        updated_at = NOW()
      WHERE date = ${date}::DATE
        AND daily_number = ${daily_number}
        AND deleted_at IS NULL
      RETURNING
        id,
        daily_number,
        type,
        amount,
        name,
        location,
        note,
        date,
        raw_text,
        category_id,
        created_at,
        updated_at
    ), numbered AS (
      SELECT
        id,
        ROW_NUMBER() OVER (
          ORDER BY
            id
        )::INTEGER AS display_number
      FROM transactions
      WHERE date = ${date}::DATE
        AND deleted_at IS NULL
    )
    SELECT
      updated.id,
      updated.daily_number,
      numbered.display_number,
      updated.type,
      updated.amount,
      updated.name,
      updated.location,
      updated.note,
      updated.date,
      updated.raw_text,
      categories.code AS category_code,
      categories.name AS category_name,
      categories.description AS category_description,
      categories.type AS category_type,
      updated.created_at,
      updated.updated_at
    FROM updated
    JOIN numbered ON numbered.id = updated.id
    JOIN categories ON categories.id = updated.category_id
  `;

  return row === undefined ? null : row;
};

export const softDeleteOneByDateAndDailyNumber = async (
  date: string,
  daily_number: number,
): Promise<{ id: number } | null> => {
  const database = getDatabaseClient();

  const [row] = await database<{ id: number }[]>`
    UPDATE transactions
    SET
      deleted_at = NOW(),
      updated_at = NOW()
    WHERE date = ${date}::DATE
      AND daily_number = ${daily_number}
      AND deleted_at IS NULL
    RETURNING
      id
  `;

  return row ?? null;
};

export const getOneSummaryByDateRange = async (
  from: string,
  to: string,
  mode: SummaryMode,
): Promise<FinanceSummaryTotalsRow> => {
  const database = getDatabaseClient();

  const [row] = await database<FinanceSummaryTotalsRow[]>`
    SELECT
      expense_total,
      income_total,
      income_total - expense_total AS net_total
    FROM (
      SELECT
        COALESCE(SUM(amount) FILTER (WHERE type = 'expense'), 0) AS expense_total,
        COALESCE(SUM(amount) FILTER (WHERE type = 'income'), 0) AS income_total
      FROM transactions
      WHERE date BETWEEN ${from}::DATE AND ${to}::DATE
        AND deleted_at IS NULL
        AND (${mode}::TEXT = 'net' OR type::TEXT = ${mode}::TEXT)
    ) AS totals
  `;

  if (row === undefined) {
    throw new Error('Finance summary query did not return a row.');
  }

  return row;
};

export const getAllCategorySummariesByDateRange = async (
  from: string,
  to: string,
  mode: SummaryMode,
): Promise<FinanceSummaryCategoryRow[]> => {
  const database = getDatabaseClient();

  return database<FinanceSummaryCategoryRow[]>`
    SELECT
      categories.code AS category_code,
      categories.name AS category_name,
      categories.description AS category_description,
      categories.type AS category_type,
      SUM(transactions.amount) AS total
    FROM transactions
    JOIN categories ON categories.id = transactions.category_id
    WHERE transactions.date BETWEEN ${from}::DATE AND ${to}::DATE
      AND transactions.deleted_at IS NULL
      AND (${mode}::TEXT = 'net' OR transactions.type::TEXT = ${mode}::TEXT)
    GROUP BY
      categories.id
    ORDER BY
      total DESC,
      categories.name ASC
  `;
};

export const getAllDailySummariesByDateRange = async (
  input: FinanceDailySummaryQuery,
): Promise<FinanceDailySummaryRow[]> => {
  const database = getDatabaseClient();

  return database<FinanceDailySummaryRow[]>`
    SELECT
      date,
      COALESCE(SUM(amount) FILTER (WHERE type = 'expense'), 0) AS expense_total,
      COALESCE(SUM(amount) FILTER (WHERE type = 'income'), 0) AS income_total,
      COALESCE(SUM(amount) FILTER (WHERE type = 'income'), 0)
        - COALESCE(SUM(amount) FILTER (WHERE type = 'expense'), 0) AS net_total
    FROM transactions
    WHERE date BETWEEN ${input.from}::DATE AND ${input.to}::DATE
      AND deleted_at IS NULL
    GROUP BY
      date
    ORDER BY
      date ASC
  `;
};
