export type AppErrorCode =
  | 'INVALID_INPUT'
  | 'INVALID_HOSTNAME'
  | 'UNAUTHENTICATED'
  | 'RESOURCE_UNAVAILABLE'
  | 'FORBIDDEN'
  | 'CONFLICT'
  | 'IDEMPOTENCY_CONFLICT'
  | 'INVALID_STATE_TRANSITION'
  | 'RATE_LIMITED'
  | 'DEPENDENCY_UNAVAILABLE'
  | 'CONFIGURATION_INVALID'
  | 'INTERNAL_ERROR';

export interface FieldErrors {
  readonly [path: string]: readonly string[];
}

export interface PublicErrorEnvelope {
  readonly error: {
    readonly code: AppErrorCode;
    readonly message: string;
    readonly fields?: FieldErrors;
  };
  readonly requestId: string;
}

const NON_DISCLOSING_MESSAGE = 'The requested resource is unavailable.';

export function createNonDisclosingDenial(requestId: string): PublicErrorEnvelope {
  return Object.freeze({
    error: Object.freeze({
      code: 'RESOURCE_UNAVAILABLE' as const,
      message: NON_DISCLOSING_MESSAGE,
    }),
    requestId,
  });
}

export function createPublicError(
  code: AppErrorCode,
  message: string,
  requestId: string,
  fields?: FieldErrors,
): PublicErrorEnvelope {
  return Object.freeze({
    error: Object.freeze({ code, message, ...(fields === undefined ? {} : { fields }) }),
    requestId,
  });
}
