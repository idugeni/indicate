-- One-time production data repair: move 13 UPT-owned articles to their real
-- tenant owners and convert the 134 platform-local publication rows per article
-- into cross-organization portal assignments. Original article_sites and
-- publishing-job targets are retained as inactive history; existing slugs and
-- public URLs are preserved. Execute once with a migration-owner credential.
DO $migration$
DECLARE
  v_platform_org uuid;
  v_candidate_count integer;
  v_assignment_count integer;
  v_inactive_site_count integer;
BEGIN
  SELECT id INTO STRICT v_platform_org
  FROM public.organizations
  WHERE slug = 'pengelola-platform';

  CREATE TEMP TABLE _rehome_cross_org_articles ON COMMIT DROP AS
  WITH candidates(source_article_id, target_org_slug) AS (
    VALUES
      ('e58f6502-9216-4e35-9a7e-b54ad88ef3df'::uuid, 'lapas-kelas-ii-a-besi-nusakambangan'),
      ('1db0a0f5-ead7-404d-8d49-43f6a6594a06'::uuid, 'lapas-kelas-ii-a-gladakan-nusakambangan'),
      ('68ac31ec-b50e-4c23-90d3-06d176cb9e04'::uuid, 'lapas-kelas-ii-a-kembang-kuning-nusakambangan'),
      ('c5042f2c-63bf-4d5c-a118-6c2198683b4c'::uuid, 'lapas-kelas-ii-a-permisan-nusakambangan'),
      ('52ba71bb-e06d-4040-aefc-6b9e6ecf794e'::uuid, 'lapas-terbuka-kelas-ii-b-kendal'),
      ('09d10134-8804-47e1-bba7-7693d49761f9'::uuid, 'lapas-terbuka-kelas-ii-b-kendal'),
      ('3bdc78fa-c970-433f-a493-a07346acb1fa'::uuid, 'rutan-kelas-ii-a-pekalongan'),
      ('b0a3124c-d879-4df6-91b1-6821bef176df'::uuid, 'rutan-kelas-ii-b-banyumas'),
      ('9737db5d-46b5-4759-8d3b-cfe58c171cd4'::uuid, 'rutan-kelas-ii-b-blora'),
      ('d38ea52a-77fd-4a38-a609-eb0a355950ec'::uuid, 'rutan-kelas-ii-b-kudus'),
      ('38d77abf-6325-4333-bfe0-93f319ac4218'::uuid, 'rutan-kelas-ii-b-purbalingga'),
      ('8a23deef-6ebd-44e6-ada3-2181674b0c73'::uuid, 'rutan-kelas-ii-b-rembang'),
      ('51c20cde-6887-40fc-adbc-31f485a60ac1'::uuid, 'rutan-kelas-ii-b-temanggung')
  )
  SELECT
    source.id AS legacy_article_id,
    target_org.id AS target_organization_id,
    gen_random_uuid() AS new_article_id,
    source.slug,
    target_publisher.id AS target_publisher_id,
    COALESCE(target_author.id, redaksi_author.id) AS target_author_id,
    COALESCE(target_primary_category.id, target_news_category.id) AS target_category_id,
    target_region.id AS target_region_id
  FROM candidates candidate
  JOIN public.articles source
    ON source.id = candidate.source_article_id
   AND source.organization_id = v_platform_org
  JOIN public.organizations target_org
    ON target_org.slug = candidate.target_org_slug
   AND target_org.status = 'active'
  JOIN public.publishers source_publisher
    ON source_publisher.organization_id = source.organization_id
   AND source_publisher.id = source.publisher_id
  LEFT JOIN public.authors source_author
    ON source_author.organization_id = source.organization_id
   AND source_author.id = source.author_id
  LEFT JOIN public.categories source_category
    ON source_category.organization_id = source.organization_id
   AND source_category.id = source.category_id
  LEFT JOIN public.regions source_region
    ON source_region.organization_id = source.organization_id
   AND source_region.id = source.region_id
  LEFT JOIN public.publishers target_publisher
    ON target_publisher.organization_id = target_org.id
   AND target_publisher.name = source_publisher.name
   AND target_publisher.status = 'active'
  LEFT JOIN public.authors target_author
    ON target_author.organization_id = target_org.id
   AND target_author.display_name = source_author.display_name
   AND target_author.status = 'active'
  LEFT JOIN public.authors redaksi_author
    ON redaksi_author.organization_id = target_org.id
   AND redaksi_author.display_name = 'Redaksi'
   AND redaksi_author.status = 'active'
  LEFT JOIN public.categories target_primary_category
    ON target_primary_category.organization_id = target_org.id
   AND target_primary_category.slug = source_category.slug
   AND target_primary_category.status = 'active'
  LEFT JOIN public.categories target_news_category
    ON target_news_category.organization_id = target_org.id
   AND target_news_category.slug = 'berita'
   AND target_news_category.status = 'active'
  LEFT JOIN public.regions target_region
    ON target_region.organization_id = target_org.id
   AND target_region.slug = source_region.slug
   AND target_region.status = 'active';

  SELECT count(*) INTO v_candidate_count FROM _rehome_cross_org_articles;
  IF v_candidate_count <> 13 THEN
    RAISE EXCEPTION 'Expected 13 source articles with active target organizations; found %', v_candidate_count;
  END IF;

  IF EXISTS (
    SELECT 1 FROM _rehome_cross_org_articles m
    WHERE m.target_publisher_id IS NULL
       OR m.target_author_id IS NULL
       OR m.target_category_id IS NULL
  ) THEN
    RAISE EXCEPTION 'Target publisher, author (including Redaksi fallback), or category mapping is missing; no rows changed';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM _rehome_cross_org_articles m
    JOIN public.articles a
      ON a.organization_id = m.target_organization_id
     AND a.slug = m.slug
  ) THEN
    RAISE EXCEPTION 'Target organization already contains one of the article slugs; refusing to duplicate';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM _rehome_cross_org_articles m
    LEFT JOIN LATERAL (
      SELECT count(*) AS total,
             count(*) FILTER (WHERE active AND state = 'published' AND published_at IS NOT NULL) AS published_active
      FROM public.article_sites s
      WHERE s.organization_id = v_platform_org
        AND s.article_id = m.legacy_article_id
    ) distribution ON true
    WHERE distribution.total <> 134
       OR distribution.published_active <> 134
  ) THEN
    RAISE EXCEPTION 'Expected exactly 134 active published site rows per article; refusing partial migration';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM _rehome_cross_org_articles m
    JOIN public.portal_assignments pa
      ON pa.organization_id = v_platform_org
     AND pa.source_organization_id = m.target_organization_id
     AND pa.source_article_id = m.new_article_id
  ) THEN
    RAISE EXCEPTION 'Unexpected existing portal assignments for generated target IDs';
  END IF;

  -- Create tenant-owned canonical articles. The legacy media UUID is retained
  -- intentionally: bridge media authorization checks the assigned source
  -- article's lead_media_id against the public organization asset. There is no
  -- articles.lead_media_id FK, and object keys must remain globally unique.
  INSERT INTO public.articles (
    organization_id, id, region_id, publisher_id, category_id, author_id,
    lead_media_id, slug, title, body, source, status, published_at, archived_at,
    version, created_at, updated_at, tags, cover_image_url, excerpt,
    canonical_url, scheduled_at, body_json, type, is_sponsored, video_url,
    audio_url, duration_seconds
  )
  SELECT
    m.target_organization_id,
    m.new_article_id,
    m.target_region_id,
    m.target_publisher_id,
    m.target_category_id,
    m.target_author_id,
    source.lead_media_id,
    source.slug,
    source.title,
    source.body,
    source.source,
    'active'::public.article_status,
    COALESCE(
      source.published_at,
      (SELECT max(s.published_at)
       FROM public.article_sites s
       WHERE s.organization_id = v_platform_org
         AND s.article_id = source.id
         AND s.active
         AND s.state = 'published')
    ),
    NULL,
    1,
    source.created_at,
    now(),
    source.tags,
    source.cover_image_url,
    source.excerpt,
    NULL, -- per-host canonical URLs are generated by the portal renderer
    NULL,
    source.body_json,
    source.type,
    source.is_sponsored,
    source.video_url,
    source.audio_url,
    source.duration_seconds
  FROM _rehome_cross_org_articles m
  JOIN public.articles source ON source.id = m.legacy_article_id;

  -- Preserve all available source categories, mapping by slug into the tenant.
  -- If a source category does not exist in that tenant, use its local "berita".
  INSERT INTO public.article_categories (organization_id, article_id, category_id, position)
  SELECT
    m.target_organization_id,
    m.new_article_id,
    COALESCE(target_category.id, m.target_category_id),
    source_category.position
  FROM _rehome_cross_org_articles m
  JOIN public.article_categories source_category
    ON source_category.organization_id = v_platform_org
   AND source_category.article_id = m.legacy_article_id
  LEFT JOIN public.categories legacy_category
    ON legacy_category.organization_id = v_platform_org
   AND legacy_category.id = source_category.category_id
  LEFT JOIN public.categories target_category
    ON target_category.organization_id = m.target_organization_id
   AND target_category.slug = legacy_category.slug
   AND target_category.status = 'active'
  ON CONFLICT DO NOTHING;

  INSERT INTO public.article_categories (organization_id, article_id, category_id, position)
  SELECT m.target_organization_id, m.new_article_id, m.target_category_id, 0
  FROM _rehome_cross_org_articles m
  WHERE NOT EXISTS (
    SELECT 1 FROM public.article_categories ac
    WHERE ac.organization_id = m.target_organization_id
      AND ac.article_id = m.new_article_id
  )
  ON CONFLICT DO NOTHING;

  -- Keep article revision and update history attached to the new owner.
  INSERT INTO public.article_revisions (
    organization_id, id, article_id, revision_number, title, body, snapshot,
    created_by, created_at, updated_at, body_json
  )
  SELECT
    m.target_organization_id, gen_random_uuid(), m.new_article_id,
    revision.revision_number, revision.title, revision.body, revision.snapshot,
    revision.created_by, revision.created_at, revision.updated_at, revision.body_json
  FROM _rehome_cross_org_articles m
  JOIN public.article_revisions revision
    ON revision.organization_id = v_platform_org
   AND revision.article_id = m.legacy_article_id
  ON CONFLICT DO NOTHING;

  INSERT INTO public.article_updates (
    organization_id, id, article_id, body, sort_order, published_at,
    created_by, created_at, updated_at, version
  )
  SELECT
    m.target_organization_id, gen_random_uuid(), m.new_article_id,
    update_row.body, update_row.sort_order, update_row.published_at,
    update_row.created_by, update_row.created_at, update_row.updated_at,
    update_row.version
  FROM _rehome_cross_org_articles m
  JOIN public.article_updates update_row
    ON update_row.organization_id = v_platform_org
   AND update_row.article_id = m.legacy_article_id;

  -- Move the live distribution to the cross-org bridge. Keep old article_sites
  -- rows and their published URLs for publishing-job and audit history.
  INSERT INTO public.portal_assignments (
    id, organization_id, site_id, source_organization_id, source_article_id,
    state, state_occurred_at, published_at, version, created_at, updated_at,
    view_count
  )
  SELECT
    gen_random_uuid(),
    v_platform_org,
    old_site.site_id,
    m.target_organization_id,
    m.new_article_id,
    old_site.state,
    old_site.state_occurred_at,
    old_site.published_at,
    old_site.version,
    old_site.created_at,
    now(),
    old_site.view_count
  FROM _rehome_cross_org_articles m
  JOIN public.article_sites old_site
    ON old_site.organization_id = v_platform_org
   AND old_site.article_id = m.legacy_article_id
   AND old_site.active
   AND old_site.state = 'published'
   AND old_site.published_at IS NOT NULL;

  GET DIAGNOSTICS v_assignment_count = ROW_COUNT;
  IF v_assignment_count <> 1742 THEN
    RAISE EXCEPTION 'Expected 1742 portal assignments; inserted %; rolling back', v_assignment_count;
  END IF;

  UPDATE public.article_sites old_site
  SET active = false,
      version = old_site.version + 1,
      updated_at = now()
  FROM _rehome_cross_org_articles m
  WHERE old_site.organization_id = v_platform_org
    AND old_site.article_id = m.legacy_article_id
    AND old_site.active;

  GET DIAGNOSTICS v_inactive_site_count = ROW_COUNT;
  IF v_inactive_site_count <> 1742 THEN
    RAISE EXCEPTION 'Expected 1742 legacy site rows to be retained as inactive history; updated %; rolling back', v_inactive_site_count;
  END IF;

  UPDATE public.articles source
  SET status = 'archived'::public.article_status,
      archived_at = COALESCE(source.archived_at, now()),
      version = source.version + 1,
      updated_at = now()
  FROM _rehome_cross_org_articles m
  WHERE source.organization_id = v_platform_org
    AND source.id = m.legacy_article_id;

  IF EXISTS (
    SELECT 1 FROM _rehome_cross_org_articles m
    LEFT JOIN public.articles owner_article
      ON owner_article.organization_id = m.target_organization_id
     AND owner_article.id = m.new_article_id
    LEFT JOIN public.portal_assignments pa
      ON pa.organization_id = v_platform_org
     AND pa.source_organization_id = m.target_organization_id
     AND pa.source_article_id = m.new_article_id
    WHERE owner_article.id IS NULL
       OR owner_article.status <> 'active'
       OR owner_article.published_at IS NULL
       OR pa.id IS NULL
  ) THEN
    RAISE EXCEPTION 'Post-migration ownership/bridge verification failed; rolling back';
  END IF;
END
$migration$;
