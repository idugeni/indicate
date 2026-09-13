-- Keterlihatan undangan + outbox tingkat tenant.
--
-- org_invitations dan telegram_outbox adalah tabel function-only tanpa baca
-- runtime tingkat tenant, sehingga undangan pending dan antrean Telegram tidak
-- terlihat admin org di dasbor. Tiga pembaca allowlist mengikuti preseden
-- ops_visibility (SECURITY DEFINER + SET search_path + cek izin internal):
-- - invite_list: anggota dengan membership.manage melihat undangan org-nya.
-- - invite_revoke: platform admin ATAU membership.manage membatalkan undangan
--   pending (dihapus; audit dipertahankan).
-- - outbox_list: anggota aktif suatu org melihat antrean belum-terkirim org-nya.
-- Checksum di bawah adalah sha256 heks dari isi berkas ini sebelum baris INSERT.
CREATE OR REPLACE FUNCTION indicate_private.invite_list(p_actor_id uuid, p_org_id uuid)
 RETURNS TABLE(id uuid, email text, role_id uuid, role_name text, expires_at timestamp with time zone, accepted_at timestamp with time zone, created_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
BEGIN
  IF NOT indicate_private.permission_has_platform_admin(p_actor_id)
     AND NOT indicate_private.permission_has_tenant(p_actor_id, p_org_id, 'membership.manage') THEN
    RAISE EXCEPTION 'platform permission required' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY SELECT i.id, i.email, i.role_id, r.name, i.expires_at, i.accepted_at, i.created_at
  FROM public.org_invitations i LEFT JOIN public.roles r ON r.organization_id = i.org_id AND r.id = i.role_id
  WHERE i.org_id = p_org_id
  ORDER BY i.created_at DESC LIMIT 100;
END
$function$;--> statement-breakpoint
CREATE OR REPLACE FUNCTION indicate_private.invite_revoke(p_actor_id uuid, p_request_id text, p_invite_id uuid, p_now timestamp with time zone)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
DECLARE v_inv public.org_invitations%ROWTYPE;
BEGIN
  SELECT * INTO v_inv FROM public.org_invitations WHERE id = p_invite_id FOR UPDATE;
  IF v_inv.id IS NULL THEN
    RAISE EXCEPTION 'invitation required' USING ERRCODE = '42501';
  END IF;
  IF NOT indicate_private.permission_has_platform_admin(p_actor_id)
     AND NOT indicate_private.permission_has_tenant(p_actor_id, v_inv.org_id, 'membership.manage') THEN
    RAISE EXCEPTION 'platform permission required' USING ERRCODE = '42501';
  END IF;
  IF v_inv.accepted_at IS NOT NULL THEN
    RAISE EXCEPTION 'invitation already accepted' USING ERRCODE = '42501';
  END IF;
  DELETE FROM public.org_invitations WHERE id = v_inv.id;
  INSERT INTO public.audit_logs(organization_id, id, actor_type, actor_id, entry_point, action, target_type, target_id, outcome, changed_fields, after, request_id, occurred_at)
  VALUES (v_inv.org_id, gen_random_uuid(), 'user', p_actor_id::text, 'dashboard', 'invite.revoke', 'invitation', v_inv.id::text, 'succeeded', ARRAY['email'], jsonb_build_object('email', v_inv.email), p_request_id, p_now);
  RETURN true;
END
$function$;--> statement-breakpoint
CREATE OR REPLACE FUNCTION indicate_private.outbox_list(p_actor_id uuid, p_organization_id uuid)
 RETURNS TABLE(id uuid, chat_id text, status text, attempts integer, next_attempt_at timestamp with time zone, created_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.memberships m JOIN public.users u ON u.id = m.user_id
    WHERE m.organization_id = p_organization_id AND m.user_id = p_actor_id
      AND m.status = 'active' AND u.status = 'active'
  ) THEN
    RAISE EXCEPTION 'membership required' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY SELECT o.id, o.chat_id, o.status, o.attempts, o.next_attempt_at, o.created_at
  FROM public.telegram_outbox o WHERE o.organization_id = p_organization_id AND o.status <> 'sent'
  ORDER BY o.next_attempt_at, o.id LIMIT 100;
END
$function$;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.invite_list(uuid, uuid) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.invite_list(uuid, uuid) TO indicate_runtime;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.invite_revoke(uuid, text, uuid, timestamptz) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.invite_revoke(uuid, text, uuid, timestamptz) TO indicate_runtime;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.outbox_list(uuid, uuid) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.outbox_list(uuid, uuid) TO indicate_runtime;--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (103, 'invite_visibility', 'sha256:4a28307e987a696d366c49060d6b971459c8a9bcc165550038e8589f07cdd716');
