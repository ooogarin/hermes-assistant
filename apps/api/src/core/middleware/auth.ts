import { timingSafeEqual } from 'node:crypto';
import { failureResponse } from '../http/response';
import type { MiddlewareHandler } from 'hono';
import type { AppEnv } from '../http/app-env';

const encoder = new TextEncoder();

const hasMatchingToken = (providedToken: string, expectedToken: string): boolean => {
  const provided = encoder.encode(providedToken);
  const expected = encoder.encode(expectedToken);

  return provided.length === expected.length && timingSafeEqual(provided, expected);
};

export const createAuthMiddleware = (apiKey: string): MiddlewareHandler<AppEnv> => {
  return async (context, next) => {
    const authorization = context.req.header('Authorization');
    const token = authorization?.startsWith('Bearer ') ? authorization.slice('Bearer '.length) : undefined;

    if (token === undefined || !hasMatchingToken(token, apiKey)) {
      return failureResponse({
        context,
        error: {
          code: 'UNAUTHENTICATED',
          message: 'Authentication required',
          details: null,
        },
        statusCode: 401,
      });
    }

    await next();
  };
};
