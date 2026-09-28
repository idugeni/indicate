-- Drop the orphaned publisher batch, carry its city metadata forward, and close
-- the two gaps that let the duplicate provisioning pass land unnoticed.
--
-- The 59 unit publishers were written twice. The 2026-09-08 pass wrote one
-- publisher per unit inside that unit's own tenant organization; the 2026-09-13
-- pass wrote the same 59 names again inside the platform organization and is the
-- one the 7,906 official_affiliations rows point at. The first pass therefore
-- holds the only copy of `contacts.city` and has no referrer at all: no article,
-- no affiliation, no audit row, and none of its 59 organizations owns a site.
-- The second pass lost `city` when the R2 logo backfill rewrote `contacts`, so
-- the deletion merges that single field forward rather than dropping it with the
-- row.
--
-- `logoUrl` is deliberately not merged. The first pass points at per-unit logos
-- that are all archived, while the second pass points at the active shared
-- organization asset, so copying the field would repoint 59 verified publishers
-- at media that no longer serves.
--
-- The unique constraint could not have prevented the original incident, because
-- the two passes landed in different organizations. It closes the same hole
-- within one organization, which is where a re-run of the centralized pass would
-- collide.
--
-- `articles.published_at` was left null by the import even though every article
-- has published assignments carrying the editorial date. Delivery renders the
-- assignment timestamp, so the column does not change a rendered page today, but
-- a null editorial date is not a state any sort, export, or reader of the table
-- can survive.
--
-- The guard refuses to run unless the shape is exactly the one audited: 118 unit
-- rows over 59 names, and no referrer of any kind on the older row of each name.

DO $migration$
DECLARE
  unit_rows integer;
  unit_names integer;
  orphan_referrers integer;
BEGIN
  WITH ranked AS (
    SELECT
      id,
      name,
      row_number() OVER (PARTITION BY name ORDER BY created_at, id) AS rank_in_name
    FROM public.publishers
    WHERE type = 'correctional_institution'
  )
  SELECT
    count(*),
    count(DISTINCT name),
    count(*) FILTER (
      WHERE rank_in_name = 1
        AND (
          EXISTS (SELECT 1 FROM public.articles AS article WHERE article.publisher_id = ranked.id)
          OR EXISTS (SELECT 1 FROM public.official_affiliations AS affiliation WHERE affiliation.publisher_id = ranked.id)
          OR EXISTS (
            SELECT 1
            FROM public.audit_logs AS log
            WHERE log.target_id = ranked.id::text
          )
        )
    )
  INTO unit_rows, unit_names, orphan_referrers
  FROM ranked;

  IF unit_rows <> 118 OR unit_names <> 59 OR orphan_referrers <> 0 THEN
    RAISE EXCEPTION
      'publisher_dedupe_unexpected_shape: rows=% names=% orphan_referrers=%',
      unit_rows, unit_names, orphan_referrers;
  END IF;

  WITH ranked AS (
    SELECT
      id,
      name,
      contacts,
      row_number() OVER (PARTITION BY name ORDER BY created_at, id) AS rank_in_name
    FROM public.publishers
    WHERE type = 'correctional_institution'
  )
  UPDATE public.publishers AS live
  SET contacts = live.contacts || jsonb_build_object('city', orphan.contacts ->> 'city'),
      updated_at = now()
  FROM ranked AS orphan
  WHERE orphan.rank_in_name = 1
    AND orphan.contacts ->> 'city' IS NOT NULL
    AND live.type = 'correctional_institution'
    AND live.name = orphan.name
    AND NOT (live.contacts ? 'city');

  WITH ranked AS (
    SELECT
      id,
      row_number() OVER (PARTITION BY name ORDER BY created_at, id) AS rank_in_name
    FROM public.publishers
    WHERE type = 'correctional_institution'
  )
  DELETE FROM public.publishers AS publisher
  USING ranked
  WHERE ranked.id = publisher.id
    AND ranked.rank_in_name = 1;
END
$migration$;
--> statement-breakpoint
ALTER TABLE public.publishers
  ADD CONSTRAINT publishers_org_name_unique UNIQUE (organization_id, name);
--> statement-breakpoint
UPDATE public.articles AS article
SET published_at = assignment.published_at
FROM (
  SELECT article_id, min(published_at) AS published_at
  FROM public.article_sites
  WHERE state = 'published'
    AND published_at IS NOT NULL
  GROUP BY article_id
) AS assignment
WHERE assignment.article_id = article.id
  AND article.published_at IS NULL;
--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (213, 'publisher_dedupe_and_article_dates', 'sha256:3bb7328c1f3bb1c167b9335f37869f8de735cd997aa673060429610a97dc5332');
