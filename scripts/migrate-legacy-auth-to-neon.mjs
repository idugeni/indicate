#!/usr/bin/env node
/**
 * Additive migration from imported legacy auth.users into Neon Managed Auth.
 * No legacy rows are deleted. Dry-run is the default.
 *
 * Each new Neon account gets a cryptographically random, unique bootstrap
 * password that is never logged or persisted. Users must use the account
 * recovery flow to choose their own password after SMTP/recovery is verified.
 */
import postgres from 'postgres';
import { randomBytes, randomUUID } from 'node:crypto';

const apply = process.argv.includes('--apply');
const confirmed = process.argv.includes('--confirm-neon-auth-migration');
const databaseUrl = process.env.DATABASE_DIRECT_URL?.trim();
const authBaseUrl = process.env.NEON_AUTH_BASE_URL?.trim()?.replace(/\/+$/u, '');

if (!databaseUrl || !authBaseUrl) {
  console.error('Required: DATABASE_DIRECT_URL and NEON_AUTH_BASE_URL.');
  process.exit(2);
}
if (apply && !confirmed) {
  console.error('Apply mode requires --confirm-neon-auth-migration.');
  process.exit(2);
}

const db = postgres(databaseUrl, { max: 1, connect_timeout: 15, idle_timeout: 5 });
const requestId = 'neon-auth-migration-' + randomUUID();
const summary = {
  mode: apply ? 'apply' : 'dry-run',
  legacyAuthAccounts: 0,
  neonAccountsCreated: 0,
  existingNeonAccountsReused: 0,
  localProfilesLinked: 0,
  skippedMissingEmail: 0,
  skippedUnverifiedEmail: 0,
  errors: 0,
};

function displayName(metadata, email) {
  const candidate = metadata && typeof metadata === 'object'
    ? (metadata.full_name || metadata.name || metadata.display_name)
    : null;
  return (typeof candidate === 'string' && candidate.trim() ? candidate.trim() : email.split('@')[0]).slice(0, 200);
}

async function findNeonUser(email) {
  const rows = await db.unsafe(
    'SELECT id, email, "emailVerified" AS email_verified FROM neon_auth."user" WHERE lower(email) = $1 LIMIT 1',
    [email],
  );
  return rows[0] || null;
}

async function createNeonUser(legacy, email) {
  const response = await fetch(authBaseUrl + '/sign-up/email', {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({
      email,
      name: displayName(legacy.raw_user_meta_data, email),
      password: randomBytes(48).toString('base64url'),
    }),
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) {
    // Do not print response bodies; they may contain personal data.
    throw new Error('Neon Auth sign-up endpoint returned HTTP ' + response.status);
  }
  await response.arrayBuffer(); // Consume without logging token or user payload.
}

async function linkLocalProfile(legacy, neonUser) {
  // Migration may link only a legacy identity whose email was confirmed by the
  // source provider. Unverified legacy accounts must complete the Neon Auth
  // verification flow before their local profile can be linked.
  if (!legacy.email_confirmed_at || neonUser.email_verified !== true) {
    summary.skippedUnverifiedEmail += 1;
    return;
  }

  const rows = await db.unsafe(
    'SELECT id, neon_auth_user_id FROM public.users WHERE auth_user_id = $1 LIMIT 2',
    [legacy.id],
  );
  if (rows.length > 1) throw new Error('Legacy identity maps to multiple local profiles');
  if (!rows.length) return;

  const local = rows[0];
  if (local.neon_auth_user_id && local.neon_auth_user_id !== neonUser.id) {
    throw new Error('Local profile already links to a different Neon Auth identity');
  }

  let didLink = false;
  await db.begin(async (tx) => {
    const currentRows = await tx.unsafe(
      'SELECT neon_auth_user_id FROM public.users WHERE id = $1 FOR UPDATE',
      [local.id],
    );
    const current = currentRows[0];
    if (!current) throw new Error('Local profile disappeared during identity migration');
    if (current.neon_auth_user_id && current.neon_auth_user_id !== neonUser.id) {
      throw new Error('Local profile already links to a different Neon Auth identity');
    }

    if (!current.neon_auth_user_id) {
      // The database guard requires a transaction-local linkage intent. The
      // email-confirmation check above is the migration's source-of-truth gate.
      await tx.unsafe("SELECT set_config('app.neon_auth_identity_link', 'on', true)");
      const updated = await tx.unsafe(
        'UPDATE public.users SET neon_auth_user_id = $1, updated_at = now() WHERE id = $2 AND auth_user_id = $3 AND neon_auth_user_id IS NULL RETURNING id',
        [neonUser.id, local.id, legacy.id],
      );
      if (updated.length !== 1) {
        throw new Error('Identity link did not persist; legacy data was not deleted');
      }
      didLink = true;
    }

    await tx.unsafe(
      'INSERT INTO public.identity_link_audit_logs (local_user_id, legacy_auth_user_id, neon_auth_user_id, request_id) SELECT $1, $2, $3, $4 WHERE NOT EXISTS (SELECT 1 FROM public.identity_link_audit_logs WHERE local_user_id = $1 AND legacy_auth_user_id = $2 AND neon_auth_user_id = $3)',
      [local.id, legacy.id, neonUser.id, requestId],
    );
  });

  if (didLink) summary.localProfilesLinked += 1;
}

try {
  const legacyUsers = await db.unsafe(
    "SELECT id, email, raw_user_meta_data, email_confirmed_at FROM auth.users WHERE deleted_at IS NULL AND email IS NOT NULL AND btrim(email) <> '' ORDER BY created_at, id",
  );
  summary.legacyAuthAccounts = legacyUsers.length;
  const noEmail = await db.unsafe(
    "SELECT count(*)::int AS count FROM auth.users WHERE deleted_at IS NULL AND (email IS NULL OR btrim(email) = '')",
  );
  summary.skippedMissingEmail = noEmail[0]?.count || 0;
  const profiles = await db.unsafe(
    'SELECT count(*)::int AS total, count(*) FILTER (WHERE neon_auth_user_id IS NOT NULL)::int AS linked FROM public.users',
  );
  console.log(JSON.stringify({
    phase: 'preflight',
    mode: summary.mode,
    legacyAuthAccounts: summary.legacyAuthAccounts,
    legacyAccountsWithoutEmail: summary.skippedMissingEmail,
    localProfiles: profiles[0]?.total || 0,
    localProfilesAlreadyLinked: profiles[0]?.linked || 0,
    note: apply ? 'Applying additive account migration.' : 'Dry-run only; no writes performed.',
  }));

  for (const legacy of legacyUsers) {
    const email = String(legacy.email).trim().toLowerCase();
    try {
      let neonUser = await findNeonUser(email);
      if (!neonUser) {
        if (!apply) continue;
        await createNeonUser(legacy, email);
        neonUser = await findNeonUser(email);
        if (!neonUser) throw new Error('Sign-up succeeded but user was not queryable');
        summary.neonAccountsCreated += 1;
      } else {
        summary.existingNeonAccountsReused += 1;
      }

      // Preserve verification only when the legacy provider confirmed it.
      if (apply && legacy.email_confirmed_at && neonUser.email_verified !== true) {
        await db.unsafe(
          'UPDATE neon_auth."user" SET "emailVerified" = true, "updatedAt" = now() WHERE id = $1',
          [neonUser.id],
        );
        neonUser.email_verified = true;
      }
      if (apply) await linkLocalProfile(legacy, neonUser);
    } catch (error) {
      summary.errors += 1;
      console.error(JSON.stringify({
        event: 'account_migration_error',
        email: '[redacted]',
        legacyAuthUserId: legacy.id,
        error: error instanceof Error ? error.message : 'Unknown migration error',
      }));
    }
  }

  if (apply) {
    const state = await db.unsafe(
      'SELECT (SELECT count(*)::int FROM neon_auth."user") AS neon_auth_users, (SELECT count(*)::int FROM public.users) AS local_profiles, (SELECT count(*)::int FROM public.users WHERE neon_auth_user_id IS NOT NULL) AS linked_profiles, (SELECT count(*)::int FROM public.users WHERE neon_auth_user_id IS NULL) AS unlinked_profiles',
    );
    console.log(JSON.stringify({ phase: 'postflight', ...state[0] }));
  }
  console.log(JSON.stringify({ phase: 'summary', ...summary }));
  if (summary.errors > 0) process.exitCode = 1;
} finally {
  await db.end({ timeout: 5 });
}
