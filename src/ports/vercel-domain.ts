import type { HealthCheckPort } from '@/ports/health-check';

export interface ExactDomainAssociationResult {
  readonly hostname: string;
  readonly associated: boolean;
  readonly verificationChallenge?: {
    readonly type: 'TXT';
    readonly name: string;
    readonly value: string;
  };
}

export interface VercelHostingPort extends HealthCheckPort {
  readonly projectCount: 1;
  readonly responsibility: 'application_hosting_only';
  associateExactDomain(hostname: string): Promise<ExactDomainAssociationResult>;
  removeExactDomain(hostname: string): Promise<void>;
  verifyExactDomain(hostname: string): Promise<boolean>;
}
