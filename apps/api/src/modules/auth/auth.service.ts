import { issueWebJwt, verifyWebJwt } from '../../core/auth/web-jwt';
import { AppError } from '../../core/errors/app-error';
import type { AuthResources, IssuedWebJwt } from '../../core/auth/auth.types';
import type { AuthStatusResponse, JwtRequest, LoginRequest, LoginResponse } from './auth.types';

const toAuthStatusResponse = (expiresAt: number): AuthStatusResponse => ({
  authenticated: true,
  expires_at: new Date(expiresAt).toISOString(),
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

  let issued: IssuedWebJwt;

  try {
    issued = await issueWebJwt(resources.configuration.jwt_secret, resources.now);
  } catch {
    throw new AppError({ code: 'SERVICE_UNAVAILABLE', message: 'Service unavailable', statusCode: 503 });
  }

  return { token: issued.token, data: toAuthStatusResponse(issued.expires_at) };
};

export const requireWebJwt = async (resources: AuthResources, input: JwtRequest): Promise<AuthStatusResponse> => {
  const verified = await verifyWebJwt(input.token, resources.configuration.jwt_secret, resources.now);

  if (verified === undefined) {
    throw new AppError({ code: 'UNAUTHENTICATED', message: 'Authentication required', statusCode: 401 });
  }

  return toAuthStatusResponse(verified.expires_at);
};
