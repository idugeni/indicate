-- Metode pembayaran invoice: teks tampilan ("Transfer bank") + CHECK panjang.
-- Kolom NOT NULL berdefault agar bacaan lama tetap valid selama rollout;
-- invoice_create menerima p_payment_method opsional (default sama).
-- Checksum di bawah adalah sha256 heks dari isi berkas ini sebelum baris INSERT.
ALTER TABLE public.invoices ADD COLUMN payment_method text NOT NULL DEFAULT 'Transfer bank';--> statement-breakpoint
ALTER TABLE public.invoices ADD CONSTRAINT invoices_payment_method_bounded CHECK (length(payment_method) BETWEEN 1 AND 40);--> statement-breakpoint
CREATE OR REPLACE FUNCTION indicate_private.invoice_create(p_actor_id uuid, p_request_id text, p_organization_id uuid, p_amount integer, p_paid_at timestamp with time zone, p_note text, p_now timestamp with time zone, p_payment_method text DEFAULT 'Transfer bank')
  RETURNS uuid
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
DECLARE v_id uuid := gen_random_uuid(); v_slug text; v_number text; v_method text;
BEGIN
  IF NOT indicate_private.permission_has_platform_admin(p_actor_id) THEN
    RAISE EXCEPTION 'platform permission required' USING ERRCODE = '42501';
  END IF;
  SELECT slug INTO v_slug FROM public.organizations WHERE id = p_organization_id;
  IF v_slug IS NULL THEN
    RAISE EXCEPTION 'organization required' USING ERRCODE = '42501';
  END IF;
  IF p_amount IS NULL OR p_amount < 0 THEN
    RAISE EXCEPTION 'amount invalid' USING ERRCODE = '42501';
  END IF;
  IF p_paid_at IS NULL THEN
    RAISE EXCEPTION 'paid_at required' USING ERRCODE = '42501';
  END IF;
  v_method := COALESCE(NULLIF(p_payment_method, ''), 'Transfer bank');
  v_number := 'IND-'
    || upper(substr(md5(v_slug), 1, 5))
    || '-' || to_char(p_now, 'YYMM-')
    || lpad(nextval('public.invoice_number_seq')::text, 4, '0')
    || '-' || (SELECT string_agg(substr('ABCDEFGHJKMNPQRSTUVWXYZ23456789', (floor(random() * 31) + 1)::integer, 1), '' ORDER BY s) FROM generate_series(1, 4) AS s);
  INSERT INTO public.invoices(id, organization_id, number, amount_idr, status, paid_at, billing_note, payment_method, created_by, version, created_at, updated_at)
  VALUES (v_id, p_organization_id, v_number, p_amount, 'paid', p_paid_at, nullif(p_note, ''), v_method, p_actor_id, 1, p_now, p_now);
  INSERT INTO public.audit_logs(organization_id, id, actor_type, actor_id, entry_point, action, target_type, target_id, outcome, changed_fields, after, request_id, occurred_at)
  VALUES (p_organization_id, gen_random_uuid(), 'user', p_actor_id::text, 'dashboard', 'invoice.create', 'invoice', v_id::text, 'succeeded', ARRAY['number','amount','paidAt','paymentMethod'], jsonb_build_object('number', v_number, 'amount', p_amount, 'paidAt', p_paid_at, 'paymentMethod', v_method), p_request_id, p_now);
  RETURN v_id;
END
$function$;--> statement-breakpoint
DROP FUNCTION IF EXISTS indicate_private.invoice_list_for_org(uuid, uuid);--> statement-breakpoint
CREATE FUNCTION indicate_private.invoice_list_for_org(p_actor_id uuid, p_organization_id uuid)
  RETURNS TABLE(id uuid, organization_id uuid, organization_name text, number text, amount_idr integer, currency text, status invoice_status, paid_at timestamp with time zone, billing_note text, payment_method text, voided_at timestamp with time zone, void_reason text, version integer, created_at timestamp with time zone)
  LANGUAGE plpgsql
  STABLE SECURITY DEFINER
  SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
BEGIN
  IF NOT indicate_private.permission_has_platform_admin(p_actor_id)
     AND NOT EXISTS (SELECT 1 FROM public.memberships WHERE memberships.organization_id = invoice_list_for_org.p_organization_id AND memberships.user_id = p_actor_id AND memberships.status = 'active') THEN
    RAISE EXCEPTION 'platform permission required' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY SELECT i.id, i.organization_id, o.name, i.number, i.amount_idr, i.currency, i.status, i.paid_at, i.billing_note, i.payment_method, i.voided_at, i.void_reason, i.version, i.created_at
  FROM public.invoices i JOIN public.organizations o ON o.id = i.organization_id
  WHERE i.organization_id = p_organization_id ORDER BY i.paid_at DESC, i.created_at DESC;
END
$function$;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.invoice_list_for_org(uuid, uuid) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.invoice_list_for_org(uuid, uuid) TO indicate_runtime;--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (130, 'invoice_payment_method', 'sha256:c6760485915fe0cd5645aa40afa37a8db3b9fbb3c244d58329965176c779840a');
