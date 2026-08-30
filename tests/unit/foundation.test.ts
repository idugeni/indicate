import { describe, expect, it } from 'vitest';

import { getFoundationStatus } from '@/application/foundation/foundation-status';
import { PLATFORM_RESOURCE_KINDS } from '@/domain/foundation/platform-topology';
import { SystemClock } from '@/infrastructure/system/system-clock';
import { UuidGenerator } from '@/infrastructure/system/uuid-generator';

describe('foundation primitives', () => {
  it('reports every approved resource kind without enabling tenant data', () => {
    expect(getFoundationStatus()).toEqual({
      stage: 'foundation',
      resourceKinds: PLATFORM_RESOURCE_KINDS,
      tenantDataAvailable: false,
    });
  });

  it('provides system time through the clock port', () => {
    expect(new SystemClock().now()).toBeInstanceOf(Date);
  });

  it('generates UUID identifiers', () => {
    expect(new UuidGenerator().create()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });
});
