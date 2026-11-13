export type AiConfiguration = {
  base_url: string;
  api_key: string;
  model: string;
  max_tokens: number;
  temperature: number;
  timeout_ms: number;
};

export type AiJsonRequest = {
  system_prompt: string;
  user_prompt: string;
};

export type AiFetch = (url: string, init: RequestInit) => Promise<Response>;

export type AiFailureKind = 'http' | 'network' | 'timeout';

/**
 * Safe diagnostics for a failed provider call. It never carries the API key or
 * the request body, so it may be logged.
 */
export type AiFailure = {
  endpoint: string;
  kind: AiFailureKind;
  status: number | null;
  provider_code: string | null;
  provider_message: string | null;
};

export type AiClientDependencies = {
  fetch?: AiFetch;
  log?: (failure: AiFailure) => void;
};

export type AiClient = {
  generateJson: (request: AiJsonRequest) => Promise<unknown>;
};
