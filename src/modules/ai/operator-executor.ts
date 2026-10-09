import 'server-only';

import type { AuthorizedTenantActorContext } from '@/core/operation-context';
import { getServerRuntimeContext } from '@/core/config/runtime/runtime-context';
import { getSharedRuntimeDatabase } from '@/data/client';
import { UuidGenerator } from '@/core/system/uuid-generator';
import { DrizzleDashboardRepository } from '@/data/repos/dashboard';
import { TenantBusinessService } from '@/modules/dashboard/tenant-business-service';
import { fetchCachedAnalytics, fetchCachedDashboard } from '@/modules/dashboard/dashboard-dal';
import { OPERATOR_CAPABILITIES, type OperatorCapabilityDefinition } from '@/modules/ai/operator-capabilities';
import type { OperatorPlan } from '@/modules/ai/operator-plan';

export const OPERATOR_READ_EXECUTION_ENABLED = true;
export const OPERATOR_WRITE_EXECUTION_ENABLED = false;

const EXECUTABLE_READ_CAPABILITIES = new Set([
  'command-center.overview.read',
  'network-intelligence.health.read',
  'editorial-workspace.articles.read',
  'system-operations.status.read',
]);

export type OperatorStepResult =
  | { readonly id: string; readonly capabilityId: string; readonly ok: true; readonly result: unknown }
  | { readonly id: string; readonly capabilityId: string; readonly ok: false; readonly error: string };

function boundedResult(value: unknown): unknown {
  let serialized: string;
  try { serialized = JSON.stringify(value); }
  catch { return { truncated: true, summary: 'Hasil tidak dapat diserialisasi.' }; }
  if (serialized.length <= 12000) return JSON.parse(serialized) as unknown;
  return { truncated: true, preview: serialized.slice(0, 12000) };
}

function catalogCapability(id: string): OperatorCapabilityDefinition | undefined {
  return OPERATOR_CAPABILITIES.find((item) => item.id === id);
}

/** Execute only explicitly implemented read handlers; authorization remains enforced by the existing domain services. */
export async function executeOperatorPlan(input: {
  readonly actor: AuthorizedTenantActorContext;
  readonly plan: OperatorPlan;
}): Promise<{ readonly ok: true; readonly results: readonly OperatorStepResult[] } | { readonly ok: false; readonly error: string }> {
  if (!OPERATOR_READ_EXECUTION_ENABLED) return { ok: false, error: 'Eksekusi baca AI dinonaktifkan.' };
  const capabilities = input.plan.steps.map((step) => ({ step, capability: catalogCapability(step.capabilityId) }));
  if (capabilities.some(({ capability }) => capability === undefined || !EXECUTABLE_READ_CAPABILITIES.has(capability.id))) {
    return { ok: false, error: 'Rencana memuat kemampuan yang belum memiliki handler terverifikasi.' };
  }
  if (input.plan.steps.some((step) => Object.keys(step.arguments).length > 0)) {
    return { ok: false, error: 'Argumen belum didukung untuk kemampuan baca operator.' };
  }

  const context = await getServerRuntimeContext();
  const runtime = getSharedRuntimeDatabase(context.bootstrap);
  const service = new TenantBusinessService(new DrizzleDashboardRepository(runtime.db), new UuidGenerator());
  const results: OperatorStepResult[] = [];

  for (const { step } of input.plan.steps) {
    let result: unknown;
    switch (step.capabilityId) {
      case 'command-center.overview.read':
        result = await fetchCachedDashboard(input.actor);
        break;
      case 'network-intelligence.health.read':
        result = await fetchCachedAnalytics(input.actor, {});
        break;
      case 'editorial-workspace.articles.read':
        result = await service.listEditorial(input.actor, { limit: '20' });
        break;
      case 'system-operations.status.read':
        result = await service.operations(input.actor);
        break;
      default:
        return { ok: false, error: 'Kemampuan tidak tersedia untuk eksekusi.' };
    }

    if (typeof result === 'object' && result !== null && 'ok' in result && (result as { readonly ok?: unknown }).ok === false) {
      results.push({ id: step.id, capabilityId: step.capabilityId, ok: false, error: 'Operasi ditolak atau gagal pada layanan domain.' });
      continue;
    }
    results.push({ id: step.id, capabilityId: step.capabilityId, ok: true, result: boundedResult(result) });
  }

  return { ok: true, results };
}
