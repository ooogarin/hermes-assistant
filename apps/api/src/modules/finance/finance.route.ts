import { Hono } from 'hono';
import { appValidator } from '../../core/http/validator';
import * as financeHandler from './finance.handler';
import {
  createTransactionsSchema,
  dailySummaryQuerySchema,
  listTransactionsSchema,
  summaryQuerySchema,
  transactionReferenceSchema,
  updateTransactionSchema,
} from './finance.validator';
import { createFinanceCategoryRoutes } from './finance-category/finance-category.route';
import type { AppEnv } from '../../core/http/app-env';

export const createFinanceRoutes = () => {
  const route = new Hono<AppEnv>();

  route.route('/categories', createFinanceCategoryRoutes());
  route.get('/summary/daily', appValidator('query', dailySummaryQuerySchema), financeHandler.getDailySummary);
  route.get('/summary', appValidator('query', summaryQuerySchema), financeHandler.getSummary);
  route.post('/transactions', appValidator('json', createTransactionsSchema), financeHandler.createTransactions);
  route.get('/transactions', appValidator('query', listTransactionsSchema), financeHandler.listTransactions);
  route.get(
    '/transactions/:date/:daily_number',
    appValidator('param', transactionReferenceSchema),
    financeHandler.getTransaction,
  );
  route.patch(
    '/transactions/:date/:daily_number',
    appValidator('param', transactionReferenceSchema),
    appValidator('json', updateTransactionSchema),
    financeHandler.updateTransaction,
  );
  route.delete(
    '/transactions/:date/:daily_number',
    appValidator('param', transactionReferenceSchema),
    financeHandler.removeTransaction,
  );

  return route;
};
