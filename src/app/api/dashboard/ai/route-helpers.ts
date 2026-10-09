import type { AiAdapterResult } from '@/modules/ai/ai-service';
import type { AiChatPrompt as AdapterPrompt } from '@/integrations/ai/ai-prompt';

/** Streaming adapter shape probed by a runtime type guard. */
interface StreamCapableAdapter {
  readonly executeStream?: (
    plainKey: string,
    modelName: string,
    promptData: AdapterPrompt,
    options?: { readonly signal?: AbortSignal | undefined; readonly onChunk?: ((delta: string) => void) | undefined },
  ) => Promise<AiAdapterResult>;
}

/** Return the adapter when it supports streaming, null otherwise. */
export function asStreamCapableAdapter(adapter: { readonly execute: unknown }): StreamCapableAdapter | null {
  const candidate = adapter as Partial<StreamCapableAdapter>;
  return typeof candidate.executeStream === 'function' ? candidate as StreamCapableAdapter : null;
}
