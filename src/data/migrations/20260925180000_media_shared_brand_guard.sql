-- Protect a media asset that many portals display.
--
-- One apex brand image is the single source for the whole network: the apex, its
-- province portal, and its 31 city portals all point at the same `media` row
-- (3328 sites, 114 distinct default images). That sharing is deliberate and
-- public delivery already authorizes it, but it also meant a single archive
-- could quietly strip the image from 32 live portals, and a delete surfaced a
-- bare foreign-key error. The database now refuses both with an actionable
-- message naming how many portals depend on the asset.
--
-- The supported order is therefore: repoint the brand first, then archive the
-- old asset. `saveSiteSettings` repoints every derived portal in the same
-- transaction when an apex default changes, so that order is a single action in
-- the dashboard.
--
-- Body digest (reproducible): LF-normalize this file, substitute the 64-hex
-- checksum literal below with 64 zeros, SHA-256 the complete UTF-8 bytes.
CREATE OR REPLACE FUNCTION indicate_private.guard_shared_media()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public, indicate_private
AS $$
DECLARE
  dependent_sites integer;
  action constant text := CASE WHEN TG_OP = 'DELETE' THEN 'deleted' ELSE 'archived' END;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.state = 'active' THEN
    RETURN NEW;
  END IF;

  SELECT count(*) INTO dependent_sites
    FROM public.site_settings
   WHERE organization_id = OLD.organization_id
     AND (default_media_id = OLD.id OR logo_media_id = OLD.id OR favicon_media_id = OLD.id);

  IF dependent_sites > 0 THEN
    RAISE EXCEPTION
      'media is still displayed by % portal(s); repoint the brand media first, then archive it',
      dependent_sites
      USING ERRCODE = '23503';
  END IF;

  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;--> statement-breakpoint
DROP TRIGGER IF EXISTS media_shared_guard ON public.media;--> statement-breakpoint
CREATE TRIGGER media_shared_guard
  BEFORE DELETE OR UPDATE OF state ON public.media
  FOR EACH ROW EXECUTE FUNCTION indicate_private.guard_shared_media();--> statement-breakpoint
DO $$
DECLARE
  shared_assets integer;
  protected_rows integer;
BEGIN
  SELECT count(*) INTO shared_assets
    FROM (
      SELECT media.id
        FROM public.media
        JOIN public.site_settings
          ON site_settings.organization_id = media.organization_id
         AND media.id IN (site_settings.default_media_id, site_settings.logo_media_id, site_settings.favicon_media_id)
       GROUP BY media.id
      HAVING count(*) > 1
    ) AS shared;
  IF shared_assets = 0 THEN
    RAISE EXCEPTION 'media_shared_guard_degenerate: no shared brand asset found to protect';
  END IF;

  SELECT count(*) INTO protected_rows
    FROM public.media
   WHERE id IN (
     SELECT unnest(ARRAY[default_media_id, logo_media_id, favicon_media_id]) FROM public.site_settings
      WHERE default_media_id IS NOT NULL OR logo_media_id IS NOT NULL OR favicon_media_id IS NOT NULL
   );
  IF protected_rows = 0 THEN
    RAISE EXCEPTION 'media_shared_guard_degenerate: no media row is referenced by portal settings';
  END IF;
END;
$$;--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (186, 'media_shared_brand_guard', 'sha256:56076092edb09422f8198da0383f1fe5e5c780550f7faea9cc24d9fe4c9f267f');
