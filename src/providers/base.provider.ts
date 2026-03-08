export interface CallOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  timeout?: number;
}

export interface LLMResponse {
  text: string;
  model: string;
  tokens: { input: number; output: number };
  latencyMs: number;
  raw?: unknown;
}

export interface LLMProvider {
  name: string;
  call(prompt: string, options?: CallOptions): Promise<LLMResponse>;
}

export abstract class BaseLLMProvider implements LLMProvider {
  abstract name: string;
  abstract call(prompt: string, options?: CallOptions): Promise<LLMResponse>;

  protected async timedCall<T>(fn: () => Promise<T>): Promise<{ result: T; latencyMs: number }> {
    const start = performance.now();
    const result = await fn();
    const latencyMs = Math.round(performance.now() - start);
    return { result, latencyMs };
  }
}
