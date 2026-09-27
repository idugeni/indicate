-- Drop the assignment rows that the removed automatic distribution created.
--
-- article.create used to write one article_sites row per active portal in the
-- organization. Delivery only ever reads rows in the published state, and
-- publication is the operation that decides which portals an article reaches,
-- so every one of those rows was invisible, unused, and pure write amplification.
-- On the main tenant 30 articles left 132,660 rows behind, and each editorial
-- write also enqueued a cache invalidation per portal, which is what pushed the
-- invalidation queue past half a million rows and the database over its size
-- allowance.
--
-- A row is dead when it is still queued, carries no publication timestamp, and
-- no publication job ever targeted it. Anything a job touched, or that has been
-- published, is left alone so in-flight and live work survives. The delete runs
-- in batches so it stays inside a statement timeout on a large backlog.

DO $migration$
DECLARE
  passes integer := 0;
  batch_size constant integer := 2000;
BEGIN
  LOOP
    DELETE FROM public.article_sites
    WHERE id IN (
      SELECT candidate.id
      FROM public.article_sites AS candidate
      WHERE candidate.state = 'queued'
        AND candidate.published_at IS NULL
        AND NOT EXISTS (
          SELECT 1 FROM public.publishing_job_targets AS target
          WHERE target.article_site_id = candidate.id
        )
      ORDER BY candidate.id
      LIMIT batch_size
    );
    passes := passes + 1;
    EXIT WHEN passes > 10000;
  END LOOP;
END
$migration$;
--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (209, 'drop_unpublished_auto_assignments', 'sha256:09a60347a6fe4fc18565194e26bca74f3b2cfc5f99528f3ddf20a8324c24b7fb');
