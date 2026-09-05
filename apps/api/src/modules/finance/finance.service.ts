import { randomUUID } from 'node:crypto';
import { commitTransaction, rollbackTransaction, startTransaction } from '../../core/database/client';
import { AppError } from '../../core/errors/app-error';
import * as financeRepository from './finance.repository';
import type { DatabaseReservedConnection } from '../../core/database/database.types';
import type {
  Category,
  CreateTransactionsRequest,
  FinanceSummary,
  FinanceSummaryCategory,
  FinanceTransaction,
  FinanceTransactionInsertPayload,
  FinanceTransactionUpdatePayload,
  ListCategoriesRequest,
  ListTransactionsRequest,
  SummaryRequest,
  TransactionReferenceRequest,
  UpdateTransactionRequest,
} from './finance.types';

export const createTransactions = async (input: CreateTransactionsRequest): Promise<FinanceTransaction[]> => {
  const categoryByCode = await getCategoryByCode(
    input.transactions.map((transaction) => transaction.categoryCode),
    input.type,
  );
  const payloads = input.transactions.map<FinanceTransactionInsertPayload>((transaction) => ({
    amount: transaction.amount,
    categoryId: categoryByCode.get(transaction.categoryCode)?.id ?? 0,
    dailyNumber: 0,
    name: transaction.name,
    location: transaction.location,
    note: transaction.note,
  }));
  let trx: DatabaseReservedConnection | undefined;

  try {
    trx = await startTransaction();

    const firstDailyNumber = await financeRepository.getNextDailyNumber(trx, input.date);
    const numberedPayloads = payloads.map((payload, index) => ({
      ...payload,
      dailyNumber: firstDailyNumber + index,
    }));
    const transactions = await financeRepository.insertBatch(
      trx,
      randomUUID(),
      input.date,
      input.type,
      input.rawText,
      numberedPayloads,
    );
    const trxToCommit = trx;
    trx = undefined;

    await commitTransaction(trxToCommit);

    return transactions;
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
  const transaction = await financeRepository.findByReference(input.date, input.dailyNumber);

  if (transaction === null) {
    throw transactionNotFound();
  }

  return transaction;
};

export const listTransactions = (input: ListTransactionsRequest): Promise<FinanceTransaction[]> => {
  return financeRepository.getAllByDate(input.date);
};

export const updateTransaction = async (
  reference: TransactionReferenceRequest,
  input: UpdateTransactionRequest,
): Promise<FinanceTransaction> => {
  const current = await getTransaction(reference);
  let categoryId: number | undefined;

  if (input.categoryCode !== undefined) {
    categoryId = (await getRequiredCategory(input.categoryCode, current.type)).id;
  }

  const payload: FinanceTransactionUpdatePayload = {
    amount: input.amount,
    categoryId,
    name: input.name,
    location: input.location,
    note: input.note,
  };
  const transaction = await financeRepository.updateByReference(reference.date, reference.dailyNumber, payload);

  if (transaction === null) {
    throw transactionNotFound();
  }

  return transaction;
};

export const removeTransaction = async (input: TransactionReferenceRequest): Promise<void> => {
  const deleted = await financeRepository.softDeleteByReference(input.date, input.dailyNumber);

  if (!deleted) {
    throw transactionNotFound();
  }
};

export const listCategories = (input: ListCategoriesRequest): Promise<Category[]> => {
  return financeRepository.getActiveCategories(input.type);
};

export const getSummary = async (input: SummaryRequest): Promise<FinanceSummary> => {
  const [totals, categoryRows] = await Promise.all([
    financeRepository.getSummaryTotals(input.from, input.to, input.mode),
    financeRepository.getSummaryByCategory(input.from, input.to, input.mode),
  ]);
  const expenseTotal = Number(totals.expense_total);
  const incomeTotal = Number(totals.income_total);
  const byCategory = categoryRows.map<FinanceSummaryCategory>((row) => ({
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
    expenseTotal,
    incomeTotal,
    netTotal: incomeTotal - expenseTotal,
    byCategory,
  };
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
  return new AppError({
    code: 'TRANSACTION_NOT_FOUND',
    statusCode: 404,
    message: 'Transaction not found',
  });
};
