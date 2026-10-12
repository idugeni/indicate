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
DROP TRIGGER categories_catalog_binding ON public.categories;--> statement-breakpoint
CREATE TRIGGER categories_catalog_binding
BEFORE INSERT OR UPDATE OF name, slug, catalog_id ON public.categories
FOR EACH ROW EXECUTE FUNCTION indicate_private.sync_category_catalog_binding();--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (280, 'global_taxonomy_integrity', 'sha256:e932630e79d3f67a7e8e2e8c955f39b1caef8f71bafeac1b542bad05d5ba3af0');
