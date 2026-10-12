-- Bind each article-category assignment to its canonical global category identity.
--
-- category_id remains a tenant binding during the compatibility rollout; catalog_id
-- is the canonical global identity used to prevent duplicate assignments and enable
-- direct catalog reads. Existing article-category assignments are backfilled safely.
--
-- Body digest: LF-normalize this file and replace its own checksum with zeros.

ALTER TABLE public.article_categories ADD COLUMN catalog_id uuid;--> statement-breakpoint
UPDATE public.article_categories AS ac
SET catalog_id = c.catalog_id
FROM public.categories AS c
WHERE c.organization_id = ac.organization_id
  AND c.id = ac.category_id;--> statement-breakpoint
DO $article_category_catalog_guard$
BEGIN
  IF EXISTS (SELECT 1 FROM public.article_categories WHERE catalog_id IS NULL) THEN
    RAISE EXCEPTION 'article_category_catalog_backfill_incomplete';
  END IF;

  IF EXISTS (
    SELECT organization_id, article_id, catalog_id
    FROM public.article_categories
    GROUP BY organization_id, article_id, catalog_id
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'duplicate_global_category_for_article';
  END IF;
END
$article_category_catalog_guard$;--> statement-breakpoint
ALTER TABLE public.article_categories ALTER COLUMN catalog_id SET NOT NULL;--> statement-breakpoint
ALTER TABLE public.article_categories
  ADD CONSTRAINT article_categories_catalog_fk
    FOREIGN KEY (catalog_id) REFERENCES public.category_catalog(id) ON DELETE RESTRICT,
  ADD CONSTRAINT article_categories_global_category_unique
    UNIQUE (organization_id, article_id, catalog_id);--> statement-breakpoint
CREATE INDEX article_categories_catalog_idx
  ON public.article_categories (catalog_id, organization_id);--> statement-breakpoint
CREATE FUNCTION indicate_private.sync_article_category_catalog_binding()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, indicate_private
AS $func$
DECLARE
  v_catalog_id uuid;
BEGIN
  SELECT c.catalog_id
    INTO v_catalog_id
  FROM public.categories AS c
  WHERE c.organization_id = NEW.organization_id
    AND c.id = NEW.category_id;

  IF v_catalog_id IS NULL THEN
    RAISE EXCEPTION 'article_category_binding_unavailable';
  END IF;

  IF NEW.catalog_id IS NOT NULL AND NEW.catalog_id <> v_catalog_id THEN
    RAISE EXCEPTION 'article_category_catalog_mismatch';
  END IF;

  NEW.catalog_id := v_catalog_id;
  RETURN NEW;
END
$func$;--> statement-breakpoint
CREATE TRIGGER article_categories_catalog_binding
BEFORE INSERT OR UPDATE OF category_id, catalog_id ON public.article_categories
FOR EACH ROW EXECUTE FUNCTION indicate_private.sync_article_category_catalog_binding();--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.sync_article_category_catalog_binding() FROM PUBLIC, anon, authenticated, indicate_runtime;--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (282, 'article_category_global_identity', 'sha256:ea124c98ee45d60cbb476e38e17ad09b6118564821629a81064af5c6cadf781b');
