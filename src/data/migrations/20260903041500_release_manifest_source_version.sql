-- Rename the rollout-manifest source column to drop the retired env-based
-- terminology. No behavior change; the release-manifest tooling never ran
-- (zero rows) and no application code reads this column.
--
-- Body digest (reproducible): LF-normalize this file, substitute the 64-hex
-- checksum literal below with 64 zeros, SHA-256 the complete UTF-8 bytes.

ALTER TABLE public.runtime_config_release_manifests RENAME COLUMN legacy_source_version TO source_version;--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (61, 'release_manifest_source_version', 'sha256:b04b87352195d9f4d47a96475c94ba67bc9c6cf4340631cdfd9c1cf3796e0841');
