-- Fix the site-settings read function: the declared return column
-- `seo_robots_directive text` received the raw enum value, so every call
-- failed with "structure of query does not match function result type"
-- (even on an empty table). Cast to text like the sibling media-state
-- column already does. Signature unchanged, so CREATE OR REPLACE suffices.
--
-- Body digest (reproducible): LF-normalize this file, substitute the 64-hex
-- checksum literal below with 64 zeros, SHA-256 the complete UTF-8 bytes.

CREATE OR REPLACE FUNCTION indicate_private.read_runtime_config_site_settings()
RETURNS TABLE (
  organization_id uuid,
  site_id uuid,
  locale text,
  seo_default_title text,
  seo_default_description text,
  seo_robots_directive text,
  seo_open_graph_site_name text,
  seo_schema_version integer,
  fallback_media_id uuid,
  fallback_media_object_key text,
  fallback_media_state text,
  fallback_media_organization_id uuid,
  version integer
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, indicate_private
AS $$
BEGIN
  RETURN QUERY
  SELECT ss.organization_id, ss.site_id, ss.locale, ss.seo_default_title,
         ss.seo_default_description, ss.seo_robots_directive::text,
         ss.seo_open_graph_site_name, ss.seo_schema_version,
         ss.fallback_media_id, m.object_key, m.state::text, m.organization_id,
         ss.version
  FROM public.site_settings AS ss
  LEFT JOIN public.media AS m
    ON m.organization_id = ss.organization_id AND m.id = ss.fallback_media_id
  ORDER BY ss.organization_id, ss.site_id;
END
$$;--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (62, 'fix_site_settings_robots_cast', 'sha256:8021001122933d5b7b439b781ae7559826aaa0ba4af4cf0046ec221f19ee3855');
