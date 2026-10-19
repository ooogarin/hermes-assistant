type ApiErrorCode = 'INVALID_RESPONSE' | 'NETWORK_ERROR' | 'REQUEST_FAILED' | 'RESOURCE_NOT_FOUND' | 'UNAUTHORIZED';

type ApiErrorOptions = {
  code: ApiErrorCode | string;
  message: string;
  requestId?: string;
  retryAfter?: number;
  status: number;
};

export class ApiError extends Error {
  readonly code: ApiErrorCode | string;
  readonly requestId?: string;
  readonly retryAfter?: number;
  readonly status: number;

  constructor({ code, message, requestId, retryAfter, status }: ApiErrorOptions) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.requestId = requestId;
    this.retryAfter = retryAfter;
    this.status = status;
  }
}
