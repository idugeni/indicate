# Neon Auth account migration

This additive migration copies legacy `auth.users` identities into Neon Managed Auth. It preserves local user IDs, organization memberships, and application RBAC by populating `public.users.neon_auth_user_id` and appending identity-link audit rows. It does not delete legacy accounts, tables, or schemas.

## Preconditions

- Take and verify a restorable backup of the target Neon branch.
- Confirm `DATABASE_DIRECT_URL` and `NEON_AUTH_BASE_URL` point to the same branch.
- Confirm email/password sign-up and account recovery are configured.
- Run dry-run first. Production apply is an explicit, reviewed operation after a restorable snapshot is verified.
- Verify login, sessions, logout, email verification/recovery, Super Admin, access-key login, memberships, RBAC, and tenant isolation before removing legacy auth tables.
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

The script is idempotent by normalized email and local identity mapping. It links an existing local profile only when the legacy provider marked that email as confirmed; unverified accounts are left unlinked for the verified Neon Auth flow. Conflicting identity links are reported and left unchanged. Any errors mean migration is incomplete.

## Interpretation and limitations

- All non-deleted legacy auth users with an email are candidates for migration.
- Legacy users without a local `public.users` row can be created in Neon Auth but do not receive a local profile link.
- Email verification is preserved only if the legacy provider confirmed it.
- Legacy password hashes are not copied. Newly created accounts require account recovery before users can choose their password.
- No legacy auth data is removed. Reconcile counts and test real sign-ins before any eventual legacy-schema cleanup.


## Production execution record — 2026-10-18

- A manual Neon snapshot named `pre-production-neon-auth-cutover-2026-10-18` was created and restored to a separate branch; the restored copy was checked for the expected legacy account/profile counts before continuing.
- Production Vercel database connection variables and `NEON_AUTH_BASE_URL` were aligned to the same Neon Auth-enabled database endpoint.
- Neon Auth now contains 63 user identities. The 61 local profiles were linked one-to-one to the matching legacy auth IDs, with 61 identity-link audit rows. All 61 local profiles map to legacy identities whose source email was confirmed; the two remaining legacy identities have no local profile.
- Legacy `auth.users` and the local legacy `auth_user_id` values remain in place for rollback. No legacy schema or user rows were dropped.
- The administrative account creation operation did not set password credentials. Users must use the existing **Forgot Password** flow to establish their own password. Do not issue a shared password.
- This record confirms the database mapping and environment cutover, not a successful interactive sign-in. Production login/recovery, Super Admin, access-key login, membership/RBAC, tenant isolation, and the refreshed production deployment must be smoke-tested before removing any legacy auth schema.
