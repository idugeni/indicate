import type {
  JsonValue, PublicationOptions, PublicationOverride, PublicationResult, PublicationTargetRecord, PublishingState,
} from '@/modules/publishing/models';

export const FINGERPRINT_VERSION = 1;

const TARGET_TRANSITIONS: Readonly<Record<PublishingState, ReadonlySet<PublishingState>>> = Object.freeze({
  queued: new Set<PublishingState>(['processing']),
  processing: new Set<PublishingState>(['published', 'retrying', 'failed']),
  retrying: new Set<PublishingState>(['processing', 'failed']),
  published: new Set<PublishingState>(['published', 'unpublished']),
  failed: new Set<PublishingState>(['failed', 'retrying']),
  unpublished: new Set<PublishingState>(['unpublished']),
});

function canonicalizeValue(value: JsonValue): JsonValue {
  if (Array.isArray(value)) return value.map(canonicalizeValue);
  if (value !== null && typeof value === 'object') {
    const record = value as { readonly [key: string]: JsonValue };
    return Object.fromEntries(Object.keys(record).sort().map((key) => [key, canonicalizeValue(record[key]!) ]));
  }
  return value;
}

export function canonicalizePublicationOptions(options: PublicationOptions): string {
  return JSON.stringify(canonicalizeValue(options));
}

export function canonicalPublicationPayload(input: {
  readonly organizationId: string;
  readonly articleId: string;
  readonly siteIds: readonly string[];
  readonly options: PublicationOptions;
  readonly overrides?: Readonly<Record<string, PublicationOverride>>;
}): string {
  const overrides = input.overrides ?? {};
  return JSON.stringify({
    version: FINGERPRINT_VERSION,
    organizationId: input.organizationId,
    articleId: input.articleId,
    siteIds: [...new Set(input.siteIds)].sort(),
    options: JSON.parse(canonicalizePublicationOptions(input.options)) as JsonValue,
    // Omitted when empty so pre-override requests keep their original fingerprint.
    ...(Object.keys(overrides).length === 0 ? {} : { overrides: canonicalizeValue(overrides as unknown as JsonValue) }),
  });
}

export async function publicationFingerprint(input: {
  readonly organizationId: string;
  readonly articleId: string;
  readonly siteIds: readonly string[];
  readonly options: PublicationOptions;
  readonly overrides?: Readonly<Record<string, PublicationOverride>>;
}): Promise<string> {
  const bytes = new TextEncoder().encode(canonicalPublicationPayload(input));
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return `v${FINGERPRINT_VERSION}:${Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, '0')).join('')}`;
}

export function isAllowedTargetTransition(from: PublishingState, to: PublishingState): boolean {
  return TARGET_TRANSITIONS[from].has(to);
}

export function aggregateJobState(states: readonly PublishingState[]): PublishingState {
  if (states.length === 0) throw new Error('At least one target state is required.');
  if (states.includes('processing')) return 'processing';
  if (states.includes('retrying')) return 'retrying';
  if (states.every((state) => state === 'published')) return 'published';
  if (states.every((state) => state === 'published' || state === 'failed') && states.includes('failed')) return 'failed';
  if (states.every((state) => state === 'published' || state === 'failed' || state === 'unpublished') && states.includes('unpublished')) return 'unpublished';
  return 'queued';
}

export interface RetryPolicy {
  readonly maxAttempts: number;
  readonly delaysSeconds: readonly number[];
}

export function retryDelaySeconds(policy: RetryPolicy, completedAttempts: number): number | null {
  if (completedAttempts < 1 || completedAttempts >= policy.maxAttempts) return null;
  return policy.delaysSeconds[Math.min(completedAttempts - 1, policy.delaysSeconds.length - 1)] ?? null;
}

export function projectPublicationResult(targets: readonly Pick<PublicationTargetRecord, 'state' | 'publishedUrl'>[]): PublicationResult {
  const finalState = aggregateJobState(targets.map(({ state }) => state));
  if (finalState !== 'published' && finalState !== 'failed') throw new Error('Publication result requires terminal targets.');
  const urls = targets.filter((target) => target.state === 'published' && target.publishedUrl !== null)
    .map((target) => target.publishedUrl!).sort();
  return Object.freeze({ finalState, successfulCount: urls.length, urls: Object.freeze(urls) });
}

export function hasCurrentFence(currentToken: number, requestedToken: number): boolean {
  return currentToken === requestedToken;
}
