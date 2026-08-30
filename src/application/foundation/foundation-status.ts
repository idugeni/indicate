import { PLATFORM_RESOURCE_KINDS } from '@/domain/foundation/platform-topology';

export interface FoundationStatus {
  readonly stage: 'foundation';
  readonly resourceKinds: typeof PLATFORM_RESOURCE_KINDS;
  readonly tenantDataAvailable: false;
}

export function getFoundationStatus(): FoundationStatus {
  return {
    stage: 'foundation',
    resourceKinds: PLATFORM_RESOURCE_KINDS,
    tenantDataAvailable: false,
  };
}
