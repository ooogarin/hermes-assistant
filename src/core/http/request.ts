import type { Context } from 'hono';
import type { z } from 'zod';
import type { AppEnv } from './app-env';

type ValidatedRequest = {
  valid: (target: 'json' | 'param' | 'query') => unknown;
};

const getValidatedRequest = (context: Context<AppEnv>): ValidatedRequest => context.req as unknown as ValidatedRequest;

const getValidatedValue = <Schema extends z.ZodType>(
  context: Context<AppEnv>,
  target: 'json' | 'param' | 'query',
  _schema: Schema,
): z.output<Schema> => getValidatedRequest(context).valid(target) as z.output<Schema>;

export const getBody = <Schema extends z.ZodType>(context: Context<AppEnv>, schema: Schema): z.output<Schema> => {
  return getValidatedValue(context, 'json', schema);
};

export const getParam = <Schema extends z.ZodType>(context: Context<AppEnv>, schema: Schema): z.output<Schema> => {
  return getValidatedValue(context, 'param', schema);
};

export const getQuery = <Schema extends z.ZodType>(context: Context<AppEnv>, schema: Schema): z.output<Schema> => {
  return getValidatedValue(context, 'query', schema);
};
