import type { AnalyticsProjection } from '@/modules/dashboard/models';
import { formatMoment } from '@/modules/dashboard/components/shared/format-moment';

export const PAGE_SIZE = 10;

export function isAnalyticsProjection(value: unknown): value is AnalyticsProjection {
  if (typeof value !== 'object' || value === null) return false;
  return Array.isArray((value as Partial<AnalyticsProjection>).articlesByRegion);
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

/** Nested customer record inside a `{ customer, subscription }` row. */
export function nestedCustomer(item: Record<string, unknown>): Record<string, unknown> | null {
  const customer = item.customer;
  return typeof customer === 'object' && customer !== null ? (customer as Record<string, unknown>) : null;
}

/** Absolute moment for an audit row; an unparsable value is passed through unchanged. */
export function formatAuditMoment(value: string): string {
  return formatMoment(value) ?? value;
}

/** Secondary line under a row name: claim scope for affiliations, target and time for audit rows. */
export function resolveItemSubtitle(item: Record<string, unknown>): string | null {
  const city = typeof item.cityName === 'string' ? item.cityName.trim() : '';
  const portals = typeof item.portalCount === 'number' && Number.isFinite(item.portalCount) ? item.portalCount : null;
  const target = typeof item.targetType === 'string' ? item.targetType.trim() : '';
  const occurredAt = typeof item.occurredAt === 'string' ? formatAuditMoment(item.occurredAt) : '';
  const parts: string[] = [];
  if (city !== '') parts.push(city);
  if (portals !== null) parts.push(`${portals.toLocaleString('id-ID')} portal`);
  if (target !== '') parts.push(target);
  if (occurredAt !== '') parts.push(occurredAt);
  if (parts.length > 0) return parts.join(' · ');
  const metadata = nestedCustomer(item)?.customerMetadata;
  const customerCity = typeof metadata === 'object' && metadata !== null
    ? (metadata as Record<string, unknown>).city
    : undefined;
  return typeof customerCity === 'string' && customerCity.trim() !== '' ? customerCity.trim() : null;
}

/**
 * Derive the badge status for a row.
 *
 * @remarks Honours boolean `active`, audit `outcome`, and the `{ customer, subscription }`
 * envelope the customer projection ships, whose status lives on the nested record.
 */
export function resolveRowStatus(item: Record<string, unknown>): string {
  const direct = item.status ?? item.state ?? item.verificationStatus ?? item.outcome;
  if (direct !== undefined) return String(direct);
  if (typeof item.active === 'boolean') return item.active ? 'active' : 'inactive';
  const customer = nestedCustomer(item);
  if (customer !== null && customer.status !== undefined) return String(customer.status);
  const subscription = item.subscription;
  if (typeof subscription === 'object' && subscription !== null) {
    const status = (subscription as Record<string, unknown>).status;
    if (status !== undefined) return String(status);
  }
  return 'unknown';
}

/**
 * Server row ceilings per collection.
 *
 * @remarks A table that loaded exactly this many rows is showing a truncated
 * page, so the count must read as "the newest N", not as the collection total.
 * Measuring the real total would need an unbounded scan of a table that only
 * grows, which `AGENTS.md` §"Database access & egress" rules out; the filters
 * on these views are the deliberate way to reach older rows.
 */
export const COLLECTION_LIMITS: Readonly<Record<string, number>> = {
  auditLogs: 500,
  invalidationTasks: 100,
  objectCleanupTasks: 100,
  mediaKeyReservations: 100,
  cacheBypasses: 100,
  transitionReceipts: 100,
  webhookReplayClaims: 100,
  sites: 200,
  siteSettings: 200,
};

export const COLLECTION_LABELS: Readonly<Record<string, string>> = {
  publishers: 'Penerbit',
  affiliations: 'Afiliasi Resmi',
  sites: 'Situs',
  records: 'Pelanggan',
  apiKeys: 'Kunci API',
  domains: 'Domain',
  regions: 'Wilayah',
  siteSettings: 'Pengaturan Situs',
  roles: 'Peran',
  memberships: 'Anggota',
  invitations: 'Undangan',
  activationAttempts: 'Percobaan Aktivasi',
  auditLogs: 'Catatan Audit',
  retentionRuns: 'Riwayat Retensi',
  invalidationTasks: 'Antrean Invalidasi Cache',
  objectCleanupTasks: 'Antrean Pembersihan Objek',
  mediaKeyReservations: 'Reservasi Kunci Media',
  cacheBypasses: 'Bypass Cache',
  transitionReceipts: 'Bukti Transisi',
  webhookReplayClaims: 'Klaim Replay Webhook',
};

export function collectionLabel(collectionKey: string): string {
  return COLLECTION_LABELS[collectionKey] ?? collectionKey.replace(/([A-Z])/g, ' $1').trim();
}

export function resolveItemName(item: Record<string, unknown>): string {
  const possibleName =
    item.name ??
    item.title ??
    item.displayName ??
    item.institutionName ??
    item.action ??
    item.key ??
    item.normalizedHostname ??
    item.objectKey ??
    (item.customer as { name?: string } | undefined)?.name;

  const label = typeof possibleName === 'string' ? possibleName.trim() : '';
  if (label !== '') return label;
  return typeof item.id === 'string' && item.id !== '' ? item.id : 'Tanpa nama';
}
