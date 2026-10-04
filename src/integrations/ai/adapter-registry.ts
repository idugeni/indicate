import 'server-only';

import type { AiAdapterResponse, AiChatPrompt, AiProviderAdapter } from '@/integrations/ai/ai-prompt';
import type { CloudflareGatewayConfig } from '@/integrations/ai/gateway/cloudflare/cloudflare-gateway';
import { executeGeminiAdapter } from '@/integrations/ai/gemini-adapter';
import { OpenAiCompatibleAdapter } from '@/integrations/ai/openai-compatible-adapter';
import { OPENROUTER_BASE_URL } from '@/integrations/ai/gateway/openrouter/openrouter-gateway';
import { VERCEL_GATEWAY_BASE_URL } from '@/integrations/ai/gateway/vercel/vercel-gateway';

/**
 * Gemini adapter bound to an optional Cloudflare AI Gateway route.
 *
 * @remarks The default instance stays direct; the dashboard route builds a
 * gateway-bound instance when bootstrap configures a gateway slug.
 */
export class GeminiAdapterWrapper implements AiProviderAdapter {
  readonly providerId = 'gemini';

  constructor(private readonly gateway: CloudflareGatewayConfig | null = null) {}

  execute(plainKey: string, modelName: string, promptData: AiChatPrompt): Promise<AiAdapterResponse> {
    return executeGeminiAdapter(plainKey, modelName, promptData, undefined, this.gateway);
  }
}

const adapters: ReadonlyMap<string, AiProviderAdapter> = new Map<string, AiProviderAdapter>([
  ['gemini', new GeminiAdapterWrapper()],
  ['openai-compatible', new OpenAiCompatibleAdapter()],
  ['openrouter', new OpenAiCompatibleAdapter('openrouter', OPENROUTER_BASE_URL, { 'X-Title': 'Indicate' })],
  ['vercel-gateway', new OpenAiCompatibleAdapter('vercel-gateway', VERCEL_GATEWAY_BASE_URL)],
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
