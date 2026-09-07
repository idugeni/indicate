-- Tenant-visible expiry warnings for active subscriptions.
--
-- The nightly sweep enforces expiry silently; tenants first learn about it
-- from a denial. These warning intents land in audit_logs (the dashboard Log
-- Keamanan view), tiered so the 7-day and 1-day notices never double-fire on
-- the same night: 7d covers (1d, 7d], 1d covers (0, 1d]. One warning per
-- threshold window; the sweep itself remains the sole enforcer.
--
-- Body digest (reproducible): LF-normalize this file, substitute the 64-hex
-- checksum literal below with 64 zeros, SHA-256 the complete UTF-8 bytes.

CREATE OR REPLACE FUNCTION indicate_private.subscription_sweep_expired()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
DECLARE v_count integer := 0;
BEGIN
  WITH moved AS (
    UPDATE public.subscriptions SET status = 'past_due', version = version + 1, updated_at = now()
    WHERE status = 'active' AND period_ends_at IS NOT NULL AND period_ends_at <= now()
    RETURNING organization_id, plan
  )
  SELECT count(*) INTO v_count FROM moved;
  INSERT INTO public.audit_logs(organization_id, id, actor_type, actor_id, entry_point, action, target_type, target_id, outcome, changed_fields, after, request_id, occurred_at)
  SELECT organization_id, gen_random_uuid(), 'system', 'subscription-sweeper', 'worker', 'subscription.expire', 'subscription', organization_id::text, 'succeeded', ARRAY['status'], jsonb_build_object('status', 'past_due', 'plan', plan), 'sweep-expired', now()
  FROM public.subscriptions WHERE status = 'past_due' AND updated_at >= now() - interval '1 minute';
  WITH moved AS (
    UPDATE public.subscriptions SET status = 'suspended', version = version + 1, updated_at = now()
    WHERE status = 'past_due' AND period_ends_at IS NOT NULL AND period_ends_at <= now() - interval '30 days'
    RETURNING organization_id, plan
  )
  SELECT v_count + count(*) INTO v_count FROM moved;
  INSERT INTO public.audit_logs(organization_id, id, actor_type, actor_id, entry_point, action, target_type, target_id, outcome, changed_fields, after, request_id, occurred_at)
  SELECT organization_id, gen_random_uuid(), 'system', 'subscription-sweeper', 'worker', 'subscription.suspend', 'subscription', organization_id::text, 'succeeded', ARRAY['status'], jsonb_build_object('status', 'suspended', 'plan', plan), 'sweep-expired', now()
  FROM public.subscriptions WHERE status = 'suspended' AND updated_at >= now() - interval '1 minute';
  INSERT INTO public.audit_logs(organization_id, id, actor_type, actor_id, entry_point, action, target_type, target_id, outcome, changed_fields, after, request_id, occurred_at)
  SELECT s.organization_id, gen_random_uuid(), 'system', 'subscription-sweeper', 'worker', 'subscription.expiring_warning', 'subscription', s.organization_id::text, 'succeeded', ARRAY['periodEndsAt'], jsonb_build_object('threshold', '7d', 'periodEndsAt', s.period_ends_at, 'plan', s.plan), 'sweep-expiry-warning', now()
  FROM public.subscriptions AS s
  WHERE s.status = 'active' AND s.period_ends_at IS NOT NULL
    AND s.period_ends_at > now() + interval '1 day' AND s.period_ends_at <= now() + interval '7 days'
    AND NOT EXISTS (
      SELECT 1 FROM public.audit_logs AS a
      WHERE a.organization_id = s.organization_id AND a.action = 'subscription.expiring_warning'
        AND a.after->>'threshold' = '7d' AND a.occurred_at > now() - interval '8 days'
    );
  INSERT INTO public.audit_logs(organization_id, id, actor_type, actor_id, entry_point, action, target_type, target_id, outcome, changed_fields, after, request_id, occurred_at)
  SELECT s.organization_id, gen_random_uuid(), 'system', 'subscription-sweeper', 'worker', 'subscription.expiring_warning', 'subscription', s.organization_id::text, 'succeeded', ARRAY['periodEndsAt'], jsonb_build_object('threshold', '1d', 'periodEndsAt', s.period_ends_at, 'plan', s.plan), 'sweep-expiry-warning', now()
  FROM public.subscriptions AS s
  WHERE s.status = 'active' AND s.period_ends_at IS NOT NULL
    AND s.period_ends_at > now() AND s.period_ends_at <= now() + interval '1 day'
    AND NOT EXISTS (
      SELECT 1 FROM public.audit_logs AS a
      WHERE a.organization_id = s.organization_id AND a.action = 'subscription.expiring_warning'
        AND a.after->>'threshold' = '1d' AND a.occurred_at > now() - interval '2 days'
    );
  RETURN v_count;
END
$function$;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.subscription_sweep_expired() FROM PUBLIC;--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (67, 'subscription_expiry_warnings', 'sha256:d7ae07192c318cc8bb074e5af2c64b0e14658d0788e956d054b0128c75c70564');
