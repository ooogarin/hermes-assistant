import { z } from 'zod';
import { ApiError } from './api-error';

const errorEnvelopeSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().nullable().optional(),
  }),
  request_id: z.string().optional(),
});

const successEnvelopeSchema = z.object({
  success: z.literal(true),
  data: z.unknown(),
});

type ApiRequestOptions = Omit<RequestInit, 'body'> & {
  body?: unknown;
};

const parseJson = async (response: Response): Promise<unknown> => {
  try {
    return await response.json();
  } catch {
    throw new ApiError({
      code: 'INVALID_RESPONSE',
      message: 'Respons layanan tidak dapat dibaca.',
      status: response.status,
    });
  }
};

const createHeaders = (options: ApiRequestOptions): Headers => {
  const headers = new Headers(options.headers);
  headers.set('Accept', 'application/json');

  if (options.body !== undefined) {
    headers.set('Content-Type', 'application/json');
  }

  return headers;
};

export const apiRequest = async <Schema extends z.ZodType>(
  path: string,
  schema: Schema,
  options: ApiRequestOptions = {},
): Promise<z.output<Schema>> => {
  if (!path.startsWith('/api/v1/')) {
    throw new Error('API requests must use a relative /api/v1/ path.');
  }

  let response: Response;
  try {
    response = await fetch(path, {
      ...options,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      headers: createHeaders(options),
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw error;
    }

    throw new ApiError({
      code: 'NETWORK_ERROR',
      message: 'Layanan belum dapat dihubungi. Periksa koneksi lalu coba lagi.',
      status: 0,
    });
  }

  if (response.status === 204) {
    const parsedEmptyData = schema.safeParse(undefined);
    if (parsedEmptyData.success) {
      return parsedEmptyData.data;
    }

    throw new ApiError({
      code: 'INVALID_RESPONSE',
      message: 'Respons layanan tidak berisi data yang diharapkan.',
      status: response.status,
    });
  }

  const payload = await parseJson(response);

  if (!response.ok) {
    const parsedError = errorEnvelopeSchema.safeParse(payload);
    if (parsedError.success) {
      throw new ApiError({
        code: parsedError.data.error.code,
        message: parsedError.data.error.message,
        requestId: parsedError.data.request_id,
        status: response.status,
      });
    }

    throw new ApiError({
      code: 'REQUEST_FAILED',
      message: 'Permintaan belum dapat diproses. Coba lagi.',
      status: response.status,
    });
  }

  const parsedSuccess = successEnvelopeSchema.safeParse(payload);

  if (!parsedSuccess.success) {
    throw new ApiError({
      code: 'INVALID_RESPONSE',
      message: 'Respons layanan tidak sesuai dengan format yang diharapkan.',
      status: response.status,
    });
  }

  const parsedData = schema.safeParse(parsedSuccess.data.data);
  if (!parsedData.success) {
    throw new ApiError({
      code: 'INVALID_RESPONSE',
      message: 'Data layanan tidak sesuai dengan format yang diharapkan.',
      status: response.status,
    });
  }

  return parsedData.data;
};
