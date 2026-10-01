import { Hono } from 'hono';
import { appValidator } from '../../core/http/validator';
import {
  createLoginAttemptMiddleware,
  createLoginVerificationMiddleware,
  loginBodyMiddleware,
} from '../../core/middleware/login-request';
import { createWebOriginMiddleware } from '../../core/middleware/web-origin';
import * as authHandler from './auth.handler';
import { loginBodySchema } from './auth.validator';
import type { AuthResources } from '../../core/auth/auth.types';
import type { AppEnv } from '../../core/http/app-env';

export const createAuthRoutes = (resources: AuthResources) => {
  const route = new Hono<AppEnv>();
  const originMiddleware = createWebOriginMiddleware(resources.configuration.origin);

  route.post(
    '/login',
    originMiddleware,
    createLoginAttemptMiddleware(resources.limiter),
    loginBodyMiddleware,
    appValidator('json', loginBodySchema),
    createLoginVerificationMiddleware(resources.limiter),
    authHandler.login,
  );
  route.get('/session', authHandler.getSession);
  route.post('/logout', originMiddleware, authHandler.logout);

  return route;
};
