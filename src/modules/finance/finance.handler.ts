import { getBody, getParam, getQuery } from '../../core/http/request';
import { successResponse } from '../../core/http/response';
import * as financeService from './finance.service';
import {
  createTransactionsSchema,
  listCategoriesSchema,
  listTransactionsSchema,
  summaryQuerySchema,
  transactionReferenceSchema,
  updateTransactionSchema,
} from './finance.validator';
import type { Context } from 'hono';
import type { AppEnv } from '../../core/http/app-env';
import type { TransactionReferenceRequest } from './finance.types';

export const createTransactions = async (context: Context<AppEnv>) => {
  const data = getBody(context, createTransactionsSchema);
  const result = await financeService.createTransactions(data);

  return successResponse({ context, data: { items: result }, statusCode: 201 });
};

export const getTransaction = async (context: Context<AppEnv>) => {
  const request = getTransactionReference(context);
  const result = await financeService.getTransaction(request);

  return successResponse({ context, data: result });
};

export const listTransactions = async (context: Context<AppEnv>) => {
  const query = getQuery(context, listTransactionsSchema);
  const result = await financeService.listTransactions(query);

  return successResponse({ context, data: { items: result } });
};

export const updateTransaction = async (context: Context<AppEnv>) => {
  const request = getTransactionReference(context);
  const data = getBody(context, updateTransactionSchema);
  const result = await financeService.updateTransaction(request, data);

  return successResponse({ context, data: result });
};

export const removeTransaction = async (context: Context<AppEnv>) => {
  const request = getTransactionReference(context);

  await financeService.removeTransaction(request);

  return context.body(null, 204);
};

export const listCategories = async (context: Context<AppEnv>) => {
  const query = getQuery(context, listCategoriesSchema);
  const result = await financeService.listCategories(query);

  return successResponse({ context, data: { items: result } });
};

export const getSummary = async (context: Context<AppEnv>) => {
  const query = getQuery(context, summaryQuerySchema);
  const result = await financeService.getSummary(query);

  return successResponse({ context, data: result });
};

const getTransactionReference = (context: Context<AppEnv>): TransactionReferenceRequest => {
  const params = getParam(context, transactionReferenceSchema);

  return {
    date: params.date,
    dailyNumber: params.dailyNumber,
  };
};
