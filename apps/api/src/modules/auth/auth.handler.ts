import { clearAuthCookie, readAuthCookie, setAuthCookie } from '../../core/auth/auth-cookie';
import { getBody } from '../../core/http/request';
import { successResponse } from '../../core/http/response';
import * as authService from './auth.service';
import { loginBodySchema } from './auth.validator';
import type { Context } from 'hono';
import type { AppEnv } from '../../core/http/app-env';
import type { LoginRequest } from './auth.types';

export const login = async (context: Context<AppEnv>) => {
  const resources = context.get('auth_resources');
  const input: LoginRequest = getBody(context, loginBodySchema);

  const result = await authService.login(resources, input);

  setAuthCookie(context, resources.configuration, result.token);

  return successResponse({ context, data: result.data });
};

export const getStatus = async (context: Context<AppEnv>) => {
  const resources = context.get('auth_resources');
  const result = await authService.requireWebJwt(resources, {
    token: readAuthCookie(context, resources.configuration),
  });

  return successResponse({ context, data: result });
};

export const logout = (context: Context<AppEnv>) => {
  const resources = context.get('auth_resources');

  clearAuthCookie(context, resources.configuration);

  return context.body(null, 204);
};
