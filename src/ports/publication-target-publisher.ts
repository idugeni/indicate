import type { PublicationTargetRecord, WorkerClaim } from '@/domain/stage4/models';

export type TargetPublicationOutcome =
  | { readonly kind: 'published'; readonly url: string }
  | { readonly kind: 'retryable_failure'; readonly code: string }
  | { readonly kind: 'terminal_failure'; readonly code: string };

export interface PublicationTargetPublisherPort {
  publish(claim: WorkerClaim, target: PublicationTargetRecord): Promise<TargetPublicationOutcome>;
}
