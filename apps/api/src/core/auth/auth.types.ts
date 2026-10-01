export type WebAuthConfiguration = {
  password_hash: string;
  origin: string;
  session_ttl_seconds: number;
  secure_cookie: boolean;
};

export type WebSession = {
  issued_at: number;
  expires_at: number;
};

export type IssuedWebSession = {
  token: string;
  session: WebSession;
};

export type WebSessionStore = {
  create: () => IssuedWebSession;
  find: (token: string | undefined) => WebSession | undefined;
  revoke: (token: string | undefined) => void;
};

export type LoginLimiter = {
  admitAttempt: () => number | undefined;
  acquireVerification: () => boolean;
  releaseVerification: () => void;
};

export type AuthResources = {
  configuration: WebAuthConfiguration;
  sessions: WebSessionStore;
  limiter: LoginLimiter;
  verifyPassword: (password: string, hash: string) => Promise<boolean>;
};

export type AuthDependencies = {
  now?: () => number;
  verifyPassword?: AuthResources['verifyPassword'];
};
