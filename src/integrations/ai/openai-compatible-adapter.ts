import 'server-only';

import type { AiAdapterResponse, AiChatPrompt, AiProviderAdapter } from '@/integrations/ai/ai-prompt';

/**
 * Calls any OpenAI-compatible chat-completions endpoint with a router key.
 *
 * @remarks No key or URL is hardcoded; both arrive per call from the router database.
 */
export class OpenAiCompatibleAdapter implements AiProviderAdapter {
  readonly providerId: string;
  private readonly baseUrl: string;
  private readonly extraHeaders: Readonly<Record<string, string>>;

  constructor(providerId = 'openai-compatible', baseUrl = 'https://api.openai.com/v1', extraHeaders: Readonly<Record<string, string>> = {}) {
    this.providerId = providerId;
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.extraHeaders = extraHeaders;
  }

  /**
   * Sends chat messages to the configured base URL.
   *
   * @param plainKey - Decrypted API key from the router database, never from environment.
   * @param modelName - Model identifier owned by the router model config.
   * @param promptData - Prompt, history, and generation controls.
   * @returns Model text and token usage; tool calls are never executed by this stub.
   * @throws {Error} When the provider rejects the request; the message never carries key material.
   */
  async execute(plainKey: string, modelName: string, promptData: AiChatPrompt): Promise<AiAdapterResponse> {
    if (plainKey.length === 0) throw new Error('OpenAI-compatible adapter requires a router-provided key.');
    const messages: Array<{ role: string; content: unknown }> = [];
    if (promptData.systemInstruction !== undefined) {
      messages.push({ role: 'system', content: promptData.systemInstruction });
    }
    for (const message of (promptData.history ?? []).slice(-6)) {
      messages.push({ role: message.role === 'model' ? 'assistant' : message.role, content: message.text });
    }
    const images = promptData.images ?? [];
    if (images.length > 0) {
      const content: Array<Record<string, unknown>> = [{ type: 'text', text: promptData.prompt }];
      for (const image of images.slice(0, 4)) {
        content.push({ type: 'image_url', image_url: { url: `data:${image.mimeType};base64,${image.base64}` } });
      }
      messages.push({ role: 'user', content });
    } else {
      messages.push({ role: 'user', content: promptData.prompt });
    }
    let res: Response;
    try {
      res = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${plainKey}`, ...this.extraHeaders },
        body: JSON.stringify({
          model: modelName,
          messages,
          temperature: promptData.temperature ?? 1.0,
          max_tokens: promptData.maxOutputTokens ?? 32768,
          top_p: promptData.topP,
          presence_penalty: promptData.presencePenalty,
          frequency_penalty: promptData.frequencyPenalty,
          seed: promptData.seed,
          ...(promptData.responseMimeType === 'application/json' ? { response_format: { type: 'json_object' } } : {}),
        }),
      });
    } catch {
      throw new Error('OpenAI-compatible request failed.');
    }
    if (!res.ok) throw new Error(`OpenAI-compatible request rejected with status ${res.status}.`);
    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
    };
    const usage = data.usage;
    if (usage === undefined) return { text: data.choices?.[0]?.message?.content ?? '', toolCallsExecuted: [] };
    return {
      text: data.choices?.[0]?.message?.content ?? '',
      toolCallsExecuted: [],
      tokensUsage: {
        prompt: usage.prompt_tokens ?? 0,
        completion: usage.completion_tokens ?? 0,
        total: usage.total_tokens ?? 0,
      },
    };
  }
}
