-- Canonical global identities for taxonomy and geography.
--
-- Tenant-owned category/region rows remain as organization bindings for
-- backwards-compatible FKs and region/site authorization. The catalog rows
-- provide stable global identities; tenant availability and hierarchy remain
-- scoped. Article tags are normalized globally and mirrored into article_tags,
-- while articles.tags stays as a compatibility projection during rollout.
--
-- This is an expand migration: it does not drop or rewrite existing IDs.
-- Body digest: LF-normalize this file and replace its own checksum with zeros.

CREATE TABLE public.category_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL,
  status public.record_status NOT NULL DEFAULT 'active',
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT category_catalog_slug_unique UNIQUE (slug),
  CONSTRAINT category_catalog_version_positive CHECK (version > 0),
  CONSTRAINT category_catalog_slug_shape CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);--> statement-breakpoint
CREATE INDEX category_catalog_status_idx ON public.category_catalog (status);--> statement-breakpoint
INSERT INTO public.category_catalog (name, slug, status)
SELECT DISTINCT ON (c.slug) c.name, c.slug, 'active'::public.record_status
FROM public.categories AS c
ORDER BY c.slug, (c.status = 'active') DESC, c.name;--> statement-breakpoint
ALTER TABLE public.categories ADD COLUMN catalog_id uuid;--> statement-breakpoint
UPDATE public.categories AS c
SET catalog_id = cc.id
FROM public.category_catalog AS cc
WHERE cc.slug = c.slug;--> statement-breakpoint
ALTER TABLE public.categories ALTER COLUMN catalog_id SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE public.categories ALTER COLUMN catalog_id SET NOT NULL;--> statement-breakpoint
ALTER TABLE public.categories
  ADD CONSTRAINT categories_catalog_fk FOREIGN KEY (catalog_id) REFERENCES public.category_catalog(id) ON DELETE RESTRICT,
  ADD CONSTRAINT categories_organization_catalog_unique UNIQUE (organization_id, catalog_id);--> statement-breakpoint
CREATE INDEX categories_catalog_id_idx ON public.categories (catalog_id);--> statement-breakpoint
CREATE FUNCTION indicate_private.sync_category_catalog_binding()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, indicate_private
AS $func$
DECLARE
  v_catalog_id uuid;
BEGIN
  INSERT INTO public.category_catalog (name, slug, status)
  VALUES (NEW.name, NEW.slug, 'active')
  ON CONFLICT (slug) DO NOTHING;

  SELECT id INTO v_catalog_id
  FROM public.category_catalog
  WHERE slug = NEW.slug;

  IF v_catalog_id IS NULL THEN
    RAISE EXCEPTION 'category_catalog_binding_unavailable';
  END IF;

  NEW.catalog_id := v_catalog_id;
  RETURN NEW;
END
$func$;--> statement-breakpoint
CREATE TRIGGER categories_catalog_binding
BEFORE INSERT OR UPDATE OF name, slug ON public.categories
FOR EACH ROW EXECUTE FUNCTION indicate_private.sync_category_catalog_binding();--> statement-breakpoint
CREATE TABLE public.region_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  canonical_key text NOT NULL,
  name text NOT NULL,
  short_name text,
  slug text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('region', 'city')),
  parent_region_id uuid REFERENCES public.region_catalog(id) ON DELETE RESTRICT,
  status public.record_status NOT NULL DEFAULT 'active',
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT region_catalog_canonical_key_unique UNIQUE (canonical_key),
  CONSTRAINT region_catalog_version_positive CHECK (version > 0),
  CONSTRAINT region_catalog_parent_kind_check CHECK ((kind = 'city') = (parent_region_id IS NOT NULL)),
  CONSTRAINT region_catalog_slug_shape CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);--> statement-breakpoint
CREATE INDEX region_catalog_status_idx ON public.region_catalog (status);--> statement-breakpoint
INSERT INTO public.region_catalog (canonical_key, name, short_name, slug, kind, status)
SELECT DISTINCT ON (r.slug) 'region:' || r.slug, r.name, r.short_name, r.slug, 'region', 'active'::public.record_status
FROM public.regions AS r
WHERE r.kind = 'region'
ORDER BY r.slug, (r.status = 'active') DESC, r.name;--> statement-breakpoint
INSERT INTO public.region_catalog (canonical_key, name, short_name, slug, kind, parent_region_id, status)
SELECT DISTINCT ON (pc.canonical_key, r.slug)
  'city:' || pc.canonical_key || ':' || r.slug,
  r.name,
  r.short_name,
  r.slug,
  'city',
  pc.id,
  'active'::public.record_status
FROM public.regions AS r
JOIN public.regions AS parent
  ON parent.organization_id = r.organization_id
 AND parent.id = r.parent_region_id
JOIN public.region_catalog AS pc
  ON pc.canonical_key = 'region:' || parent.slug
WHERE r.kind = 'city'
ORDER BY pc.canonical_key, r.slug, (r.status = 'active') DESC, r.name;--> statement-breakpoint
ALTER TABLE public.regions ADD COLUMN catalog_id uuid;--> statement-breakpoint
WITH mapping AS (
  SELECT
    r.organization_id,
    r.id,
    rc.id AS catalog_id
  FROM public.regions AS r
  LEFT JOIN public.regions AS parent
    ON parent.organization_id = r.organization_id
   AND parent.id = r.parent_region_id
  JOIN public.region_catalog AS rc
    ON rc.canonical_key = CASE
      WHEN r.kind = 'region' THEN 'region:' || r.slug
      ELSE 'city:region:' || parent.slug || ':' || r.slug
    END
)
UPDATE public.regions AS r
SET catalog_id = mapping.catalog_id
FROM mapping
WHERE mapping.organization_id = r.organization_id
  AND mapping.id = r.id;--> statement-breakpoint
DO $catalog_guard$
BEGIN
  IF EXISTS (SELECT 1 FROM public.regions WHERE catalog_id IS NULL) THEN
    RAISE EXCEPTION 'region_catalog_backfill_incomplete';
  END IF;
END
$catalog_guard$;--> statement-breakpoint
ALTER TABLE public.regions ALTER COLUMN catalog_id SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE public.regions ALTER COLUMN catalog_id SET NOT NULL;--> statement-breakpoint
ALTER TABLE public.regions
  ADD CONSTRAINT regions_catalog_fk FOREIGN KEY (catalog_id) REFERENCES public.region_catalog(id) ON DELETE RESTRICT,
  ADD CONSTRAINT regions_organization_catalog_unique UNIQUE (organization_id, catalog_id);--> statement-breakpoint
CREATE INDEX regions_catalog_id_idx ON public.regions (catalog_id);--> statement-breakpoint
CREATE FUNCTION indicate_private.sync_region_catalog_binding()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, indicate_private
AS $func$
DECLARE
  v_parent_catalog_id uuid;
  v_parent_key text;
  v_catalog_key text;
  v_catalog_id uuid;
BEGIN
  IF NEW.kind = 'region' THEN
    v_catalog_key := 'region:' || NEW.slug;
  ELSE
    SELECT parent.catalog_id, catalog.canonical_key
      INTO v_parent_catalog_id, v_parent_key
    FROM public.regions AS parent
    JOIN public.region_catalog AS catalog ON catalog.id = parent.catalog_id
    WHERE parent.organization_id = NEW.organization_id
      AND parent.id = NEW.parent_region_id;

    IF v_parent_catalog_id IS NULL OR v_parent_key IS NULL THEN
      RAISE EXCEPTION 'region_catalog_parent_unavailable';
    END IF;

    v_catalog_key := 'city:' || v_parent_key || ':' || NEW.slug;
  END IF;

  INSERT INTO public.region_catalog (
    canonical_key, name, short_name, slug, kind, parent_region_id, status
  )
  VALUES (
    v_catalog_key, NEW.name, NEW.short_name, NEW.slug, NEW.kind::text,
    v_parent_catalog_id, 'active'
  )
  ON CONFLICT (canonical_key) DO NOTHING;

  SELECT id INTO v_catalog_id
  FROM public.region_catalog
  WHERE canonical_key = v_catalog_key;

  IF v_catalog_id IS NULL THEN
    RAISE EXCEPTION 'region_catalog_binding_unavailable';
  END IF;

  NEW.catalog_id := v_catalog_id;
  RETURN NEW;
END
$func$;--> statement-breakpoint
CREATE TRIGGER regions_catalog_binding
BEFORE INSERT OR UPDATE OF name, short_name, slug, kind, parent_region_id ON public.regions
FOR EACH ROW EXECUTE FUNCTION indicate_private.sync_region_catalog_binding();--> statement-breakpoint
CREATE TABLE public.tag_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL,
  status public.record_status NOT NULL DEFAULT 'active',
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT tag_catalog_slug_unique UNIQUE (slug),
  CONSTRAINT tag_catalog_version_positive CHECK (version > 0),
  CONSTRAINT tag_catalog_slug_shape CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);--> statement-breakpoint
CREATE INDEX tag_catalog_status_idx ON public.tag_catalog (status);--> statement-breakpoint
CREATE TABLE public.article_tags (
  organization_id uuid NOT NULL,
  article_id uuid NOT NULL,
  tag_id uuid NOT NULL REFERENCES public.tag_catalog(id) ON DELETE RESTRICT,
  position integer NOT NULL CHECK (position >= 1),
  PRIMARY KEY (organization_id, article_id, tag_id),
  UNIQUE (organization_id, article_id, position),
  FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE RESTRICT,
  FOREIGN KEY (organization_id, article_id) REFERENCES public.articles(organization_id, id) ON DELETE CASCADE
);--> statement-breakpoint
CREATE INDEX article_tags_tag_idx ON public.article_tags (tag_id, organization_id);--> statement-breakpoint
INSERT INTO public.tag_catalog (name, slug, status)
SELECT DISTINCT u.tag, u.tag, 'active'::public.record_status
FROM public.articles AS a
CROSS JOIN LATERAL unnest(a.tags) AS u(tag)
WHERE u.tag ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
ON CONFLICT (slug) DO NOTHING;--> statement-breakpoint
INSERT INTO public.article_tags (organization_id, article_id, tag_id, position)
SELECT a.organization_id, a.id, tc.id, ranked.position
FROM public.articles AS a
CROSS JOIN LATERAL (
  SELECT tag, min(ord)::integer AS position
  FROM unnest(a.tags) WITH ORDINALITY AS u(tag, ord)
  WHERE tag ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
  GROUP BY tag
) AS ranked
JOIN public.tag_catalog AS tc ON tc.slug = ranked.tag
ON CONFLICT (organization_id, article_id, tag_id)
DO UPDATE SET position = EXCLUDED.position;--> statement-breakpoint
CREATE FUNCTION indicate_private.sync_article_tag_catalog()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, indicate_private
AS $func$
DECLARE
  v_tag text;
  v_position integer;
  v_tag_id uuid;
BEGIN
  DELETE FROM public.article_tags
  WHERE organization_id = NEW.organization_id
    AND article_id = NEW.id;

  FOR v_tag, v_position IN
    SELECT normalized.tag, min(u.ord)::integer
    FROM unnest(COALESCE(NEW.tags, ARRAY[]::text[])) WITH ORDINALITY AS u(raw_tag, ord)
    CROSS JOIN LATERAL (
      SELECT rtrim(left(trim(both '-' FROM regexp_replace(
        regexp_replace(regexp_replace(lower(trim(u.raw_tag)), '[^a-z0-9\s_-]', '', 'g'),
          '[\s_]+', '-', 'g'),
        '-+', '-', 'g')), 60), '-') AS tag
    ) AS normalized
    WHERE u.raw_tag ~ '[a-zA-Z0-9]' AND normalized.tag <> ''
    GROUP BY normalized.tag
    ORDER BY min(u.ord)
  LOOP
    INSERT INTO public.tag_catalog (name, slug, status)
    VALUES (v_tag, v_tag, 'active')
    ON CONFLICT (slug) DO NOTHING;

    SELECT id INTO v_tag_id
    FROM public.tag_catalog
    WHERE slug = v_tag;

    IF v_tag_id IS NULL THEN
      RAISE EXCEPTION 'tag_catalog_binding_unavailable';
    END IF;

    INSERT INTO public.article_tags (organization_id, article_id, tag_id, position)
    VALUES (NEW.organization_id, NEW.id, v_tag_id, v_position)
    ON CONFLICT (organization_id, article_id, tag_id)
    DO UPDATE SET position = EXCLUDED.position;
  END LOOP;

  RETURN NEW;
END
$func$;--> statement-breakpoint
CREATE TRIGGER articles_tag_catalog_sync
AFTER INSERT OR UPDATE OF tags ON public.articles
FOR EACH ROW EXECUTE FUNCTION indicate_private.sync_article_tag_catalog();--> statement-breakpoint
REVOKE ALL ON TABLE public.category_catalog, public.region_catalog, public.tag_catalog, public.article_tags FROM PUBLIC, anon, authenticated, indicate_runtime;--> statement-breakpoint
GRANT SELECT ON public.category_catalog, public.region_catalog, public.tag_catalog TO indicate_runtime;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON public.article_tags TO indicate_runtime;--> statement-breakpoint
ALTER TABLE public.category_catalog ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE public.region_catalog ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE public.tag_catalog ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE public.article_tags ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY global_catalog_select ON public.category_catalog FOR SELECT TO indicate_runtime USING (status = 'active');--> statement-breakpoint
CREATE POLICY global_catalog_select ON public.region_catalog FOR SELECT TO indicate_runtime USING (status = 'active');--> statement-breakpoint
CREATE POLICY global_catalog_select ON public.tag_catalog FOR SELECT TO indicate_runtime USING (status = 'active');--> statement-breakpoint
CREATE POLICY tenant_isolation_select ON public.article_tags FOR SELECT TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()));--> statement-breakpoint
CREATE POLICY tenant_isolation_insert ON public.article_tags FOR INSERT TO indicate_runtime WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()));--> statement-breakpoint
CREATE POLICY tenant_isolation_update ON public.article_tags FOR UPDATE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id())) WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()));--> statement-breakpoint
CREATE POLICY tenant_isolation_delete ON public.article_tags FOR DELETE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()));--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.sync_category_catalog_binding() FROM PUBLIC, anon, authenticated, indicate_runtime;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.sync_region_catalog_binding() FROM PUBLIC, anon, authenticated, indicate_runtime;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.sync_article_tag_catalog() FROM PUBLIC, anon, authenticated, indicate_runtime;--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (279, 'canonical_metadata_catalogs', 'sha256:9befb4cfcb791579f19d6ca4f6739fc3da8b8c3b6ede02dd54396aa1e646ac13');
