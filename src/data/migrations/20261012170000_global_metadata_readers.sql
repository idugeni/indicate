-- Move database-backed article tag reads and category labels to canonical global catalogs.
--
-- Existing function signatures and grants are preserved. Tenant ownership remains
-- explicit in every article_tags lookup; category bindings resolve their global
-- identity through category_catalog.
--
-- Body digest: LF-normalize this file and replace its own checksum with zeros.

CREATE OR REPLACE FUNCTION indicate_private.list_cross_org_articles(
  p_status text,
  p_search text,
  p_tag text,
  p_sort text,
  p_publication_state text,
  p_limit int,
  p_cursor_id uuid
)
RETURNS TABLE(
  organization_id uuid,
  org_slug text,
  org_name text,
  id uuid,
  region_id uuid,
  publisher_id uuid,
  category_id uuid,
  author_id uuid,
  lead_media_id uuid,
  cover_image_url text,
  slug text,
  title text,
  excerpt text,
  canonical_url text,
  source text,
  tags text[],
  status public.article_status,
  article_type text,
  is_sponsored boolean,
  video_url text,
  audio_url text,
  duration_seconds int,
  published_at timestamp with time zone,
  scheduled_at timestamp with time zone,
  archived_at timestamp with time zone,
  version int,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  category_ids uuid[],
  category_names text[],
  portal_hostnames text[],
  published_urls text[],
  published_at_max timestamp with time zone
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, indicate_private
AS $func$
DECLARE
  v_limit int := LEAST(GREATEST(COALESCE(p_limit, 50), 1), 500);
  v_sort text := CASE WHEN p_sort IN ('updated', 'published-desc', 'published-asc', 'title', 'syndicated') THEN p_sort ELSE 'published-desc' END;
  v_needle text := NULL;
  v_cursor_bigint bigint := NULL;
  v_cursor_title text := NULL;
  v_cursor_id uuid := NULL;
BEGIN
  IF p_search IS NOT NULL AND btrim(p_search) <> '' THEN
    v_needle := '%' || REPLACE(REPLACE(REPLACE(btrim(p_search), '\', '\\'), '%', '\%'), '_', '\_') || '%';
  END IF;

  IF p_cursor_id IS NOT NULL THEN
    IF v_sort = 'title' THEN
      SELECT a.title, a.id INTO v_cursor_title, v_cursor_id
      FROM public.articles AS a WHERE a.id = p_cursor_id;
    ELSIF v_sort = 'syndicated' THEN
      SELECT (SELECT COUNT(*)::bigint FROM public.article_sites AS s WHERE s.organization_id = a.organization_id AND s.article_id = a.id AND s.state = 'published'), a.id
        INTO v_cursor_bigint, v_cursor_id
      FROM public.articles AS a WHERE a.id = p_cursor_id;
    ELSIF v_sort = 'updated' THEN
      SELECT ((EXTRACT(EPOCH FROM COALESCE(a.updated_at, a.created_at, a.published_at, a.scheduled_at)) * 1000000)::bigint), a.id
        INTO v_cursor_bigint, v_cursor_id
      FROM public.articles AS a WHERE a.id = p_cursor_id;
    ELSE
      SELECT ((EXTRACT(EPOCH FROM COALESCE((SELECT MAX(s.published_at) FROM public.article_sites AS s WHERE s.organization_id = a.organization_id AND s.article_id = a.id AND s.state = 'published' AND s.active), a.published_at, a.created_at)) * 1000000)::bigint), a.id
        INTO v_cursor_bigint, v_cursor_id
      FROM public.articles AS a WHERE a.id = p_cursor_id;
    END IF;
    IF v_cursor_id IS NULL THEN
      v_cursor_bigint := NULL;
      v_cursor_title := NULL;
    END IF;
  END IF;

  IF v_sort = 'title' THEN
    RETURN QUERY
    WITH base AS (
      SELECT
        a.organization_id AS b_org, o.slug AS b_org_slug, o.name AS b_org_name,
        a.id AS b_id, a.region_id AS b_region, a.publisher_id AS b_publisher, a.category_id AS b_category,
        a.author_id AS b_author, a.lead_media_id AS b_lead_media, a.cover_image_url AS b_cover,
        a.slug AS b_slug, a.title AS b_title, a.excerpt AS b_excerpt, a.canonical_url AS b_canonical,
        a.source AS b_source, (SELECT COALESCE(ARRAY_AGG(tc.slug ORDER BY at.position), '{}'::text[]) FROM public.article_tags AS at JOIN public.tag_catalog AS tc ON tc.id = at.tag_id AND tc.status = 'active' WHERE at.organization_id = a.organization_id AND at.article_id = a.id) AS b_tags, a.status AS b_status, a.type::text AS b_type,
        a.is_sponsored AS b_sponsored, a.video_url AS b_video, a.audio_url AS b_audio,
        a.duration_seconds AS b_duration, a.published_at AS b_published, a.scheduled_at AS b_scheduled,
        a.archived_at AS b_archived, a.version AS b_version, a.created_at AS b_created, a.updated_at AS b_updated,
        (SELECT COALESCE(ARRAY_AGG(ac.category_id ORDER BY ac.position), '{}'::uuid[])
         FROM public.article_categories AS ac
         WHERE ac.organization_id = a.organization_id AND ac.article_id = a.id) AS b_cat_ids,
        (SELECT COALESCE(ARRAY_AGG(cc.name ORDER BY ac.position), '{}'::text[])
         FROM public.article_categories AS ac
         JOIN public.categories AS c ON c.organization_id = ac.organization_id AND c.id = ac.category_id
         JOIN public.category_catalog AS cc ON cc.id = c.catalog_id AND cc.status = 'active'
         WHERE ac.organization_id = a.organization_id AND ac.article_id = a.id) AS b_cat_names,
        (SELECT COALESCE(ARRAY_AGG(h.hostname ORDER BY h.hostname), '{}'::text[])
         FROM (
           SELECT DISTINCT COALESCE(apex.normalized_hostname, st.normalized_hostname) AS hostname
           FROM public.article_sites AS s
           JOIN public.sites AS st ON st.organization_id = s.organization_id AND st.id = s.site_id
           LEFT JOIN public.sites AS apex ON apex.organization_id = st.organization_id AND apex.domain_id = st.domain_id AND apex.site_level = 'apex'
           WHERE s.organization_id = a.organization_id AND s.article_id = a.id AND s.active
         ) AS h WHERE h.hostname IS NOT NULL) AS b_portals,
        (SELECT COALESCE(ARRAY_AGG(u.url ORDER BY u.url), '{}'::text[])
         FROM (
           SELECT DISTINCT COALESCE(s.published_url, 'https://' || st.normalized_hostname || '/' || a.slug) AS url
           FROM public.article_sites AS s
           JOIN public.sites AS st ON st.organization_id = s.organization_id AND st.id = s.site_id
           WHERE s.organization_id = a.organization_id AND s.article_id = a.id AND s.active AND s.state = 'published'
         ) AS u) AS b_urls,
        (SELECT MAX(s.published_at)
         FROM public.article_sites AS s
         WHERE s.organization_id = a.organization_id AND s.article_id = a.id AND s.state = 'published' AND s.active) AS b_pub_max
      FROM public.articles AS a
      JOIN public.organizations AS o ON o.id = a.organization_id
      WHERE o.status = 'active'
        AND (p_status IS NULL OR p_status = '' OR a.status::text = p_status)
        AND (p_tag IS NULL OR p_tag = '' OR EXISTS (SELECT 1 FROM public.article_tags AS at JOIN public.tag_catalog AS tc ON tc.id = at.tag_id AND tc.status = 'active' WHERE at.organization_id = a.organization_id AND at.article_id = a.id AND tc.slug = p_tag))
        AND (v_needle IS NULL OR a.title ILIKE v_needle ESCAPE '\' OR a.slug ILIKE v_needle ESCAPE '\')
        AND (p_publication_state IS NULL OR p_publication_state = '' OR EXISTS (
          SELECT 1 FROM public.article_sites AS s
          WHERE s.organization_id = a.organization_id AND s.article_id = a.id AND s.active AND s.state::text = p_publication_state))
    )
    SELECT b_org, b_org_slug, b_org_name, b_id, b_region, b_publisher, b_category, b_author,
      b_lead_media, b_cover, b_slug, b_title, b_excerpt, b_canonical, b_source, b_tags, b_status,
      b_type, b_sponsored, b_video, b_audio, b_duration, b_published, b_scheduled, b_archived,
      b_version, b_created, b_updated, b_cat_ids, b_cat_names, b_portals, b_urls, b_pub_max
    FROM base
    WHERE v_cursor_id IS NULL OR v_cursor_title IS NULL OR base.b_title > v_cursor_title OR (base.b_title = v_cursor_title AND base.b_id > v_cursor_id)
    ORDER BY base.b_title ASC, base.b_id ASC
    LIMIT v_limit + 1;
    RETURN;
  ELSIF v_sort = 'published-asc' THEN
    RETURN QUERY
    WITH base AS (
      SELECT
        a.organization_id AS b_org, o.slug AS b_org_slug, o.name AS b_org_name,
        a.id AS b_id, a.region_id AS b_region, a.publisher_id AS b_publisher, a.category_id AS b_category,
        a.author_id AS b_author, a.lead_media_id AS b_lead_media, a.cover_image_url AS b_cover,
        a.slug AS b_slug, a.title AS b_title, a.excerpt AS b_excerpt, a.canonical_url AS b_canonical,
        a.source AS b_source, (SELECT COALESCE(ARRAY_AGG(tc.slug ORDER BY at.position), '{}'::text[]) FROM public.article_tags AS at JOIN public.tag_catalog AS tc ON tc.id = at.tag_id AND tc.status = 'active' WHERE at.organization_id = a.organization_id AND at.article_id = a.id) AS b_tags, a.status AS b_status, a.type::text AS b_type,
        a.is_sponsored AS b_sponsored, a.video_url AS b_video, a.audio_url AS b_audio,
        a.duration_seconds AS b_duration, a.published_at AS b_published, a.scheduled_at AS b_scheduled,
        a.archived_at AS b_archived, a.version AS b_version, a.created_at AS b_created, a.updated_at AS b_updated,
        (SELECT COALESCE(ARRAY_AGG(ac.category_id ORDER BY ac.position), '{}'::uuid[])
         FROM public.article_categories AS ac
         WHERE ac.organization_id = a.organization_id AND ac.article_id = a.id) AS b_cat_ids,
        (SELECT COALESCE(ARRAY_AGG(cc.name ORDER BY ac.position), '{}'::text[])
         FROM public.article_categories AS ac
         JOIN public.categories AS c ON c.organization_id = ac.organization_id AND c.id = ac.category_id
         JOIN public.category_catalog AS cc ON cc.id = c.catalog_id AND cc.status = 'active'
         WHERE ac.organization_id = a.organization_id AND ac.article_id = a.id) AS b_cat_names,
        (SELECT COALESCE(ARRAY_AGG(h.hostname ORDER BY h.hostname), '{}'::text[])
         FROM (
           SELECT DISTINCT COALESCE(apex.normalized_hostname, st.normalized_hostname) AS hostname
           FROM public.article_sites AS s
           JOIN public.sites AS st ON st.organization_id = s.organization_id AND st.id = s.site_id
           LEFT JOIN public.sites AS apex ON apex.organization_id = st.organization_id AND apex.domain_id = st.domain_id AND apex.site_level = 'apex'
           WHERE s.organization_id = a.organization_id AND s.article_id = a.id AND s.active
         ) AS h WHERE h.hostname IS NOT NULL) AS b_portals,
        (SELECT COALESCE(ARRAY_AGG(u.url ORDER BY u.url), '{}'::text[])
         FROM (
           SELECT DISTINCT COALESCE(s.published_url, 'https://' || st.normalized_hostname || '/' || a.slug) AS url
           FROM public.article_sites AS s
           JOIN public.sites AS st ON st.organization_id = s.organization_id AND st.id = s.site_id
           WHERE s.organization_id = a.organization_id AND s.article_id = a.id AND s.active AND s.state = 'published'
         ) AS u) AS b_urls,
        (SELECT MAX(s.published_at)
         FROM public.article_sites AS s
         WHERE s.organization_id = a.organization_id AND s.article_id = a.id AND s.state = 'published' AND s.active) AS b_pub_max,
        ((EXTRACT(EPOCH FROM COALESCE((SELECT MAX(s.published_at) FROM public.article_sites AS s WHERE s.organization_id = a.organization_id AND s.article_id = a.id AND s.state = 'published' AND s.active), a.published_at, a.created_at)) * 1000000)::bigint) AS b_key
      FROM public.articles AS a
      JOIN public.organizations AS o ON o.id = a.organization_id
      WHERE o.status = 'active'
        AND (p_status IS NULL OR p_status = '' OR a.status::text = p_status)
        AND (p_tag IS NULL OR p_tag = '' OR EXISTS (SELECT 1 FROM public.article_tags AS at JOIN public.tag_catalog AS tc ON tc.id = at.tag_id AND tc.status = 'active' WHERE at.organization_id = a.organization_id AND at.article_id = a.id AND tc.slug = p_tag))
        AND (v_needle IS NULL OR a.title ILIKE v_needle ESCAPE '\' OR a.slug ILIKE v_needle ESCAPE '\')
        AND (p_publication_state IS NULL OR p_publication_state = '' OR EXISTS (
          SELECT 1 FROM public.article_sites AS s
          WHERE s.organization_id = a.organization_id AND s.article_id = a.id AND s.active AND s.state::text = p_publication_state))
    )
    SELECT b_org, b_org_slug, b_org_name, b_id, b_region, b_publisher, b_category, b_author,
      b_lead_media, b_cover, b_slug, b_title, b_excerpt, b_canonical, b_source, b_tags, b_status,
      b_type, b_sponsored, b_video, b_audio, b_duration, b_published, b_scheduled, b_archived,
      b_version, b_created, b_updated, b_cat_ids, b_cat_names, b_portals, b_urls, b_pub_max
    FROM base
    WHERE v_cursor_id IS NULL OR v_cursor_bigint IS NULL OR base.b_key > v_cursor_bigint OR (base.b_key = v_cursor_bigint AND base.b_id > v_cursor_id)
    ORDER BY base.b_key ASC, base.b_id ASC
    LIMIT v_limit + 1;
    RETURN;
  ELSIF v_sort = 'updated' THEN
    RETURN QUERY
    WITH base AS (
      SELECT
        a.organization_id AS b_org, o.slug AS b_org_slug, o.name AS b_org_name,
        a.id AS b_id, a.region_id AS b_region, a.publisher_id AS b_publisher, a.category_id AS b_category,
        a.author_id AS b_author, a.lead_media_id AS b_lead_media, a.cover_image_url AS b_cover,
        a.slug AS b_slug, a.title AS b_title, a.excerpt AS b_excerpt, a.canonical_url AS b_canonical,
        a.source AS b_source, (SELECT COALESCE(ARRAY_AGG(tc.slug ORDER BY at.position), '{}'::text[]) FROM public.article_tags AS at JOIN public.tag_catalog AS tc ON tc.id = at.tag_id AND tc.status = 'active' WHERE at.organization_id = a.organization_id AND at.article_id = a.id) AS b_tags, a.status AS b_status, a.type::text AS b_type,
        a.is_sponsored AS b_sponsored, a.video_url AS b_video, a.audio_url AS b_audio,
        a.duration_seconds AS b_duration, a.published_at AS b_published, a.scheduled_at AS b_scheduled,
        a.archived_at AS b_archived, a.version AS b_version, a.created_at AS b_created, a.updated_at AS b_updated,
        (SELECT COALESCE(ARRAY_AGG(ac.category_id ORDER BY ac.position), '{}'::uuid[])
         FROM public.article_categories AS ac
         WHERE ac.organization_id = a.organization_id AND ac.article_id = a.id) AS b_cat_ids,
        (SELECT COALESCE(ARRAY_AGG(cc.name ORDER BY ac.position), '{}'::text[])
         FROM public.article_categories AS ac
         JOIN public.categories AS c ON c.organization_id = ac.organization_id AND c.id = ac.category_id
         JOIN public.category_catalog AS cc ON cc.id = c.catalog_id AND cc.status = 'active'
         WHERE ac.organization_id = a.organization_id AND ac.article_id = a.id) AS b_cat_names,
        (SELECT COALESCE(ARRAY_AGG(h.hostname ORDER BY h.hostname), '{}'::text[])
         FROM (
           SELECT DISTINCT COALESCE(apex.normalized_hostname, st.normalized_hostname) AS hostname
           FROM public.article_sites AS s
           JOIN public.sites AS st ON st.organization_id = s.organization_id AND st.id = s.site_id
           LEFT JOIN public.sites AS apex ON apex.organization_id = st.organization_id AND apex.domain_id = st.domain_id AND apex.site_level = 'apex'
           WHERE s.organization_id = a.organization_id AND s.article_id = a.id AND s.active
         ) AS h WHERE h.hostname IS NOT NULL) AS b_portals,
        (SELECT COALESCE(ARRAY_AGG(u.url ORDER BY u.url), '{}'::text[])
         FROM (
           SELECT DISTINCT COALESCE(s.published_url, 'https://' || st.normalized_hostname || '/' || a.slug) AS url
           FROM public.article_sites AS s
           JOIN public.sites AS st ON st.organization_id = s.organization_id AND st.id = s.site_id
           WHERE s.organization_id = a.organization_id AND s.article_id = a.id AND s.active AND s.state = 'published'
         ) AS u) AS b_urls,
        (SELECT MAX(s.published_at)
         FROM public.article_sites AS s
         WHERE s.organization_id = a.organization_id AND s.article_id = a.id AND s.state = 'published' AND s.active) AS b_pub_max,
        ((EXTRACT(EPOCH FROM COALESCE(a.updated_at, a.created_at, a.published_at, a.scheduled_at)) * 1000000)::bigint) AS b_key
      FROM public.articles AS a
      JOIN public.organizations AS o ON o.id = a.organization_id
      WHERE o.status = 'active'
        AND (p_status IS NULL OR p_status = '' OR a.status::text = p_status)
        AND (p_tag IS NULL OR p_tag = '' OR EXISTS (SELECT 1 FROM public.article_tags AS at JOIN public.tag_catalog AS tc ON tc.id = at.tag_id AND tc.status = 'active' WHERE at.organization_id = a.organization_id AND at.article_id = a.id AND tc.slug = p_tag))
        AND (v_needle IS NULL OR a.title ILIKE v_needle ESCAPE '\' OR a.slug ILIKE v_needle ESCAPE '\')
        AND (p_publication_state IS NULL OR p_publication_state = '' OR EXISTS (
          SELECT 1 FROM public.article_sites AS s
          WHERE s.organization_id = a.organization_id AND s.article_id = a.id AND s.active AND s.state::text = p_publication_state))
    )
    SELECT b_org, b_org_slug, b_org_name, b_id, b_region, b_publisher, b_category, b_author,
      b_lead_media, b_cover, b_slug, b_title, b_excerpt, b_canonical, b_source, b_tags, b_status,
      b_type, b_sponsored, b_video, b_audio, b_duration, b_published, b_scheduled, b_archived,
      b_version, b_created, b_updated, b_cat_ids, b_cat_names, b_portals, b_urls, b_pub_max
    FROM base
    WHERE v_cursor_id IS NULL OR v_cursor_bigint IS NULL OR base.b_key < v_cursor_bigint OR (base.b_key = v_cursor_bigint AND base.b_id < v_cursor_id)
    ORDER BY base.b_key DESC, base.b_id DESC
    LIMIT v_limit + 1;
    RETURN;
  ELSIF v_sort = 'syndicated' THEN
    RETURN QUERY
    WITH base AS (
      SELECT
        a.organization_id AS b_org, o.slug AS b_org_slug, o.name AS b_org_name,
        a.id AS b_id, a.region_id AS b_region, a.publisher_id AS b_publisher, a.category_id AS b_category,
        a.author_id AS b_author, a.lead_media_id AS b_lead_media, a.cover_image_url AS b_cover,
        a.slug AS b_slug, a.title AS b_title, a.excerpt AS b_excerpt, a.canonical_url AS b_canonical,
        a.source AS b_source, (SELECT COALESCE(ARRAY_AGG(tc.slug ORDER BY at.position), '{}'::text[]) FROM public.article_tags AS at JOIN public.tag_catalog AS tc ON tc.id = at.tag_id AND tc.status = 'active' WHERE at.organization_id = a.organization_id AND at.article_id = a.id) AS b_tags, a.status AS b_status, a.type::text AS b_type,
        a.is_sponsored AS b_sponsored, a.video_url AS b_video, a.audio_url AS b_audio,
        a.duration_seconds AS b_duration, a.published_at AS b_published, a.scheduled_at AS b_scheduled,
        a.archived_at AS b_archived, a.version AS b_version, a.created_at AS b_created, a.updated_at AS b_updated,
        (SELECT COALESCE(ARRAY_AGG(ac.category_id ORDER BY ac.position), '{}'::uuid[])
         FROM public.article_categories AS ac
         WHERE ac.organization_id = a.organization_id AND ac.article_id = a.id) AS b_cat_ids,
        (SELECT COALESCE(ARRAY_AGG(cc.name ORDER BY ac.position), '{}'::text[])
         FROM public.article_categories AS ac
         JOIN public.categories AS c ON c.organization_id = ac.organization_id AND c.id = ac.category_id
         JOIN public.category_catalog AS cc ON cc.id = c.catalog_id AND cc.status = 'active'
         WHERE ac.organization_id = a.organization_id AND ac.article_id = a.id) AS b_cat_names,
        (SELECT COALESCE(ARRAY_AGG(h.hostname ORDER BY h.hostname), '{}'::text[])
         FROM (
           SELECT DISTINCT COALESCE(apex.normalized_hostname, st.normalized_hostname) AS hostname
           FROM public.article_sites AS s
           JOIN public.sites AS st ON st.organization_id = s.organization_id AND st.id = s.site_id
           LEFT JOIN public.sites AS apex ON apex.organization_id = st.organization_id AND apex.domain_id = st.domain_id AND apex.site_level = 'apex'
           WHERE s.organization_id = a.organization_id AND s.article_id = a.id AND s.active
         ) AS h WHERE h.hostname IS NOT NULL) AS b_portals,
        (SELECT COALESCE(ARRAY_AGG(u.url ORDER BY u.url), '{}'::text[])
         FROM (
           SELECT DISTINCT COALESCE(s.published_url, 'https://' || st.normalized_hostname || '/' || a.slug) AS url
           FROM public.article_sites AS s
           JOIN public.sites AS st ON st.organization_id = s.organization_id AND st.id = s.site_id
           WHERE s.organization_id = a.organization_id AND s.article_id = a.id AND s.active AND s.state = 'published'
         ) AS u) AS b_urls,
        (SELECT MAX(s.published_at)
         FROM public.article_sites AS s
         WHERE s.organization_id = a.organization_id AND s.article_id = a.id AND s.state = 'published' AND s.active) AS b_pub_max,
        (SELECT COUNT(*)::bigint
         FROM public.article_sites AS s
         WHERE s.organization_id = a.organization_id AND s.article_id = a.id AND s.state = 'published') AS b_key
      FROM public.articles AS a
      JOIN public.organizations AS o ON o.id = a.organization_id
      WHERE o.status = 'active'
        AND (p_status IS NULL OR p_status = '' OR a.status::text = p_status)
        AND (p_tag IS NULL OR p_tag = '' OR EXISTS (SELECT 1 FROM public.article_tags AS at JOIN public.tag_catalog AS tc ON tc.id = at.tag_id AND tc.status = 'active' WHERE at.organization_id = a.organization_id AND at.article_id = a.id AND tc.slug = p_tag))
        AND (v_needle IS NULL OR a.title ILIKE v_needle ESCAPE '\' OR a.slug ILIKE v_needle ESCAPE '\')
        AND (p_publication_state IS NULL OR p_publication_state = '' OR EXISTS (
          SELECT 1 FROM public.article_sites AS s
          WHERE s.organization_id = a.organization_id AND s.article_id = a.id AND s.active AND s.state::text = p_publication_state))
    )
    SELECT b_org, b_org_slug, b_org_name, b_id, b_region, b_publisher, b_category, b_author,
      b_lead_media, b_cover, b_slug, b_title, b_excerpt, b_canonical, b_source, b_tags, b_status,
      b_type, b_sponsored, b_video, b_audio, b_duration, b_published, b_scheduled, b_archived,
      b_version, b_created, b_updated, b_cat_ids, b_cat_names, b_portals, b_urls, b_pub_max
    FROM base
    WHERE v_cursor_id IS NULL OR v_cursor_bigint IS NULL OR base.b_key < v_cursor_bigint OR (base.b_key = v_cursor_bigint AND base.b_id < v_cursor_id)
    ORDER BY base.b_key DESC, base.b_id DESC
    LIMIT v_limit + 1;
    RETURN;
  ELSE
    RETURN QUERY
    WITH base AS (
      SELECT
        a.organization_id AS b_org, o.slug AS b_org_slug, o.name AS b_org_name,
        a.id AS b_id, a.region_id AS b_region, a.publisher_id AS b_publisher, a.category_id AS b_category,
        a.author_id AS b_author, a.lead_media_id AS b_lead_media, a.cover_image_url AS b_cover,
        a.slug AS b_slug, a.title AS b_title, a.excerpt AS b_excerpt, a.canonical_url AS b_canonical,
        a.source AS b_source, (SELECT COALESCE(ARRAY_AGG(tc.slug ORDER BY at.position), '{}'::text[]) FROM public.article_tags AS at JOIN public.tag_catalog AS tc ON tc.id = at.tag_id AND tc.status = 'active' WHERE at.organization_id = a.organization_id AND at.article_id = a.id) AS b_tags, a.status AS b_status, a.type::text AS b_type,
        a.is_sponsored AS b_sponsored, a.video_url AS b_video, a.audio_url AS b_audio,
        a.duration_seconds AS b_duration, a.published_at AS b_published, a.scheduled_at AS b_scheduled,
        a.archived_at AS b_archived, a.version AS b_version, a.created_at AS b_created, a.updated_at AS b_updated,
        (SELECT COALESCE(ARRAY_AGG(ac.category_id ORDER BY ac.position), '{}'::uuid[])
         FROM public.article_categories AS ac
         WHERE ac.organization_id = a.organization_id AND ac.article_id = a.id) AS b_cat_ids,
        (SELECT COALESCE(ARRAY_AGG(cc.name ORDER BY ac.position), '{}'::text[])
         FROM public.article_categories AS ac
         JOIN public.categories AS c ON c.organization_id = ac.organization_id AND c.id = ac.category_id
         JOIN public.category_catalog AS cc ON cc.id = c.catalog_id AND cc.status = 'active'
         WHERE ac.organization_id = a.organization_id AND ac.article_id = a.id) AS b_cat_names,
        (SELECT COALESCE(ARRAY_AGG(h.hostname ORDER BY h.hostname), '{}'::text[])
         FROM (
           SELECT DISTINCT COALESCE(apex.normalized_hostname, st.normalized_hostname) AS hostname
           FROM public.article_sites AS s
           JOIN public.sites AS st ON st.organization_id = s.organization_id AND st.id = s.site_id
           LEFT JOIN public.sites AS apex ON apex.organization_id = st.organization_id AND apex.domain_id = st.domain_id AND apex.site_level = 'apex'
           WHERE s.organization_id = a.organization_id AND s.article_id = a.id AND s.active
         ) AS h WHERE h.hostname IS NOT NULL) AS b_portals,
        (SELECT COALESCE(ARRAY_AGG(u.url ORDER BY u.url), '{}'::text[])
         FROM (
           SELECT DISTINCT COALESCE(s.published_url, 'https://' || st.normalized_hostname || '/' || a.slug) AS url
           FROM public.article_sites AS s
           JOIN public.sites AS st ON st.organization_id = s.organization_id AND st.id = s.site_id
           WHERE s.organization_id = a.organization_id AND s.article_id = a.id AND s.active AND s.state = 'published'
         ) AS u) AS b_urls,
        (SELECT MAX(s.published_at)
         FROM public.article_sites AS s
         WHERE s.organization_id = a.organization_id AND s.article_id = a.id AND s.state = 'published' AND s.active) AS b_pub_max,
        ((EXTRACT(EPOCH FROM COALESCE((SELECT MAX(s.published_at) FROM public.article_sites AS s WHERE s.organization_id = a.organization_id AND s.article_id = a.id AND s.state = 'published' AND s.active), a.published_at, a.created_at)) * 1000000)::bigint) AS b_key
      FROM public.articles AS a
      JOIN public.organizations AS o ON o.id = a.organization_id
      WHERE o.status = 'active'
        AND (p_status IS NULL OR p_status = '' OR a.status::text = p_status)
        AND (p_tag IS NULL OR p_tag = '' OR EXISTS (SELECT 1 FROM public.article_tags AS at JOIN public.tag_catalog AS tc ON tc.id = at.tag_id AND tc.status = 'active' WHERE at.organization_id = a.organization_id AND at.article_id = a.id AND tc.slug = p_tag))
        AND (v_needle IS NULL OR a.title ILIKE v_needle ESCAPE '\' OR a.slug ILIKE v_needle ESCAPE '\')
        AND (p_publication_state IS NULL OR p_publication_state = '' OR EXISTS (
          SELECT 1 FROM public.article_sites AS s
          WHERE s.organization_id = a.organization_id AND s.article_id = a.id AND s.active AND s.state::text = p_publication_state))
    )
    SELECT b_org, b_org_slug, b_org_name, b_id, b_region, b_publisher, b_category, b_author,
      b_lead_media, b_cover, b_slug, b_title, b_excerpt, b_canonical, b_source, b_tags, b_status,
      b_type, b_sponsored, b_video, b_audio, b_duration, b_published, b_scheduled, b_archived,
      b_version, b_created, b_updated, b_cat_ids, b_cat_names, b_portals, b_urls, b_pub_max
    FROM base
    WHERE v_cursor_id IS NULL OR v_cursor_bigint IS NULL OR base.b_key < v_cursor_bigint OR (base.b_key = v_cursor_bigint AND base.b_id < v_cursor_id)
    ORDER BY base.b_key DESC, base.b_id DESC
    LIMIT v_limit + 1;
    RETURN;
  END IF;
END;
$func$;;--> statement-breakpoint
CREATE OR REPLACE FUNCTION indicate_private.count_cross_org_articles(
  p_status text,
  p_search text,
  p_tag text,
  p_publication_state text
)
RETURNS int
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, indicate_private
AS $$
  SELECT COUNT(*)::int
  FROM public.articles AS a
  JOIN public.organizations AS o ON o.id = a.organization_id
  WHERE o.status = 'active'
    AND (p_status IS NULL OR p_status = '' OR a.status::text = p_status)
    AND (p_tag IS NULL OR p_tag = '' OR EXISTS (SELECT 1 FROM public.article_tags AS at JOIN public.tag_catalog AS tc ON tc.id = at.tag_id AND tc.status = 'active' WHERE at.organization_id = a.organization_id AND at.article_id = a.id AND tc.slug = p_tag))
    AND (
      NULLIF(btrim(p_search), '') IS NULL
      OR a.title ILIKE ('%' || REPLACE(REPLACE(REPLACE(btrim(p_search), '\', '\\'), '%', '\%'), '_', '\_') || '%') ESCAPE '\'
      OR a.slug ILIKE ('%' || REPLACE(REPLACE(REPLACE(btrim(p_search), '\', '\\'), '%', '\%'), '_', '\_') || '%') ESCAPE '\'
    )
    AND (p_publication_state IS NULL OR p_publication_state = '' OR EXISTS (
      SELECT 1 FROM public.article_sites AS s
      WHERE s.organization_id = a.organization_id AND s.article_id = a.id AND s.active AND s.state::text = p_publication_state))
$$;;--> statement-breakpoint
CREATE OR REPLACE FUNCTION indicate_private.fetch_assigned_article_details(
  requested_organization_id uuid,
  requested_article_ids uuid[]
)
RETURNS TABLE(
  article_id uuid, slug text, title text, excerpt text, canonical_url text,
  tags text[], status public.article_status, article_type text, is_sponsored boolean,
  video_url text, audio_url text, duration_seconds integer,
  region_id uuid, category_slug text, category_name text,
  publisher_name text, attribution text, publisher_logo text, publisher_city text,
  publisher_bio text, publisher_verified boolean, publisher_type text,
  author_display text, author_bio text, author_avatar text, author_url text,
  cover_image_url text, published_at timestamp with time zone,
  updated_at timestamp with time zone, body text, body_json jsonb
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, indicate_private
AS $$
  SELECT a.id, a.slug, a.title, a.excerpt, a.canonical_url,
    (SELECT COALESCE(ARRAY_AGG(tc.slug ORDER BY at.position), '{}'::text[]) FROM public.article_tags AS at JOIN public.tag_catalog AS tc ON tc.id = at.tag_id AND tc.status = 'active' WHERE at.organization_id = a.organization_id AND at.article_id = a.id), a.status, a.type::text, a.is_sponsored,
    a.video_url, a.audio_url, a.duration_seconds,
    a.region_id, cc.slug, cc.name,
    p.name, p.attribution_label,
    p.contacts->>'logoUrl', p.contacts->>'city', p.contacts->>'bio',
    p.verification_status = 'verified', p.type::text,
    au.display_name, au.bio, au.avatar_url, au.website_url,
    a.cover_image_url, a.published_at,
    a.updated_at, a.body, a.body_json
  FROM public.articles AS a
  LEFT JOIN public.publishers AS p
    ON p.organization_id = a.organization_id AND p.id = a.publisher_id AND p.status = 'active'
  LEFT JOIN public.authors AS au
    ON au.organization_id = a.organization_id AND au.id = a.author_id AND au.status = 'active'
  LEFT JOIN public.categories AS c
    ON c.organization_id = a.organization_id AND c.id = a.category_id AND c.status = 'active'
  LEFT JOIN public.category_catalog AS cc
    ON cc.id = c.catalog_id AND cc.status = 'active'
  WHERE a.organization_id = requested_organization_id
    AND a.id = ANY (requested_article_ids)
    AND a.status = 'active'
    AND a.published_at IS NOT NULL
$$;;--> statement-breakpoint
CREATE OR REPLACE FUNCTION indicate_private.fetch_assigned_articles(
  requested_organization_id uuid,
  requested_article_ids uuid[]
)
RETURNS TABLE(
  article_id uuid, slug text, title text, excerpt text, canonical_url text,
  tags text[], status public.article_status, article_type text, is_sponsored boolean,
  video_url text, audio_url text, duration_seconds integer,
  region_id uuid, category_id uuid, publisher_id uuid, author_id uuid,
  lead_media_id uuid, cover_image_url text, published_at timestamp with time zone,
  updated_at timestamp with time zone
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, indicate_private
AS $$
  SELECT a.id, a.slug, a.title, a.excerpt, a.canonical_url,
    (SELECT COALESCE(ARRAY_AGG(tc.slug ORDER BY at.position), '{}'::text[]) FROM public.article_tags AS at JOIN public.tag_catalog AS tc ON tc.id = at.tag_id AND tc.status = 'active' WHERE at.organization_id = a.organization_id AND at.article_id = a.id), a.status, a.type::text, a.is_sponsored,
    a.video_url, a.audio_url, a.duration_seconds,
    a.region_id, a.category_id, a.publisher_id, a.author_id,
    a.lead_media_id, a.cover_image_url, a.published_at,
    a.updated_at
  FROM public.articles AS a
  WHERE a.organization_id = requested_organization_id
    AND a.id = ANY (requested_article_ids)
    AND a.status = 'active'
    AND a.published_at IS NOT NULL
$$;;--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (281, 'global_metadata_readers', 'sha256:19e7a7e63d871bb14b97e56e96a7d9c04e5d29867e08cc1ad79ecf1dc30af6be');
