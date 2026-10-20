import { randomBytes } from 'node:crypto';
import { sign, verify } from 'hono/jwt';
import { z } from 'zod';
import { AppError } from '../errors/app-error';
import type { AuthResources, IssuedWebJwt } from './auth.types';

export const jwtLifetimeSeconds = 24 * 60 * 60;
export const webJwtSchema = z
  .string()
  .max(2_048)
  .regex(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);

const issuer = 'hermes-api';
const audience = 'hermes-web';
const subject = 'owner';

const claimsSchema = z.strictObject({
  iss: z.literal(issuer),
  aud: z.literal(audience),
  sub: z.literal(subject),
  iat: z.number().int().nonnegative(),
  exp: z.number().int().positive(),
  jti: z.string().regex(/^[A-Za-z0-9_-]{22}$/),
});

export const issueWebJwt = async (secret: string, now: () => number): Promise<IssuedWebJwt> => {
  const issuedAt = Math.floor(now() / 1_000);
  const expiresAt = issuedAt + jwtLifetimeSeconds;
  const claims = {
    iss: issuer,
    aud: audience,
    sub: subject,
    iat: issuedAt,
    exp: expiresAt,
    jti: randomBytes(16).toString('base64url'),
  };

  const token = await sign(claims, secret, 'HS256');

  return { token, expires_at: expiresAt * 1_000 };
};

export const verifyWebJwt = async (
  token: string | undefined,
  secret: string,
  now: () => number,
): Promise<{ expires_at: number } | undefined> => {
  const parsedToken = webJwtSchema.safeParse(token);

  if (!parsedToken.success) {
    return undefined;
  }

  try {
    const payload = await verify(parsedToken.data, secret, {
      alg: 'HS256',
      iss: issuer,
      aud: audience,
      exp: false,
      iat: false,
    });
    const parsedClaims = claimsSchema.safeParse(payload);

    if (!parsedClaims.success) {
      return undefined;
    }

    const { iat, exp } = parsedClaims.data;
    const currentTime = Math.floor(now() / 1_000);
    const hasInvalidLifetime = exp - iat !== jwtLifetimeSeconds;
    const isOutsideLifetime = iat > currentTime || exp <= currentTime;

    if (hasInvalidLifetime || isOutsideLifetime) {
      return undefined;
    }

    return { expires_at: exp * 1_000 };
  } catch {
    return undefined;
  }
};

/**
 * Verifies the browser token and refuses the request when it is missing or no
 * longer valid. The middleware and the auth module both use it, so the rule
 * lives here rather than in a module.
 */
export const requireVerifiedWebJwt = async (
  resources: AuthResources,
  token: string | undefined,
): Promise<{ expires_at: number }> => {
  const verified = await verifyWebJwt(token, resources.configuration.jwt_secret, resources.now);

  if (verified === undefined) {
    throw new AppError({ code: 'UNAUTHENTICATED', message: 'Authentication required', statusCode: 401 });
  }

  return verified;
};
