import type { AnalyticsProjection } from '@/modules/dashboard/models';
export function isAnalyticsProjection(value: unknown): value is AnalyticsProjection {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Partial<AnalyticsProjection>;
  const requiredArrays: readonly (keyof AnalyticsProjection)[] = [
    'articlesByRegion', 'articlesBySite', 'articlesByCategory', 'articlesByPublisher',
    'articlesByStatus', 'jobsByState', 'jobsBySiteRegionAndState', 'outcomesBySiteAndState',
    'outcomesBySiteRegionAndState', 'tugasHarian', 'aktivitasPerJam', 'aktivitasTerbaru', 'arusPenerbit',
  ];
  return requiredArrays.every((key) => Array.isArray(record[key]))
    && typeof record.jendela === 'object'
    && record.jendela !== null
    && typeof record.jendela.awal === 'string'
    && typeof record.jendela.akhir === 'string';
}

export type StatusTone = 'ok' | 'bad' | 'busy' | 'idle';

export function resolveStatus(rawStatus: unknown): { readonly label: string; readonly tone: StatusTone } {
  const status = String(rawStatus ?? 'unknown').toLowerCase();

  switch (status) {
    case 'active':
    case 'published':
    case 'verified':
    case 'success':
    case 'healthy':
    case 'completed':
      return { label: status, tone: 'ok' };
    case 'failed':
    case 'error':
    case 'rejected':
    case 'suspended':
      return { label: status, tone: 'bad' };
    case 'pending':
    case 'processing':
    case 'queued':
    case 'retrying':
      return { label: status, tone: 'busy' };
    default:
      return { label: status, tone: 'idle' };
  }
}

export const STATUS_BADGE_TONE: Record<StatusTone, string> = {
  ok: 'border-signal/40 text-signal',
  bad: 'border-error/40 text-error',
  busy: 'border-warning/40 text-warning',
  idle: 'border-hairline-strong text-paper-dim',
};
