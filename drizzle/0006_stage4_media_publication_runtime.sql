-- Stage 4 exact media reservations, immutable publication outcomes, strict transitions, and claimed reconciliation.
ALTER TABLE public.media_key_reservations
  ADD CONSTRAINT media_key_reservation_owner_prefix CHECK (
    (article_id IS NOT NULL AND object_key LIKE ('articles/' || article_id::text || '/%'))
    OR (site_id IS NOT NULL AND object_key LIKE ('sites/' || site_id::text || '/%'))
    OR (organization_asset AND object_key LIKE 'assets/%')
  );--> statement-breakpoint

UPDATE public.media_key_reservations
SET status = 'occupied', expected_checksum = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA='
WHERE expected_checksum IS NULL;--> statement-breakpoint
ALTER TABLE public.media_key_reservations
  ALTER COLUMN expected_checksum SET NOT NULL,
  ADD CONSTRAINT media_key_reservation_sha256_checksum CHECK (expected_checksum ~ '^[A-Za-z0-9+/]{43}=$');--> statement-breakpoint

ALTER TABLE public.publishing_job_targets
  ADD COLUMN published_url text,
  ADD COLUMN published_at timestamptz,
  ADD CONSTRAINT publishing_job_targets_published_outcome CHECK (
    state <> 'published' OR (published_url IS NOT NULL AND published_at IS NOT NULL)
  );--> statement-breakpoint

ALTER TABLE public.publishing_jobs
  ADD COLUMN reconciliation_claim_token uuid,
  ADD COLUMN reconciliation_claim_expires_at timestamptz;--> statement-breakpoint

ALTER TABLE public.publication_transition_receipts
  ADD COLUMN reconciliation_claim_token uuid,
  ADD COLUMN reconciliation_claim_expires_at timestamptz;--> statement-breakpoint

ALTER TABLE public.object_cleanup_tasks
  ADD COLUMN reconciliation_claim_token uuid,
  ADD COLUMN reconciliation_claim_expires_at timestamptz;--> statement-breakpoint

CREATE INDEX publishing_jobs_reconciliation_claim_idx
  ON public.publishing_jobs (dispatch_status, reconciliation_claim_expires_at);--> statement-breakpoint
CREATE INDEX publication_transition_receipts_claim_idx
  ON public.publication_transition_receipts (acknowledged_at, reconciliation_claim_expires_at);--> statement-breakpoint
CREATE INDEX object_cleanup_tasks_claim_idx
  ON public.object_cleanup_tasks (status, reconciliation_claim_expires_at);--> statement-breakpoint
CREATE INDEX articles_organization_lead_media_idx
  ON public.articles (organization_id, lead_media_id)
  WHERE lead_media_id IS NOT NULL;--> statement-breakpoint

CREATE OR REPLACE FUNCTION indicate_private.enforce_stage4_job_transition()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public, indicate_private
AS $$
BEGIN
  IF NEW.state = OLD.state THEN RETURN NEW; END IF;
  IF NOT (
    (OLD.state = 'queued' AND NEW.state IN ('processing', 'retrying', 'failed')) OR
    (OLD.state = 'processing' AND NEW.state IN ('published', 'retrying', 'failed')) OR
    (OLD.state = 'retrying' AND NEW.state IN ('processing', 'failed'))
  ) THEN
    RAISE EXCEPTION 'invalid publishing job state transition' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;--> statement-breakpoint

CREATE TRIGGER stage4_publishing_job_transition_guard
BEFORE UPDATE OF state ON public.publishing_jobs
FOR EACH ROW EXECUTE FUNCTION indicate_private.enforce_stage4_job_transition();--> statement-breakpoint

CREATE OR REPLACE FUNCTION indicate_private.enforce_stage4_target_transition()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public, indicate_private
AS $$
BEGIN
  IF NEW.state = OLD.state THEN
    IF OLD.state IN ('published', 'failed') THEN
      NEW.finished_at := OLD.finished_at;
      NEW.published_url := OLD.published_url;
      NEW.published_at := OLD.published_at;
      NEW.sanitized_error := OLD.sanitized_error;
    END IF;
    RETURN NEW;
  END IF;
  IF NOT (
    (OLD.state = 'queued' AND NEW.state = 'processing') OR
    (OLD.state = 'processing' AND NEW.state IN ('published', 'retrying', 'failed')) OR
    (OLD.state = 'retrying' AND NEW.state IN ('processing', 'failed'))
  ) THEN
    RAISE EXCEPTION 'invalid publishing target state transition' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;--> statement-breakpoint

CREATE TRIGGER stage4_publishing_target_transition_guard
BEFORE UPDATE OF state ON public.publishing_job_targets
FOR EACH ROW EXECUTE FUNCTION indicate_private.enforce_stage4_target_transition();--> statement-breakpoint

-- article_sites is the mutable current projection. Normal transitions match target transitions;
-- terminal -> queued is permitted only after a new durable queued job target exists for this relation.
CREATE OR REPLACE FUNCTION indicate_private.enforce_stage4_article_site_transition()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public, indicate_private
AS $$
BEGIN
  IF NEW.state = OLD.state THEN RETURN NEW; END IF;
  IF (
    (OLD.state = 'queued' AND NEW.state = 'processing') OR
    (OLD.state = 'processing' AND NEW.state IN ('published', 'retrying', 'failed')) OR
    (OLD.state = 'retrying' AND NEW.state IN ('processing', 'failed'))
  ) THEN RETURN NEW; END IF;
  IF OLD.state IN ('published', 'failed') AND NEW.state = 'queued' AND EXISTS (
    SELECT 1
    FROM public.publishing_job_targets AS target
    INNER JOIN public.publishing_jobs AS job
      ON job.organization_id = target.organization_id AND job.id = target.job_id
    WHERE target.organization_id = OLD.organization_id
      AND target.article_site_id = OLD.id
      AND target.state = 'queued'
      AND job.state = 'queued'
  ) THEN RETURN NEW; END IF;
  RAISE EXCEPTION 'invalid article site current-projection transition' USING ERRCODE = '23514';
END;
$$;--> statement-breakpoint

CREATE TRIGGER stage4_article_site_transition_guard
BEFORE UPDATE OF state ON public.article_sites
FOR EACH ROW EXECUTE FUNCTION indicate_private.enforce_stage4_article_site_transition();--> statement-breakpoint

CREATE OR REPLACE FUNCTION indicate_private.claim_stage4_dispatch_gaps(
  requested_now timestamptz,
  requested_limit integer,
  requested_token uuid,
  requested_claim_expires_at timestamptz
)
RETURNS TABLE(organization_id uuid, job_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, indicate_private
AS $$
BEGIN
  RETURN QUERY
  WITH candidates AS (
    SELECT job.organization_id, job.id
    FROM public.publishing_jobs AS job
    WHERE job.state IN ('queued', 'retrying')
      AND job.dispatch_status = 'pending'
      AND job.next_dispatch_at <= requested_now
      AND (job.reconciliation_claim_expires_at IS NULL OR job.reconciliation_claim_expires_at <= requested_now)
    ORDER BY job.next_dispatch_at, job.id
    FOR UPDATE SKIP LOCKED
    LIMIT LEAST(GREATEST(requested_limit, 1), 100)
  )
  UPDATE public.publishing_jobs AS job
  SET reconciliation_claim_token = requested_token,
      reconciliation_claim_expires_at = requested_claim_expires_at
  FROM candidates
  WHERE job.organization_id = candidates.organization_id AND job.id = candidates.id
  RETURNING job.organization_id, job.id;
END;
$$;--> statement-breakpoint

CREATE OR REPLACE FUNCTION indicate_private.find_stage4_expired_leases(requested_now timestamptz, requested_limit integer)
RETURNS TABLE(organization_id uuid, job_id uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, indicate_private
AS $$
  SELECT job.organization_id, job.id
  FROM public.publishing_jobs AS job
  WHERE job.state = 'processing' AND job.lease_expires_at <= requested_now
  ORDER BY job.lease_expires_at, job.id
  LIMIT LEAST(GREATEST(requested_limit, 1), 100)
$$;--> statement-breakpoint

CREATE OR REPLACE FUNCTION indicate_private.claim_stage4_transition_receipts(
  requested_now timestamptz,
  requested_limit integer,
  requested_token uuid,
  requested_claim_expires_at timestamptz
)
RETURNS TABLE(organization_id uuid, receipt_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, indicate_private
AS $$
BEGIN
  RETURN QUERY
  WITH candidates AS (
    SELECT receipt.organization_id, receipt.id
    FROM public.publication_transition_receipts AS receipt
    WHERE receipt.acknowledged_at IS NULL
      AND (receipt.reconciliation_claim_expires_at IS NULL OR receipt.reconciliation_claim_expires_at <= requested_now)
    ORDER BY receipt.created_at, receipt.id
    FOR UPDATE SKIP LOCKED
    LIMIT LEAST(GREATEST(requested_limit, 1), 100)
  )
  UPDATE public.publication_transition_receipts AS receipt
  SET reconciliation_claim_token = requested_token,
      reconciliation_claim_expires_at = requested_claim_expires_at
  FROM candidates
  WHERE receipt.organization_id = candidates.organization_id AND receipt.id = candidates.id
  RETURNING receipt.organization_id, receipt.id;
END;
$$;--> statement-breakpoint

CREATE OR REPLACE FUNCTION indicate_private.claim_stage4_cleanup_tasks(
  requested_now timestamptz,
  requested_limit integer,
  requested_token uuid,
  requested_claim_expires_at timestamptz
)
RETURNS TABLE(organization_id uuid, task_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, indicate_private
AS $$
BEGIN
  RETURN QUERY
  WITH candidates AS (
    SELECT task.organization_id, task.id
    FROM public.object_cleanup_tasks AS task
    WHERE task.status IN ('pending', 'processing')
      AND task.next_attempt_at <= requested_now
      AND (task.reconciliation_claim_expires_at IS NULL OR task.reconciliation_claim_expires_at <= requested_now)
    ORDER BY task.next_attempt_at, task.id
    FOR UPDATE SKIP LOCKED
    LIMIT LEAST(GREATEST(requested_limit, 1), 100)
  )
  UPDATE public.object_cleanup_tasks AS task
  SET status = 'processing',
      reconciliation_claim_token = requested_token,
      reconciliation_claim_expires_at = requested_claim_expires_at,
      updated_at = requested_now
  FROM candidates
  WHERE task.organization_id = candidates.organization_id AND task.id = candidates.id
  RETURNING task.organization_id, task.id;
END;
$$;--> statement-breakpoint

REVOKE ALL ON FUNCTION indicate_private.claim_stage4_dispatch_gaps(timestamptz, integer, uuid, timestamptz) FROM PUBLIC;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.find_stage4_expired_leases(timestamptz, integer) FROM PUBLIC;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.claim_stage4_transition_receipts(timestamptz, integer, uuid, timestamptz) FROM PUBLIC;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.claim_stage4_cleanup_tasks(timestamptz, integer, uuid, timestamptz) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.claim_stage4_dispatch_gaps(timestamptz, integer, uuid, timestamptz) TO indicate_runtime;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.find_stage4_expired_leases(timestamptz, integer) TO indicate_runtime;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.claim_stage4_transition_receipts(timestamptz, integer, uuid, timestamptz) TO indicate_runtime;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.claim_stage4_cleanup_tasks(timestamptz, integer, uuid, timestamptz) TO indicate_runtime;--> statement-breakpoint

INSERT INTO indicate_schema_migrations (version, name, checksum)
VALUES (7, 'stage4_media_publication_runtime', 'drizzle-0006')
ON CONFLICT (version) DO NOTHING;
