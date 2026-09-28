-- Relabel the default article category from `Umum` (slug `umum`) to `Berita`
-- (slug `berita`).
--
-- Ledger 206 seeded `Umum` into every organization that owns a publisher so an
-- article could never be filed under no category. The label was the wrong call
-- for an Indonesian newsroom: `Umum` reads as "general" and "miscellaneous" in
-- one word, so an editor skims past it, and the composer pre-selects it, which
-- means every story nobody deliberately filed landed in a bucket nobody
-- browses. `Berita` is the desk an editor expects an unfiled story to sit in.
--
-- The row is renamed in place instead of being deleted and re-seeded so the
-- category id never moves; that leaves every `articles.category_id` and
-- `article_categories` row untouched. All sixty seeded rows were still
-- unreferenced when this was written, but renaming in place makes that not
-- matter.
--
-- One organization (`Pengelola Platform`) already owned an active `Berita`
-- category carrying 30 articles of its own. `categories_organization_slug_unique`
-- makes a blind rename collide there, so that organization's seeded row is
-- archived instead: its existing `Berita` already is the label the default
-- wants, and the duplicate is retired rather than renamed onto the same slug.
--
-- Body digest (reproducible): LF-normalize this file, substitute the 64-hex
-- checksum literal below with 64 zeros, SHA-256 the complete UTF-8 bytes.
DO $$
DECLARE
  referenced integer;
BEGIN
  SELECT count(*) INTO referenced
    FROM public.categories AS seeded
   WHERE seeded.slug = 'umum'
     AND (EXISTS (SELECT 1 FROM public.articles WHERE articles.category_id = seeded.id)
       OR EXISTS (SELECT 1 FROM public.article_categories WHERE article_categories.category_id = seeded.id));

  IF referenced <> 0 THEN
    RAISE EXCEPTION 'default_category_berita_blocked: % umum categories are still referenced by articles', referenced;
  END IF;
END;
$$;--> statement-breakpoint
UPDATE public.categories AS seeded
   SET status = 'archived'::public.record_status,
       version = seeded.version + 1,
       updated_at = now()
  FROM public.categories AS keeper
 WHERE keeper.organization_id = seeded.organization_id
   AND keeper.slug = 'berita'
   AND keeper.status = 'active'::public.record_status
   AND seeded.slug = 'umum'
   AND seeded.status = 'active'::public.record_status
   AND seeded.id <> keeper.id;--> statement-breakpoint
UPDATE public.categories
   SET name = 'Berita',
       slug = 'berita',
       version = version + 1,
       updated_at = now()
 WHERE slug = 'umum'
   AND status = 'active'::public.record_status
   AND NOT EXISTS (
     SELECT 1 FROM public.categories AS keeper
      WHERE keeper.organization_id = public.categories.organization_id
        AND keeper.slug = 'berita'
   );--> statement-breakpoint
DO $$
DECLARE
  expected integer;
  resolved integer;
  missing integer;
  leftover integer;
BEGIN
  SELECT count(*) INTO expected
    FROM (SELECT DISTINCT organization_id FROM public.publishers) AS publisher_org;

  SELECT count(*) INTO resolved
    FROM public.categories
   WHERE slug = 'berita'
     AND status = 'active'
     AND EXISTS (SELECT 1 FROM public.publishers AS p WHERE p.organization_id = categories.organization_id);

  SELECT count(*) INTO missing
    FROM (SELECT DISTINCT organization_id FROM public.publishers) AS publisher_org
   WHERE NOT EXISTS (
     SELECT 1 FROM public.categories AS c
      WHERE c.organization_id = publisher_org.organization_id
        AND c.slug = 'berita'
        AND c.status = 'active'
   );

  SELECT count(*) INTO leftover
    FROM public.categories
   WHERE slug = 'umum'
     AND status = 'active';

  IF missing <> 0 OR leftover <> 0 THEN
    RAISE EXCEPTION 'default_category_berita_incomplete: % publishing organizations without an active berita category, % active umum rows left', missing, leftover;
  END IF;

  RAISE NOTICE 'default_category_berita_done: % publishing organizations, % berita categories', expected, resolved;
END;
$$;--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (216, 'default_article_category_berita', 'sha256:37cff4dd0fa5725d116fc7c4a9f156a5bc812c61bf20ee0dd87d15ea24762c31');
