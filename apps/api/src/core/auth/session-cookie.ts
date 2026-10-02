import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import { sessionTokenSchema } from './session-store';
import type { Context } from 'hono';
import type { AppEnv } from '../http/app-env';
import type { WebAuthConfiguration } from './auth.types';

export const getSessionCookieName = (configuration: WebAuthConfiguration): string =>
  configuration.secure_cookie ? '__Host-hermes_session' : 'hermes_session';

export const readSessionCookie = (
  context: Context<AppEnv>,
  configuration: WebAuthConfiguration,
): string | undefined => {
  try {
    const parsed = sessionTokenSchema.safeParse(getCookie(context, getSessionCookieName(configuration)));

    return parsed.success ? parsed.data : undefined;
  } catch {
    return undefined;
  }
};

export const setSessionCookie = (
  context: Context<AppEnv>,
  configuration: WebAuthConfiguration,
  token: string,
): void => {
  setCookie(context, getSessionCookieName(configuration), token, {
    httpOnly: true,
    secure: configuration.secure_cookie,
    sameSite: 'Lax',
    path: '/',
    maxAge: configuration.session_ttl_seconds,
  });
};

export const clearSessionCookie = (context: Context<AppEnv>, configuration: WebAuthConfiguration): void => {
  deleteCookie(context, getSessionCookieName(configuration), {
    httpOnly: true,
    secure: configuration.secure_cookie,
    sameSite: 'Lax',
    path: '/',
  });
};
