-- Retire the Facebook/Meta pre-scrape machinery.
--
-- Migrations 200 and 210 built a one-shot ledger for handing each public article
-- URL to Meta's Graph API scrape endpoint: a marker column, a cooldown pair, a
-- partial due index, and three SECURITY DEFINER helpers the invalidation
-- dispatcher drained. The integration it served is gone, so every object exists
-- only to schedule a call nobody makes.
--
-- Nothing reads or writes these columns outside the removed warmer, and the
-- article URLs themselves are unaffected: the Open Graph surface a scraper
-- consumes is `og:title` / `og:description` / `og:image` rendered by
-- `generateMetadata()`, which is independent of this ledger. The marker only
-- ever recorded "Meta has already been told about this URL", and losing that
-- memory is precisely what retiring the integration means.
--
-- Dropping the columns is safe under expand/contract because the release that
-- removes the writer is this one: the code no longer references them, so nothing
-- has to be backfilled and no later release depends on the state.
--
-- The functions go first, since they are the only callers of the columns and
-- their signatures would otherwise outlive the table shape they read.

DROP FUNCTION IF EXISTS indicate_private.due_social_warm_targets(integer);
--> statement-breakpoint
DROP FUNCTION IF EXISTS indicate_private.mark_social_warm_targets(uuid[], timestamptz);
--> statement-breakpoint
DROP FUNCTION IF EXISTS indicate_private.mark_social_warm_attempts(uuid[], timestamptz);
--> statement-breakpoint
DROP FUNCTION IF EXISTS indicate_private.social_warm_cooldown(integer);
--> statement-breakpoint
DROP INDEX IF EXISTS public.article_sites_social_warm_due_idx;
--> statement-breakpoint
ALTER TABLE public.article_sites
  DROP CONSTRAINT IF EXISTS article_sites_social_warm_attempts_nonnegative;
--> statement-breakpoint
ALTER TABLE public.article_sites
  DROP COLUMN IF EXISTS social_warm_next_attempt_at,
  DROP COLUMN IF EXISTS social_warm_attempts,
  DROP COLUMN IF EXISTS social_warmed_at;
--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (217, 'drop_social_warm', 'sha256:55a2e19ae2ad79e1cef9f8d17baa2473737eaab9a26fa4d5197b8de67fef52d1');
