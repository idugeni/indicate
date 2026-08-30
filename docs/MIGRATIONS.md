# Database migration operations

Indicate uses forward-only Drizzle PostgreSQL migrations in `drizzle/`. Runtime traffic uses `DATABASE_POOL_URL` with prepared statements disabled; migrations use the separate `DATABASE_DIRECT_URL` credential.

## Promotion gate

1. Run deterministic source checks and `npm run policy:migrations`.
2. Back up the target Supabase PostgreSQL database and review every SQL migration.
3. Run `npm run db:migrate` with the direct migration credential.
4. Run `npm run db:check` through the pooled runtime path. Application activation is blocked unless the required schema version is present.
5. Run the complete stage quality gate before promotion.

## Evolution and rollback

Schema changes follow expand, backfill, verify, and contract across compatible releases. Existing columns or tables are not dropped in the same release that stops writing them. Application rollback targets the last schema-compatible deployment; irreversible database changes are corrected with a new forward migration. Failed migrations prevent activation and must never be hidden by changing migration metadata manually.

## Supabase roles

The security migrations create the dedicated `indicate_runtime` login as a non-owner, non-`BYPASSRLS` role, enable and force tenant RLS, grant only runtime table operations, reserve platform Permission writes for the migration/administration credential, allow Audit Log insertion while revoking update/delete, and make migration metadata read-only. Migration `0003_stage2_authorization_hardening.sql` adds reciprocal Membership/Telegram coherence and serializes active mapping writes on the Membership row; runtime Membership role changes deactivate affected Telegram mappings atomically before changing the Role. The Supabase database owner must assign a strong rotated password to this login and configure the transaction-pooler URL as `indicate_runtime.{projectRef}` after review. The direct `postgres` migration credential remains separate and is never used by application requests.
