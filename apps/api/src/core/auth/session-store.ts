import { createHash, randomBytes } from 'node:crypto';
import { z } from 'zod';
import type { WebSession, WebSessionStore } from './auth.types';

export const sessionTokenSchema = z.string().regex(/^[A-Za-z0-9_-]{43}$/);
const maximumSessions = 32;
const digestToken = (token: string): string => createHash('sha256').update(token).digest('hex');

export const createSessionStore = (ttlSeconds: number, now: () => number = Date.now): WebSessionStore => {
  const sessions = new Map<string, WebSession>();

  const removeExpired = (currentTime: number): void => {
    for (const [key, session] of sessions) {
      if (session.expires_at <= currentTime) {
        sessions.delete(key);
      }
    }
  };

  return {
    create: () => {
      const currentTime = now();

      removeExpired(currentTime);

      if (sessions.size >= maximumSessions) {
        const oldestKey = sessions.keys().next().value;

        if (oldestKey !== undefined) {
          sessions.delete(oldestKey);
        }
      }

      const token = randomBytes(32).toString('base64url');
      const session = { issued_at: currentTime, expires_at: currentTime + ttlSeconds * 1_000 };

      sessions.set(digestToken(token), session);

      return { token, session: { ...session } };
    },
    find: (token) => {
      const parsedToken = sessionTokenSchema.safeParse(token);

      if (!parsedToken.success) {
        return undefined;
      }

      const key = digestToken(parsedToken.data);
      const session = sessions.get(key);

      if (session === undefined) {
        return undefined;
      }

      if (session.expires_at <= now()) {
        sessions.delete(key);

        return undefined;
      }

      return { ...session };
    },
    revoke: (token) => {
      const parsedToken = sessionTokenSchema.safeParse(token);

      if (parsedToken.success) {
        sessions.delete(digestToken(parsedToken.data));
      }
    },
  };
};
