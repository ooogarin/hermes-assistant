export type ApiErrorCode =
  | 'INVALID_RESPONSE'
  | 'NETWORK_ERROR'
  | 'REQUEST_FAILED'
  | 'RESOURCE_NOT_FOUND'
  | 'UNAUTHORIZED';

type ApiErrorOptions = {
  code: ApiErrorCode | string;
  message: string;
  requestId?: string;
  status: number;
};

export class ApiError extends Error {
  readonly code: ApiErrorCode | string;
  readonly requestId?: string;
  readonly status: number;

  constructor({ code, message, requestId, status }: ApiErrorOptions) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.requestId = requestId;
    this.status = status;
  }
}
