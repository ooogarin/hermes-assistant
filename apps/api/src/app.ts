import { Hono } from 'hono';
import { requestId } from 'hono/request-id';
import { createLoginLimiter } from './core/auth/login-limiter';
import { createSessionStore } from './core/auth/session-store';
import { failureResponse, successResponse } from './core/http/response';
import { createAuthMiddleware } from './core/middleware/auth';
import { errorHandler } from './core/middleware/error-handler';
import { requestContextMiddleware } from './core/middleware/request-context';
import { createAuthRoutes } from './modules/auth/auth.route';
import { createFinanceRoutes } from './modules/finance/finance.route';
import { createGrammarRoutes } from './modules/grammar/grammar.route';
import { createJunkRoutes } from './modules/junk/junk.route';
import { createNotesRoutes } from './modules/notes/notes.route';
import { createReadingRoutes } from './modules/reading/reading.route';
import { createWritingRoutes } from './modules/writing/writing.route';
import type { AuthDependencies, AuthResources, WebAuthConfiguration } from './core/auth/auth.types';
import type { AppEnv } from './core/http/app-env';

export type CreateAppOptions = {
  internalApiKey: string;
  isDatabaseReady: () => Promise<boolean>;
  readinessTimeoutMs?: number;
  webAuth: WebAuthConfiguration;
  authDependencies?: AuthDependencies;
};

const checkDatabaseReadiness = async (check: () => Promise<boolean>, timeoutMs: number): Promise<boolean> => {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const timeoutResult = new Promise<false>((resolve) => {
    timeout = setTimeout(() => resolve(false), timeoutMs);
  });

  try {
    return await Promise.race([check().catch(() => false), timeoutResult]);
  } finally {
    if (timeout !== undefined) {
      clearTimeout(timeout);
    }
  }
};

export const createApp = ({
  internalApiKey,
  isDatabaseReady,
  readinessTimeoutMs = 2_000,
  webAuth,
  authDependencies = {},
}: CreateAppOptions) => {
  const app = new Hono<AppEnv>();
  const resources: AuthResources = {
    configuration: webAuth,
    sessions: createSessionStore(webAuth.session_ttl_seconds, authDependencies.now),
    limiter: createLoginLimiter(authDependencies.now),
    verifyPassword: authDependencies.verifyPassword ?? ((password, hash) => Bun.password.verify(password, hash)),
  };

  app.use('*', requestId());
  app.use('*', requestContextMiddleware);
  app.use('/api/*', createAuthMiddleware(internalApiKey, resources));

  app.onError(errorHandler);
  app.notFound((context) => {
    return failureResponse({
      context,
      error: {
        code: 'NOT_FOUND',
        message: 'Resource not found',
        details: null,
      },
      statusCode: 404,
    });
  });

  app.get('/health', (context) => {
    return successResponse({ context, data: { status: 'ok' } });
  });

  app.get('/health/ready', async (context) => {
    const isReady = await checkDatabaseReadiness(isDatabaseReady, readinessTimeoutMs);

    if (!isReady) {
      return failureResponse({
        context,
        error: {
          code: 'SERVICE_UNAVAILABLE',
          message: 'Service unavailable',
          details: null,
        },
        statusCode: 503,
      });
    }

    return successResponse({ context, data: { status: 'ok' } });
  });

  app.route('/api/v1/auth', createAuthRoutes(resources));
  app.route('/api/v1/notes', createNotesRoutes());
  app.route('/api/v1/junk', createJunkRoutes());
  app.route('/api/v1/finance', createFinanceRoutes());
  app.route('/api/v1/grammar', createGrammarRoutes());
  app.route('/api/v1/reading', createReadingRoutes());
  app.route('/api/v1/writing', createWritingRoutes());

  return app;
};
