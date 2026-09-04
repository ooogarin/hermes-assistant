import { timingSafeEqual } from 'node:crypto';
import { failureResponse } from '../../shared/response/api-response';
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
      return context.json(
        failureResponse(
          {
            code: 'UNAUTHENTICATED',
            message: 'Authentication required',
            details: null,
          },
          context.get('requestId'),
        ),
        401,
      );
    }

    await next();
  };
};
