-- Schema reconciliation: enforce constraints declared in src/database/schema
-- that the live database is missing.
--
-- Curated from the `drizzle-kit generate` diff of schema.ts against snapshot
-- 0002 (everything else that diff reported — tables, columns, enum types,
-- indexes — is already reflected in the live schema through an earlier
-- migration and is deliberately NOT repeated here, so this file stays
-- replayable). Every touched table was verified empty before this migration,
-- so each ADD CONSTRAINT is a metadata-only change with no row risk.
--
-- 1. Foreign keys declared via inline references() that were never created:
--    cache_bypasses, platform_user_permissions (x2), telegram_conversations,
--    and the three runtime_config release-manifest dependents.
-- 2. `domain_activation_attempts_operation_check` in its enum-compatible
--    IN form (the text-era form was dropped by 20260903021500; schema.ts
--    still declares the check, longest label fits, so restore it).
-- 3. `webhook_replay_claims_bounded_identity` upgraded to the expression
--    schema.ts declares (adds body_digest/identity_binding_digest/attempt
--    bounds), plus the missing `webhook_replay_claims_pending_terminal`.

ALTER TABLE "cache_bypasses" ADD CONSTRAINT "cache_bypasses_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform_user_permissions" ADD CONSTRAINT "platform_user_permissions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform_user_permissions" ADD CONSTRAINT "platform_user_permissions_permission_id_permissions_id_fk" FOREIGN KEY ("permission_id") REFERENCES "public"."permissions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "telegram_conversations" ADD CONSTRAINT "telegram_conversations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "runtime_config_backfill_runs" ADD CONSTRAINT "runtime_config_backfill_runs_manifest_id_runtime_config_release_manifests_id_fk" FOREIGN KEY ("manifest_id") REFERENCES "public"."runtime_config_release_manifests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "runtime_config_parity_evidence" ADD CONSTRAINT "runtime_config_parity_evidence_manifest_id_runtime_config_release_manifests_id_fk" FOREIGN KEY ("manifest_id") REFERENCES "public"."runtime_config_release_manifests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "runtime_config_release_domain_zones" ADD CONSTRAINT "runtime_config_release_domain_zones_manifest_id_runtime_config_release_manifests_id_fk" FOREIGN KEY ("manifest_id") REFERENCES "public"."runtime_config_release_manifests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "domain_activation_attempts" ADD CONSTRAINT "domain_activation_attempts_operation_check" CHECK ("domain_activation_attempts"."operation" IN ('activate', 'deactivate'));--> statement-breakpoint
ALTER TABLE "webhook_replay_claims" DROP CONSTRAINT "webhook_replay_claims_bounded_identity";--> statement-breakpoint
ALTER TABLE "webhook_replay_claims" ADD CONSTRAINT "webhook_replay_claims_pending_terminal" CHECK ("webhook_replay_claims"."pending_status" IS NULL OR "webhook_replay_claims"."pending_status" IN ('processed', 'rejected'));--> statement-breakpoint
ALTER TABLE "webhook_replay_claims" ADD CONSTRAINT "webhook_replay_claims_bounded_identity" CHECK (length("webhook_replay_claims"."source") BETWEEN 1 AND 100 AND length("webhook_replay_claims"."replay_id") BETWEEN 1 AND 255 AND length("webhook_replay_claims"."body_digest") = 64 AND ("webhook_replay_claims"."identity_binding_digest" IS NULL OR length("webhook_replay_claims"."identity_binding_digest") = 64) AND "webhook_replay_claims"."attempt_count" > 0);

INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (30, 'schema_reconciliation', 'schema-reconciliation-v1');
