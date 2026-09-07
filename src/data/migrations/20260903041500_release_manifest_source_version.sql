-- Rename the rollout-manifest source column to drop the retired env-based
-- terminology. No behavior change; the release-manifest tooling never ran
-- (zero rows) and no application code reads this column.
--
-- Body digest (reproducible): LF-normalize this file, substitute the 64-hex
-- checksum literal below with 64 zeros, SHA-256 the complete UTF-8 bytes.

ALTER TABLE public.runtime_config_release_manifests RENAME COLUMN legacy_source_version TO source_version;--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (61, 'release_manifest_source_version', 'sha256:d964c9cc8b7f459386704716e48ec545cdd24772b249248ed956d4620462c2f7');
