import { expect, mock, test } from 'bun:test';
import { AppError } from '../src/core/errors/app-error';
import { toSnakeCaseJson } from '../src/shared/response/api-response';
import type {
  Category,
  CreateTransactionsRequest,
  DailySummaryRequest,
  FinanceDailySummary,
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

const trx: FinanceTransaction = {
  daily_number: 3,
  display_number: 2,
  type: 'expense',
  amount: 23_000,
  name: 'Kopi',
  location: null,
  note: null,
  date: '2026-07-14',
  raw_text: '12, sarapan di warung A\n23, kopi',
  category,
  created_at: '2026-07-14T10:00:00.000Z',
  updated_at: '2026-07-14T10:00:00.000Z',
};

const summary: FinanceSummary = {
  from: '2026-07-14',
  to: '2026-07-14',
  mode: 'expense',
  expense_total: 23_000,
  income_total: 0,
  net_total: -23_000,
  by_category: [{ category, total: 23_000 }],
};

const dailySummary: FinanceDailySummary[] = [
  {
    date: '2026-07-14',
    expense_total: 23_000,
    income_total: 0,
    net_total: -23_000,
  },
];

const createFinanceServiceStub = (overrides: Partial<FinanceService> = {}): FinanceService => ({
  createTransactions: async () => [trx],
  getTransaction: async () => trx,
  listTransactions: async () => [trx],
  updateTransaction: async (_reference: TransactionReferenceRequest, input: UpdateTransactionRequest) => ({
    ...trx,
    ...input,
  }),
  removeTransaction: async () => {},
  listCategories: async () => [category],
  getSummary: async () => summary,
  getDailySummary: async () => dailySummary,
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
  getDailySummary: (input: DailySummaryRequest) => activeFinanceService.getDailySummary(input),
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
      raw_text: '12, sarapan di warung A\n23, kopi',
      transactions: [
        {
          amount: 23_000,
          category_code: 'food_drink',
          name: 'Kopi',
        },
      ],
    }),
  });

  expect(response.status).toBe(201);
  expect(await response.json()).toEqual({ success: true, data: toSnakeCaseJson({ items: [trx] }) });
});

test('uses the unpadded daily number in a transaction reference', async () => {
  let reference: TransactionReferenceRequest | undefined;
  const response = await createFinanceApp({
    getTransaction: async (input) => {
      reference = input;
      return trx;
    },
  }).request('http://localhost/api/v1/finance/transactions/2026-07-14/3', {
    headers: { Authorization: 'Bearer test-api-key' },
  });

  expect(response.status).toBe(200);
  expect(reference).toEqual({ date: '2026-07-14', daily_number: 3 });
  expect(await response.json()).toEqual({ success: true, data: toSnakeCaseJson(trx) });
});

test('lists transactions for one validated date', async () => {
  let listInput: ListTransactionsRequest | undefined;
  const response = await createFinanceApp({
    listTransactions: async (input) => {
      listInput = input;
      return [trx];
    },
  }).request('http://localhost/api/v1/finance/transactions?date=2026-07-14', {
    headers: { Authorization: 'Bearer test-api-key' },
  });

  expect(response.status).toBe(200);
  expect(listInput).toEqual({ date: '2026-07-14' });
  expect(await response.json()).toEqual({ success: true, data: toSnakeCaseJson({ items: [trx] }) });
});

test('updates and soft deletes a transaction through its stable reference', async () => {
  let updateInput: UpdateTransactionRequest | undefined;
  let removedReference: TransactionReferenceRequest | undefined;
  const app = createFinanceApp({
    updateTransaction: async (_reference, input) => {
      updateInput = input;
      return { ...trx, amount: input.amount ?? trx.amount };
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
  expect(removedReference).toEqual({ date: '2026-07-14', daily_number: 3 });
});

test('rejects an unresolved finance payload without calling the service', async () => {
  let createCalled = false;
  const app = createFinanceApp({
    createTransactions: async () => {
      createCalled = true;
      return [trx];
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
      raw_text: '',
      transactions: [{ amount: 12, category_code: '', name: '' }],
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
  expect(await response.json()).toEqual({ success: true, data: toSnakeCaseJson(summary) });
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

test('returns daily finance totals for a validated date range', async () => {
  let dailySummaryRequest: DailySummaryRequest | undefined;
  const response = await createFinanceApp({
    getDailySummary: async (input) => {
      dailySummaryRequest = input;
      return dailySummary;
    },
  }).request('http://localhost/api/v1/finance/summary/daily?from=2026-07-01&to=2026-07-14', {
    headers: { Authorization: 'Bearer test-api-key' },
  });

  expect(response.status).toBe(200);
  expect(dailySummaryRequest).toEqual({ from: '2026-07-01', to: '2026-07-14' });
  expect(await response.json()).toEqual({ success: true, data: toSnakeCaseJson({ items: dailySummary }) });
});

test('rejects a reversed daily finance summary date range', async () => {
  let dailySummaryCalled = false;
  const response = await createFinanceApp({
    getDailySummary: async () => {
      dailySummaryCalled = true;
      return dailySummary;
    },
  }).request('http://localhost/api/v1/finance/summary/daily?from=2026-07-15&to=2026-07-14', {
    headers: { Authorization: 'Bearer test-api-key' },
  });

  expect(response.status).toBe(400);
  expect(dailySummaryCalled).toBe(false);
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
    request_id: expect.any(String),
  });
});
