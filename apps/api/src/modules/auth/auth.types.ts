import type { z } from 'zod';
import type { authStatusResponseSchema, loginBodySchema } from './auth.validator';

// ==========[ Request contracts ]==========================================================================================
export type LoginRequest = z.infer<typeof loginBodySchema>;
export type JwtRequest = { token?: string };

// ==========[ Service operations ]==========================================================================================
export type AuthStatusResponse = z.infer<typeof authStatusResponseSchema>;
export type LoginResponse = { token: string; data: AuthStatusResponse };
