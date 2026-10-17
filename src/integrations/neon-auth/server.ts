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

type NeonAuthInstance = ReturnType<typeof createNeonAuth>;
let instance: NeonAuthInstance | undefined;

function getNeonAuth(): NeonAuthInstance {
  if (instance) return instance;
  const config = getAuthConfig();
  instance = createNeonAuth({
    baseUrl: config.baseUrl,
    cookies: {
      secret: config.cookieSecret,
      sessionDataTtl: 60,
    },
    logLevel: process.env.NODE_ENV === 'production' ? 'warn' : 'info',
  });
  return instance;
}

/**
 * Lazy initialization keeps build-time module analysis independent of deployment
 * secrets. The first real auth operation still validates configuration and fails
 * closed when either required Neon Auth variable is missing or malformed.
 */
export const neonAuth = new Proxy({} as NeonAuthInstance, {
  get(_target, property) {
    const auth = getNeonAuth();
    const value = Reflect.get(auth, property, auth) as unknown;
    return typeof value === 'function' ? value.bind(auth) : value;
  },
});
