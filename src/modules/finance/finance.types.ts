import type { z } from 'zod';
import type {
  createTransactionsSchema,
  listCategoriesSchema,
  listTransactionsSchema,
  summaryQuerySchema,
  transactionReferenceSchema,
  updateTransactionSchema,
} from './finance.validator';

// ====================================================================================================
// Request contracts
// ====================================================================================================

export type TransactionType = 'expense' | 'income';
export type SummaryMode = TransactionType | 'net';

export type CreateTransactionsRequest = z.infer<typeof createTransactionsSchema>;
export type UpdateTransactionRequest = z.infer<typeof updateTransactionSchema>;
export type TransactionReferenceParams = z.infer<typeof transactionReferenceSchema>;
export type ListTransactionsRequest = z.infer<typeof listTransactionsSchema>;
export type ListCategoriesRequest = z.infer<typeof listCategoriesSchema>;
export type SummaryRequest = z.infer<typeof summaryQuerySchema>;

export type TransactionReferenceRequest = {
  date: string;
  dailyNumber: number;
};

// ====================================================================================================
// Service operations
// ====================================================================================================

export type Category = {
  code: string;
  name: string;
  description: string;
  type: TransactionType;
};

export type FinanceTransaction = {
  dailyNumber: number;
  displayNumber: number;
  type: TransactionType;
  amount: number;
  name: string;
  location: string | null;
  note: string | null;
  date: string;
  rawText: string;
  category: Category;
  createdAt: string;
  updatedAt: string;
};

export type FinanceSummaryCategory = {
  category: Category;
  total: number;
};

export type FinanceSummary = {
  from: string;
  to: string;
  mode: SummaryMode;
  expenseTotal: number;
  incomeTotal: number;
  netTotal: number;
  byCategory: FinanceSummaryCategory[];
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
  listCategories: (input: ListCategoriesRequest) => Promise<Category[]>;
  getSummary: (input: SummaryRequest) => Promise<FinanceSummary>;
};

// ====================================================================================================
// Repository payloads
// ====================================================================================================

export type FinanceTransactionInsertPayload = {
  amount: number;
  categoryId: number;
  dailyNumber: number;
  name: string;
  location: string | null;
  note: string | null;
};

export type FinanceTransactionUpdatePayload = {
  amount?: number;
  categoryId?: number;
  name?: string;
  location?: string | null;
  note?: string | null;
};

// ====================================================================================================
// Repository responses
// ====================================================================================================

export type CategoryRow = {
  id: number;
  code: string;
  name: string;
  description: string;
  type: TransactionType;
};

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
};

export type FinanceSummaryCategoryRow = {
  category_code: string;
  category_name: string;
  category_description: string;
  category_type: TransactionType;
  total: number | string;
};
