-- Restrict tenant RLS policies to runtime role.
--
-- CREATE POLICY without TO defaults to PUBLIC. Two tenant tables missed the
-- TO indicate_runtime clause while every sibling policy targets the runtime
-- role, leaving a broader policy subject than intended even though FORCE RLS
-- plus the organization guard still applies. Recreate both with the explicit
-- role. cron.job and cron.job_run_details keep their extension-default PUBLIC
-- policies and are intentionally untouched.
-- Body digest (reproducible): LF-normalize this file, substitute the 64-hex
-- checksum literal below with 64 zeros, SHA-256 the complete UTF-8 bytes.
DROP POLICY IF EXISTS tenant_isolation ON public.article_revisions;--> statement-breakpoint
CREATE POLICY tenant_isolation ON public.article_revisions TO indicate_runtime
  USING (organization_id = indicate_private.current_organization_id())
  WITH CHECK (organization_id = indicate_private.current_organization_id());--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON public.article_site_view_days;--> statement-breakpoint
CREATE POLICY tenant_isolation ON public.article_site_view_days TO indicate_runtime
  USING (organization_id = indicate_private.current_organization_id() AND ((SELECT indicate_private.current_region_id()) IS NULL OR EXISTS (SELECT 1 FROM public.sites s WHERE s.organization_id = article_site_view_days.organization_id AND s.id = article_site_view_days.site_id AND (s.region_id IS NULL OR s.region_id = (SELECT indicate_private.current_region_id())))))
  WITH CHECK (organization_id = indicate_private.current_organization_id());--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (169, 'rls_policy_runtime_role', 'sha256:14cceb9abc54307e07fc1db361e9993d1b9e03d53feadf5ccc7490b5f5668f64');
