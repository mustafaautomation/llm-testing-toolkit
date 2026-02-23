import { BaseLLMProvider, CallOptions, LLMResponse } from './base.provider';

interface OpenAIConfig {
  apiKey: string;
  baseUrl?: string;
  defaultModel?: string;
}

interface OpenAIResponse {
  choices?: Array<{ message?: { content?: string } }>;
  model?: string;
  usage?: { prompt_tokens?: number; completion_tokens?: number };
}

export class OpenAIProvider extends BaseLLMProvider {
  name = 'openai';
  private apiKey: string;
  private baseUrl: string;
  private defaultModel: string;

  constructor(config: OpenAIConfig) {
    super();
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.openai.com/v1';
    this.defaultModel = config.defaultModel || 'gpt-4o-mini';
  }

  async call(prompt: string, options?: CallOptions): Promise<LLMResponse> {
    const model = options?.model || this.defaultModel;
    const timeout = options?.timeout || 30000;

    const body = {
      model,
      messages: [
        ...(options?.systemPrompt ? [{ role: 'system', content: options.systemPrompt }] : []),
        { role: 'user', content: prompt },
      ],
      temperature: options?.temperature ?? 0,
      max_tokens: options?.maxTokens ?? 1024,
    };

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    const { result, latencyMs } = await this.timedCall(async () => {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`OpenAI API error (${response.status}): ${error}`);
      }

      return response.json() as Promise<OpenAIResponse>;
    });

    return {
      text: result.choices?.[0]?.message?.content || '',
      model: result.model || model,
      tokens: {
        input: result.usage?.prompt_tokens || 0,
        output: result.usage?.completion_tokens || 0,
      },
      latencyMs,
      raw: result,
    };
  }
}
