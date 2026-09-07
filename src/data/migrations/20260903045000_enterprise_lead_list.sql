-- Enterprise lead listing untuk admin platform.
--
-- Forward-only. Tabel `enterprise_leads` adalah function-only
-- (RLS default-deny + FORCE, lihat 20260903032500_billing_orders.sql):
-- penulisan lewat `billing_lead_create`, pembacaan admin lewat fungsi
-- SECURITY DEFINER baru di bawah, mengikuti preseden
-- `billing_order_list_pending` (gated `permission_has_platform_admin`).
-- Tidak ada perubahan skema tabel; hanya satu fungsi baca.

CREATE OR REPLACE FUNCTION indicate_private.billing_lead_list(p_actor_id uuid)
  RETURNS TABLE(id uuid, nama text, email text, kebutuhan text, created_at timestamp with time zone)
  LANGUAGE plpgsql
  STABLE SECURITY DEFINER
  SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
BEGIN
  IF NOT indicate_private.permission_has_platform_admin(p_actor_id) THEN
    RAISE EXCEPTION 'platform permission required' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY SELECT l.id, l.nama, l.email, l.kebutuhan, l.created_at
  FROM public.enterprise_leads l
  ORDER BY l.created_at DESC;
END
$function$;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.billing_lead_list(uuid) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.billing_lead_list(uuid) TO indicate_runtime;--> statement-breakpoint

-- Registrasi susulan (fungsi sudah live tanpa baris riwayat): agar fresh
-- environment yang dibangun dari file berurutan mencatat versi yang sama.
-- Body digest (reproducible): LF-normalize this file, substitute the 64-hex
-- checksum literal below with 64 zeros, SHA-256 the complete UTF-8 bytes.
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (71, 'enterprise_lead_list', 'sha256:ca365bea85899527f5cdc90817c2a9ae897938ad09fc6f9c75aa9826fd0777da');
