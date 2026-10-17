import 'server-only';

import { createNeonAuth } from '@neondatabase/auth/next/server';

function requiredEnv(name: 'NEON_AUTH_BASE_URL' | 'NEON_AUTH_COOKIE_SECRET'): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function getAuthConfig() {
  const baseUrl = requiredEnv('NEON_AUTH_BASE_URL');
  const cookieSecret = requiredEnv('NEON_AUTH_COOKIE_SECRET');

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(baseUrl);
  } catch {
    throw new Error('NEON_AUTH_BASE_URL must be a valid absolute URL');
  }
  if (parsedUrl.protocol !== 'https:' && process.env.NODE_ENV === 'production') {
    throw new Error('NEON_AUTH_BASE_URL must use HTTPS in production');
  }
  if (cookieSecret.length < 32) {
    throw new Error('NEON_AUTH_COOKIE_SECRET must contain at least 32 characters');
  }

  return { baseUrl: parsedUrl.toString().replace(/\/$/u, ''), cookieSecret };
}

const config = getAuthConfig();

/**
 * Server-side Neon Managed Auth instance.
 *
 * This module only provides the authentication transport/session API. App-level
 * authorization must still resolve the Neon identity to a local user and verify
 * active membership/permissions before granting dashboard access.
 */
export const neonAuth = createNeonAuth({
  baseUrl: config.baseUrl,
  cookies: {
    secret: config.cookieSecret,
    sessionDataTtl: 60,
  },
  logLevel: process.env.NODE_ENV === 'production' ? 'warn' : 'info',
});
