/** Edge-safe platform guards (dependency-free for the proxy bundle): `x-platform-token`/`Bearer plat_*`, `x-on-behalf-ticket` for tenant paths, IP allowlist for `/platform/*`. */

export const PLATFORM_TOKEN_HEADER = 'x-platform-token';
export const ON_BEHALF_TICKET_HEADER = 'x-on-behalf-ticket';
export const PLATFORM_ALLOWED_IPS_ENV = 'PLATFORM_ALLOWED_IPS';

export function isPlatformPath(pathname: string): boolean {
  return (
    pathname === '/platform' ||
    pathname.startsWith('/platform/') ||
    pathname === '/api/platform' ||
    pathname.startsWith('/api/platform/')
  );
}

export function isDashboardPath(pathname: string): boolean {
  return (
    pathname === '/dashboard' ||
    pathname.startsWith('/dashboard/') ||
    pathname.startsWith('/api/dashboard/')
  );
}

export function parsePlatformAllowedIps(value: string | undefined): readonly string[] {
  if (value === undefined) return [];
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function isLoopbackIp(ip: string): boolean {
  return ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1';
}

function ipv4ToInt(ip: string): number | null {
  const parts = ip.split('.');
  if (parts.length !== 4) return null;
  let result = 0;
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return null;
    const octet = Number(part);
    if (octet < 0 || octet > 255) return null;
    result = result * 256 + octet;
  }
  return result;
}

function cidrMatches(ip: string, cidr: string): boolean {
  const slash = cidr.indexOf('/');
  if (slash === -1) return ip.toLowerCase() === cidr.toLowerCase();
  const base = cidr.slice(0, slash);
  const prefix = Number(cidr.slice(slash + 1));
  if (!Number.isInteger(prefix) || prefix < 0 || prefix > 32) return false;
  const ipInt = ipv4ToInt(ip);
  const baseInt = ipv4ToInt(base);
  if (ipInt === null || baseInt === null) return false;
  if (prefix === 0) return true;
  const mask = (0xffffffff << (32 - prefix)) >>> 0;
  return ((ipInt & mask) >>> 0) === ((baseInt & mask) >>> 0);
}

export function isIpAllowlisted(ip: string, allowlist: readonly string[]): boolean {
  return allowlist.some((entry) => cidrMatches(ip, entry));
}

export function extractClientIp(headers: Headers): string | null {
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded !== null) {
    const first = forwarded.split(',')[0]?.trim();
    if (first !== undefined && first.length > 0) return first;
  }
  const realIp = headers.get('x-real-ip');
  if (realIp !== null && realIp.trim().length > 0) return realIp.trim();
  return null;
}

export function carriesPlatformToken(headers: Headers): boolean {
  const direct = headers.get(PLATFORM_TOKEN_HEADER);
  if (direct !== null && direct.trim().length > 0) return true;
  const authorization = headers.get('authorization');
  if (authorization !== null && /^Bearer\s+plat_/iu.test(authorization.trim())) return true;
  return false;
}

export function hasOnBehalfTicket(headers: Headers): boolean {
  const ticket = headers.get(ON_BEHALF_TICKET_HEADER);
  return ticket !== null && ticket.trim().length > 0;
}

export function isPlatformTokenWithoutTicket(headers: Headers): boolean {
  return carriesPlatformToken(headers) && !hasOnBehalfTicket(headers);
}

export function isPlatformOnlyWithoutTicket(input: {
  readonly orgPermissionCount: number;
  readonly platformPermissionCount: number;
  readonly headers: Headers;
}): boolean {
  return (
    input.orgPermissionCount === 0 &&
    input.platformPermissionCount > 0 &&
    !hasOnBehalfTicket(input.headers)
  );
}

/** Fail-closed platform IP check; loopback is allowed only when allowlisted. */
export function isPlatformRequestAllowed(input: {
  readonly headers: Headers;
  readonly allowlist: readonly string[];
}): boolean {
  const ip = extractClientIp(input.headers);
  if (ip === null) return false;
  if (isLoopbackIp(ip)) return isIpAllowlisted(ip, input.allowlist);
  return isIpAllowlisted(ip, input.allowlist);
}
