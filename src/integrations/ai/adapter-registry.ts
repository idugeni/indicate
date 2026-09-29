import 'server-only';

import type { AiAdapterResponse, AiChatPrompt, AiProviderAdapter } from '@/integrations/ai/ai-prompt';
import { executeGeminiAdapter } from '@/integrations/ai/gemini-adapter';
import { OpenAiCompatibleAdapter } from '@/integrations/ai/openai-compatible-adapter';

class GeminiAdapterWrapper implements AiProviderAdapter {
  readonly providerId = 'gemini';

  execute(plainKey: string, modelName: string, promptData: AiChatPrompt): Promise<AiAdapterResponse> {
    return executeGeminiAdapter(plainKey, modelName, promptData);
  }
}

const adapters: ReadonlyMap<string, AiProviderAdapter> = new Map<string, AiProviderAdapter>([
  ['gemini', new GeminiAdapterWrapper()],
  ['openai-compatible', new OpenAiCompatibleAdapter()],
]);

/**
 * Resolves the adapter for one router provider id.
 *
 * @param providerId - Router provider identifier, matched case-insensitively.
 * @returns Adapter bound to no key; the key arrives per `execute` call.
 * @throws {Error} When no adapter is registered for the identifier.
 */
export function getAiAdapter(providerId: string): AiProviderAdapter {
  const adapter = adapters.get(providerId.toLowerCase());
  if (adapter === undefined) throw new Error(`Unknown AI provider: ${providerId}.`);
  return adapter;
}
