-- Tenant isolation for multi-category assignments: RLS plus runtime grants
-- plus org-scoped policies mirroring `categories` (this table carries no
-- region column, so policies check the organization only). Without this,
-- `indicate_runtime` holds zero privileges here and every dashboard read
-- touching assignments fails closed with permission denied.
-- Body digest (reproducible): LF-normalize this file, substitute the 64-hex
-- checksum literal below with 64 zeros, SHA-256 the complete UTF-8 bytes.
ALTER TABLE public.article_categories ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON public.article_categories TO indicate_runtime;--> statement-breakpoint
CREATE POLICY tenant_isolation_select ON public.article_categories FOR SELECT TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()));--> statement-breakpoint
CREATE POLICY tenant_isolation_insert ON public.article_categories FOR INSERT TO indicate_runtime WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()));--> statement-breakpoint
CREATE POLICY tenant_isolation_update ON public.article_categories FOR UPDATE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id())) WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()));--> statement-breakpoint
CREATE POLICY tenant_isolation_delete ON public.article_categories FOR DELETE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()));--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (155, 'article_categories_rls', 'sha256:b14e51c7efcf237ad19e7a19be21897cb181267fdf732c1633fbdcba5984ab2f');
