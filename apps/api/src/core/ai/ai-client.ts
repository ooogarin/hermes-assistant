import { z } from 'zod';
import { AppError } from '../errors/app-error';
import { appLogger } from '../logging/logger';
import type { AiClient, AiClientDependencies, AiConfiguration, AiFailure, AiFetch, AiJsonRequest } from './ai.types';

const providerResponseSchema = z.object({
  choices: z.array(z.object({ message: z.object({ content: z.string() }) })).min(1),
});

const maximumContentLength = 200_000;
const maximumProviderMessageLength = 300;
const secretPattern = /\b(?:sk|pk|api)[-_][A-Za-z0-9_*.-]{6,}\b/gi;

const aiUnavailableError = (): AppError =>
  new AppError({ code: 'AI_UNAVAILABLE', statusCode: 503, message: 'AI service is unavailable.' });

const aiAuthFailedError = (): AppError =>
  new AppError({ code: 'AI_AUTH_FAILED', statusCode: 503, message: 'AI credentials were rejected.' });

const aiRateLimitedError = (): AppError =>
  new AppError({ code: 'AI_RATE_LIMITED', statusCode: 503, message: 'AI provider rate limit reached.' });

const aiConfigurationError = (): AppError =>
  new AppError({
    code: 'AI_CONFIGURATION_ERROR',
    statusCode: 503,
    message: 'AI provider rejected the request configuration.',
  });

const aiInvalidResponseError = (): AppError =>
  new AppError({ code: 'AI_INVALID_RESPONSE', statusCode: 503, message: 'AI response could not be used.' });

const providerErrorForStatus = (status: number): AppError => {
  if (status === 401 || status === 403) {
    return aiAuthFailedError();
  }

  if (status === 429) {
    return aiRateLimitedError();
  }

  if (status === 400 || status === 404 || status === 422) {
    return aiConfigurationError();
  }

  return aiUnavailableError();
};

const logFailureToApp = (failure: AiFailure): void => {
  appLogger.warning(
    'AI request failed: kind={kind} status={status} provider_code={providerCode} provider_message={providerMessage} [endpoint={endpoint}]',
    {
      endpoint: failure.endpoint,
      kind: failure.kind,
      providerCode: failure.provider_code ?? 'none',
      providerMessage: failure.provider_message ?? 'none',
      status: failure.status ?? 'none',
    },
  );
};

const sanitizeProviderMessage = (value: string): string =>
  value.replace(secretPattern, '[REDACTED]').replace(/\s+/g, ' ').trim().slice(0, maximumProviderMessageLength);

const readProviderError = async (response: Response): Promise<{ code: string | null; message: string | null }> => {
  let text: string;

  try {
    text = (await response.text()).slice(0, 2_000);
  } catch {
    return { code: null, message: null };
  }

  try {
    const payload: unknown = JSON.parse(text);

    if (typeof payload !== 'object' || payload === null || !('error' in payload)) {
      return { code: null, message: null };
    }

    const error = (payload as { error: unknown }).error;

    if (typeof error !== 'object' || error === null) {
      return { code: null, message: null };
    }

    const { code, message, type } = error as { code?: unknown; message?: unknown; type?: unknown };
    const providerCode = typeof code === 'string' ? code : typeof type === 'string' ? type : null;

    return {
      code: providerCode,
      message: typeof message === 'string' ? sanitizeProviderMessage(message) : null,
    };
  } catch {
    return { code: null, message: sanitizeProviderMessage(text) };
  }
};

const readFailureKind = (error: unknown): AiFailure['kind'] => {
  if (error instanceof DOMException) {
    return error.name === 'TimeoutError' || error.name === 'AbortError' ? 'timeout' : 'network';
  }

  return 'network';
};

const stripJsonFence = (content: string): string => {
  const trimmed = content.trim();
  const match = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(trimmed);
  const fencedContent = match?.[1];

  return fencedContent === undefined ? trimmed : fencedContent.trim();
};

const parseJsonContent = (content: string): unknown => {
  if (content.length > maximumContentLength) {
    throw aiInvalidResponseError();
  }

  try {
    return JSON.parse(stripJsonFence(content));
  } catch {
    throw aiInvalidResponseError();
  }
};

export const createAiClient = (configuration: AiConfiguration, dependencies: AiClientDependencies = {}): AiClient => {
  const endpoint = `${configuration.base_url.replace(/\/+$/, '')}/chat/completions`;
  const fetchImplementation: AiFetch = dependencies.fetch ?? ((url, init) => fetch(url, init));
  const logFailure = dependencies.log ?? logFailureToApp;

  return {
    generateJson: async (request: AiJsonRequest): Promise<unknown> => {
      let response: Response;

      try {
        response = await fetchImplementation(endpoint, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${configuration.api_key}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: configuration.model,
            messages: [
              { role: 'system', content: request.system_prompt },
              { role: 'user', content: request.user_prompt },
            ],
            response_format: { type: 'json_object' },
            temperature: configuration.temperature,
            max_tokens: configuration.max_tokens,
            stream: false,
          }),
          signal: AbortSignal.timeout(configuration.timeout_ms),
        });
      } catch (error) {
        logFailure({
          endpoint,
          kind: readFailureKind(error),
          provider_code: null,
          provider_message: null,
          status: null,
        });

        throw aiUnavailableError();
      }

      if (!response.ok) {
        const providerError = await readProviderError(response);
        const isAuthFailure = response.status === 401 || response.status === 403;

        logFailure({
          endpoint,
          kind: 'http',
          provider_code: providerError.code,
          // Providers may echo a masked key on authentication failures.
          provider_message: isAuthFailure ? null : providerError.message,
          status: response.status,
        });

        throw providerErrorForStatus(response.status);
      }

      let payload: unknown;

      try {
        payload = await response.json();
      } catch {
        throw aiInvalidResponseError();
      }

      const parsed = providerResponseSchema.safeParse(payload);

      if (!parsed.success) {
        throw aiInvalidResponseError();
      }

      const content = parsed.data.choices[0]?.message.content;

      if (content === undefined) {
        throw aiInvalidResponseError();
      }

      return parseJsonContent(content);
    },
  };
};
