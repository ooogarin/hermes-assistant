import { randomUUID } from 'node:crypto';
import { commitTransaction, rollbackTransaction, startTransaction } from '../../core/database/client';
import { AppError } from '../../core/errors/app-error';
import { notFoundError } from '../../core/errors/not-found-error';
import { toIsoTimestamp } from '../../shared/date/date';
import * as financeRepository from './finance.repository';
import type { DatabaseReservedConnection } from '../../core/database/database.types';
import type {
  Category,
  CreateTransactionsRequest,
  DailySummaryRequest,
  FinanceDailySummary,
  FinanceDailySummaryQuery,
  FinanceSummary,
  FinanceSummaryCategory,
  FinanceTransaction,
  FinanceTransactionInsertPayload,
  FinanceTransactionRow,
  FinanceTransactionUpdatePayload,
  ListCategoriesRequest,
  ListTransactionsRequest,
  SummaryRequest,
  TransactionReferenceRequest,
  UpdateTransactionRequest,
} from './finance.types';

export const createTransactions = async (input: CreateTransactionsRequest): Promise<FinanceTransaction[]> => {
  const categoryByCode = await getCategoryByCode(
    input.transactions.map((transaction) => transaction.category_code),
    input.type,
  );
  const payloads = input.transactions.map<FinanceTransactionInsertPayload>((transaction) => ({
    amount: transaction.amount,
    category_id: categoryByCode.get(transaction.category_code)?.id ?? 0,
    daily_number: 0,
    name: transaction.name,
    location: transaction.location,
    note: transaction.note,
  }));
  let trx: DatabaseReservedConnection | undefined;

  try {
    trx = await startTransaction();

    const firstDailyNumberRow = await financeRepository.getNextDailyNumber(trx, input.date);
    const firstDailyNumber = (firstDailyNumberRow.daily_number ?? 0) + 1;
    const numberedPayloads = payloads.map((payload, index) => ({
      ...payload,
      daily_number: firstDailyNumber + index,
    }));
    const transactions = await financeRepository.insertBatch(
      trx,
      randomUUID(),
      input.date,
      input.type,
      input.raw_text,
      numberedPayloads,
    );
    const trxToCommit = trx;
    trx = undefined;

    await commitTransaction(trxToCommit);

    return transactions.map(toFinanceTransaction);
  } catch (error) {
    if (trx !== undefined) {
      const trxToRollback = trx;
      trx = undefined;

      await rollbackTransaction(trxToRollback).catch(() => undefined);
    }

    throw error;
  }
};

export const getTransaction = async (input: TransactionReferenceRequest): Promise<FinanceTransaction> => {
  const transaction = await financeRepository.findByReference(input.date, input.daily_number);

  if (transaction === null) {
    throw transactionNotFound();
  }

  return toFinanceTransaction(transaction);
};

export const listTransactions = async (input: ListTransactionsRequest): Promise<FinanceTransaction[]> => {
  const rows = await financeRepository.getAllByDate(input.date);
  return rows.map(toFinanceTransaction);
};

export const updateTransaction = async (
  reference: TransactionReferenceRequest,
  input: UpdateTransactionRequest,
): Promise<FinanceTransaction> => {
  const current = await getTransaction(reference);
  let category_id: number | undefined;

  if (input.category_code !== undefined) {
    category_id = (await getRequiredCategory(input.category_code, current.type)).id;
  }

  const payload: FinanceTransactionUpdatePayload = {
    amount: input.amount,
    category_id,
    name: input.name,
    location: input.location,
    note: input.note,
  };
  const transaction = await financeRepository.updateByReference(reference.date, reference.daily_number, payload);

  if (transaction === null) {
    throw transactionNotFound();
  }

  return toFinanceTransaction(transaction);
};

export const removeTransaction = async (input: TransactionReferenceRequest): Promise<void> => {
  const deleted = await financeRepository.softDeleteByReference(input.date, input.daily_number);

  if (!deleted) {
    throw transactionNotFound();
  }
};

export const listCategories = async (input: ListCategoriesRequest): Promise<Category[]> => {
  const rows = await financeRepository.getActiveCategories(input.type);
  return rows.map(toCategory);
};

export const getSummary = async (input: SummaryRequest): Promise<FinanceSummary> => {
  const [totals, categoryRows] = await Promise.all([
    financeRepository.getSummaryTotals(input.from, input.to, input.mode),
    financeRepository.getSummaryByCategory(input.from, input.to, input.mode),
  ]);
  const expense_total = Number(totals.expense_total);
  const income_total = Number(totals.income_total);
  const by_category = categoryRows.map<FinanceSummaryCategory>((row) => ({
    category: {
      code: row.category_code,
      name: row.category_name,
      description: row.category_description,
      type: row.category_type,
    },
    total: Number(row.total),
  }));

  return {
    from: input.from,
    to: input.to,
    mode: input.mode,
    expense_total,
    income_total,
    net_total: income_total - expense_total,
    by_category,
  };
};

export const getDailySummary = async (input: DailySummaryRequest): Promise<FinanceDailySummary[]> => {
  const query: FinanceDailySummaryQuery = {
    from: input.from,
    to: input.to,
  };
  const rows = await financeRepository.getDailySummary(query);

  return rows.map((row) => ({
    date: toIsoDate(row.date),
    expense_total: Number(row.expense_total),
    income_total: Number(row.income_total),
    net_total: Number(row.net_total),
  }));
};

// ====================================================================================================
// Helper functions
// ====================================================================================================

const getCategoryByCode = async (codes: string[], type: CreateTransactionsRequest['type']) => {
  const categories = await financeRepository.getActiveCategoriesByCodes([...new Set(codes)], type);
  const categoryByCode = new Map(categories.map((category) => [category.code, category]));
  const missingCodes = [...new Set(codes)].filter((code) => !categoryByCode.has(code));

  if (missingCodes.length > 0) {
    throw invalidCategory(missingCodes);
  }

  return categoryByCode;
};

const getRequiredCategory = async (code: string, type: FinanceTransaction['type']) => {
  const [category] = await financeRepository.getActiveCategoriesByCodes([code], type);

  if (category === undefined) {
    throw invalidCategory([code]);
  }

  return category;
};

const toIsoDate = (value: Date | string): string => {
  return value instanceof Date ? value.toISOString().slice(0, 10) : value.slice(0, 10);
};

const toCategory = (row: {
  code: string;
  name: string;
  description: string;
  type: FinanceTransaction['type'];
}): Category => ({
  code: row.code,
  name: row.name,
  description: row.description,
  type: row.type,
});

const toFinanceTransaction = (row: FinanceTransactionRow): FinanceTransaction => ({
  daily_number: row.daily_number,
  display_number: Number(row.display_number),
  type: row.type,
  amount: Number(row.amount),
  name: row.name,
  location: row.location,
  note: row.note,
  date: toIsoDate(row.date),
  raw_text: row.raw_text,
  category: {
    code: row.category_code,
    name: row.category_name,
    description: row.category_description,
    type: row.category_type,
  },
  created_at: toIsoTimestamp(row.created_at),
  updated_at: toIsoTimestamp(row.updated_at),
});

const invalidCategory = (codes: string[]): AppError => {
  return new AppError({
    code: 'INVALID_TRANSACTION_CATEGORY',
    statusCode: 400,
    message: 'Transaction category is invalid for its type',
    details: { codes },
    exposeDetails: true,
  });
};

const transactionNotFound = (): AppError => {
  return notFoundError('TRANSACTION_NOT_FOUND', 'Transaction not found');
};
