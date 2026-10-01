# Database migration operations

> **Status:** Advisory (relaxed 2026-09-14 — warns, does not block without owner sign-off).
> **Owner:** Platform team.
> **Source of truth:** `src/data/migrations/` applied in `src/data/migrations/meta/_journal.json` order with `DATABASE_DIRECT_URL`; runtime reads via `DATABASE_POOL_URL`.
> **Related:** [architecture](architecture.md) · [release](release.md)

Indicate uses forward-only Drizzle PostgreSQL migrations in `src/data/migrations/` by default (history edits allowed in development with reviewer approval). Runtime traffic uses `DATABASE_POOL_URL` with prepared statements disabled; migrations use the separate `DATABASE_DIRECT_URL` credential.

## Reaching the direct credential

`DATABASE_DIRECT_URL` accepts two equivalent shapes, and the choice is forced by the network rather than by preference:

```text
postgresql://postgres:<password>@db.<ref>.supabase.co:5432/postgres
postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres
```

Supabase publishes a project's direct host as **AAAA-only** in some regions. `indicate-sg` is one: `db.cmqipmerhfpfqoeasibs.supabase.co` has no A record at all, so on an IPv4-only workstation `getaddrinfo` returns `ENOTFOUND` and no URL pointing at it can ever connect. Port 5432 on the pooler is the same database reached over IPv4, with the same password, and `postgres` there carries `BYPASSRLS`, `CREATEDB`, and `CREATEROLE` — everything a migration needs. The pooler itself dials the database over the IPv6 address, which is why the client side is the only part that has to be IPv4.

Diagnose it with `resolve4` and `resolve6` on the host rather than by retrying the connection: a `ENODATA` on A next to a populated AAAA is the fingerprint, and it is not a local resolver fault, since `1.1.1.1` and `8.8.8.8` return the same split. The Supavisor username must carry the ref as `<user>.<ref>`; a bare `postgres` is refused with `no tenant identifier provided`, and `bootstrap-schema.ts` rejects a pooler URL whose username lacks the ref, so the project binding stays in the configuration rather than at connect time.

`DATABASE_POOL_URL` takes the same two shapes, so one project's credentials can point at one host without the pair drifting apart.

### Proving the identity guard before it reaches a deployment

`SUPABASE_PROJECT_REF` is what makes the guard live, and the guard is fail-closed: `validateBootstrapConfig` refuses to produce a configuration, so a mismatch stops the application booting. That makes the ref worth proving before it lands in an environment, and the values it needs are exactly the ones the Vercel API will not return — both database URLs are `visibility: secret`, so `get_project_env` answers `decrypted: false` and only a human can read them from the dashboard.

`npm run check:bootstrap-identity` runs the same rule offline, with no database connection, and prints the verdict per field. It accepts `--env <file>` or explicit `--ref`, `--supabase-url`, `--pool`, and `--direct` flags, exits 0 when the guard would pass and 1 when it would refuse, and never prints a password:

```text
$ npm run check:bootstrap-identity -- --env .env
project ref: cmqipmerhfpfqoeasibs
  ok   NEXT_PUBLIC_SUPABASE_URL host cmqipmerhfpfqoeasibs.supabase.co
  ok   DATABASE_POOL_URL indicate_runtime.cmqipmerhfpfqoeasibs@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres
  ok   DATABASE_DIRECT_URL postgres.cmqipmerhfpfqoeasibs@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres
bootstrap identity guard would pass.
```

Run it against the dashboard's production values before adding `SUPABASE_PROJECT_REF` there. If it refuses, the env var is what is wrong, not the ref.

## Promotion gate (recommended, not blocking)

1. Run deterministic source checks and review every migration for drift against the Drizzle snapshot metadata.
2. Back up the target Supabase PostgreSQL database and review every SQL migration.
3. Apply each reviewed SQL file in the order recorded by Drizzle's `src/data/migrations/meta/_journal.json` (which follows filename order) with the direct migration credential (via `psql` or the Supabase SQL editor).
4. Verify through the pooled runtime path: start the application and confirm `GET /api/health` reports a valid configuration and the expected Postgres snapshot version. The gate is armed since migration 197: `assertSchemaGate` reads the newest `migration_gate_events.required_version` and refuses to activate when the applied ledger is behind it, so a promotion that skips a migration fails the next boot instead of drifting silently. A refusal writes `actual_version` next to `required_version` and names the ledger's `applied_at` in the error, so the incident answer is in the log and in the table. Disarm only by inserting a newer gate row with a lower `required_version`, never by deleting one.
5. Run the quality gate before promotion when practical; a failed check warns but does not hard-block promotion without owner sign-off.

## Claiming a ledger version (multi-session rule)

`indicate_schema_migrations.version` is shared across parallel sessions: before numbering a new migration, read the `_journal.json` tail AND live `max(version)` — a double-claimed version (v164, Sep 2026) only surfaces at apply time. New file checksum = SHA-256 over LF-normalized bytes with the checksum literal zeroed; verify with the match check before `db:bootstrap`, then regen + `db:bootstrap:check`.

## Evolution and rollback

Schema changes follow expand, backfill, verify, and contract across compatible releases by default. Existing columns or tables should not be dropped in the same release that stops writing them, but exceptions are allowed in development with reviewer approval. (Known exception, do not repeat without approval: `20260903021500_delivery_activation_enums.sql` dropped `domain_activation_attempts.phase` without a paired contract release.) Application rollback targets the last schema-compatible deployment; irreversible database changes are corrected with a new forward migration. Failed migrations prevent activation and should not be hidden by changing migration metadata manually outside development.

## Retention

`audit_logs` is insert-only by design and is never swept: rows accumulate permanently and are exported to WORM storage (`audit_worm_export`, `src/modules/audit/audit-worm-export.ts`) by the daily cron `/api/internal/maintenance/worm-export` (`30 5 * * *` UTC). That cron was absent from `vercel.json` between 2026-09-22 and 2026-10-01, so no `worm/` object was written after 2026-09-12 until it was restored; the missed days are recovered per date with `?date=YYYY-MM-DD`, which the route accepts because the bucket is `worm-indefinite` locked and existing keys are skipped. Verify coverage by the `worm/<YYYY-MM-DD>/` prefixes in the bucket, not by `retention_runs`, whose rows are stamped with the run time. No scheduled DELETE exists for it. `retention_sweep()` compacts operational queues (`org_invitations`, `webhook_replay_claims`, `object_cleanup_tasks`, `invalidation_tasks`, `publication_transition_receipts`), keeps only the cache bypasses that are currently active, and keeps `media_key_reservations` honest: a reservation past its deadline that never produced a `media` row is flipped to `expired`, a `used` reservation with no `media` row after a three-day grace is deleted as an upload that never landed, and an abandoned reservation (past deadline, never completed, never `occupied`, no `media` row, no open cleanup task) enqueues `object_cleanup_tasks` (`reservation.abandoned`, object plus `-thumb` variant) so the five-minute reconciler deletes the orphaned bytes via `deleteExact`. A portal bypasses the cache only while its invalidation is in flight, so the sweep deletes a `cache_bypasses` row once the bypass is off: `readBypassed()` already treats a missing row as "not bypassing", which keeps the table meaning "is this portal bypassing right now" instead of growing to one row per portal forever. The grace is three days because an upload is authorized for minutes, so three days is roughly four hundred times the real window. An expired reservation keeps its row as an audit trail, which is why the object key carries a partial unique index (`WHERE status <> 'expired'`): without it the `ON CONFLICT DO NOTHING` in `reserveMediaCandidate` would answer `occupied` for that key forever. Orphan history for removed categories is deleted by explicit forward migration (precedent: `20260925030000_retention_runs_drop_telegram_history.sql`).

## Column coverage

No column-level audit is maintained. The earlier hand-audit was retired on
2026-09-29: its numbers were produced by manual inspection with no generator
behind them, so every schema or query change invalidated it silently, and a
stale table of "unused" columns is worse than none. The rule that governs which
columns a change may reach lives in `AGENTS.md` under "Database access &
egress" — projection minimum, tenant-scoped reads, and the six-step change
gate. A retired table leaves its trace in the migration that dropped it.

## Ledger gap at 187

Production carries ledger row 187, `author_newsroom_profile`, whose SQL was
never committed here. Only its digest survives, so the checksum can never be
matched and the gap stays visible rather than being papered over. Its entire
effect was the newsroom author row, so migration 192 states that effect as an
idempotent, guarded UPDATE: a database built from the bootstrap converges on the
same author profile, and production matches zero rows and takes no version churn.
Never rewrite a ledger checksum to match a file nobody wrote.

## Unused-index watchlist (monitor only, never drop blind)

Pre-traffic advisors flag unused indexes that turn needed at volume (standing policy in `20260903035500_billing_advisor_hardening.sql`). Known case: `runtime_config_revisions_environment_idx` reads only through `read_runtime_config_revision()`, which casts the column (`environment::text`), defeating the btree — leave the index in place; if the flag ever blocks, cast the parameter instead of the column.

## Supabase roles

The security migrations create the dedicated `indicate_runtime` login as a non-owner, non-`BYPASSRLS` role, enable and force tenant RLS, grant only runtime table operations, reserve platform Permission writes for the migration/administration credential, allow Audit Log insertion while revoking update/delete, and make migration metadata read-only. Migration `20260903001500_authorization_hardening.sql` adds reciprocal Membership/Telegram coherence and serializes active mapping writes on the Membership row; runtime Membership role changes deactivate affected Telegram mappings atomically before changing the Role. The Supabase database owner must assign a strong rotated password to this login and configure the transaction-pooler URL as `indicate_runtime.{projectRef}` after review. The direct `postgres` migration credential remains separate and is never used by application requests.
