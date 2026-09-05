export type ApiMeta = Record<string, unknown>;

export type ApiSuccess<T> = {
  success: true;
  data: T;
  meta?: ApiMeta;
};

export type ApiErrorBody = {
  code: string;
  message: string;
  details: unknown | null;
};

export type ApiFailure = {
  success: false;
  error: ApiErrorBody;
  requestId?: string;
};

export const createSuccessResponse = <T>(data: T, meta?: ApiMeta): ApiSuccess<T> => {
  if (meta === undefined) {
    return { success: true, data };
  }

  return { success: true, data, meta };
};

export const createFailureResponse = (error: ApiErrorBody, requestId?: string): ApiFailure => {
  if (requestId === undefined) {
    return { success: false, error };
  }

  return { success: false, error, requestId };
};
