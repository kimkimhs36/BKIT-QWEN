import { z } from 'zod';
export type AIRequest = { system: string; input: unknown; maxOutputTokens: number };
export type AIResponse = { data: unknown; inputTokens: number; outputTokens: number };
export interface ProviderAdapter {
  generate(request: AIRequest): Promise<AIResponse>;
}
const output = z.object({
  choices: z.array(z.object({ message: z.object({ content: z.string().nullable() }) })).min(1),
  usage: z.object({
    prompt_tokens: z.number().int().min(0),
    completion_tokens: z.number().int().min(0),
  }),
});
export class OpenAICompatibleAdapter implements ProviderAdapter {
  constructor(private config: { baseURL: string; apiKey: string; model: string }) {}
  async generate(request: AIRequest): Promise<AIResponse> {
    const url = new URL(this.config.baseURL);
    if (url.protocol !== 'https:') throw new Error('Provider requires HTTPS');
    const response = await fetch(
      new URL('chat/completions', url.href.endsWith('/') ? url.href : url.href + '/'),
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.config.model,
          messages: [
            { role: 'system', content: request.system },
            { role: 'user', content: JSON.stringify(request.input) },
          ],
          response_format: { type: 'json_object' },
          max_completion_tokens: request.maxOutputTokens,
        }),
        signal: AbortSignal.timeout(15000),
      },
    );
    if (!response.ok) throw new Error('Provider unavailable');
    const value = output.parse(await response.json());
    const data = JSON.parse(value.choices[0].message.content || '');
    return {
      data,
      inputTokens: value.usage.prompt_tokens,
      outputTokens: value.usage.completion_tokens,
    };
  }
}
