import 'server-only';

import type { RuntimeContext } from '@/core/config/runtime/runtime-context';
import { getServerRuntimeContext } from '@/core/config/runtime/runtime-context';
import { getSharedRuntimeDatabase } from '@/data/client';
import { resolveCloudflareGatewayConfig } from '@/integrations/ai/gateway/cloudflare/cloudflare-gateway';
import type { AiChatPrompt as AdapterPrompt } from '@/integrations/ai/ai-prompt';
import { GeminiAdapterWrapper, getAiAdapter } from '@/integrations/ai/adapter-registry';
import { createVercelGatewayBudgetGuard, vercelGatewayBudgetScope } from '@/integrations/ai/gateway/vercel/vercel-gateway';
import { createAiSemanticCache } from '@/modules/ai/ai-semantic-cache';
import type { AiChatPrompt as ServicePrompt } from '@/modules/ai/ai-types';
import type { AiServiceDeps } from '@/modules/ai/ai-service';
import { createAiBudgetGuard } from '@/modules/ai/ai-security';
import { createAiModelRateLimitStore } from '@/modules/ai/ai-rate-limit';

/**
 * Build the same credential routing, budget, rate-limit, cache, and provider
 * adapter boundary used by dashboard AI operations. Passing these dependencies
 * directly to a query avoids mutating the process-wide dashboard AI singleton.
 */
export async function createServerAiServiceDeps(
  organizationId?: string,
  context?: RuntimeContext,
): Promise<AiServiceDeps> {
  const resolved = context ?? await getServerRuntimeContext();
  const runtime = getSharedRuntimeDatabase(resolved.bootstrap);
  const redis = resolved.config.redis;
  const gateway = resolveCloudflareGatewayConfig({
    accountId: resolved.config.cloudflare.accountId,
    gatewaySlug: resolved.config.cloudflare.aiGatewaySlug,
    ...(resolved.config.cloudflare.aiGatewayCacheTtlSeconds === null
      ? {}
      : { cacheTtlSeconds: resolved.config.cloudflare.aiGatewayCacheTtlSeconds }),
  });
  const vercelBudget = createVercelGatewayBudgetGuard({
    url: redis.url,
    token: redis.token,
    namespace: redis.namespace,
  });

  return {
    db: runtime.db,
    budget: createAiBudgetGuard({ url: redis.url, token: redis.token, namespace: redis.namespace }),
    rateLimit: { store: createAiModelRateLimitStore({ url: redis.url, token: redis.token, namespace: redis.namespace }) },
    cache: createAiSemanticCache(runtime.db, { organizationId: organizationId ?? null }),
    resolveAdapter: (providerId: string) => {
      const inner = providerId === 'gemini' && gateway !== null
        ? new GeminiAdapterWrapper(gateway)
        : getAiAdapter(providerId);
      return {
        execute: async (apiKey: string, modelName: string, prompt: ServicePrompt) => {
          if (providerId === 'vercel-gateway') {
            const verdict = await vercelBudget.check(vercelGatewayBudgetScope(prompt.organizationId ?? null));
            if (!verdict.allowed) throw new Error('Vercel AI Gateway monthly budget exceeded.');
          }
          const adapted: AdapterPrompt = {
            prompt: prompt.prompt,
            ...(prompt.history === undefined ? {} : { history: prompt.history.map((message) => ({ role: message.role, text: message.text })) }),
            ...(prompt.systemInstruction === undefined ? {} : { systemInstruction: prompt.systemInstruction }),
            ...(prompt.temperature === undefined ? {} : { temperature: prompt.temperature }),
            ...(prompt.topP === undefined ? {} : { topP: prompt.topP }),
            ...(prompt.topK === undefined ? {} : { topK: prompt.topK }),
            ...(prompt.maxOutputTokens === undefined ? {} : { maxOutputTokens: prompt.maxOutputTokens }),
            ...(prompt.presencePenalty === undefined ? {} : { presencePenalty: prompt.presencePenalty }),
            ...(prompt.frequencyPenalty === undefined ? {} : { frequencyPenalty: prompt.frequencyPenalty }),
            ...(prompt.seed === undefined ? {} : { seed: prompt.seed }),
            ...(prompt.responseMimeType === undefined ? {} : { responseMimeType: prompt.responseMimeType }),
            ...(prompt.responseSchema === undefined ? {} : { responseSchema: { ...prompt.responseSchema } }),
            ...(prompt.stopSequences === undefined ? {} : { stopSequences: [...prompt.stopSequences] }),
            ...(prompt.thinkingConfig === undefined ? {} : {
              thinkingConfig: {
                ...(prompt.thinkingConfig.thinkingBudget === undefined ? {} : { thinkingBudget: prompt.thinkingConfig.thinkingBudget }),
                ...(prompt.thinkingConfig.includeThoughts === undefined ? {} : { includeThoughts: prompt.thinkingConfig.includeThoughts }),
              },
            }),
            ...(prompt.safetySettings === undefined ? {} : {
              safetySettings: prompt.safetySettings.map((setting) => ({ category: setting.category, threshold: setting.threshold })),
            }),
            ...(prompt.images === undefined ? {} : { images: prompt.images.map((item) => ({ base64: item.base64, mimeType: item.mimeType })) }),
            ...(prompt.audio === undefined ? {} : { audio: prompt.audio.map((item) => ({ base64: item.base64, mimeType: item.mimeType })) }),
            ...(prompt.enableTools === undefined ? {} : { enableTools: prompt.enableTools }),
            ...(prompt.responseModalities === undefined ? {} : { responseModalities: [...prompt.responseModalities] }),
            ...(prompt.speechVoiceName === undefined ? {} : { speechVoiceName: prompt.speechVoiceName }),
            ...(prompt.gatewayOnlyProviders === undefined ? {} : { gatewayOnlyProviders: [...prompt.gatewayOnlyProviders] }),
          };
          const result = await inner.execute(apiKey, modelName, adapted);
          if (providerId === 'vercel-gateway') {
            await vercelBudget.record(vercelGatewayBudgetScope(prompt.organizationId ?? null), result.tokensUsage?.total ?? 0);
          }
          return {
            text: result.text,
            tokensUsage: result.tokensUsage === undefined ? undefined : { ...result.tokensUsage },
            toolCallsExecuted: [...result.toolCallsExecuted],
            toolResults: result.toolResults === undefined ? undefined : { ...result.toolResults },
            inlineData: result.inlineData === undefined ? undefined : result.inlineData.map((item) => ({ ...item })),
          };
        },
      };
    },
  };
}
