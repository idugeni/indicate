-- Stale object cleanup: drop constraints that schema.ts no longer declares
-- and rename the rest to their declared names.
--
-- Context: several hand-written migrations created auto-named foreign keys,
-- duplicate bounding checks, and misnamed checks that schema.ts never
-- declared, while a few declared names exceed Postgres' 63-byte identifier
-- limit and were truncated on creation. Every touched table was verified
-- empty before this migration, so every statement below is metadata-only.
--
-- 1. Drop superseded auto-named foreign keys (replaced by the explicit
--    short-named constraints from 20260903022000, or renamed below).
-- 2. Drop the truncated over-long constraints created by 20260903022000
--    (Postgres truncates identifiers to 63 bytes; schema.ts now declares
--    short explicit names instead).
-- 3. Rename surviving constraints to their schema.ts names.
-- 4. Drop stale checks: duplicate webhook bounds, singleton checks on policy
--    tables that schema.ts does not declare (uniqueness is enforced by the
--    primary key), and the duplicate publication retry check.
-- 5. Add the parity-evidence timestamps schema.ts declares.

ALTER TABLE "cache_bypasses" DROP CONSTRAINT "cache_bypasses_organization_id_fkey";--> statement-breakpoint
ALTER TABLE "platform_user_permissions" DROP CONSTRAINT "platform_user_permissions_user_id_fkey";--> statement-breakpoint
ALTER TABLE "platform_user_permissions" DROP CONSTRAINT "platform_user_permissions_permission_id_fkey";--> statement-breakpoint
ALTER TABLE "telegram_conversations" DROP CONSTRAINT "telegram_conversations_organization_id_fkey";--> statement-breakpoint
ALTER TABLE "runtime_config_backfill_runs" DROP CONSTRAINT "runtime_config_backfill_runs_manifest_id_runtime_config_release";--> statement-breakpoint
ALTER TABLE "runtime_config_parity_evidence" DROP CONSTRAINT "runtime_config_parity_evidence_manifest_id_runtime_config_relea";--> statement-breakpoint
ALTER TABLE "runtime_config_release_domain_zones" DROP CONSTRAINT "runtime_config_release_domain_zones_manifest_id_runtime_config_";--> statement-breakpoint
ALTER TABLE "runtime_config_backfill_runs" RENAME CONSTRAINT "runtime_config_backfill_runs_manifest_id_fkey" TO "runtime_config_backfill_runs_manifest_fk";--> statement-breakpoint
ALTER TABLE "runtime_config_parity_evidence" RENAME CONSTRAINT "runtime_config_parity_evidence_manifest_id_fkey" TO "runtime_config_parity_evidence_manifest_fk";--> statement-breakpoint
ALTER TABLE "runtime_config_release_domain_zones" RENAME CONSTRAINT "runtime_config_release_domain_zones_manifest_id_fkey" TO "runtime_config_release_domain_zones_manifest_fk";--> statement-breakpoint
ALTER TABLE "runtime_config_release_domain_zones" RENAME CONSTRAINT "runtime_config_release_domain_zones_pkey" TO "runtime_config_release_domain_zones_pk";--> statement-breakpoint
ALTER TABLE "publication_transition_receipts" RENAME CONSTRAINT "publication_transition_receipts_organization_id_organizations_i" TO "publication_transition_receipts_organization_fk";--> statement-breakpoint
ALTER TABLE "runtime_config_backfill_runs" RENAME CONSTRAINT "runtime_config_backfill_counts_nonnegative" TO "runtime_config_backfill_created_nonnegative";--> statement-breakpoint
ALTER TABLE "media_policy" RENAME CONSTRAINT "media_policy_mimes_nonempty" TO "media_policy_mime_nonempty";--> statement-breakpoint
ALTER TABLE "shared_deployment_config" RENAME CONSTRAINT "shared_deployment_config_id_singleton" TO "shared_deployment_config_singleton";--> statement-breakpoint
ALTER TABLE "webhook_replay_claims" DROP CONSTRAINT "webhook_replay_claims_attempt_count_check";--> statement-breakpoint
ALTER TABLE "webhook_replay_claims" DROP CONSTRAINT "webhook_replay_claims_body_digest_check";--> statement-breakpoint
ALTER TABLE "webhook_replay_claims" DROP CONSTRAINT "webhook_replay_claims_identity_binding_check";--> statement-breakpoint
ALTER TABLE "webhook_replay_claims" DROP CONSTRAINT "webhook_replay_claims_pending_terminal_check";--> statement-breakpoint
ALTER TABLE "cache_policy" DROP CONSTRAINT "cache_policy_id_singleton";--> statement-breakpoint
ALTER TABLE "media_policy" DROP CONSTRAINT "media_policy_id_singleton";--> statement-breakpoint
ALTER TABLE "publication_policy" DROP CONSTRAINT "publication_policy_id_singleton";--> statement-breakpoint
ALTER TABLE "webhook_policy" DROP CONSTRAINT "webhook_policy_id_singleton";--> statement-breakpoint
ALTER TABLE "publication_policy" DROP CONSTRAINT "publication_policy_retry_le_attempts";--> statement-breakpoint
ALTER TABLE "articles" DROP CONSTRAINT "articles_lead_media_fk";--> statement-breakpoint
ALTER TABLE "runtime_config_parity_evidence" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "runtime_config_parity_evidence" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;

INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (31, 'stale_object_cleanup', 'stale-object-cleanup-v1');
