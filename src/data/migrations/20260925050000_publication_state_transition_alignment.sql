-- Align live publication guards with the application state machine.
--
-- Unpublishing a published target must move both the target and its aggregate
-- job to `unpublished`; a job with a published and failed target can therefore
-- move from `failed` to `unpublished`. A later publication request also needs
-- to requeue an article-site projection that was previously unpublished.
-- Existing processing and retry transitions remain unchanged.
-- Body digest (reproducible): LF-normalize this file, substitute the 64-hex
-- checksum literal below with 64 zeros, SHA-256 the complete UTF-8 bytes.
CREATE OR REPLACE FUNCTION indicate_private.enforce_publishing_job_transition()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
BEGIN
  IF NEW.state = OLD.state THEN RETURN NEW; END IF;
  IF NOT (
    (OLD.state = 'queued' AND NEW.state IN ('processing', 'retrying', 'failed')) OR
    (OLD.state = 'processing' AND NEW.state IN ('published', 'retrying', 'failed')) OR
    (OLD.state = 'retrying' AND NEW.state IN ('processing', 'failed')) OR
    (OLD.state = 'published' AND NEW.state = 'unpublished') OR
    (OLD.state = 'failed' AND NEW.state IN ('retrying', 'unpublished'))
  ) THEN
    RAISE EXCEPTION 'invalid publishing job state transition' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$function$;--> statement-breakpoint
CREATE OR REPLACE FUNCTION indicate_private.enforce_publishing_target_transition()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
BEGIN
  IF NEW.state = OLD.state THEN
    IF OLD.state IN ('published', 'failed', 'unpublished') THEN
      NEW.finished_at := OLD.finished_at;
      NEW.published_url := OLD.published_url;
      NEW.published_at := OLD.published_at;
      NEW.sanitized_error := OLD.sanitized_error;
    END IF;
    RETURN NEW;
  END IF;
  IF NOT (
    (OLD.state = 'queued' AND NEW.state IN ('processing', 'failed')) OR
    (OLD.state = 'processing' AND NEW.state IN ('published', 'retrying', 'failed')) OR
    (OLD.state = 'retrying' AND NEW.state IN ('processing', 'failed')) OR
    (OLD.state = 'published' AND NEW.state = 'unpublished')
  ) THEN
    RAISE EXCEPTION 'invalid publishing target state transition' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$function$;--> statement-breakpoint
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
  IF OLD.state IN ('published', 'failed', 'unpublished') AND NEW.state = 'queued' AND EXISTS (
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
VALUES (173, 'publication_state_transition_alignment', 'sha256:6b322032ba21f92828ad9a042e759193050d874bed47aea5fa857be6c0ef215a');
