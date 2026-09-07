-- F88: keterlihatan operasional (retensi + outbox).
--
-- retention_runs dan telegram_outbox adalah tabel function-only tanpa baca
-- runtime, sehingga bukti sweep/export/erasure dan antrean Telegram tidak
-- terlihat di dasbor. Dua pembaca allowlist:
-- - retention_list: anggota aktif suatu org melihat baris global + org-nya.
-- - outbox_list_platform: khusus platform admin (berisi chat lintas org).
-- Checksum di bawah adalah sha256 heks dari isi berkas ini sebelum baris INSERT.
CREATE OR REPLACE FUNCTION indicate_private.retention_list(p_actor_id uuid, p_organization_id uuid)
 RETURNS TABLE(id uuid, organization_id uuid, category text, purged_count integer, started_at timestamp with time zone, finished_at timestamp with time zone)
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
  RETURN QUERY SELECT r.id, r.organization_id, r.category, r.purged_count, r.started_at, r.finished_at
  FROM public.retention_runs r
  WHERE r.organization_id IS NULL OR r.organization_id = p_organization_id
  ORDER BY r.started_at DESC LIMIT 100;
END
$function$;--> statement-breakpoint
CREATE OR REPLACE FUNCTION indicate_private.outbox_list_platform(p_actor_id uuid)
 RETURNS TABLE(id uuid, organization_id uuid, chat_id text, status text, attempts integer, next_attempt_at timestamp with time zone, created_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
BEGIN
  IF NOT indicate_private.permission_has_platform_admin(p_actor_id) THEN
    RAISE EXCEPTION 'platform permission required' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY SELECT o.id, o.organization_id, o.chat_id, o.status, o.attempts, o.next_attempt_at, o.created_at
  FROM public.telegram_outbox o WHERE o.status <> 'sent' ORDER BY o.next_attempt_at, o.id LIMIT 100;
END
$function$;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.retention_list(uuid, uuid) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.retention_list(uuid, uuid) TO indicate_runtime;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.outbox_list_platform(uuid) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.outbox_list_platform(uuid) TO indicate_runtime;--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (88, 'ops_visibility', 'sha256:414877ce74e48efc153bed150a99085cc440216b2cf4ce000dc0ae11301ab39e');
