import { Hono } from 'hono';
import { requestId } from 'hono/request-id';
import { createAuthMiddleware } from './core/middleware/auth';
import { errorHandler } from './core/middleware/error-handler';
import { requestContextMiddleware } from './core/middleware/request-context';
import { failureResponse, successResponse } from './shared/response/api-response';
import type { AppEnv } from './core/http/app-env';

export type CreateAppOptions = {
  internalApiKey: string;
  isDatabaseReady: () => Promise<boolean>;
};

export const createApp = ({ internalApiKey, isDatabaseReady }: CreateAppOptions) => {
  const app = new Hono<AppEnv>();

  app.use('*', requestId());
  app.use('*', requestContextMiddleware);
  app.use('/api/*', createAuthMiddleware(internalApiKey));

  app.onError(errorHandler);
  app.notFound((context) => {
    return context.json(
      failureResponse(
        {
          code: 'NOT_FOUND',
          message: 'Resource not found',
          details: null,
        },
        context.get('requestId'),
      ),
      404,
    );
  });

  app.get('/health', (context) => {
    return context.json(successResponse({ status: 'ok' }));
  });

  app.get('/health/ready', async (context) => {
    const isReady = await isDatabaseReady().catch(() => false);

    if (!isReady) {
      return context.json(
        failureResponse(
          {
            code: 'SERVICE_UNAVAILABLE',
            message: 'Service unavailable',
            details: null,
          },
          context.get('requestId'),
        ),
        503,
      );
    }

    return context.json(successResponse({ status: 'ok' }));
  });

  return app;
};
