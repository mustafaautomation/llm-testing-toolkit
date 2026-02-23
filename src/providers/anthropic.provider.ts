import { BaseLLMProvider, CallOptions, LLMResponse } from './base.provider';

interface AnthropicConfig {
  apiKey: string;
  baseUrl?: string;
  defaultModel?: string;
}

interface AnthropicResponse {
  content?: Array<{ type: string; text?: string }>;
  model?: string;
  usage?: { input_tokens?: number; output_tokens?: number };
}

export class AnthropicProvider extends BaseLLMProvider {
  name = 'anthropic';
  private apiKey: string;
  private baseUrl: string;
  private defaultModel: string;

  constructor(config: AnthropicConfig) {
    super();
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.anthropic.com/v1';
    this.defaultModel = config.defaultModel || 'claude-sonnet-4-6';
  }

  async call(prompt: string, options?: CallOptions): Promise<LLMResponse> {
    const model = options?.model || this.defaultModel;
    const timeout = options?.timeout || 30000;

    const body: Record<string, unknown> = {
      model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: options?.maxTokens ?? 1024,
      temperature: options?.temperature ?? 0,
    };

    if (options?.systemPrompt) {
      body.system = options.systemPrompt;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    const { result, latencyMs } = await this.timedCall(async () => {
      const response = await fetch(`${this.baseUrl}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Anthropic API error (${response.status}): ${error}`);
      }

      return response.json() as Promise<AnthropicResponse>;
    });

    const textContent = result.content?.find((c) => c.type === 'text');

    return {
      text: textContent?.text || '',
      model: result.model || model,
      tokens: {
        input: result.usage?.input_tokens || 0,
        output: result.usage?.output_tokens || 0,
      },
      latencyMs,
      raw: result,
    };
  }
}
