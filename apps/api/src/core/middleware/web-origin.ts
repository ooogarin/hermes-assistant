import { z } from 'zod';
import { AppError } from '../errors/app-error';
import type { MiddlewareHandler } from 'hono';
import type { AppEnv } from '../http/app-env';

export const createWebOriginMiddleware = (origin: string): MiddlewareHandler<AppEnv> => {
  const originSchema = z.literal(origin);

  return async (context, next) => {
    if (!originSchema.safeParse(context.req.header('Origin')).success) {
      throw new AppError({ code: 'FORBIDDEN', message: 'Access forbidden', statusCode: 403 });
    }

    await next();
  };
};
