import type { RequestIdVariables } from 'hono/request-id';
import type { AuthResources } from '../auth/auth.types';

export type AppEnv = {
  Variables: RequestIdVariables & { auth_resources: AuthResources; auth_mode: 'agent' | 'browser' };
};
