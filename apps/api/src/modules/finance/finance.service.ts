import { randomUUID } from 'node:crypto';
import { commitTransaction, rollbackTransaction, startTransaction } from '../../core/database/client';
import { notFoundError } from '../../core/errors/not-found-error';
import { toIsoTimestamp } from '../../shared/date/date';
import * as financeRepository from './finance.repository';
import * as financeCategoryService from './finance-category/finance-category.service';
import type { DatabaseReservedConnection } from '../../core/database/database.types';
import type { AppError } from '../../core/errors/app-error';
import type {
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
  ListTransactionsRequest,
  SummaryRequest,
  TransactionReferenceRequest,
  UpdateTransactionRequest,
} from './finance.types';

export const createTransactions = async (input: CreateTransactionsRequest): Promise<FinanceTransaction[]> => {
  const categoryByCode = await financeCategoryService.getRequiredCategoryMapByCodes(
    input.transactions.map((transaction) => transaction.category_code),
    input.type,
  );

  const payloads = input.transactions.map<FinanceTransactionInsertPayload>((transaction) => ({
    amount: transaction.amount,
    // getRequiredCategoryMapByCodes throws on missing codes, so every lookup below resolves.
    category_id: categoryByCode.get(transaction.category_code)?.id ?? 0,
    daily_number: 0,
    name: transaction.name,
    location: transaction.location,
    note: transaction.note,
  }));
  let trx: DatabaseReservedConnection | undefined;

  try {
    trx = await startTransaction();

    const firstDailyNumberRow = await financeRepository.getLastDailyNumberByDateForUpdate(input.date, trx);

    const firstDailyNumber = (firstDailyNumberRow.daily_number ?? 0) + 1;
    const numberedPayloads = payloads.map((payload, index) => ({
      ...payload,
      daily_number: firstDailyNumber + index,
    }));

    const transactions = await financeRepository.insertAll(
      randomUUID(),
      input.date,
      input.type,
      input.raw_text,
      numberedPayloads,
      trx,
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
  const transaction = await financeRepository.getOneByDateAndDailyNumber(input.date, input.daily_number);

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
    const category = await financeCategoryService.getRequiredCategory(input.category_code, current.type);

    category_id = category.id;
  }

  const payload: FinanceTransactionUpdatePayload = {
    amount: input.amount,
    category_id,
    name: input.name,
    location: input.location,
    note: input.note,
  };

  const transaction = await financeRepository.updateOneByDateAndDailyNumber(
    reference.date,
    reference.daily_number,
    payload,
  );

  if (transaction === null) {
    throw transactionNotFound();
  }

  return toFinanceTransaction(transaction);
};

export const removeTransaction = async (input: TransactionReferenceRequest): Promise<void> => {
  const deleted = await financeRepository.softDeleteOneByDateAndDailyNumber(input.date, input.daily_number);

  if (!deleted) {
    throw transactionNotFound();
  }
};

export const getSummary = async (input: SummaryRequest): Promise<FinanceSummary> => {
  const [totals, categoryRows] = await Promise.all([
    financeRepository.getOneSummaryByDateRange(input.from, input.to, input.mode),
    financeRepository.getAllCategorySummariesByDateRange(input.from, input.to, input.mode),
  ]);

  const expense_total = Number(totals.expense_total);
  const income_total = Number(totals.income_total);
  const net_total = Number(totals.net_total);
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
    net_total,
    by_category,
  };
};

export const getDailySummary = async (input: DailySummaryRequest): Promise<FinanceDailySummary[]> => {
  const query: FinanceDailySummaryQuery = {
    from: input.from,
    to: input.to,
  };

  const rows = await financeRepository.getAllDailySummariesByDateRange(query);

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

const toIsoDate = (value: Date | string): string => {
  return value instanceof Date ? value.toISOString().slice(0, 10) : value.slice(0, 10);
};

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

const transactionNotFound = (): AppError => {
  return notFoundError('TRANSACTION_NOT_FOUND', 'Transaction not found');
};
