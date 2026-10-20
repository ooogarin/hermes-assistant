import { timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { readAuthCookie } from '../auth/auth-cookie';
import { requireVerifiedWebJwt } from '../auth/web-jwt';
import { failureResponse } from '../http/response';
import { createWebOriginMiddleware } from './web-origin';
import type { MiddlewareHandler } from 'hono';
import type { AuthResources } from '../auth/auth.types';
import type { AppEnv } from '../http/app-env';

const encoder = new TextEncoder();
const authorizationSchema = z
  .string()
  .max(519)
  .regex(/^Bearer [^\r\n]+$/);

const hasMatchingToken = (providedToken: string, expectedToken: string): boolean => {
  const provided = encoder.encode(providedToken);
  const expected = encoder.encode(expectedToken);

  return provided.length === expected.length && timingSafeEqual(provided, expected);
};

export const createAuthMiddleware = (apiKey: string, resources: AuthResources): MiddlewareHandler<AppEnv> => {
  const originMiddleware = createWebOriginMiddleware(resources.configuration.origin);

  return async (context, next) => {
    context.header('Cache-Control', 'private, no-store');
    context.set('auth_resources', resources);

    try {
      const path = context.req.path;
      const method = context.req.method;
      const isAuthCommand = method === 'POST' && (path === '/api/v1/auth/login' || path === '/api/v1/auth/logout');

      if (isAuthCommand) {
        await next();

        return;
      }

      const authorization = context.req.header('Authorization');
      const isBrowserStatusEndpoint = path === '/api/v1/auth/status';

      const usesAgentAuthorization = authorization !== undefined && !isBrowserStatusEndpoint;

      if (usesAgentAuthorization) {
        const parsed = authorizationSchema.safeParse(authorization);
        const token = parsed.success ? parsed.data.slice('Bearer '.length) : undefined;

        const isInvalidToken = token === undefined || !hasMatchingToken(token, apiKey);

        if (isInvalidToken) {
          return failureResponse({
            context,
            error: { code: 'UNAUTHENTICATED', message: 'Authentication required', details: null },
            statusCode: 401,
          });
        }

        context.set('auth_mode', 'agent');

        await next();

        return;
      }

      await requireVerifiedWebJwt(resources, readAuthCookie(context, resources.configuration));

      context.set('auth_mode', 'browser');

      if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
        await originMiddleware(context, next);

        return;
      }

      await next();
    } finally {
      context.header('Cache-Control', 'private, no-store');
    }
  };
};

export const requireAgent: MiddlewareHandler<AppEnv> = async (context, next) => {
  if (context.get('auth_mode') !== 'agent') {
    return failureResponse({
      context,
      error: { code: 'FORBIDDEN', message: 'Agent authentication required', details: null },
      statusCode: 403,
    });
  }

  await next();
};
