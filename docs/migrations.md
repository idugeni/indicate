# Database migration operations

> **Status:** Advisory (relaxed 2026-09-14 — warns, does not block without owner sign-off).
> **Owner:** Platform team.
> **Source of truth:** `src/data/migrations/` applied in `src/data/migrations/meta/_journal.json` order with `DATABASE_DIRECT_URL`; runtime reads via `DATABASE_POOL_URL`.
> **Related:** [architecture](architecture.md) · [production readiness runbook](production-readiness-runbook.md) · [release checklist](release-checklist.md)

Indicate uses forward-only Drizzle PostgreSQL migrations in `src/data/migrations/` by default (history edits allowed in development with reviewer approval). Runtime traffic uses `DATABASE_POOL_URL` with prepared statements disabled; migrations use the separate `DATABASE_DIRECT_URL` credential.

## Promotion gate (recommended, not blocking)

1. Run deterministic source checks and review every migration for drift against the Drizzle snapshot metadata.
2. Back up the target Supabase PostgreSQL database and review every SQL migration.
3. Apply each reviewed SQL file in the order recorded by Drizzle's `src/data/migrations/meta/_journal.json` (which follows filename order) with the direct migration credential (via `psql` or the Supabase SQL editor).
4. Verify through the pooled runtime path: start the application and confirm `GET /api/health` reports a valid configuration and the expected Postgres snapshot version. The `migration_gate_events.required_version` check is advisory in relaxed mode — the health handler surfaces the version but does not block activation.
5. Run the quality gate before promotion when practical; a failed check warns but does not hard-block promotion without owner sign-off.

## Claiming a ledger version (multi-session rule)

`indicate_schema_migrations.version` is shared across parallel sessions: before numbering a new migration, read the `_journal.json` tail AND live `max(version)` — a double-claimed version (v164, Sep 2026) only surfaces at apply time. New file checksum = SHA-256 over LF-normalized bytes with the checksum literal zeroed; verify with the match check before `db:bootstrap`, then regen + `db:bootstrap:check`.

## Evolution and rollback

Schema changes follow expand, backfill, verify, and contract across compatible releases by default. Existing columns or tables should not be dropped in the same release that stops writing them, but exceptions are allowed in development with reviewer approval. (Known exception, do not repeat without approval: `20260903021500_delivery_activation_enums.sql` dropped `domain_activation_attempts.phase` without a paired contract release.) Application rollback targets the last schema-compatible deployment; irreversible database changes are corrected with a new forward migration. Failed migrations prevent activation and should not be hidden by changing migration metadata manually outside development.

## Retention

`audit_logs` is insert-only by design and is never swept: rows accumulate permanently and are exported daily to WORM storage (`audit_worm_export`, `src/modules/audit/audit-worm-export.ts`). No scheduled DELETE exists for it. `retention_sweep()` only compacts operational queues (`org_invitations`, `webhook_replay_claims`, `object_cleanup_tasks`, `invalidation_tasks`, `publication_transition_receipts`); orphan history for removed categories is deleted by explicit forward migration (precedent: `20260925030000_retention_runs_drop_telegram_history.sql`).

## Unused-index watchlist (monitor only, never drop blind)

Pre-traffic advisors flag unused indexes that turn needed at volume (standing policy in `20260903035500_billing_advisor_hardening.sql`). Known case: `runtime_config_revisions_environment_idx` reads only through `read_runtime_config_revision()`, which casts the column (`environment::text`), defeating the btree — leave the index in place; if the flag ever blocks, cast the parameter instead of the column.

## Supabase roles

The security migrations create the dedicated `indicate_runtime` login as a non-owner, non-`BYPASSRLS` role, enable and force tenant RLS, grant only runtime table operations, reserve platform Permission writes for the migration/administration credential, allow Audit Log insertion while revoking update/delete, and make migration metadata read-only. Migration `20260903001500_authorization_hardening.sql` adds reciprocal Membership/Telegram coherence and serializes active mapping writes on the Membership row; runtime Membership role changes deactivate affected Telegram mappings atomically before changing the Role. The Supabase database owner must assign a strong rotated password to this login and configure the transaction-pooler URL as `indicate_runtime.{projectRef}` after review. The direct `postgres` migration credential remains separate and is never used by application requests.
