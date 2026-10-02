import type { LoginLimiter } from './auth.types';

const maximumAttempts = 10;
const windowMs = 60_000;

export const createLoginLimiter = (now: () => number = Date.now): LoginLimiter => {
  let windowStartedAt = now();
  let attempts = 0;
  let verifying = false;

  return {
    admitAttempt: () => {
      const currentTime = now();

      if (currentTime >= windowStartedAt + windowMs) {
        windowStartedAt = currentTime;
        attempts = 0;
      }

      if (attempts >= maximumAttempts) {
        return Math.max(1, Math.ceil((windowStartedAt + windowMs - currentTime) / 1_000));
      }

      attempts += 1;

      return undefined;
    },
    acquireVerification: () => {
      if (verifying) {
        return false;
      }

      verifying = true;

      return true;
    },
    releaseVerification: () => {
      verifying = false;
    },
  };
};
