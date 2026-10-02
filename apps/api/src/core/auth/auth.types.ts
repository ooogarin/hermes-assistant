export type WebAuthConfiguration = {
  password_hash: string;
  origin: string;
  jwt_secret: string;
  secure_cookie: boolean;
};

export type IssuedWebJwt = {
  token: string;
  expires_at: number;
};

export type LoginLimiter = {
  admitAttempt: () => number | undefined;
  acquireVerification: () => boolean;
  releaseVerification: () => void;
};

export type AuthResources = {
  configuration: WebAuthConfiguration;
  limiter: LoginLimiter;
  now: () => number;
  verifyPassword: (password: string, hash: string) => Promise<boolean>;
};

export type AuthDependencies = {
  now?: () => number;
  verifyPassword?: AuthResources['verifyPassword'];
};
