-- Undo the editorial timestamp that the publisher-dedupe migration stamped onto
-- all 30 articles.
--
-- That migration backfilled `articles.published_at` from the published
-- assignments. The correction was right, but `articles_touch_updated_at` fires on
-- any row change, so the backfill also rewrote `articles.updated_at` to the moment
-- it ran. Delivery renders `updatedAt` as the "Diperbarui" line, so every article
-- page started claiming it had been revised today even though nothing had been
-- edited. The stored value before the backfill was a single bulk timestamp from
-- the 2026-09-27 import, so the per-row `created_at` is the closest truthful
-- record of when each article was last touched.
--
-- The trigger has to stand down for the write, because it would otherwise stamp
-- the row again. It is disabled and re-enabled inside the same transaction, so a
-- failure anywhere rolls the whole migration back with the trigger still armed.
--
-- The guard matches the exact timestamp the backfill produced. A row edited since
-- then carries a different value and is left alone, so this can never overwrite a
-- real editorial change that happened after the backfill.

DO $migration$
DECLARE
  stamped integer;
  total integer;
BEGIN
  SELECT count(*) INTO stamped
  FROM public.articles
  WHERE updated_at = '2026-09-28 11:21:12.472508+00'::timestamptz;

  SELECT count(*) INTO total FROM public.articles;

  IF stamped <> total THEN
    RAISE EXCEPTION
      'article_updated_at_restore_unexpected_shape: stamped=% total=%',
      stamped, total;
  END IF;

  ALTER TABLE public.articles DISABLE TRIGGER articles_touch_updated_at;

  UPDATE public.articles
  SET updated_at = created_at
  WHERE updated_at = '2026-09-28 11:21:12.472508+00'::timestamptz;

  ALTER TABLE public.articles ENABLE TRIGGER articles_touch_updated_at;
END
$migration$;
--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (215, 'article_updated_at_restore', 'sha256:3667c5652edeadffc32296b693a5a0d28eeb87a0ab346a97c7fb94e2cca01fef');
