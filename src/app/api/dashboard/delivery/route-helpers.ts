import { DeliveryOperationPendingError } from '@/modules/delivery/domain-provisioning-service';
import { DeliveryConflictError, DeliveryResourceUnavailableError } from '@/modules/delivery/ports';

/** Map delivery failures to stable HTTP status codes. */
export function deliveryErrorStatus(error: unknown): number {
  if (error instanceof DeliveryOperationPendingError) return 503;
  if (error instanceof DeliveryConflictError) return 409;
  if (error instanceof DeliveryResourceUnavailableError) return 404;
  if (error instanceof Error && error.message === 'CONFIGURATION_INVALID') return 400;
  return 503;
}
