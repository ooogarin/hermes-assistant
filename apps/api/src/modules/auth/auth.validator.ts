import { z } from 'zod';

export const loginBodySchema = z.strictObject(
  { password: z.string().min(1).max(512) },
  { error: 'Invalid login fields' },
);

export const sessionResponseSchema = z.strictObject({
  authenticated: z.literal(true),
  expires_at: z.iso.datetime(),
});
