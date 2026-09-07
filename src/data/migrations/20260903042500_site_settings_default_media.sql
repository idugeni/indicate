-- Rename the per-site fallback media column to default media terminology,
-- matching the global default asset (public/assets/default.png). Metadata-only
-- renames: no data moves, no behavior change. All dependent functions are
-- replaced in the same transaction so no execution can observe the old name.
--
-- Body digest (reproducible): LF-normalize this file, substitute the 64-hex
-- checksum literal below with 64 zeros, SHA-256 the complete UTF-8 bytes.

ALTER TABLE public.site_settings RENAME COLUMN fallback_media_id TO default_media_id;--> statement-breakpoint
ALTER TABLE public.site_settings RENAME CONSTRAINT site_settings_fallback_media_fk TO site_settings_default_media_fk;--> statement-breakpoint
CREATE OR REPLACE FUNCTION indicate_private.guard_active_site_settings()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public, indicate_private
AS $$
BEGIN
  IF NEW.status = 'active' AND NEW.activation_state = 'active' THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.site_settings AS ss
      WHERE ss.organization_id = NEW.organization_id
        AND ss.site_id = NEW.id
        AND ss.locale IS NOT NULL
        AND ss.seo_default_title IS NOT NULL
        AND ss.seo_default_description IS NOT NULL
        AND ss.seo_robots_directive IS NOT NULL
        AND ss.seo_open_graph_site_name IS NOT NULL
        AND ss.seo_schema_version IS NOT NULL
        AND ss.default_media_id IS NOT NULL
        AND EXISTS (
          SELECT 1
          FROM public.media AS m
          WHERE m.organization_id = ss.organization_id
            AND m.id = ss.default_media_id
            AND m.state = 'active'
        )
    ) THEN
      RAISE EXCEPTION 'active site requires complete same-organization site settings and active default media' USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END
$$;--> statement-breakpoint
CREATE OR REPLACE FUNCTION indicate_private.guard_site_settings_against_active_site()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public, indicate_private
AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.sites AS s
    WHERE s.organization_id = OLD.organization_id
      AND s.id = OLD.site_id
      AND s.status = 'active'
      AND s.activation_state = 'active'
  ) AND (
    OLD.locale IS NULL OR OLD.seo_default_title IS NULL OR OLD.seo_default_description IS NULL
    OR OLD.seo_robots_directive IS NULL OR OLD.seo_open_graph_site_name IS NULL OR OLD.seo_schema_version IS NULL
    OR OLD.default_media_id IS NULL
  ) THEN
    RAISE EXCEPTION 'cannot invalidate site settings while the site is active' USING ERRCODE = '23514';
  END IF;
  RETURN OLD;
END
$$;--> statement-breakpoint
-- OUT parameter names are part of the row type, so REPLACE is rejected;
-- drop first (no dependents exist) and recreate with identical privileges.
DROP FUNCTION IF EXISTS indicate_private.read_runtime_config_site_settings();--> statement-breakpoint
CREATE FUNCTION indicate_private.read_runtime_config_site_settings()
RETURNS TABLE (
  organization_id uuid,
  site_id uuid,
  locale text,
  seo_default_title text,
  seo_default_description text,
  seo_robots_directive text,
  seo_open_graph_site_name text,
  seo_schema_version integer,
  default_media_id uuid,
  default_media_object_key text,
  default_media_state text,
  default_media_organization_id uuid,
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
         ss.default_media_id, m.object_key, m.state::text, m.organization_id,
         ss.version
  FROM public.site_settings AS ss
  LEFT JOIN public.media AS m
    ON m.organization_id = ss.organization_id AND m.id = ss.default_media_id
  ORDER BY ss.organization_id, ss.site_id;
END
$$;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.read_runtime_config_site_settings() FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.read_runtime_config_site_settings() TO indicate_runtime;--> statement-breakpoint
-- Input parameter names cannot change under OR REPLACE either; drop first
-- (no dependents exist) and recreate with identical privileges.
DROP FUNCTION IF EXISTS indicate_private.mutate_site_settings(uuid, uuid, uuid, text, text, text, text, text, integer, uuid, integer);--> statement-breakpoint
CREATE FUNCTION indicate_private.mutate_site_settings(p_actor_id uuid, p_org_id uuid, p_site_id uuid, p_locale text, p_seo_default_title text, p_seo_default_description text, p_seo_robots_directive text, p_seo_open_graph_site_name text, p_seo_schema_version integer, p_default_media_id uuid, p_expected_version integer)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
DECLARE v_after integer; v_revision bigint;
BEGIN
  IF NOT indicate_private.permission_has_tenant(p_actor_id, p_org_id, 'site_settings.manage') THEN
    RAISE EXCEPTION 'site settings mutation denied' USING ERRCODE = '42501';
  END IF;
  UPDATE public.site_settings AS ss
     SET locale = p_locale, seo_default_title = p_seo_default_title,
         seo_default_description = p_seo_default_description, seo_robots_directive = p_seo_robots_directive,
         seo_open_graph_site_name = p_seo_open_graph_site_name, seo_schema_version = p_seo_schema_version,
         default_media_id = p_default_media_id, version = version + 1, updated_at = now()
   WHERE ss.organization_id = p_org_id AND ss.site_id = p_site_id AND ss.version = p_expected_version
   RETURNING ss.version INTO v_after;
  IF v_after IS NULL THEN RAISE EXCEPTION 'runtime config version conflict' USING ERRCODE = '55000'; END IF;
  v_revision := nextval(pg_get_serial_sequence('public.runtime_config_revisions', 'version'));
  INSERT INTO public.runtime_config_revisions (version, environment, committed_at, mutation_kind)
  VALUES (v_revision, current_setting('app.environment', true), now(), 'site_settings');
  INSERT INTO public.runtime_config_audit_logs (
    id, organization_id, actor_type, actor_id, environment, action, target_type, target_id,
    expected_version, resulting_version, changed_fields, outcome, request_id
  ) VALUES (
    gen_random_uuid(), p_org_id, 'user', p_actor_id, current_setting('app.environment', true),
    'update', 'site_settings', p_site_id, p_expected_version, v_after,
    ARRAY['locale','seo_default_title','seo_default_description','seo_robots_directive',
          'seo_open_graph_site_name','seo_schema_version','default_media_id'],
    'succeeded', current_setting('app.request_id', true)
  );
  INSERT INTO public.runtime_config_invalidation_intents (
    id, runtime_revision, environment, partition_kind, organization_id, site_id, status, attempts, next_attempt_at
  ) VALUES (gen_random_uuid(), v_revision, current_setting('app.environment', true), 'site', p_org_id, p_site_id, 'pending', 0, now());
  RETURN v_after;
END
$function$;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.mutate_site_settings(p_actor_id uuid, p_org_id uuid, p_site_id uuid, p_locale text, p_seo_default_title text, p_seo_default_description text, p_seo_robots_directive text, p_seo_open_graph_site_name text, p_seo_schema_version integer, p_default_media_id uuid, p_expected_version integer) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.mutate_site_settings(p_actor_id uuid, p_org_id uuid, p_site_id uuid, p_locale text, p_seo_default_title text, p_seo_default_description text, p_seo_robots_directive text, p_seo_open_graph_site_name text, p_seo_schema_version integer, p_default_media_id uuid, p_expected_version integer) TO indicate_runtime;--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (63, 'site_settings_default_media', 'sha256:3587bfd7e7328d57727d2931b739079ed744ab1ea582fb0f75657c4f5f9ef367');
