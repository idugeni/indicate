# PostgreSQL migrations on Neon

## Connection contract

The application database and interactive authentication are provided by Neon. Use the Neon connection values for the intended branch; never use an old Supabase endpoint.

- `DATABASE_POOL_URL`: Neon pooled connection URL, with a hostname containing `-pooler.` and TLS required.
- `DATABASE_DIRECT_URL`: direct Neon connection URL for migration/admin tasks; do not use it for request traffic.
- `NEON_AUTH_BASE_URL`: the exact Neon Managed Auth endpoint for the target branch.
- `NEON_AUTH_COOKIE_SECRET`: a random server-only signing secret, at least 32 characters.

Never commit real URLs/passwords or print environment values into logs. The runtime bootstrap requires production database URLs to use a Neon host and validates the auth URL and cookie secret.

## Release schema gate

The application pins its minimum supported schema in
`src/data/schema-version.ts`. Keep `CURRENT_REQUIRED_SCHEMA_VERSION` equal
to the number of ordered entries in `src/data/migrations/meta/_journal.json`;
the schema-gate unit test checks this contract. The runtime gate enforces the
higher of that application minimum and the latest configured database
`migration_gate_events.required_version`, even when no database gate row
exists. A deployment built from newer code therefore fails closed when the
database ledger is behind.

Production builds use the production database for prerender validation. During
`NEXT_PHASE=phase-production-build`, a rejected schema gate does not write a
failure event; it reports the mismatch and fails the build without mutating
production. Apply the reviewed migration with the migration-owner procedure
before promoting a release that requires it.

## Runtime configuration invalidation

The scheduled `/api/internal/delivery/reconcile?scope=invalidation` endpoint
processes delivery-cache tasks and the durable runtime-configuration
invalidation-intent queue. The latter claims intents through the existing
security-definer functions, applies an idempotent process-local snapshot
invalidation, and completes or reschedules each claim using its fencing token.
Snapshot versions are embedded in shared-cache keys; other warm instances
refresh from the authoritative revision when their bounded local snapshot
expires. The reconciler is restricted to the production deployment because
the database claim function operates over all runtime-config intents in its
target database.

## Review and apply a migration

1. Confirm the target Neon project and branch, and create/verify a recoverable backup before modifying schema.
2. Review the SQL file and any related Drizzle schema changes. Migrations are forward-only: do not edit already-applied historical migration files to represent a new schema.
3. Apply SQL files in the order recorded by Drizzle's `src/data/migrations/meta/_journal.json`, using `DATABASE_DIRECT_URL` and an account with the required migration privileges. Do not run DDL through the pooled runtime connection.
4. Verify the database migration ledger and check the local archive with `npm run db:bootstrap:check`. That command fails if the generated bootstrap SQL and ordered migration journal are out of sync.
5. Run the targeted integration tests, typecheck, lint, full test shards, production build, and the non-production branch smoke tests before proposing promotion.
6. For production promotion, compare required and applied schema-gate versions, run the application health probes, test sign-in/session/RBAC, and retain the previous provider and a rollback route until the Neon cutover is verified.

The Neon backup workflow is manually dispatched from GitHub Actions and requires the repository/environment secrets `NEON_DATABASE_BACKUP_URL` and `BACKUP_ENCRYPTION_KEY`. Verify that a backup artifact is actually produced and can be decrypted before relying on it for a release.

## Runtime database role and tenant isolation

The dedicated `indicate_runtime` PostgreSQL login remains a non-owner runtime role. Tenant RLS, the `indicate_private` tenant-context functions, explicit table grants, audit-log append-only behavior, and platform authorization boundaries remain enforced by PostgreSQL; changing providers does not relax these invariants.

The pooled Neon URL must use the reviewed runtime role and the production branch. The direct migration credential is held separately and is never used for ordinary application requests. Keep role passwords in the secret manager and rotate them using the database credential runbook.

## Neon Auth rollout gates

Neon Managed Auth is a distinct authentication system from the imported application database. Database import success alone does not migrate users, sessions, password hashes, or verified identities.

Before production cutover, verify the user/account/session tables in Neon Auth and prove one of these supported existing-account paths:

- a verified identity mapping from each old provider user ID to its Neon user ID, with no automatic email-only linking; or
- a documented, verified password-reset/re-enrollment flow for accounts whose credentials cannot be imported.

Check verified and unverified email, expired sessions/reset tokens, active and inactive local users, revoked organization memberships, cross-tenant access, super-admin access, dashboard access keys, and Turnstile failure/outage behavior. Preserve local organization membership, roles, permissions, audit history, and consent evidence.

## Production safety

Do not switch application production traffic as part of schema review alone. First prove that the Neon database contains every required table, column, constraint, index, trigger, function, extension, RLS policy, and migration-ledger entry. A previous import check reported one failure; that issue must be investigated and closed before cutover. Keep backups and the former provider available until rollback is no longer needed.
