import { AppError } from '../../core/errors/app-error';
import type { AuthResources, WebSession } from '../../core/auth/auth.types';
import type { LoginRequest, LoginResponse, SessionRequest, SessionResponse } from './auth.types';

const toSessionResponse = (session: WebSession): SessionResponse => ({
  authenticated: true,
  expires_at: new Date(session.expires_at).toISOString(),
});

export const login = async (resources: AuthResources, input: LoginRequest): Promise<LoginResponse> => {
  let matches: boolean;
  try {
    matches = await resources.verifyPassword(input.password, resources.configuration.password_hash);
  } catch {
    throw new AppError({ code: 'SERVICE_UNAVAILABLE', message: 'Service unavailable', statusCode: 503 });
  }

  if (!matches) {
    throw new AppError({ code: 'INVALID_CREDENTIALS', message: 'Invalid credentials', statusCode: 401 });
  }

  const issued = resources.sessions.create();
  resources.sessions.revoke(input.previous_token);
  return { token: issued.token, data: toSessionResponse(issued.session) };
};

export const requireSession = (resources: AuthResources, input: SessionRequest): WebSession => {
  const session = resources.sessions.find(input.token);
  if (session === undefined) {
    throw new AppError({ code: 'UNAUTHENTICATED', message: 'Authentication required', statusCode: 401 });
  }

  return session;
};

export const getSession = (resources: AuthResources, input: SessionRequest): SessionResponse =>
  toSessionResponse(requireSession(resources, input));

export const logout = (resources: AuthResources, input: SessionRequest): void => {
  resources.sessions.revoke(input.token);
};
