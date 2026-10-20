#!/usr/bin/env node
/**
 * Bulk-send Neon Auth password-reset emails to active users who belong to
 * active customer organizations. This never reads or writes password hashes.
 *
 * Dry-run by default. Use --execute to send reset emails.
 *
 * Required environment:
 *   DATABASE_DIRECT_URL (or DATABASE_POOL_URL)
 *   NEON_AUTH_BASE_URL
 * Optional:
 *   NEXT_PUBLIC_SITE_URL (defaults to https://indicate.website)
 */
import postgres from 'postgres';

const args = new Set(process.argv.slice(2));
if (args.has('--help')) {
  console.log('Usage: node scripts/auth/bulk-organization-password-reset.mjs [--execute]');
  console.log('Dry-run by default; --execute sends reset emails to eligible accounts.');
  process.exit(0);
}

const execute = args.has('--execute');
const databaseUrl = process.env.DATABASE_DIRECT_URL?.trim() || process.env.DATABASE_POOL_URL?.trim();
const authBaseUrl = process.env.NEON_AUTH_BASE_URL?.trim()?.replace(/\/+$/u, '');
const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL?.trim() || 'https://indicate.website').replace(/\/+$/u, '');

if (!databaseUrl) {
  console.error('Missing DATABASE_DIRECT_URL or DATABASE_POOL_URL.');
  process.exit(1);
}
if (!authBaseUrl) {
  console.error('Missing NEON_AUTH_BASE_URL.');
  process.exit(1);
}

let parsedAuthUrl;
let parsedSiteUrl;
try {
  parsedAuthUrl = new URL(authBaseUrl);
  parsedSiteUrl = new URL(siteUrl);
} catch {
  console.error('NEON_AUTH_BASE_URL and NEXT_PUBLIC_SITE_URL must be valid absolute URLs.');
  process.exit(1);
}
if (parsedAuthUrl.protocol !== 'https:' || parsedSiteUrl.protocol !== 'https:') {
  console.error('Bulk password recovery requires HTTPS endpoints.');
  process.exit(1);
}
if (parsedSiteUrl.origin !== 'https://indicate.website') {
  console.error('Refusing unexpected reset redirect origin; expected https://indicate.website.');
  process.exit(1);
}

const sql = postgres(databaseUrl, { max: 1, connect_timeout: 10, idle_timeout: 5 });
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

try {
  const rows = await sql`
    SELECT DISTINCT lower(btrim(u.email)) AS email
    FROM public.organizations AS o
    JOIN public.memberships AS m
      ON m.organization_id = o.id
     AND m.status::text = 'active'
    JOIN public.users AS u
      ON u.id = m.user_id
     AND u.status::text = 'active'
    WHERE o.kind::text = 'customer'
      AND o.status::text = 'active'
      AND u.neon_auth_user_id IS NOT NULL
      AND nullif(btrim(u.email), '') IS NOT NULL
    ORDER BY email
  `;

  console.log(`Eligible active organization accounts: ${rows.length}`);
  if (!execute) {
    console.log('Dry-run only; no email was sent. Re-run with --execute to send reset links in bulk.');
    process.exitCode = 0;
  } else {
    let requested = 0;
    let failed = 0;
    for (const [index, row] of rows.entries()) {
      let response;
      try {
        response = await fetch(`${authBaseUrl}/request-password-reset`, {
          method: 'POST',
          headers: { 'content-type': 'application/json', accept: 'application/json' },
          body: JSON.stringify({
            email: row.email,
            redirectTo: `${siteUrl}/update-password`,
          }),
          signal: AbortSignal.timeout(15000),
        });
      } catch {
        failed += 1;
        console.error(`Request ${index + 1}/${rows.length}: network error`);
        await delay(500);
        continue;
      }

      if (response.ok) {
        requested += 1;
      } else {
        failed += 1;
        console.error(`Request ${index + 1}/${rows.length}: HTTP ${response.status}`);
      }
      // Keep requests sequential to avoid hammering the managed auth endpoint.
      await delay(500);
    }

    console.log(`Reset requests accepted: ${requested}`);
    console.log(`Requests with errors: ${failed}`);
    if (failed > 0) process.exitCode = 1;
  }
} finally {
  await sql.end({ timeout: 5 });
}
