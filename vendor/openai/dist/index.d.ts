export interface OpenAIClientOptions {
  apiKey?: string;
  baseURL?: string;
  fetch?: typeof fetch;
}

export interface ModerationCreateParams {
  model: string;
  input: string | string[];
}

export interface ModerationCategory {
  [key: string]: boolean;
}

export interface ModerationResult {
  flagged: boolean;
  categories?: ModerationCategory;
  [key: string]: unknown;
}

export interface ModerationCreateResponse {
  results: ModerationResult[];
  [key: string]: unknown;
}

declare class OpenAIClient {
  constructor(options?: OpenAIClientOptions);
  readonly moderations: {
    create(params: ModerationCreateParams): Promise<ModerationCreateResponse>;
  };
}

export default OpenAIClient;
export { OpenAIClient };
