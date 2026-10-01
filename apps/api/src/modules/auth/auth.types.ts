import type { z } from 'zod';
import type { AuthResources } from '../../core/auth/auth.types';
import type { loginBodySchema, sessionResponseSchema } from './auth.validator';

// Request contracts
export type LoginRequest = z.infer<typeof loginBodySchema> & { previous_token?: string };
export type SessionRequest = { token?: string };

// Service operations
export type SessionResponse = z.infer<typeof sessionResponseSchema>;
export type LoginResponse = { token: string; data: SessionResponse };
export type AuthService = {
  login: (resources: AuthResources, input: LoginRequest) => Promise<LoginResponse>;
  getSession: (resources: AuthResources, input: SessionRequest) => SessionResponse;
  logout: (resources: AuthResources, input: SessionRequest) => void;
};
