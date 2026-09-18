import { describe, expect, it } from 'vitest';

import { deliveryErrorStatus } from '@/app/api/dashboard/delivery/route';
import { DeliveryOperationPendingError } from '@/modules/delivery/domain-provisioning-service';
import { DeliveryConflictError, DeliveryResourceUnavailableError } from '@/modules/delivery/ports';

describe('deliveryErrorStatus', () => {
  it('memetakan pending ke 503 dan konflik ke 409', () => {
    expect(deliveryErrorStatus(new DeliveryOperationPendingError())).toBe(503);
    expect(deliveryErrorStatus(new DeliveryConflictError())).toBe(409);
  });

  it('memetakan sumber tak tersedia ke 404 non-disclosing', () => {
    expect(deliveryErrorStatus(new DeliveryResourceUnavailableError())).toBe(404);
  });

  it('memetakan konfigurasi invalid ke 400', () => {
    expect(deliveryErrorStatus(new Error('CONFIGURATION_INVALID'))).toBe(400);
  });

  it('menjatuhkan galat tak dikenal ke 503', () => {
    expect(deliveryErrorStatus(new Error('boom'))).toBe(503);
    expect(deliveryErrorStatus(null)).toBe(503);
  });
});
