# Neon Auth account migration

This is an additive migration from the legacy auth.users records retained in
the Neon database into Neon Managed Auth. It preserves local user IDs,
organization memberships, and application RBAC by populating
public.users.neon_auth_user_id and appending identity-link audit rows.

## Preconditions

- Take and verify a restorable backup of the target Neon branch.
- Confirm DATABASE_DIRECT_URL points to the intended Neon branch/database.
- Confirm NEON_AUTH_BASE_URL points to the same branch's Neon Managed Auth.
- Confirm email/password sign-up and SMTP/email verification settings.
- Run the dry-run first and review the counts.
- Run against Preview first. Verify login, session creation, logout, verified
  email behavior, Super Admin, access-key login, organization membership, RBAC,
  and tenant isolation before Production.
- Keep legacy auth.users until every account and app identity is reconciled and
  rollback is no longer needed.

## Dry run

With DATABASE_DIRECT_URL and NEON_AUTH_BASE_URL set in a secure shell:

\`\`\`bash
node scripts/migrate-legacy-auth-to-neon.mjs
\`\`\`

Dry-run is the default and performs no writes.

## Apply

The shared temporary password must be supplied only as an environment secret;
never commit it or print it in logs. A shared password creates material
account-takeover risk and must be rotated immediately. The script requires
explicit confirmation flags:

\`\`\`bash
NEON_MIGRATION_DEFAULT_PASSWORD='(set securely)' node scripts/migrate-legacy-auth-to-neon.mjs --apply --allow-shared-password --confirm-neon-auth-migration
\`\`\`

Use a secret manager instead of shell history where possible. Do not run against
Production until Preview passes the full auth/RBAC regression suite. The script
never deletes legacy accounts or legacy auth schemas. It reuses accounts by
email and maps local profiles idempotently; conflicting identity links are
reported and left unchanged.

## Interpretation

- All non-deleted legacy auth users with an email are candidates for Neon Auth.
- Legacy users without a local public.users row are still migrated as auth
  accounts but do not receive a local profile link.
- Email verification is preserved only when the legacy provider confirmed it.
- Legacy password hashes are not copied. Newly created Neon Auth accounts
  receive the supplied temporary password; users must rotate it promptly.
- Any errors mean migration is incomplete. Do not remove legacy schemas or
  declare cutover complete until counts reconcile and real login tests pass.
