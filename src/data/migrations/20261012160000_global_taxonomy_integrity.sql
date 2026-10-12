-- Keep category bindings attached to canonical global category identities.
--
-- `categories` remains a tenant-scoped binding for authorization and existing
-- foreign keys. `category_catalog` is the canonical source for category name
-- and slug. Never generate a random catalog UUID: every binding must resolve
-- through its canonical slug.
--
-- Body digest: LF-normalize this file and replace its own checksum with zeros.

ALTER TABLE public.categories ALTER COLUMN catalog_id DROP DEFAULT;--> statement-breakpoint
DO $category_binding_guard$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.categories AS c
    LEFT JOIN public.category_catalog AS cc ON cc.id = c.catalog_id
    WHERE cc.id IS NULL OR cc.slug <> c.slug OR cc.name <> c.name
  ) THEN
    RAISE EXCEPTION 'category_catalog_binding_inconsistent';
  END IF;
END
$category_binding_guard$;--> statement-breakpoint
CREATE OR REPLACE FUNCTION indicate_private.sync_category_catalog_binding()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, indicate_private
AS $func$
DECLARE
  v_catalog_id uuid;
  v_catalog_name text;
  v_catalog_slug text;
BEGIN
  INSERT INTO public.category_catalog (name, slug, status)
  VALUES (NEW.name, NEW.slug, 'active')
  ON CONFLICT (slug) DO NOTHING;

  SELECT id, name, slug
    INTO v_catalog_id, v_catalog_name, v_catalog_slug
  FROM public.category_catalog
  WHERE slug = NEW.slug;

  IF v_catalog_id IS NULL THEN
    RAISE EXCEPTION 'category_catalog_binding_unavailable';
  END IF;

  IF TG_OP = 'UPDATE'
     AND OLD.catalog_id IS DISTINCT FROM v_catalog_id
     AND EXISTS (
       SELECT 1
       FROM public.article_categories AS ac
       WHERE ac.organization_id = OLD.organization_id
         AND ac.category_id = OLD.id
     ) THEN
    RAISE EXCEPTION 'category_catalog_identity_in_use';
  END IF;

  NEW.catalog_id := v_catalog_id;
  NEW.name := v_catalog_name;
  NEW.slug := v_catalog_slug;
  RETURN NEW;
END
$func$;--> statement-breakpoint
DROP TRIGGER categories_catalog_binding ON public.categories;--> statement-breakpoint
CREATE TRIGGER categories_catalog_binding
BEFORE INSERT OR UPDATE OF name, slug, catalog_id ON public.categories
FOR EACH ROW EXECUTE FUNCTION indicate_private.sync_category_catalog_binding();--> statement-breakpoint
CREATE FUNCTION indicate_private.sync_category_catalog_labels()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, indicate_private
AS $func$
BEGIN
  IF NEW.name IS DISTINCT FROM OLD.name OR NEW.slug IS DISTINCT FROM OLD.slug THEN
    UPDATE public.categories
    SET name = NEW.name, slug = NEW.slug
    WHERE catalog_id = NEW.id;
  END IF;
  RETURN NEW;
END
$func$;--> statement-breakpoint
CREATE TRIGGER category_catalog_labels_sync
AFTER UPDATE OF name, slug ON public.category_catalog
FOR EACH ROW EXECUTE FUNCTION indicate_private.sync_category_catalog_labels();--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.sync_category_catalog_labels() FROM PUBLIC, anon, authenticated, indicate_runtime;--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (280, 'global_taxonomy_integrity', 'sha256:aede9fbdebd86afb58fcc17efca091d32cb99fcff20adc4715dc7dee518b7122');
