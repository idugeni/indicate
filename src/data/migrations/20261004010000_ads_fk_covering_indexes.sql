-- Covering indexes for the advertising foreign keys.
--
-- The performance advisor flags every FK without a leftmost-covering index
-- after `ads_full_schema` (v245). Tenant FKs on `organization_id` alone are
-- already covered by each table's composite primary key, but the creative,
-- placement, and slot references are not on any index's left edge: placement
-- and creative deletes would scan the event tables, and slot-side lookups
-- would scan placements and tenant settings. Eight narrow btree indexes close
-- exactly those gaps; the hot read paths (`organization_id, site_id, ...`)
-- were already indexed in v245 and are untouched here.
--
-- Tables are empty at apply time, so plain CREATE INDEX holds only a brief
-- catalog lock; CONCURRENTLY would forbid running inside the migration
-- transaction with no benefit on zero rows.
--
-- Ledger version 246 follows the live `max(version)`, which is 245.
--
-- Body digest (reproducible): LF-normalize this file, substitute the 64-hex
-- checksum literal below with 64 zeros, SHA-256 the complete UTF-8 bytes.
CREATE INDEX "ad_placements_organization_creative_idx" ON "public"."ad_placements" USING btree ("organization_id","creative_id");--> statement-breakpoint
CREATE INDEX "ad_placements_slot_idx" ON "public"."ad_placements" USING btree ("slot_id");--> statement-breakpoint
CREATE INDEX "tenant_ad_settings_organization_creative_idx" ON "public"."tenant_ad_settings" USING btree ("organization_id","creative_id");--> statement-breakpoint
CREATE INDEX "tenant_ad_settings_slot_idx" ON "public"."tenant_ad_settings" USING btree ("slot_id");--> statement-breakpoint
CREATE INDEX "ad_impressions_organization_placement_idx" ON "public"."ad_impressions" USING btree ("organization_id","placement_id");--> statement-breakpoint
CREATE INDEX "ad_impressions_organization_creative_idx" ON "public"."ad_impressions" USING btree ("organization_id","creative_id");--> statement-breakpoint
CREATE INDEX "ad_clicks_organization_placement_idx" ON "public"."ad_clicks" USING btree ("organization_id","placement_id");--> statement-breakpoint
CREATE INDEX "ad_clicks_organization_creative_idx" ON "public"."ad_clicks" USING btree ("organization_id","creative_id");--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (246, 'ads_fk_covering_indexes', 'sha256:5b23261222a15b2fd902f36b921a968fa5ee5151d492a4a7be38ba73127935c9');
