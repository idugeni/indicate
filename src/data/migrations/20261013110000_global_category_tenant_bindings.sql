-- Make every active global category available to each organization that publishes content.
-- `categories` is the tenant binding layer; `category_catalog` remains the canonical
-- global taxonomy. Without these bindings, the editor can only select a tenant's
-- existing subset (often just `Berita`) even though the global catalog has more terms.
-- Body digest: LF-normalize this file and replace its own checksum with zeros.

INSERT INTO public.categories (
  organization_id, id, name, slug, status, version, created_at, updated_at, catalog_id
)
SELECT
  eligible.organization_id,
  gen_random_uuid(),
  catalog.name,
  catalog.slug,
  'active'::public.record_status,
  1,
  now(),
  now(),
  catalog.id
FROM (
  SELECT DISTINCT p.organization_id
  FROM public.publishers AS p
) AS eligible
CROSS JOIN public.category_catalog AS catalog
WHERE catalog.status = 'active'::public.record_status
  AND NOT EXISTS (
    SELECT 1
    FROM public.categories AS existing
    WHERE existing.organization_id = eligible.organization_id
      AND existing.catalog_id = catalog.id
  )
ON CONFLICT (organization_id, slug) DO NOTHING;--> statement-breakpoint

-- A globally active category must not remain hidden in an organization simply
-- because its local binding was archived before the global catalog was introduced.
UPDATE public.categories AS binding
SET status = 'active'::public.record_status,
    version = binding.version + 1,
    updated_at = now()
FROM public.category_catalog AS catalog
WHERE catalog.id = binding.catalog_id
  AND catalog.status = 'active'::public.record_status
  AND binding.status <> 'active'::public.record_status;--> statement-breakpoint

-- New global categories are created through a tenant binding. Fan the new canonical
-- identity out to every other publishing organization so the editor stays global after
-- this one-time backfill, not merely until the next category is created.
CREATE FUNCTION indicate_private.fanout_global_category_bindings()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, indicate_private
AS $func$
BEGIN
  -- Prevent the bindings inserted by this trigger from recursively fanning out.
  IF pg_trigger_depth() > 1 THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.categories (
    organization_id, id, name, slug, status, version, created_at, updated_at, catalog_id
  )
  SELECT
    eligible.organization_id,
    gen_random_uuid(),
    NEW.name,
    NEW.slug,
    'active'::public.record_status,
    1,
    now(),
    now(),
    NEW.catalog_id
  FROM (
    SELECT DISTINCT p.organization_id
    FROM public.publishers AS p
  ) AS eligible
  WHERE eligible.organization_id <> NEW.organization_id
  ON CONFLICT (organization_id, slug) DO NOTHING;

  RETURN NEW;
END
$func$;--> statement-breakpoint

CREATE TRIGGER categories_global_binding_fanout
AFTER INSERT ON public.categories
FOR EACH ROW EXECUTE FUNCTION indicate_private.fanout_global_category_bindings();--> statement-breakpoint

REVOKE ALL ON FUNCTION indicate_private.fanout_global_category_bindings() FROM PUBLIC, anon, authenticated, indicate_runtime;--> statement-breakpoint

INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (287, 'global_category_tenant_bindings', 'sha256:998cd8db4bac03f2cbc85c8ad74b47a900b5a8d8f5ca852250d2599faa2118fc');
