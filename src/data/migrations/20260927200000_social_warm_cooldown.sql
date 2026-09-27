-- Give the social warm a cooldown so one unreachable target cannot hold the queue.
--
-- `due_social_warm_targets` is oldest-first and `SocialWarmer` marks a target
-- only after Meta accepted it, so a target that never succeeds is due again on
-- every dispatch forever. On production nothing was ever marked: 4,020 of 4,020
-- published `article_sites` rows still carried a NULL `social_warmed_at`, all
-- 64 slots of every tick went to the same 2026-07-28 batch, and a newly
-- published article sat at position 4,021 behind a window it could never enter.
--
-- Two columns break that: `social_warm_attempts` counts failed attempts and
-- `social_warm_next_attempt_at` parks the target until a cooldown elapses, so a
-- permanently failing URL falls out of the oldest-first window instead of
-- starving everything newer. The cooldown doubles from 30s and caps at 7 days,
-- which both spreads Meta's quota and lets a genuinely fixed deployment resume
-- without a manual reset.
--
-- The existing backlog is parked for a week rather than warmed. Meta caches a
-- URL for about 30 days and spends several units of an app-wide quota per
-- scrape, so 4,020 pre-scrape calls would burn that quota on links first
-- published in July. Rows published after this migration start with a NULL
-- cooldown and are due on the next dispatch, so warming proceeds forward only.

ALTER TABLE public.article_sites
  ADD COLUMN social_warm_attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN social_warm_next_attempt_at timestamp with time zone;

ALTER TABLE public.article_sites
  ADD CONSTRAINT article_sites_social_warm_attempts_nonnegative CHECK (social_warm_attempts >= 0);

CREATE OR REPLACE FUNCTION indicate_private.social_warm_cooldown(p_attempts integer)
 RETURNS interval
 LANGUAGE sql
 IMMUTABLE
AS $function$
  SELECT make_interval(secs => LEAST(604800, 30 * (2 ^ LEAST(GREATEST(p_attempts, 1) - 1, 15))))
$function$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION indicate_private.due_social_warm_targets(p_limit integer)
 RETURNS TABLE(article_site_id uuid, url text)
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
     AND (target.social_warm_next_attempt_at IS NULL OR target.social_warm_next_attempt_at <= now())
   ORDER BY target.social_warm_next_attempt_at NULLS FIRST, target.published_at, target.id
   LIMIT greatest(1, least(p_limit, 200));
$function$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION indicate_private.mark_social_warm_attempts(p_article_site_ids uuid[], p_now timestamptz)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
DECLARE
  touched integer;
BEGIN
  UPDATE public.article_sites AS target
     SET social_warm_attempts = target.social_warm_attempts + 1,
         social_warm_next_attempt_at = p_now + indicate_private.social_warm_cooldown(target.social_warm_attempts + 1),
         updated_at = p_now
   WHERE target.id = ANY(p_article_site_ids)
     AND target.social_warmed_at IS NULL;
  GET DIAGNOSTICS touched = ROW_COUNT;
  RETURN touched;
END
$function$;
--> statement-breakpoint
DROP INDEX IF EXISTS public.article_sites_social_warm_due_idx;
--> statement-breakpoint
CREATE INDEX article_sites_social_warm_due_idx
  ON public.article_sites (social_warm_next_attempt_at NULLS FIRST, published_at, id)
  WHERE social_warmed_at IS NULL AND state = 'published';
--> statement-breakpoint
ANALYZE public.article_sites;
--> statement-breakpoint
UPDATE public.article_sites
   SET social_warm_attempts = 1,
       social_warm_next_attempt_at = now() + interval '7 days'
 WHERE social_warmed_at IS NULL
   AND state = 'published'
   AND social_warm_next_attempt_at IS NULL;
--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (210, 'social_warm_cooldown', 'sha256:bed6cd96936947333e2f4603d9091d439693eb0c5e06718f345e20215e056c50');