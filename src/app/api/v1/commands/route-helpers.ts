import type { PublicErrorEnvelope } from '@/core/errors';

/** Map API command errors to stable HTTP statuses. */
export const status = (error: PublicErrorEnvelope) => error.error.code === 'RESOURCE_UNAVAILABLE' ? 404 : error.error.code === 'INVALID_INPUT' ? 400 : error.error.code === 'RATE_LIMITED' ? 429 : error.error.code === 'DEPENDENCY_UNAVAILABLE' ? 503 : 409;
