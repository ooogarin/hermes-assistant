export type ShutdownSignal = 'SIGINT' | 'SIGTERM';

export type LifecycleLogger = {
  info(message: string, properties?: Record<string, unknown>): void;
  warning(message: string, properties?: Record<string, unknown>): void;
  error(message: string, properties?: Record<string, unknown>): void;
};

export type LifecycleServer = {
  stop(closeActiveConnections?: boolean): Promise<void>;
};

export type LifecycleDatabase = {
  close(options?: { timeout?: number }): Promise<void>;
};

export type ProcessLifecycleOptions = {
  server: LifecycleServer;
  database: LifecycleDatabase;
  logger: LifecycleLogger;
  shutdownTimeoutMs: number;
  exit?: (code: number) => void;
};

export type ProcessLifecycle = {
  shutdown(signal: ShutdownSignal): Promise<void>;
};
