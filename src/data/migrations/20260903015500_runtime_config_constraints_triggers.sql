-- Final runtime-config constraints and triggers. Deferred guards prevent an
-- Active Site from losing valid locale/SEO/fallback state; activation requires
-- a non-null Cloudflare zone ID; policy arrays get per-element bounds.

-- Per-element publication retry bounds + distinctness hint.
CREATE OR REPLACE FUNCTION indicate_private.validate_publication_retry_delays()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public, indicate_private
AS $$
DECLARE
  v_delay integer;
  v_index integer;
BEGIN
  IF cardinality(NEW.retry_delays_seconds) < 1 OR cardinality(NEW.retry_delays_seconds) > 9 THEN
    RAISE EXCEPTION 'publication retry delays must hold 1..9 entries' USING ERRCODE = '23514';
  END IF;
  IF NEW.max_attempts < 1 OR cardinality(NEW.retry_delays_seconds) > NEW.max_attempts - 1 THEN
    RAISE EXCEPTION 'publication retry count exceeds max_attempts-1' USING ERRCODE = '23514';
  END IF;
  FOR v_index IN 1 .. cardinality(NEW.retry_delays_seconds) LOOP
    v_delay := NEW.retry_delays_seconds[v_index];
    IF v_delay < 1 OR v_delay > 3600 THEN
      RAISE EXCEPTION 'publication retry delay out of bounds' USING ERRCODE = '23514';
    END IF;
    IF cardinality(array_positions(NEW.retry_delays_seconds, v_delay)) > 1 THEN
      RAISE EXCEPTION 'publication retry delays must be distinct' USING ERRCODE = '23514';
    END IF;
  END LOOP;
  RETURN NEW;
END
$$;--> statement-breakpoint
CREATE TRIGGER publication_policy_retry_delays_guard
BEFORE INSERT OR UPDATE ON public.publication_policy
FOR EACH ROW EXECUTE FUNCTION indicate_private.validate_publication_retry_delays();--> statement-breakpoint

-- Non-empty distinct allowed MIME types.
CREATE OR REPLACE FUNCTION indicate_private.validate_media_policy_mimes()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public, indicate_private
AS $$
DECLARE
  v_mime text;
  v_seen text[] := '{}';
BEGIN
  IF cardinality(NEW.allowed_mime_types) < 1 THEN
    RAISE EXCEPTION 'media policy requires at least one MIME type' USING ERRCODE = '23514';
  END IF;
  FOREACH v_mime IN ARRAY NEW.allowed_mime_types LOOP
    IF v_mime = ANY (v_seen) THEN
      RAISE EXCEPTION 'media policy MIME types must be distinct' USING ERRCODE = '23514';
    END IF;
    v_seen := v_seen || v_mime;
  END LOOP;
  RETURN NEW;
END
$$;--> statement-breakpoint
CREATE TRIGGER media_policy_mimes_guard
BEFORE INSERT OR UPDATE ON public.media_policy
FOR EACH ROW EXECUTE FUNCTION indicate_private.validate_media_policy_mimes();--> statement-breakpoint

-- Domain activation requires a non-null Cloudflare zone ID.
CREATE OR REPLACE FUNCTION indicate_private.guard_active_domain_zone()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public, indicate_private
AS $$
BEGIN
  IF NEW.status = 'active' AND NEW.cloudflare_zone_id IS NULL THEN
    RAISE EXCEPTION 'active domain requires a Cloudflare zone id' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END
$$;--> statement-breakpoint
CREATE TRIGGER domains_active_requires_zone_guard
BEFORE INSERT OR UPDATE ON public.domains
FOR EACH ROW EXECUTE FUNCTION indicate_private.guard_active_domain_zone();--> statement-breakpoint

-- Deferred guard: an Active Site must have complete valid Same-Organization
-- locale/SEO/fallback settings. Runs at commit so a multi-statement activation
-- transaction can build state before verification.
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
        AND ss.fallback_media_id IS NOT NULL
        AND EXISTS (
          SELECT 1
          FROM public.media AS m
          WHERE m.organization_id = ss.organization_id
            AND m.id = ss.fallback_media_id
            AND m.state = 'active'
        )
    ) THEN
      RAISE EXCEPTION 'active site requires complete same-organization site settings and active fallback media' USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END
$$;--> statement-breakpoint
CREATE CONSTRAINT TRIGGER sites_settings_guard_deferred
AFTER INSERT OR UPDATE ON public.sites
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION indicate_private.guard_active_site_settings();--> statement-breakpoint

-- Guard: valid Site Settings cannot be deleted or invalidated while the Site is active.
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
    OR OLD.fallback_media_id IS NULL
  ) THEN
    RAISE EXCEPTION 'cannot invalidate site settings while the site is active' USING ERRCODE = '23514';
  END IF;
  RETURN OLD;
END
$$;--> statement-breakpoint
CREATE TRIGGER site_settings_active_site_guard
BEFORE UPDATE OR DELETE ON public.site_settings
FOR EACH ROW EXECUTE FUNCTION indicate_private.guard_site_settings_against_active_site();--> statement-breakpoint

INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (24, 'runtime_config_constraints_triggers', 'runtime-config-constraints-triggers-v1');