import { z } from 'zod';
import { AppError } from '../errors/app-error';
import type { MiddlewareHandler } from 'hono';
import type { AppEnv } from '../http/app-env';

export const createWebOriginMiddleware = (origin: string): MiddlewareHandler<AppEnv> => {
  const allowedOrigins = new Set([origin]);
  const configuredOrigin = new URL(origin);
  const hasLocalHttpOrigin = configuredOrigin.protocol === 'http:';
  const hasLoopbackHost = ['localhost', '127.0.0.1'].includes(configuredOrigin.hostname);

  if (hasLocalHttpOrigin && hasLoopbackHost) {
    const alternateHost = configuredOrigin.hostname === 'localhost' ? '127.0.0.1' : 'localhost';
    configuredOrigin.hostname = alternateHost;
    allowedOrigins.add(configuredOrigin.origin);
  }

  const originSchema = z.string().refine((value) => allowedOrigins.has(value));

  return async (context, next) => {
    if (!originSchema.safeParse(context.req.header('Origin')).success) {
      throw new AppError({ code: 'FORBIDDEN', message: 'Access forbidden', statusCode: 403 });
    }

    await next();
  };
};
