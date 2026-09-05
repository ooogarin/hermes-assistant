import { expect, mock, test } from 'bun:test';
import { AppError } from '../src/core/errors/app-error';
import type {
  Category,
  CreateTransactionsRequest,
  FinanceService,
  FinanceSummary,
  FinanceTransaction,
  ListCategoriesRequest,
  ListTransactionsRequest,
  SummaryRequest,
  TransactionReferenceRequest,
  UpdateTransactionRequest,
} from '../src/modules/finance/finance.types';

const category: Category = {
  code: 'food_drink',
  name: 'Makanan & Minuman',
  description: 'Food, drinks, coffee, snacks, restaurants, warungs, cafes.',
  type: 'expense',
};

const transaction: FinanceTransaction = {
  dailyNumber: 3,
  displayNumber: 2,
  type: 'expense',
  amount: 23_000,
  name: 'Kopi',
  location: null,
  note: null,
  date: '2026-07-14',
  rawText: '12, sarapan di warung A\n23, kopi',
  category,
  createdAt: '2026-07-14T10:00:00.000Z',
  updatedAt: '2026-07-14T10:00:00.000Z',
};

const summary: FinanceSummary = {
  from: '2026-07-14',
  to: '2026-07-14',
  mode: 'expense',
  expenseTotal: 23_000,
  incomeTotal: 0,
  netTotal: -23_000,
  byCategory: [{ category, total: 23_000 }],
};

const createFinanceServiceStub = (overrides: Partial<FinanceService> = {}): FinanceService => ({
  createTransactions: async () => [transaction],
  getTransaction: async () => transaction,
  listTransactions: async () => [transaction],
  updateTransaction: async (_reference: TransactionReferenceRequest, input: UpdateTransactionRequest) => ({
    ...transaction,
    ...input,
  }),
  removeTransaction: async () => {},
  listCategories: async () => [category],
  getSummary: async () => summary,
  ...overrides,
});

let activeFinanceService = createFinanceServiceStub();

mock.module('../src/modules/finance/finance.service', () => ({
  createTransactions: (input: CreateTransactionsRequest) => activeFinanceService.createTransactions(input),
  getTransaction: (input: TransactionReferenceRequest) => activeFinanceService.getTransaction(input),
  listTransactions: (input: ListTransactionsRequest) => activeFinanceService.listTransactions(input),
  updateTransaction: (reference: TransactionReferenceRequest, input: UpdateTransactionRequest) =>
    activeFinanceService.updateTransaction(reference, input),
  removeTransaction: (input: TransactionReferenceRequest) => activeFinanceService.removeTransaction(input),
  listCategories: (input: ListCategoriesRequest) => activeFinanceService.listCategories(input),
  getSummary: (input: SummaryRequest) => activeFinanceService.getSummary(input),
}));

const { createApp } = await import('../src/app');

const createFinanceApp = (overrides: Partial<FinanceService> = {}) => {
  activeFinanceService = createFinanceServiceStub(overrides);

  return createApp({
    internalApiKey: 'test-api-key',
    isDatabaseReady: async () => true,
  });
};

test('creates a resolved finance batch through the authenticated API', async () => {
  const response = await createFinanceApp().request('http://localhost/api/v1/finance/transactions', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer test-api-key',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      date: '2026-07-14',
      type: 'expense',
      rawText: '12, sarapan di warung A\n23, kopi',
      transactions: [
        {
          amount: 23_000,
          categoryCode: 'food_drink',
          name: 'Kopi',
        },
      ],
    }),
  });

  expect(response.status).toBe(201);
  expect(await response.json()).toEqual({ success: true, data: { items: [transaction] } });
});

test('uses the unpadded daily number in a transaction reference', async () => {
  let reference: TransactionReferenceRequest | undefined;
  const response = await createFinanceApp({
    getTransaction: async (input) => {
      reference = input;
      return transaction;
    },
  }).request('http://localhost/api/v1/finance/transactions/2026-07-14/3', {
    headers: { Authorization: 'Bearer test-api-key' },
  });

  expect(response.status).toBe(200);
  expect(reference).toEqual({ date: '2026-07-14', dailyNumber: 3 });
  expect(await response.json()).toEqual({ success: true, data: transaction });
});

test('lists transactions for one validated date', async () => {
  let listInput: ListTransactionsRequest | undefined;
  const response = await createFinanceApp({
    listTransactions: async (input) => {
      listInput = input;
      return [transaction];
    },
  }).request('http://localhost/api/v1/finance/transactions?date=2026-07-14', {
    headers: { Authorization: 'Bearer test-api-key' },
  });

  expect(response.status).toBe(200);
  expect(listInput).toEqual({ date: '2026-07-14' });
  expect(await response.json()).toEqual({ success: true, data: { items: [transaction] } });
});

test('updates and soft deletes a transaction through its stable reference', async () => {
  let updateInput: UpdateTransactionRequest | undefined;
  let removedReference: TransactionReferenceRequest | undefined;
  const app = createFinanceApp({
    updateTransaction: async (_reference, input) => {
      updateInput = input;
      return { ...transaction, amount: input.amount ?? transaction.amount };
    },
    removeTransaction: async (reference) => {
      removedReference = reference;
    },
  });
  const url = 'http://localhost/api/v1/finance/transactions/2026-07-14/3';
  const patchResponse = await app.request(url, {
    method: 'PATCH',
    headers: {
      Authorization: 'Bearer test-api-key',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ amount: 25_000, note: null }),
  });
  const deleteResponse = await app.request(url, {
    method: 'DELETE',
    headers: { Authorization: 'Bearer test-api-key' },
  });

  expect(patchResponse.status).toBe(200);
  expect(updateInput).toEqual({ amount: 25_000, note: null });
  expect(deleteResponse.status).toBe(204);
  expect(removedReference).toEqual({ date: '2026-07-14', dailyNumber: 3 });
});

test('rejects an unresolved finance payload without calling the service', async () => {
  let createCalled = false;
  const app = createFinanceApp({
    createTransactions: async () => {
      createCalled = true;
      return [transaction];
    },
  });

  const response = await app.request('http://localhost/api/v1/finance/transactions', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer test-api-key',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      date: 'not-a-date',
      rawText: '',
      transactions: [{ amount: 12, categoryCode: '', name: '' }],
    }),
  });

  expect(response.status).toBe(400);
  expect(createCalled).toBe(false);
  expect(await response.json()).toMatchObject({
    success: false,
    error: { code: 'VALIDATION_ERROR', message: 'Request validation failed' },
  });
});

test('passes a category type filter to the finance service', async () => {
  let categoryFilter: ListCategoriesRequest | undefined;
  const response = await createFinanceApp({
    listCategories: async (input) => {
      categoryFilter = input;
      return [category];
    },
  }).request('http://localhost/api/v1/finance/categories?type=expense', {
    headers: { Authorization: 'Bearer test-api-key' },
  });

  expect(response.status).toBe(200);
  expect(categoryFilter).toEqual({ type: 'expense' });
  expect(await response.json()).toEqual({ success: true, data: { items: [category] } });
});

test('returns a SQL-backed summary through the API', async () => {
  let summaryRequest: SummaryRequest | undefined;
  const response = await createFinanceApp({
    getSummary: async (input) => {
      summaryRequest = input;
      return summary;
    },
  }).request('http://localhost/api/v1/finance/summary?from=2026-07-14&to=2026-07-14&mode=expense', {
    headers: { Authorization: 'Bearer test-api-key' },
  });

  expect(response.status).toBe(200);
  expect(summaryRequest).toEqual({ from: '2026-07-14', to: '2026-07-14', mode: 'expense' });
  expect(await response.json()).toEqual({ success: true, data: summary });
});

test('rejects a reversed finance summary date range', async () => {
  let summaryCalled = false;
  const response = await createFinanceApp({
    getSummary: async () => {
      summaryCalled = true;
      return summary;
    },
  }).request('http://localhost/api/v1/finance/summary?from=2026-07-15&to=2026-07-14', {
    headers: { Authorization: 'Bearer test-api-key' },
  });

  expect(response.status).toBe(400);
  expect(summaryCalled).toBe(false);
});

test('returns the standard not-found response for an unknown transaction', async () => {
  const response = await createFinanceApp({
    getTransaction: async () => {
      throw new AppError({ code: 'TRANSACTION_NOT_FOUND', statusCode: 404, message: 'Transaction not found' });
    },
  }).request('http://localhost/api/v1/finance/transactions/2026-07-14/3', {
    headers: { Authorization: 'Bearer test-api-key' },
  });

  expect(response.status).toBe(404);
  expect(await response.json()).toEqual({
    success: false,
    error: { code: 'TRANSACTION_NOT_FOUND', message: 'Transaction not found', details: null },
    requestId: expect.any(String),
  });
});
