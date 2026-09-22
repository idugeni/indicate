-- Cover the retention evidence organization FK for per-org lookups.
--
-- The performance advisor flags `retention_runs_organization_id_fkey`
-- (migration 151) without a covering index. The table is tiny and
-- function-only, but per-org evidence reads should not seq-scan.
-- Body digest (reproducible): LF-normalize this file, substitute the 64-hex
-- checksum literal below with 64 zeros, SHA-256 the complete UTF-8 bytes.
CREATE INDEX retention_runs_organization_idx ON public.retention_runs (organization_id);--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (152, 'retention_runs_organization_idx', 'sha256:a4ee25332ee95056b5eb4d7f118e6aebbe09eac1ec86781ddccc1d8b2dde0ba3');
