import { z } from 'zod';
import { apiRequest } from '../../lib/api/api-client';

const authStatusSchema = z.strictObject({
  authenticated: z.literal(true),
  expires_at: z.iso.datetime(),
});

export const getAuthStatus = () => apiRequest('/api/v1/auth/status', authStatusSchema);

export const loginWithPassword = (password: string) =>
  apiRequest('/api/v1/auth/login', authStatusSchema, { method: 'POST', body: { password } });

export const logout = () => apiRequest('/api/v1/auth/logout', z.void(), { method: 'POST' });
