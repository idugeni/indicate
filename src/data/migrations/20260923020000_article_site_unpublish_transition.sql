-- Allow withdrawal of published article-site assignments: the dashboard/API
-- `publication.unpublish` path sets `article_sites` from `published` to
-- `unpublished` directly, which the current-projection guard rejects, so
-- every live unpublish fails closed. Permit exactly that terminal step;
-- all other transitions stay unchanged.
-- Body digest (reproducible): LF-normalize this file, substitute the 64-hex
-- checksum literal below with 64 zeros, SHA-256 the complete UTF-8 bytes.
CREATE OR REPLACE FUNCTION indicate_private.enforce_article_site_transition()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
BEGIN
  IF NEW.state = OLD.state THEN RETURN NEW; END IF;
  IF (
    (OLD.state = 'queued' AND NEW.state = 'processing') OR
    (OLD.state = 'processing' AND NEW.state IN ('published', 'retrying', 'failed')) OR
    (OLD.state = 'retrying' AND NEW.state IN ('processing', 'failed')) OR
    (OLD.state = 'published' AND NEW.state = 'unpublished')
  ) THEN RETURN NEW; END IF;
  IF OLD.state IN ('published', 'failed') AND NEW.state = 'queued' AND EXISTS (
    SELECT 1 FROM public.publishing_job_targets AS target
    INNER JOIN public.publishing_jobs AS job
      ON job.organization_id = target.organization_id AND job.id = target.job_id
    WHERE target.organization_id = OLD.organization_id AND target.article_site_id = OLD.id
      AND target.state = 'queued' AND job.state = 'queued'
  ) THEN RETURN NEW; END IF;
  RAISE EXCEPTION 'invalid article site current-projection transition' USING ERRCODE = '23514';
END;
$function$;--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (156, 'article_site_unpublish_transition', 'sha256:8a44a4612f72a0830541157fdf332edadd265f31df7a0a4ac9583edea3ac4a39');
