export type ApiMeta = Record<string, unknown>;

type SnakeCase<Value extends string> = Value extends `${infer Character}${infer Rest}`
  ? Character extends Lowercase<Character>
    ? `${Character}${SnakeCase<Rest>}`
    : `_${Lowercase<Character>}${SnakeCase<Rest>}`
  : Value;

export type SnakeCaseKeysDeep<Value> = Value extends Date
  ? Value
  : Value extends readonly (infer Item)[]
    ? SnakeCaseKeysDeep<Item>[]
    : Value extends Record<string, unknown>
      ? { [Key in keyof Value as Key extends string ? SnakeCase<Key> : Key]: SnakeCaseKeysDeep<Value[Key]> }
      : Value;

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
  request_id?: string;
};

const toSnakeCase = (value: string): string => {
  return value
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
    .replace(/([a-z\d])([A-Z])/g, '$1_$2')
    .toLowerCase();
};

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  if (value === null || typeof value !== 'object') {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);

  return prototype === Object.prototype || prototype === null;
};

export const toSnakeCaseJson = <Value>(value: Value): SnakeCaseKeysDeep<Value> => {
  if (Array.isArray(value)) {
    return value.map(toSnakeCaseJson) as SnakeCaseKeysDeep<Value>;
  }

  if (isPlainObject(value)) {
    const entries = Object.entries(value).map(([key, item]) => [toSnakeCase(key), toSnakeCaseJson(item)]);

    return Object.fromEntries(entries) as SnakeCaseKeysDeep<Value>;
  }

  return value as SnakeCaseKeysDeep<Value>;
};

export const createSuccessResponse = <T>(data: T, meta?: ApiMeta): ApiSuccess<SnakeCaseKeysDeep<T>> => {
  const responseData = toSnakeCaseJson(data);

  if (meta === undefined) {
    return { success: true, data: responseData };
  }

  return { success: true, data: responseData, meta: toSnakeCaseJson(meta) };
};

export const createFailureResponse = (error: ApiErrorBody, requestId?: string): ApiFailure => {
  const responseError = toSnakeCaseJson(error);

  if (requestId === undefined) {
    return { success: false, error: responseError };
  }

  return { success: false, error: responseError, request_id: requestId };
};
