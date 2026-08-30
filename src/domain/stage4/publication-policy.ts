import type {
  JsonValue, PublicationOptions, PublicationResult, PublicationTargetRecord, PublishingState,
} from './models';

export const FINGERPRINT_VERSION = 1;
export const PUBLISHING_STATES = Object.freeze(['queued', 'processing', 'published', 'failed', 'retrying'] as const);

const JOB_TRANSITIONS: Readonly<Record<PublishingState, ReadonlySet<PublishingState>>> = Object.freeze({
  queued: new Set<PublishingState>(['processing', 'retrying', 'failed']),
  processing: new Set<PublishingState>(['published', 'retrying', 'failed']),
  retrying: new Set<PublishingState>(['processing', 'failed']),
  published: new Set<PublishingState>(['published']),
  failed: new Set<PublishingState>(['failed']),
});
const TARGET_TRANSITIONS: Readonly<Record<PublishingState, ReadonlySet<PublishingState>>> = Object.freeze({
  queued: new Set<PublishingState>(['processing']),
  processing: new Set<PublishingState>(['published', 'retrying', 'failed']),
  retrying: new Set<PublishingState>(['processing', 'failed']),
  published: new Set<PublishingState>(['published']),
  failed: new Set<PublishingState>(['failed']),
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
}): string {
  return JSON.stringify({
    version: FINGERPRINT_VERSION,
    organizationId: input.organizationId,
    articleId: input.articleId,
    siteIds: [...new Set(input.siteIds)].sort(),
    options: JSON.parse(canonicalizePublicationOptions(input.options)) as JsonValue,
  });
}

export async function publicationFingerprint(input: {
  readonly organizationId: string;
  readonly articleId: string;
  readonly siteIds: readonly string[];
  readonly options: PublicationOptions;
}): Promise<string> {
  const bytes = new TextEncoder().encode(canonicalPublicationPayload(input));
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return `v${FINGERPRINT_VERSION}:${Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, '0')).join('')}`;
}

export function isAllowedJobTransition(from: PublishingState, to: PublishingState): boolean {
  return JOB_TRANSITIONS[from].has(to);
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

export function retryableTargetIds(targets: readonly Pick<PublicationTargetRecord, 'id' | 'state' | 'attempt'>[], policy: RetryPolicy): readonly string[] {
  return targets.filter((target) => target.state === 'retrying' && target.attempt < policy.maxAttempts).map(({ id }) => id);
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

export interface TransitionedOutcome {
  readonly state: PublishingState;
  readonly publishedUrl: string | null;
  readonly publishedAt: string | null;
  readonly sanitizedError: Readonly<Record<string, unknown>> | null;
}

export function applyTargetTransition(current: TransitionedOutcome, to: PublishingState, next: Omit<TransitionedOutcome, 'state'>): TransitionedOutcome {
  if (!isAllowedTargetTransition(current.state, to)) throw new Error('INVALID_STATE_TRANSITION');
  if ((current.state === 'published' || current.state === 'failed') && current.state === to) return current;
  return Object.freeze({ state: to, ...next });
}
