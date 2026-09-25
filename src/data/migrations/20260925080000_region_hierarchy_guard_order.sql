-- Run the geography immutability guard before the shape checks.
--
-- `guard_region_hierarchy` returned early for a parentless row, so flipping a
-- referenced city geography to `kind='region', parent_region_id=NULL` skipped
-- the immutability check and detached a live city from its province. The
-- guard now runs first for every UPDATE, then the shape rules apply.
--
-- Body digest (reproducible): LF-normalize this file, substitute the 64-hex
-- checksum literal below with 64 zeros, SHA-256 the complete UTF-8 bytes.
CREATE OR REPLACE FUNCTION indicate_private.guard_region_hierarchy()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public, indicate_private
AS $$
DECLARE
  parent_kind text;
  referencing_sites integer;
BEGIN
  IF TG_OP = 'UPDATE'
     AND (NEW.kind IS DISTINCT FROM OLD.kind OR NEW.parent_region_id IS DISTINCT FROM OLD.parent_region_id) THEN
    SELECT count(*) INTO referencing_sites
      FROM public.sites AS s
     WHERE s.organization_id = NEW.organization_id AND s.region_id = NEW.id;
    IF referencing_sites > 0 THEN
      RAISE EXCEPTION 'geography kind and parent are immutable while % site(s) reference it', referencing_sites
        USING ERRCODE = '23514';
    END IF;
  END IF;

  IF NEW.parent_region_id IS NULL THEN
    IF NEW.kind::text <> 'region' THEN
      RAISE EXCEPTION 'city geography requires a region parent' USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.kind::text <> 'city' THEN
    RAISE EXCEPTION 'only a city geography may declare a parent' USING ERRCODE = '23514';
  END IF;
  IF NEW.parent_region_id = NEW.id THEN
    RAISE EXCEPTION 'geography cannot be its own parent' USING ERRCODE = '23514';
  END IF;

  SELECT g.kind::text INTO parent_kind
    FROM public.regions AS g
   WHERE g.organization_id = NEW.organization_id AND g.id = NEW.parent_region_id;
  IF parent_kind IS DISTINCT FROM 'region' THEN
    RAISE EXCEPTION 'city parent must be a region geography' USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (176, 'region_hierarchy_guard_order', 'sha256:91cbee4a2ae5007a76473b485e7dec03d27b889369ef693e38fc4ba711e1dfb5');
