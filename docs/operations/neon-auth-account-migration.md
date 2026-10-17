# Neon Auth account migration

This additive migration copies legacy `auth.users` identities into Neon Managed Auth. It preserves local user IDs, organization memberships, and application RBAC by populating `public.users.neon_auth_user_id` and appending identity-link audit rows. It does not delete legacy accounts, tables, or schemas.

## Preconditions

- Take and verify a restorable backup of the target Neon branch.
- Confirm `DATABASE_DIRECT_URL` and `NEON_AUTH_BASE_URL` point to the same branch.
- Confirm email/password sign-up and account recovery are configured.
- Run dry-run first, then Preview only.
- Verify login, sessions, logout, email verification/recovery, Super Admin, access-key login, memberships, RBAC, and tenant isolation before Production.
- Keep legacy `auth.users` until every identity is reconciled and rollback is no longer needed.

## Dry run

Set `DATABASE_DIRECT_URL` and `NEON_AUTH_BASE_URL` securely, then run:

```sh
node scripts/migrate-legacy-auth-to-neon.mjs
```

Dry-run is the default and performs no writes.

## Apply

After reviewing the dry-run and confirming the target is Preview, run:

```sh
node scripts/migrate-legacy-auth-to-neon.mjs --apply --confirm-neon-auth-migration
```

The script gives each newly created account a unique random bootstrap password that is never logged or persisted. Users must use the configured account-recovery flow to set their own passwords. This is intentionally safer than applying one shared password to all accounts.

Do not run against Production until Preview passes the full auth/RBAC regression suite. The script is idempotent by email and local identity mapping. Conflicting identity links are reported and left unchanged. Any errors mean migration is incomplete.

## Interpretation and limitations

- All non-deleted legacy auth users with an email are candidates for migration.
- Legacy users without a local `public.users` row can be created in Neon Auth but do not receive a local profile link.
- Email verification is preserved only if the legacy provider confirmed it.
- Legacy password hashes are not copied. Newly created accounts require account recovery before users can choose their password.
- No legacy auth data is removed. Reconcile counts and test real sign-ins before any eventual legacy-schema cleanup.
