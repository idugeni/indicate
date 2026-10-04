import { NextResponse } from 'next/server';
import { and, eq, sql } from 'drizzle-orm';

import { getServerRuntimeContext } from '@/core/config/runtime/runtime-context';
import { resolveRequestId } from '@/core/observability/request-id';
import { withApiAccess } from '@/core/observability/api-access';
import { getSharedRuntimeDatabase } from '@/data/client';
import { aiCredentials, aiModels, aiProviders } from '@/data/schema/ai';
import { runtimeConfigAuditLogs } from '@/data/schema/runtime-config';
import { authorized } from '@/app/api/internal/maintenance/view-flush/route';
import { diffCatalogModels, normalizeListingId } from '@/modules/ai/ai-model-sweep';
import { OPENROUTER_BASE_URL } from '@/integrations/ai/gateway/openrouter/openrouter-gateway';
import { VERCEL_GATEWAY_BASE_URL } from '@/integrations/ai/gateway/vercel/vercel-gateway';

const FETCH_TIMEOUT_MS = 15000;

async function fetchJson(url: string, headers: Record<string, string>): Promise<unknown> {
  const response = await fetch(url, { headers, signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
  if (!response.ok) throw new Error(`listing HTTP ${response.status}`);
  return (await response.json()) as unknown;
}

function listingIds(payload: unknown): Set<string> {
  const data = (payload as { readonly data?: readonly unknown[] }).data;
  const ids = new Set<string>();
  if (!Array.isArray(data)) return ids;
  for (const entry of data) {
    const id = normalizeListingId(entry);
    if (id !== null) ids.add(id);
  }
  return ids;
}

async function handleGET(request: Request) {
  const requestId = resolveRequestId(request);
  const context = await getServerRuntimeContext();
  if (!authorized(request, context.config.security.cronSecret)) {
    return new NextResponse('Not Found', { status: 404, headers: { 'Cache-Control': 'private, no-store', 'X-Robots-Tag': 'noindex, nofollow' } });
  }
  const runtime = getSharedRuntimeDatabase(context.bootstrap);
  const now = new Date();
  const deactivated: string[] = [];
  const skipped: string[] = [];

  const providers = await runtime.db
    .select({ id: aiProviders.id, isActive: aiProviders.isActive, supportsChat: aiProviders.supportsChat })
    .from(aiProviders)
    .where(and(eq(aiProviders.isActive, true), eq(aiProviders.supportsChat, true)))
    .limit(50);
  const models = await runtime.db
    .select({ id: aiModels.id, providerId: aiModels.providerId, modelName: aiModels.modelName, taskRecommendation: aiModels.taskRecommendation, isActive: aiModels.isActive })
    .from(aiModels)
    .limit(100);
  const credentials = await runtime.db
    .select({ id: aiCredentials.id, providerId: aiCredentials.providerId, keyEncrypted: aiCredentials.keyEncrypted })
    .from(aiCredentials)
    .where(eq(aiCredentials.status, 'active'))
    .limit(200);

  async function decryptFirst(providerId: string): Promise<string | null> {
    const row = credentials.find((credential) => credential.providerId === providerId);
    if (row === undefined) return null;
    try {
      const decrypted = await runtime.db.execute<{ plain: string }>(
        sql`SELECT indicate_private.decrypt_ai_key(${row.keyEncrypted}) AS plain`,
      );
      const plain = decrypted[0]?.plain;
      return typeof plain === 'string' && plain !== '' ? plain : null;
    } catch {
      return null;
    }
  }

  async function liveIds(providerId: string): Promise<Set<string> | null> {
    try {
      if (providerId === 'openrouter') {
        return listingIds(await fetchJson(`${OPENROUTER_BASE_URL}/models`, {}));
      }
      if (providerId === 'gemini') {
        const key = await decryptFirst('gemini');
        if (key === null) return null;
        return listingIds(
          await fetchJson(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key)}`, {}),
        );
      }
      if (providerId === 'vercel-gateway') {
        const key = await decryptFirst('vercel-gateway');
        if (key === null) return null;
        return listingIds(
          await fetchJson(`${VERCEL_GATEWAY_BASE_URL}/models`, { Authorization: `Bearer ${key}` }),
        );
      }
      return null;
    } catch {
      return null;
    }
  }

  for (const provider of providers) {
    const live = await liveIds(provider.id);
    if (live === null) {
      skipped.push(provider.id);
      continue;
    }
    const diff = diffCatalogModels(
      models.filter((row) => row.providerId === provider.id),
      live,
    );
    for (const modelId of diff.deactivate) {
      await runtime.db.update(aiModels).set({ isActive: false, updatedAt: now }).where(eq(aiModels.id, modelId));
      await runtime.db.insert(runtimeConfigAuditLogs).values({
        id: crypto.randomUUID(),
        organizationId: null,
        actorType: 'system',
        actorId: null,
        environment: process.env.NODE_ENV === 'production' ? 'production' : 'development',
        action: 'ai.model.auto_deactivate',
        targetType: 'ai_model',
        targetId: modelId,
        changedFields: ['isActive'],
        outcome: 'succeeded',
        requestId,
      });
      deactivated.push(modelId);
    }
  }

  return NextResponse.json(
    { requestId, checkedAt: now.toISOString(), deactivated, skipped },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
}

/**
 * Totasi harian direktori model AI: cocokkan katalog dengan listing live
 * tiap provider dan nonaktifkan baris yang hilang (sinyal kuat penghapusan).
 *
 * @remarks Listing gagal total dilewati tanpa perubahan apa pun; baris yang
 * dinonaktifkan operator tetap mati karena tidak ada reaktivasi otomatis.
 */
export const GET = withApiAccess('GET /api/internal/maintenance/ai-model-sweep', handleGET);
