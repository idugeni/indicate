-- Fase B legal-hardening: daftar pending menyertakan bukti persetujuan.
--
-- Perubahan RETURNS TABLE mewajibkan DROP + CREATE (OR REPLACE tidak dapat
-- mengubah tipe kembalian). Tanpa perubahan perilaku otorisasi.
-- Body digest (reproducible): LF-normalize this file, substitute the 64-hex
-- checksum literal below with 64 zeros, SHA-256 the complete UTF-8 bytes.

DROP FUNCTION IF EXISTS indicate_private.billing_order_list_pending(uuid);--> statement-breakpoint
CREATE FUNCTION indicate_private.billing_order_list_pending(p_actor_id uuid)
 RETURNS TABLE(id uuid, user_email text, org_id uuid, package_name text, plan text, price_idr integer, proof_url text, terms_version text, terms_accepted_at timestamp with time zone, created_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
BEGIN
  IF NOT indicate_private.permission_has_platform_admin(p_actor_id) THEN
    RAISE EXCEPTION 'platform permission required' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY SELECT o.id, u.email, o.org_id, p.name, p.plan, p.price_idr, o.proof_url, o.terms_version, o.terms_accepted_at, o.created_at
  FROM public.orders o JOIN public.packages p ON p.id = o.package_id JOIN public.users u ON u.id = o.user_id
  WHERE o.status = 'waiting_verification'
  ORDER BY o.created_at;
END
$function$;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.billing_order_list_pending(uuid) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.billing_order_list_pending(uuid) TO indicate_runtime;--> statement-breakpoint

INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (70, 'billing_pending_terms', 'sha256:bea84b35610e87d0b94a7eda239b20b5c1b5b40dd0f7730eb5814d1dcd6e006a');
