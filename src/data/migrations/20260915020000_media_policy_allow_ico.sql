-- Izin ICO untuk favicon: tambah image/x-icon ke media_policy (idempoten).
-- Revisi + intent invalidasi dicatat agar snapshot runtime tersegarkan.
WITH env AS (
  SELECT COALESCE(NULLIF(current_setting('app.environment', TRUE), ''), 'production')::public.runtime_config_environment AS environment
),
upd AS (
  UPDATE public.media_policy
  SET allowed_mime_types = (
    SELECT array_agg(DISTINCT v ORDER BY v)
    FROM unnest(allowed_mime_types || ARRAY['image/x-icon']) AS v
  ),
  version = version + 1, updated_at = now()
  WHERE singleton_key = 'singleton'
    AND NOT (allowed_mime_types @> ARRAY['image/x-icon'])
  RETURNING version
),
rev AS (
  INSERT INTO public.runtime_config_revisions (environment, committed_at, mutation_kind)
  SELECT (SELECT environment FROM env), now(), 'media_policy'::public.runtime_config_mutation_kind
  FROM upd
  RETURNING version
)
INSERT INTO public.runtime_config_invalidation_intents (id, runtime_revision, environment, partition_kind, status, attempts, next_attempt_at)
SELECT gen_random_uuid(), rev.version, (SELECT environment FROM env), 'policy'::public.invalidation_partition_kind, 'pending', 0, now()
FROM rev;--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (112, 'media_policy_allow_ico', 'sha256:a4897962bbcd7ec7e4c66c0bcc4f06a02c8a26e53bf3f72f29055f8e091b81b7');
