import { getBody, getParam, getQuery } from '../../core/http/request';
import { successResponse } from '../../core/http/response';
import * as financeService from './finance.service';
import {
  createTransactionsSchema,
  dailySummaryQuerySchema,
  listTransactionsSchema,
  summaryQuerySchema,
  transactionReferenceSchema,
  updateTransactionSchema,
} from './finance.validator';
import type { Context } from 'hono';
import type { AppEnv } from '../../core/http/app-env';
import type { TransactionReferenceRequest } from './finance.types';

export const createTransactions = async (context: Context<AppEnv>) => {
  const input = getBody(context, createTransactionsSchema);

  const result = await financeService.createTransactions(input);

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
  const input = getBody(context, updateTransactionSchema);

  const result = await financeService.updateTransaction(request, input);

  return successResponse({ context, data: result });
};

export const removeTransaction = async (context: Context<AppEnv>) => {
  const request = getTransactionReference(context);

  await financeService.removeTransaction(request);

  return context.body(null, 204);
};

export const getSummary = async (context: Context<AppEnv>) => {
  const query = getQuery(context, summaryQuerySchema);

  const result = await financeService.getSummary(query);

  return successResponse({ context, data: result });
};

export const getDailySummary = async (context: Context<AppEnv>) => {
  const query = getQuery(context, dailySummaryQuerySchema);

  const result = await financeService.getDailySummary(query);

  return successResponse({ context, data: { items: result } });
};

const getTransactionReference = (context: Context<AppEnv>): TransactionReferenceRequest => {
  const params = getParam(context, transactionReferenceSchema);

  return {
    date: params.date,
    daily_number: params.daily_number,
  };
};
