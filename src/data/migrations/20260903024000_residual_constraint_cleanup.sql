-- Residual constraint cleanup: drop constraints the live database carries
-- that schema.ts never declared.
--
-- - `*_version_positive` on cache/publication/webhook policies: siblings of a
--   family that schema.ts only declares on some tables; the policy tables
--   here rely on their primary key and version guards in writers.
-- - `runtime_config_invalidation_intents_runtime_revision_fkey`: an inline
--   foreign key with no schema.ts declaration; intents reference revisions
--   loosely by design (leased workers must never block on revision rows).
-- Every touched table was verified empty: metadata-only, no row risk.

ALTER TABLE "cache_policy" DROP CONSTRAINT "cache_policy_version_positive";--> statement-breakpoint
ALTER TABLE "publication_policy" DROP CONSTRAINT "publication_policy_version_positive";--> statement-breakpoint
ALTER TABLE "webhook_policy" DROP CONSTRAINT "webhook_policy_version_positive";--> statement-breakpoint
ALTER TABLE "runtime_config_invalidation_intents" DROP CONSTRAINT "runtime_config_invalidation_intents_runtime_revision_fkey";

INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (34, 'residual_constraint_cleanup', 'residual-constraint-cleanup-v1');
