import { clearSessionCookie, readSessionCookie, setSessionCookie } from '../../core/auth/session-cookie';
import { getBody } from '../../core/http/request';
import { successResponse } from '../../core/http/response';
import * as authService from './auth.service';
import { loginBodySchema } from './auth.validator';
import type { Context } from 'hono';
import type { AppEnv } from '../../core/http/app-env';
import type { LoginRequest } from './auth.types';

export const login = async (context: Context<AppEnv>) => {
  const resources = context.get('auth_resources');
  const input: LoginRequest = {
    ...getBody(context, loginBodySchema),
    previous_token: readSessionCookie(context, resources.configuration),
  };

  const result = await authService.login(resources, input);

  setSessionCookie(context, resources.configuration, result.token);

  return successResponse({ context, data: result.data });
};

export const getSession = (context: Context<AppEnv>) => {
  const resources = context.get('auth_resources');
  const result = authService.getSession(resources, { token: readSessionCookie(context, resources.configuration) });

  return successResponse({ context, data: result });
};

export const logout = (context: Context<AppEnv>) => {
  const resources = context.get('auth_resources');

  authService.logout(resources, { token: readSessionCookie(context, resources.configuration) });
  clearSessionCookie(context, resources.configuration);

  return context.body(null, 204);
};
