-- Warm each public article URL for social scrapers exactly once, at first publish.
--
-- Every mutation that touched an article used to hand its URL back to Meta's
-- scrape backend, so one editorial edit — or one publisher rename, which fans
-- out to every article that publisher owns — spent app quota to re-scrape a URL
-- Meta had already cached for about thirty days. The marker below replaces that
-- fan-out with one scrape per URL for the lifetime of the article.
--
-- `article_sites` is one row per (article, site) pair, so it is the row that owns
-- one public URL, `https://{hostname}/{slug}`. Keying the marker there rather
-- than on the article matters: a site assignment publishes a brand-new URL for an
-- article that is not new at all, and that URL still needs its one scrape.
--
-- The backfill marks every already-published row. Articles live before this
-- migration keep whatever Meta already cached instead of spending one quota unit
-- each the first time somebody edits them, and it keeps the due set equal to
-- "published since the migration", which is what the warmer drains.
--
-- `due_social_warm_targets` reads that set oldest-first and `mark_social_warm_targets`
-- fills it, so a warm that fails or is cut off by the dispatch budget stays due
-- and is retried on the next minute rather than being lost.
--
-- The partial index holds only published, unmarked rows, which is empty in
-- steady state, so the due query costs an index probe and the marker adds one
-- nullable column and no table bloat.

ALTER TABLE public.article_sites ADD COLUMN social_warmed_at timestamptz;--> statement-breakpoint

UPDATE public.article_sites
   SET social_warmed_at = published_at
 WHERE state = 'published' AND published_at IS NOT NULL AND social_warmed_at IS NULL;--> statement-breakpoint

CREATE INDEX article_sites_social_warm_due_idx
  ON public.article_sites (published_at, id)
  WHERE social_warmed_at IS NULL AND state = 'published';--> statement-breakpoint

-- Oldest-due first: a URL whose warm failed or was cut off is retried before
-- newer URLs, and LIMIT caps one dispatch regardless of backlog size.
CREATE OR REPLACE FUNCTION indicate_private.due_social_warm_targets(p_limit integer)
RETURNS TABLE (article_site_id uuid, url text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
  SELECT target.id, 'https://' || host.normalized_hostname || '/' || article.slug
    FROM public.article_sites AS target
    JOIN public.articles AS article
      ON article.organization_id = target.organization_id AND article.id = target.article_id
    JOIN public.sites AS host
      ON host.organization_id = target.organization_id AND host.id = target.site_id
   WHERE target.social_warmed_at IS NULL
     AND target.state = 'published'
     AND target.active
     AND host.status = 'active'
   ORDER BY target.published_at, target.id
   LIMIT greatest(1, least(p_limit, 200));
$function$;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.due_social_warm_targets(integer) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.due_social_warm_targets(integer) TO indicate_runtime;--> statement-breakpoint

-- Fills only NULL markers, so a concurrent dispatcher that already recorded the
-- same URL is not overwritten and the call is idempotent.
CREATE OR REPLACE FUNCTION indicate_private.mark_social_warm_targets(p_article_site_ids uuid[], p_now timestamptz)
RETURNS integer
LANGUAGE sql
VOLATILE SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
  WITH filled AS (
    UPDATE public.article_sites AS target
       SET social_warmed_at = p_now
     WHERE target.id = ANY (p_article_site_ids)
       AND target.social_warmed_at IS NULL
    RETURNING 1
  )
  SELECT count(*)::integer FROM filled;
$function$;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.mark_social_warm_targets(uuid[], timestamptz) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.mark_social_warm_targets(uuid[], timestamptz) TO indicate_runtime;--> statement-breakpoint

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.article_sites
     WHERE state = 'published' AND published_at IS NOT NULL AND social_warmed_at IS NULL
  ) THEN
    RAISE EXCEPTION 'social_warm_backfill_incomplete';
  END IF;
END;
$$;--> statement-breakpoint

-- Body digest (reproducible): LF-normalize this file, substitute the 64-hex
-- checksum literal below with 64 zeros, SHA-256 the complete UTF-8 bytes.
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (200, 'social_warm_once', 'sha256:066f8e73c35430da3cf8cf7352f975756dbfd5e8ae59123676c2a91217b66eca');
