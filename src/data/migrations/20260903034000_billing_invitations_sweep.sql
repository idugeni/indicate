-- F2b/F3-DB: undangan organisasi + penyapu kedaluwarsa + cron harian.
--
-- 1. org_invitations.role_id (role target) + created_by (audit).
--    Token mentah tidak pernah disimpan: hanya token_hash (sha256 heks).
-- 2. invite_create: platform admin ATAU anggota dengan membership.manage.
--    Masa berlaku 24 jam, terikat email.
-- 3. invite_redeem: user aktif terverifikasi; email user harus sama dengan email
--    undangan; single-use (accepted_at); menolak jika kuota member paket penuh.
-- 4. subscription_sweep_expired(): active yang lewat period_ends_at -> past_due;
--    past_due lebih dari 30 hari -> suspended. Setiap transisi diaudit.
--    Dijadwalkan harian via pg_cron (06:00 WIB = 23:00 UTC hari sebelumnya).
-- 5. Cabut grant platform.customer.admin lama (transisi ke super_admin selesai):
--    baris permission dipertahankan untuk kompatibilitas baca historis.

ALTER TABLE public.org_invitations
  ADD COLUMN IF NOT EXISTS role_id uuid,
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES public.users(id) ON DELETE SET NULL;--> statement-breakpoint

CREATE OR REPLACE FUNCTION indicate_private.invite_create(p_actor_id uuid, p_request_id text, p_org_id uuid, p_role_id uuid, p_email text, p_token_hash text, p_now timestamp with time zone)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
DECLARE v_id uuid := gen_random_uuid();
BEGIN
  IF NOT indicate_private.permission_has_platform_admin(p_actor_id)
     AND NOT indicate_private.permission_has_tenant(p_actor_id, p_org_id, 'membership.manage') THEN
    RAISE EXCEPTION 'platform permission required' USING ERRCODE = '42501';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.roles WHERE organization_id = p_org_id AND id = p_role_id AND active AND tier <> 'superadmin') THEN
    RAISE EXCEPTION 'role unavailable' USING ERRCODE = '42501';
  END IF;
  IF p_email IS NULL OR length(p_email) NOT BETWEEN 3 AND 320 OR p_token_hash IS NULL OR length(p_token_hash) <> 64 THEN
    RAISE EXCEPTION 'invite fields invalid' USING ERRCODE = '42501';
  END IF;
  INSERT INTO public.org_invitations(id, org_id, email, token_hash, role_id, expires_at, created_by, created_at, updated_at)
  VALUES (v_id, p_org_id, lower(p_email), p_token_hash, p_role_id, p_now + interval '24 hours', p_actor_id, p_now, p_now);
  INSERT INTO public.audit_logs(organization_id, id, actor_type, actor_id, entry_point, action, target_type, target_id, outcome, changed_fields, after, request_id, occurred_at)
  VALUES (p_org_id, gen_random_uuid(), 'user', p_actor_id::text, 'dashboard', 'invite.create', 'invitation', v_id::text, 'succeeded', ARRAY['email','roleId'], jsonb_build_object('email', lower(p_email)), p_request_id, p_now);
  RETURN v_id;
END
$function$;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.invite_create(uuid, text, uuid, uuid, text, text, timestamptz) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.invite_create(uuid, text, uuid, uuid, text, text, timestamptz) TO indicate_runtime;--> statement-breakpoint

CREATE OR REPLACE FUNCTION indicate_private.invite_redeem(p_actor_id uuid, p_request_id text, p_token_hash text, p_now timestamp with time zone)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
DECLARE v_inv public.org_invitations%ROWTYPE; v_email text; v_plan public.subscription_plan; v_limit integer; v_members integer;
BEGIN
  SELECT email INTO v_email FROM public.users WHERE id = p_actor_id AND status = 'active';
  IF v_email IS NULL THEN RAISE EXCEPTION 'active user required' USING ERRCODE = '42501'; END IF;
  SELECT * INTO v_inv FROM public.org_invitations WHERE token_hash = p_token_hash FOR UPDATE;
  IF v_inv.id IS NULL OR v_inv.accepted_at IS NOT NULL OR v_inv.expires_at <= p_now THEN
    RAISE EXCEPTION 'invitation invalid' USING ERRCODE = '42501';
  END IF;
  IF lower(v_email) <> lower(v_inv.email) THEN
    RAISE EXCEPTION 'invitation invalid' USING ERRCODE = '42501';
  END IF;
  SELECT plan INTO v_plan FROM public.subscriptions WHERE organization_id = v_inv.org_id;
  IF v_plan IS NOT NULL THEN
    SELECT max_members INTO v_limit FROM public.plan_quotas WHERE plan = v_plan;
    IF v_limit IS NOT NULL THEN
      SELECT count(*) INTO v_members FROM public.memberships WHERE organization_id = v_inv.org_id AND status = 'active';
      IF v_members >= v_limit THEN RAISE EXCEPTION 'member quota exceeded' USING ERRCODE = '42501'; END IF;
    END IF;
  END IF;
  INSERT INTO public.memberships(organization_id, user_id, role_id, status, version, created_at, updated_at)
  VALUES (v_inv.org_id, p_actor_id, v_inv.role_id, 'active', 1, p_now, p_now)
  ON CONFLICT (organization_id, user_id) DO UPDATE SET role_id = EXCLUDED.role_id, status = 'active', version = public.memberships.version + 1, updated_at = EXCLUDED.updated_at;
  UPDATE public.org_invitations SET accepted_at = p_now, updated_at = p_now WHERE id = v_inv.id;
  INSERT INTO public.audit_logs(organization_id, id, actor_type, actor_id, entry_point, action, target_type, target_id, outcome, changed_fields, after, request_id, occurred_at)
  VALUES (v_inv.org_id, gen_random_uuid(), 'user', p_actor_id::text, 'dashboard', 'invite.redeem', 'membership', p_actor_id::text, 'succeeded', ARRAY['roleId','status'], jsonb_build_object('roleId', v_inv.role_id), p_request_id, p_now);
  RETURN v_inv.org_id;
END
$function$;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.invite_redeem(uuid, text, text, timestamptz) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.invite_redeem(uuid, text, text, timestamptz) TO indicate_runtime;--> statement-breakpoint

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
  RETURN v_count;
END
$function$;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.subscription_sweep_expired() FROM PUBLIC;--> statement-breakpoint
SELECT cron.schedule('indicate-subscription-sweep', '0 23 * * *', 'SELECT indicate_private.subscription_sweep_expired()');--> statement-breakpoint

DELETE FROM public.platform_user_permissions
USING public.permissions
WHERE platform_user_permissions.permission_id = permissions.id
  AND permissions.scope = 'platform' AND permissions.organization_id IS NULL
  AND permissions.name = 'platform.customer.admin';--> statement-breakpoint

INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (46, 'billing_invitations_sweep', 'sha256:f0717e92e585c501992a871a0e8b1b88c12f121675388f6531c6f3c7ddfc14f7');
