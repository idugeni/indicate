-- Covering indexes for single-column foreign keys flagged by the advisor.
--
-- A composite index does not cover an FK on its non-leftmost column, so
-- `dashboard_access_keys(user_id)` and both AI routing provider references
-- need their own leftmost indexes. Tiny tables, same pattern as the other
-- single-column FK indexes in this schema.
CREATE INDEX IF NOT EXISTS dashboard_access_keys_user_idx ON public.dashboard_access_keys (user_id);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS ai_routing_policies_primary_provider_idx ON public.ai_routing_policies (primary_provider_id);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS ai_routing_policies_fallback_provider_idx ON public.ai_routing_policies (fallback_provider_id);--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (233, 'fk_covering_indexes', 'sha256:7aef372626c821c17160bbdd5cecf86572e1783d350c0620210a315fd5ff86ae');
