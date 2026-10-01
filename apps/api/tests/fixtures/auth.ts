import type { WebAuthConfiguration } from '../../src/core/auth/auth.types';

export const testWebPassword = 'test-web-password-for-auth';
export const testWebAuth: WebAuthConfiguration = {
  password_hash: Bun.password.hashSync(testWebPassword, { algorithm: 'argon2id', memoryCost: 19_456, timeCost: 2 }),
  origin: 'https://hermes.example.com',
  session_ttl_seconds: 604_800,
  secure_cookie: true,
};
