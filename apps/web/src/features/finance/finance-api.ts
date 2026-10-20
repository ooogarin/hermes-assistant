import { z } from 'zod';
import { apiRequest } from '../../lib/api/api-client';
import { buildQueryString } from '../../lib/api/query-string';
import type { DateRange } from '../../lib/formatting/dates';

const categorySchema = z.object({
  code: z.string(),
  name: z.string(),
  description: z.string(),
  type: z.enum(['expense', 'income']),
});

const financeSummarySchema = z
  .object({
    from: z.string(),
    to: z.string(),
    mode: z.enum(['expense', 'income', 'net']),
    expense_total: z.number(),
    income_total: z.number(),
    net_total: z.number(),
    by_category: z.array(z.object({ category: categorySchema, total: z.number() })),
  })
  .transform(({ by_category, expense_total, income_total, net_total, ...summary }) => ({
    ...summary,
    byCategory: by_category,
    expenseTotal: expense_total,
    incomeTotal: income_total,
    netTotal: net_total,
  }));

const transactionSchema = z
  .object({
    daily_number: z.number(),
    display_number: z.number(),
    type: z.enum(['expense', 'income']),
    amount: z.number(),
    name: z.string(),
    location: z.string().nullable(),
    note: z.string().nullable(),
    date: z.string(),
    raw_text: z.string(),
    category: categorySchema,
    created_at: z.string(),
    updated_at: z.string(),
  })
  .transform(({ created_at, daily_number, display_number, raw_text, updated_at, ...transaction }) => ({
    ...transaction,
    createdAt: created_at,
    dailyNumber: daily_number,
    displayNumber: display_number,
    rawText: raw_text,
    updatedAt: updated_at,
  }));

const transactionListSchema = z.object({ items: z.array(transactionSchema) }).transform(({ items }) => items);
const categoryListSchema = z.object({ items: z.array(categorySchema) }).transform(({ items }) => items);

const dailySummarySchema = z.object({
  items: z.array(
    z
      .object({ date: z.string(), expense_total: z.number(), income_total: z.number(), net_total: z.number() })
      .transform(({ expense_total, income_total, net_total, ...row }) => ({
        ...row,
        expenseTotal: expense_total,
        incomeTotal: income_total,
        netTotal: net_total,
      })),
  ),
});

export type FinanceSummary = z.output<typeof financeSummarySchema>;
export type FinanceTransaction = z.output<typeof transactionSchema>;
export type FinanceCategory = z.output<typeof categorySchema>;
export type FinanceDailySummary = z.output<typeof dailySummarySchema>['items'];
export type FinanceTransactionType = FinanceTransaction['type'];
export type FinanceTransactionInput = {
  amount: number;
  categoryCode: string;
  location: string | null;
  name: string;
  note: string | null;
};
export type CreateFinanceTransactionsInput = {
  date: string;
  rawText: string;
  transactions: FinanceTransactionInput[];
  type: FinanceTransactionType;
};
export type UpdateFinanceTransactionInput = Partial<
  Pick<FinanceTransactionInput, 'amount' | 'categoryCode' | 'location' | 'name' | 'note'>
>;

export const getFinanceSummary = (range: DateRange, signal?: AbortSignal): Promise<FinanceSummary> =>
  apiRequest(`/api/v1/finance/summary${buildQueryString({ ...range, mode: 'net' })}`, financeSummarySchema, {
    signal,
  });

export const getFinanceTransactions = (date: string, signal?: AbortSignal): Promise<FinanceTransaction[]> =>
  apiRequest(`/api/v1/finance/transactions${buildQueryString({ date })}`, transactionListSchema, { signal });

export const getFinanceCategories = (type: FinanceTransactionType, signal?: AbortSignal): Promise<FinanceCategory[]> =>
  apiRequest(`/api/v1/finance/categories${buildQueryString({ type })}`, categoryListSchema, { signal });

export const getFinanceTransaction = (
  date: string,
  dailyNumber: number,
  signal?: AbortSignal,
): Promise<FinanceTransaction> =>
  apiRequest(`/api/v1/finance/transactions/${date}/${dailyNumber}`, transactionSchema, { signal });

export const createFinanceTransactions = (input: CreateFinanceTransactionsInput): Promise<FinanceTransaction[]> =>
  apiRequest('/api/v1/finance/transactions', transactionListSchema, {
    body: input,
    method: 'POST',
  });

export const updateFinanceTransaction = (
  date: string,
  dailyNumber: number,
  input: UpdateFinanceTransactionInput,
): Promise<FinanceTransaction> =>
  apiRequest(`/api/v1/finance/transactions/${date}/${dailyNumber}`, transactionSchema, {
    body: input,
    method: 'PATCH',
  });

export const getFinanceDailySummary = async (range: DateRange, signal?: AbortSignal): Promise<FinanceDailySummary> => {
  const result = await apiRequest(`/api/v1/finance/summary/daily${buildQueryString(range)}`, dailySummarySchema, {
    signal,
  });
  return result.items;
};
