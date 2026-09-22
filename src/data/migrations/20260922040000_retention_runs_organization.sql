-- Retention evidence per organization for org-erasure proof.
--
-- `erasure_sweep()` inserts `retention_runs.organization_id`, but the table
-- has no such column (live proof 2026-09-22: id, category, purged_count,
-- started_at, finished_at), so the org-erasure evidence insert fails.
-- Expand phase: add a nullable column plus FK; existing rows keep NULL
-- (historic sweeps are global, not per-org), so no backfill is required.
-- Body digest (reproducible): LF-normalize this file, substitute the 64-hex
-- checksum literal below with 64 zeros, SHA-256 the complete UTF-8 bytes.
ALTER TABLE public.retention_runs ADD COLUMN organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (151, 'retention_runs_organization', 'sha256:a153ec7a1778444b010ca498714ac37a7f4142db829be0463312fbd97fcbf33e');
