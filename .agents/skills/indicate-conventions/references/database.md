# Database reference

Source of truth: `docs/MIGRATIONS.md`, `src/data/`.

## Layout

- `src/data/schema/` — Drizzle table definitions: `billing`, `content`, `editorial`, `identity`, `operations`, `runtime-config`.
- `src/data/client.ts` — `createRuntimeDatabase()` factory (pooled `DATABASE_POOL_URL`, `prepare: false`); singleton ownership lives in `src/core/config/runtime/runtime-context.ts`.
- `src/data/repos/` — repository implementations (e.g. `DrizzlePublishingRepository`, `DrizzleBillingRepository`).
- `src/data/migrations/` — forward-only, hand-written SQL + `bootstrap/indicate-schema.sql`. Only `db:bootstrap` / `db:bootstrap:check` scripts exist; no per-migration `db:*` runners.

## Migration workflow

1. Write forward-only SQL; review every migration for drift against Drizzle snapshot metadata; run deterministic source checks.
2. Back up target Supabase Postgres; review every SQL file.
3. Apply in filename order with the direct migration credential (`psql` or Supabase SQL editor).
4. Verify through the pooled runtime path: boot the app and confirm `GET /api/health` reports valid configuration. The schema-version gate (`migration_gate_events.required_version`) is enforced at runtime-context initialization when armed (missing row means disarmed); the health handler surfaces the snapshot version but does not itself block.
5. Run the full quality gate (`typecheck` + `lint` + build) before promotion.

## Evolution rules

- Expand → backfill → verify → contract across compatible releases.
- Never drop a column/table in the same release that stops writing it.
- Roll back the application to the last schema-compatible deployment; correct irreversible DB changes with a new forward migration.
- Failed migrations prevent activation; never hide failure by editing migration metadata.

## Roles (provisioned by security migrations)

- `indicate_runtime` login: non-owner, non-`BYPASSRLS`; granted only runtime table operations. Owner must set a strong rotated password and configure the pooler URL as `indicate_runtime.{projectRef}`.
- Audit Log: insert allowed, update/delete revoked.
- Migration metadata: read-only at runtime.
- Platform Permission writes reserved for the migration/administration credential.
- The direct `postgres` migration credential is never used by application requests.
