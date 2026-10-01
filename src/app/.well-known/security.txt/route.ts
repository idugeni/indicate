import { connection } from 'next/server';
import { headers } from 'next/headers';

import { denied } from '@/core/routing/deny';
import { withApiAccess } from '@/core/observability/api-access';
import { deliveryComposition } from '@/modules/delivery';

/**
 * Render an RFC 9116 security.txt body.
 *
 * @param contactUrl - Absolute contact URL for vulnerability reports.
 * @param now - Reference time for the Expires line.
 * @returns security.txt body with contact, expiry, and language.
 */
export function securityTxt(contactUrl: string, now = new Date()): string {
  const expires = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString();
  return [`Contact: ${contactUrl}`, `Expires: ${expires}`, 'Preferred-Languages: id, en', ''].join('\n');
}

async function handleGET() {
  await connection();
  const { resolver, config } = await deliveryComposition();
  const result = await resolver.classify((await headers()).get('host'));
  if (result.kind === 'control' && result.surface === 'dashboard') {
    return new Response(securityTxt(`https://${config.hosts.dashboard}/contact`), {
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=0, s-maxage=3600' },
    });
  }
  if (result.kind === 'site') {
    const host = result.context.normalizedHostname;
    return new Response(securityTxt(`https://${host}/kontak`), {
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=0, s-maxage=3600' },
    });
  }
  return denied(result.kind === 'invalid' ? 400 : result.kind === 'ambiguous' ? 500 : 404);
}

/**
 * Serve the per-host security.txt backing the WAF Allowed paths checklist.
 *
 * @remarks Static body, no database read; contact stays on-host to keep tenant isolation.
 */
export const GET = withApiAccess('GET /.well-known/security.txt', handleGET, { accessLog: 'errors-only' });
