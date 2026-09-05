import { withContext } from '@logtape/logtape';
import { httpLogger } from '../logging/logger';
import type { MiddlewareHandler } from 'hono';
import type { AppEnv } from '../http/app-env';

export const requestContextMiddleware: MiddlewareHandler<AppEnv> = async (context, next) => {
  const requestId = context.get('requestId');
  const startedAt = performance.now();

  await withContext({ requestId }, async () => {
    try {
      await next();
    } finally {
      context.header('X-Request-Id', requestId);

      if (context.req.path !== '/health') {
        httpLogger.info('Request completed: {method} {path} {statusCode} in {durationMs}ms [requestId={requestId}]', {
          durationMs: Math.round((performance.now() - startedAt) * 100) / 100,
          method: context.req.method,
          path: context.req.path,
          requestId,
          statusCode: context.res.status,
        });
      }
    }
  });
};
