-- F89: daftar faktur untuk panel billing.
--
-- invoices function-only; panel butuh daftar milik sendiri (order milik user
-- atau org keanggotaannya) + semua untuk platform admin.
-- Checksum di bawah adalah sha256 heks dari isi berkas ini sebelum baris INSERT.
CREATE OR REPLACE FUNCTION indicate_private.invoice_list(p_actor_id uuid)
 RETURNS TABLE(id uuid, order_id uuid, org_id uuid, package_name text, amount integer, paid_at timestamp with time zone, created_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
DECLARE v_platform boolean;
BEGIN
  v_platform := indicate_private.permission_has_platform_admin(p_actor_id);
  RETURN QUERY
  SELECT i.id, i.order_id, o.org_id, p.name, i.amount, i.paid_at, i.created_at
  FROM public.invoices i
  JOIN public.orders o ON o.id = i.order_id
  LEFT JOIN public.packages p ON p.id = o.package_id
  WHERE v_platform
    OR o.user_id = p_actor_id
    OR (o.org_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.memberships m
      WHERE m.organization_id = o.org_id AND m.user_id = p_actor_id AND m.status = 'active'
    ))
  ORDER BY i.paid_at DESC LIMIT 100;
END
$function$;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.invoice_list(uuid) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.invoice_list(uuid) TO indicate_runtime;--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (89, 'invoice_list', 'sha256:344c13557d670084a5a12e96264feed4ec46be188c84735db73282a2d94c5859');
