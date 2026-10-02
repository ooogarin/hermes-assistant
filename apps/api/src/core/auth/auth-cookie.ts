import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import { jwtLifetimeSeconds, webJwtSchema } from './web-jwt';
import type { Context } from 'hono';
import type { AppEnv } from '../http/app-env';
import type { WebAuthConfiguration } from './auth.types';

const getAuthCookieName = (configuration: WebAuthConfiguration): string =>
  configuration.secure_cookie ? '__Host-hermes_auth' : 'hermes_auth';

export const readAuthCookie = (context: Context<AppEnv>, configuration: WebAuthConfiguration): string | undefined => {
  try {
    const parsed = webJwtSchema.safeParse(getCookie(context, getAuthCookieName(configuration)));

    return parsed.success ? parsed.data : undefined;
  } catch {
    return undefined;
  }
};

export const setAuthCookie = (context: Context<AppEnv>, configuration: WebAuthConfiguration, token: string): void => {
  setCookie(context, getAuthCookieName(configuration), token, {
    httpOnly: true,
    secure: configuration.secure_cookie,
    sameSite: 'Lax',
    path: '/',
    maxAge: jwtLifetimeSeconds,
  });
};

export const clearAuthCookie = (context: Context<AppEnv>, configuration: WebAuthConfiguration): void => {
  deleteCookie(context, getAuthCookieName(configuration), {
    httpOnly: true,
    secure: configuration.secure_cookie,
    sameSite: 'Lax',
    path: '/',
  });
};
