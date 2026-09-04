import type { HealthCheckPort } from '@/core/system/ports';

export interface ExactDomainAssociationResult {
  readonly hostname: string;
  readonly associated: boolean;
  readonly verified: boolean;
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
