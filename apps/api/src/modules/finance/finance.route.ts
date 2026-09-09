import { Hono } from 'hono';
import { appValidator } from '../../core/http/validator';
import * as financeHandler from './finance.handler';
import {
  createTransactionsSchema,
  listCategoriesSchema,
  listTransactionsSchema,
  summaryQuerySchema,
  transactionReferenceSchema,
  updateTransactionSchema,
} from './finance.validator';
import type { AppEnv } from '../../core/http/app-env';

export const createFinanceRoutes = () => {
  const route = new Hono<AppEnv>();

  route.get('/categories', appValidator('query', listCategoriesSchema), financeHandler.listCategories);
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
