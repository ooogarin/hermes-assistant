import { expect, test } from 'bun:test';
import { createLoginLimiter } from '../src/core/auth/login-limiter';
import { createSessionStore } from '../src/core/auth/session-store';

test('issues independent cryptographic tokens and expires them at the exact boundary', () => {
  let now = 1_000;
  const store = createSessionStore(300, () => now);
  const first = store.create();
  const second = store.create();
  expect(first.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
  expect(second.token).not.toBe(first.token);
  expect(store.find(first.token)).toEqual({ issued_at: 1_000, expires_at: 301_000 });

  first.session.expires_at = Infinity;
  const found = store.find(first.token);
  if (found !== undefined) found.expires_at = Infinity;
  now = 300_999;
  expect(store.find(first.token)).toBeDefined();
  now = 301_000;
  expect(store.find(first.token)).toBeUndefined();
  now = 1_000;
  expect(store.find(first.token)).toBeUndefined();
});

test('revokes tokens and rejects missing, malformed, and unknown tokens', () => {
  const store = createSessionStore(300);
  const { token } = store.create();
  for (const raw of [undefined, '', '%invalid', 'x'.repeat(42), 'x'.repeat(44), 'x'.repeat(43)]) {
    expect(store.find(raw)).toBeUndefined();
    expect(() => store.revoke(raw)).not.toThrow();
  }
  store.revoke(token);
  expect(store.find(token)).toBeUndefined();
});

test('bounds sessions at 32 by evicting the oldest while preserving newer sessions', () => {
  const store = createSessionStore(300);
  const first = store.create();
  const others = Array.from({ length: 31 }, () => store.create());
  const newest = store.create();
  expect(store.find(first.token)).toBeUndefined();
  for (const session of others) expect(store.find(session.token)).toBeDefined();
  expect(store.find(newest.token)).toBeDefined();
});

test('cleans up expired sessions before evicting an active session', () => {
  let now = 0;
  const store = createSessionStore(300, () => now);
  store.create();
  now = 1_000;
  const active = Array.from({ length: 31 }, () => store.create());
  now = 300_000;
  store.create();
  for (const session of active) expect(store.find(session.token)).toBeDefined();
});

test('session state belongs to one store and is lost on restart', () => {
  const token = createSessionStore(300).create().token;
  expect(createSessionStore(300).find(token)).toBeUndefined();
});

test('limits attempts before async work and resets only at the window boundary', () => {
  let now = 0;
  const limiter = createLoginLimiter(() => now);
  for (let index = 0; index < 10; index += 1) expect(limiter.admitAttempt()).toBeUndefined();
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
