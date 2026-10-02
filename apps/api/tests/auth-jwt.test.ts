import { expect, test } from 'bun:test';
import { decode, sign } from 'hono/jwt';
import { createLoginLimiter } from '../src/core/auth/login-limiter';
import { issueWebJwt, verifyWebJwt } from '../src/core/auth/web-jwt';
import { testWebAuth } from './fixtures/auth';

const initialTime = Date.parse('2026-10-01T12:00:00.000Z');
const secret = testWebAuth.jwt_secret;

test('issues distinct signed JWTs that expire exactly after 24 hours', async () => {
  let now = initialTime;
  const first = await issueWebJwt(secret, () => now);
  const second = await issueWebJwt(secret, () => now);

  expect(first.token).not.toBe(second.token);
  expect(first.expires_at).toBe(initialTime + 86_400_000);
  expect(await verifyWebJwt(first.token, secret, () => now)).toEqual({ expires_at: first.expires_at });

  now = first.expires_at - 1_000;
  expect(await verifyWebJwt(first.token, secret, () => now)).toBeDefined();

  now = first.expires_at;
  expect(await verifyWebJwt(first.token, secret, () => now)).toBeUndefined();
});

test('rejects tampered, foreign, malformed, and incorrectly scoped JWTs', async () => {
  const issued = await issueWebJwt(secret, () => initialTime);
  const claims = decode(issued.token).payload;
  const wrongAudience = await sign({ ...claims, aud: 'another-client' }, secret, 'HS256');
  const missingExpiry = await sign({ ...claims, exp: undefined }, secret, 'HS256');
  const wrongAlgorithm = await sign(claims, secret, 'HS384');
  const tooLong = await sign({ ...claims, exp: initialTime / 1_000 + 86_401 }, secret, 'HS256');
  const tampered = issued.token.replace(/\.[^.]+$/, '.invalid-signature');

  for (const token of [undefined, '', 'not-a-jwt', wrongAudience, missingExpiry, wrongAlgorithm, tooLong, tampered]) {
    expect(await verifyWebJwt(token, secret, () => initialTime)).toBeUndefined();
  }

  expect(await verifyWebJwt(issued.token, 'f'.repeat(64), () => initialTime)).toBeUndefined();
  expect(await verifyWebJwt(issued.token, secret, () => initialTime - 1_000)).toBeUndefined();
});

test('limits attempts before async work and resets only at the window boundary', () => {
  let now = 0;
  const limiter = createLoginLimiter(() => now);

  for (let index = 0; index < 10; index += 1) {
    expect(limiter.admitAttempt()).toBeUndefined();
  }

  expect(limiter.admitAttempt()).toBe(60);
  now = 59_001;
  expect(limiter.admitAttempt()).toBe(1);
  now = 60_000;
  expect(limiter.admitAttempt()).toBeUndefined();
});

test('allows a single password verification and independent limiters per app', () => {
  const limiter = createLoginLimiter();

  expect(limiter.acquireVerification()).toBe(true);
  expect(limiter.acquireVerification()).toBe(false);
  expect(createLoginLimiter().acquireVerification()).toBe(true);
  limiter.releaseVerification();
  expect(limiter.acquireVerification()).toBe(true);
});
