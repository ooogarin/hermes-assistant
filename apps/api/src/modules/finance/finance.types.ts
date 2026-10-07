import type { z } from 'zod';
import type {
  createTransactionsSchema,
  dailySummaryQuerySchema,
  listTransactionsSchema,
  summaryQuerySchema,
  transactionReferenceSchema,
  updateTransactionSchema,
} from './finance.validator';
import type { Category } from './finance-category/finance-category.types';

// ====================================================================================================
// Request contracts
// ====================================================================================================

export type TransactionType = 'expense' | 'income';
export type SummaryMode = TransactionType | 'net';

export type CreateTransactionsRequest = z.infer<typeof createTransactionsSchema>;
export type UpdateTransactionRequest = z.infer<typeof updateTransactionSchema>;
export type TransactionReferenceParams = z.infer<typeof transactionReferenceSchema>;
export type ListTransactionsRequest = z.infer<typeof listTransactionsSchema>;
export type SummaryRequest = z.infer<typeof summaryQuerySchema>;
export type DailySummaryRequest = z.infer<typeof dailySummaryQuerySchema>;

export type TransactionReferenceRequest = {
  date: string;
  daily_number: number;
};

// ====================================================================================================
// Service operations
// ====================================================================================================

export type FinanceTransaction = {
  daily_number: number;
  display_number: number;
  type: TransactionType;
  amount: number;
  name: string;
  location: string | null;
  note: string | null;
  date: string;
  raw_text: string;
  category: Category;
  created_at: string;
  updated_at: string;
};

export type FinanceSummaryCategory = {
  category: Category;
  total: number;
};

export type FinanceSummary = {
  from: string;
  to: string;
  mode: SummaryMode;
  expense_total: number;
  income_total: number;
  net_total: number;
  by_category: FinanceSummaryCategory[];
};

export type FinanceDailySummary = {
  date: string;
  expense_total: number;
  income_total: number;
  net_total: number;
};

export type FinanceService = {
  createTransactions: (input: CreateTransactionsRequest) => Promise<FinanceTransaction[]>;
  getTransaction: (input: TransactionReferenceRequest) => Promise<FinanceTransaction>;
  listTransactions: (input: ListTransactionsRequest) => Promise<FinanceTransaction[]>;
  updateTransaction: (
    reference: TransactionReferenceRequest,
    input: UpdateTransactionRequest,
  ) => Promise<FinanceTransaction>;
  removeTransaction: (input: TransactionReferenceRequest) => Promise<void>;
  getSummary: (input: SummaryRequest) => Promise<FinanceSummary>;
  getDailySummary: (input: DailySummaryRequest) => Promise<FinanceDailySummary[]>;
};

// ====================================================================================================
// Repository payloads
// ====================================================================================================

export type FinanceTransactionInsertPayload = {
  amount: number;
  category_id: number;
  daily_number: number;
  name: string;
  location: string | null;
  note: string | null;
};

export type DailyNumberRow = {
  daily_number: number | null;
};

export type FinanceTransactionUpdatePayload = {
  amount?: number;
  category_id?: number;
  name?: string;
  location?: string | null;
  note?: string | null;
};

export type FinanceDailySummaryQuery = {
  from: string;
  to: string;
};

// ====================================================================================================
// Repository responses
// ====================================================================================================

export type FinanceTransactionRow = {
  id: number;
  daily_number: number;
  display_number: number | string;
  type: TransactionType;
  amount: number | string;
  name: string;
  location: string | null;
  note: string | null;
  date: Date | string;
  raw_text: string;
  category_code: string;
  category_name: string;
  category_description: string;
  category_type: TransactionType;
  created_at: Date | string;
  updated_at: Date | string;
};

export type FinanceSummaryTotalsRow = {
  expense_total: number | string;
  income_total: number | string;
  net_total: number | string;
};

export type FinanceSummaryCategoryRow = {
  category_code: string;
  category_name: string;
  category_description: string;
  category_type: TransactionType;
  total: number | string;
};

export type FinanceDailySummaryRow = {
  date: Date | string;
  expense_total: number | string;
  income_total: number | string;
  net_total: number | string;
};
