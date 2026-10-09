import type { PublicErrorEnvelope } from '@/core/errors';

export const statusFor = (error: PublicErrorEnvelope) => error.error.code === 'RESOURCE_UNAVAILABLE' ? 404 : error.error.code === 'INVALID_INPUT' ? 400 : error.error.code === 'RATE_LIMITED' ? 429 : error.error.code === 'CONFLICT' ? 409 : error.error.code === 'FORBIDDEN' ? 403 : error.error.code === 'DEPENDENCY_UNAVAILABLE' ? 503 : 500;
