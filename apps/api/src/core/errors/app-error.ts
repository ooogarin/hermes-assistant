export type AppErrorOptions = {
  code: string;
  statusCode: AppErrorStatusCode;
  message: string;
  details?: unknown;
  exposeDetails?: boolean;
  cause?: unknown;
};

export type AppErrorStatusCode = 400 | 401 | 403 | 404 | 409 | 500 | 503;

export class AppError extends Error {
  readonly code: string;
  readonly statusCode: AppErrorStatusCode;
  readonly details: unknown | null;
  readonly exposeDetails: boolean;

  constructor({ code, statusCode, message, details = null, exposeDetails = false, cause }: AppErrorOptions) {
    super(message, { cause });

    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.exposeDetails = exposeDetails;
  }
}
