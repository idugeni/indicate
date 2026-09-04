-- Extend existing relations for database-backed runtime configuration:
-- typed Site Settings columns, global unique non-null Cloudflare zone IDs,
-- permission seeds, and forced RLS on the tenant-scoped config tables.

-- Typed Site Settings columns. Nullable during backfill; a deferred active-Site
-- guard (0023) makes them required once backfilled data satisfies it.
ALTER TABLE public.site_settings
  ADD COLUMN locale text NULL,
  ADD COLUMN seo_default_title text NULL,
  ADD COLUMN seo_default_description text NULL,
  ADD COLUMN seo_robots_directive text NULL,
  ADD COLUMN seo_open_graph_site_name text NULL,
  ADD COLUMN seo_schema_version integer NULL;--> statement-breakpoint

ALTER TABLE public.site_settings
  ADD CONSTRAINT site_settings_locale_shape CHECK (locale IS NULL OR locale ~ '^[a-z]{2}-[A-Z]{2}$'),
  ADD CONSTRAINT site_settings_seo_robots_directive_shape CHECK (
    seo_robots_directive IS NULL OR seo_robots_directive IN ('index,follow', 'noindex,nofollow')
  ),
  ADD CONSTRAINT site_settings_seo_schema_version_bounds CHECK (
    seo_schema_version IS NULL OR (seo_schema_version BETWEEN 1 AND 2147483647)
  );--> statement-breakpoint

-- Global uniqueness of non-null Cloudflare Zone IDs across Domain records.
CREATE UNIQUE INDEX domains_cloudflare_zone_id_unique
  ON public.domains (cloudflare_zone_id)
  WHERE cloudflare_zone_id IS NOT NULL;--> statement-breakpoint

-- Platform runtime-config and Site Settings manage permissions. Explicitly not
-- assigned to any Role; administrators attach them to approved Roles.
INSERT INTO public.permissions (id, organization_id, name, scope, description)
VALUES
  ('00000000-0000-4000-8000-000000006002', NULL, 'platform.runtime_config.manage', 'platform', 'Mutate shared runtime configuration and provider mappings'),
  ('00000000-0000-4000-8000-000000006003', NULL, 'site_settings.manage', 'platform', 'Mutate Site Settings for a Site')
ON CONFLICT DO NOTHING;--> statement-breakpoint

-- Forced RLS on tenant-scoped configuration tables. Shared tables and policy
-- tables remain governed by revoked-DML + security-definer functions instead.
ALTER TABLE public.runtime_config_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.runtime_config_audit_logs FORCE ROW LEVEL SECURITY;
ALTER TABLE public.runtime_config_invalidation_intents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.runtime_config_invalidation_intents FORCE ROW LEVEL SECURITY;--> statement-breakpoint

-- Tenant isolation: same-Organization predicate for the config audit log. Denials
-- and cross-tenant reads store null org and remain readable only in context.
CREATE POLICY runtime_config_audit_tenant_isolation
  ON public.runtime_config_audit_logs
  USING (
    organization_id IS NULL
      OR organization_id = indicate_private.current_organization_id()
  )
  WITH CHECK (
    organization_id IS NULL
      OR organization_id = indicate_private.current_organization_id()
  );--> statement-breakpoint

CREATE POLICY runtime_config_invalidation_tenant_isolation
  ON public.runtime_config_invalidation_intents
  USING (
    organization_id IS NULL
      OR organization_id = indicate_private.current_organization_id()
  )
  WITH CHECK (
    organization_id IS NULL
      OR organization_id = indicate_private.current_organization_id()
  );--> statement-breakpoint

INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (22, 'runtime_config_site_settings_zone_rls', 'runtime-config-site-settings-zone-rls-v1');