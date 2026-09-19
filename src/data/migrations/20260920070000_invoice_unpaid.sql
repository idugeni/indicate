-- Tagihan sebelum bayar: status unpaid + jatuh tempo + fungsi terbitkan/bayar.
--
-- invoice_status bertambah 'unpaid'; paid_at menjadi nullable (tagihan belum
-- punya tanggal lunas) dan due_at mencatat jatuh tempo. invoice_issue membuat
-- tagihan unpaid dengan nomor YYMM dari p_now (bulan terbit, bukan bulan
-- bayar); invoice_pay melunasi tagihan unpaid dengan version check + audit.
-- invoice_create (paid langsung) tidak berubah.
-- CATATAN APLIKASI: ALTER TYPE ... ADD VALUE tidak boleh di dalam blok
-- transaksi; terapkan berkas ini pernyataan-per-pernyataan (psql -f tanpa
-- -1, atau editor SQL Supabase), sesuai urutan journal.
ALTER TYPE public.invoice_status ADD VALUE 'unpaid';--> statement-breakpoint
ALTER TABLE public.invoices ALTER COLUMN paid_at DROP NOT NULL;--> statement-breakpoint
ALTER TABLE public.invoices ADD COLUMN due_at timestamp with time zone;--> statement-breakpoint
CREATE OR REPLACE FUNCTION indicate_private.invoice_issue(p_actor_id uuid, p_request_id text, p_organization_id uuid, p_amount integer, p_due_at timestamp with time zone, p_note text, p_now timestamp with time zone)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
DECLARE v_id uuid := gen_random_uuid(); v_slug text; v_number text;
BEGIN
  IF NOT indicate_private.permission_has_platform_admin(p_actor_id) THEN
    RAISE EXCEPTION 'platform permission required' USING ERRCODE = '42501';
  END IF;
  SELECT slug INTO v_slug FROM public.organizations WHERE id = p_organization_id;
  IF v_slug IS NULL THEN
    RAISE EXCEPTION 'organization required' USING ERRCODE = '42501';
  END IF;
  IF p_amount IS NULL OR p_amount <> 550000 THEN
    RAISE EXCEPTION 'amount invalid' USING ERRCODE = '42501';
  END IF;
  IF p_due_at IS NULL OR p_due_at <= p_now THEN
    RAISE EXCEPTION 'due_at invalid' USING ERRCODE = '42501';
  END IF;
  v_number := 'IND-'
    || upper(substr(md5(v_slug), 1, 5))
    || '-' || to_char(p_now, 'YYMM-')
    || lpad(nextval('public.invoice_number_seq')::text, 4, '0')
    || '-' || (SELECT string_agg(substr('ABCDEFGHJKMNPQRSTUVWXYZ23456789', (floor(random() * 31) + 1)::integer, 1), '' ORDER BY s) FROM generate_series(1, 4) AS s);
  INSERT INTO public.invoices(id, organization_id, number, amount_idr, status, paid_at, due_at, billing_note, payment_method, created_by, version, created_at, updated_at)
  VALUES (v_id, p_organization_id, v_number, p_amount, 'unpaid', NULL, p_due_at, nullif(p_note, ''), 'Transfer bank', p_actor_id, 1, p_now, p_now);
  INSERT INTO public.audit_logs(organization_id, id, actor_type, actor_id, entry_point, action, target_type, target_id, outcome, changed_fields, after, request_id, occurred_at)
  VALUES (p_organization_id, gen_random_uuid(), 'user', p_actor_id::text, 'dashboard', 'invoice.issue', 'invoice', v_id::text, 'succeeded', ARRAY['number','amount','dueAt'], jsonb_build_object('number', v_number, 'amount', p_amount, 'dueAt', p_due_at), p_request_id, p_now);
  RETURN v_id;
END
$function$;--> statement-breakpoint
CREATE OR REPLACE FUNCTION indicate_private.invoice_pay(p_actor_id uuid, p_request_id text, p_invoice_id uuid, p_expected_version integer, p_paid_at timestamp with time zone, p_payment_method text, p_now timestamp with time zone)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
DECLARE v_row public.invoices%ROWTYPE; v_method text;
BEGIN
  IF NOT indicate_private.permission_has_platform_admin(p_actor_id) THEN
    RAISE EXCEPTION 'platform permission required' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO v_row FROM public.invoices WHERE id = p_invoice_id FOR UPDATE;
  IF v_row.id IS NULL OR v_row.status <> 'unpaid' OR v_row.version <> p_expected_version THEN
    RETURN NULL;
  END IF;
  IF p_paid_at IS NULL THEN
    RAISE EXCEPTION 'paid_at required' USING ERRCODE = '42501';
  END IF;
  v_method := COALESCE(NULLIF(p_payment_method, ''), 'Transfer bank');
  UPDATE public.invoices
  SET status = 'paid', paid_at = p_paid_at, payment_method = v_method, version = v_row.version + 1, updated_at = p_now
  WHERE id = p_invoice_id;
  INSERT INTO public.audit_logs(organization_id, id, actor_type, actor_id, entry_point, action, target_type, target_id, outcome, changed_fields, after, request_id, occurred_at)
  VALUES (v_row.organization_id, gen_random_uuid(), 'user', p_actor_id::text, 'dashboard', 'invoice.pay', 'invoice', p_invoice_id::text, 'succeeded', ARRAY['status','paidAt','paymentMethod'], jsonb_build_object('status', 'paid', 'paidAt', p_paid_at, 'paymentMethod', v_method), p_request_id, p_now);
  RETURN p_invoice_id;
END
$function$;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.invoice_issue(uuid, text, uuid, integer, timestamptz, text, timestamptz) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.invoice_issue(uuid, text, uuid, integer, timestamptz, text, timestamptz) TO indicate_runtime;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.invoice_pay(uuid, text, uuid, integer, timestamptz, text, timestamptz) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.invoice_pay(uuid, text, uuid, integer, timestamptz, text, timestamptz) TO indicate_runtime;--> statement-breakpoint
CREATE OR REPLACE FUNCTION indicate_private.invoice_void(p_actor_id uuid, p_request_id text, p_invoice_id uuid, p_expected_version integer, p_reason text, p_now timestamp with time zone)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
BEGIN
  IF NOT indicate_private.permission_has_platform_admin(p_actor_id) THEN
    RAISE EXCEPTION 'platform permission required' USING ERRCODE = '42501';
  END IF;
  IF p_reason IS NULL OR length(p_reason) NOT BETWEEN 1 AND 500 THEN
    RAISE EXCEPTION 'reason required' USING ERRCODE = '42501';
  END IF;
  UPDATE public.invoices SET status = 'voided', voided_at = p_now, void_reason = p_reason, version = version + 1, updated_at = p_now
  WHERE id = p_invoice_id AND version = p_expected_version AND status IN ('paid', 'unpaid');
  IF NOT FOUND THEN RETURN false; END IF;
  INSERT INTO public.audit_logs(organization_id, id, actor_type, actor_id, entry_point, action, target_type, target_id, outcome, changed_fields, after, request_id, occurred_at)
  SELECT organization_id, gen_random_uuid(), 'user', p_actor_id::text, 'dashboard', 'invoice.void', 'invoice', p_invoice_id::text, 'succeeded', ARRAY['status'], jsonb_build_object('status', 'voided'), p_request_id, p_now
  FROM public.invoices WHERE id = p_invoice_id;
  RETURN true;
END
$function$;--> statement-breakpoint
DROP FUNCTION IF EXISTS indicate_private.invoice_list_for_org(uuid, uuid);--> statement-breakpointCREATE FUNCTION indicate_private.invoice_list_for_org(p_actor_id uuid, p_organization_id uuid)
  RETURNS TABLE(id uuid, organization_id uuid, organization_name text, number text, amount_idr integer, currency text, status invoice_status, paid_at timestamp with time zone, due_at timestamp with time zone, billing_note text, payment_method text, voided_at timestamp with time zone, void_reason text, version integer, created_at timestamp with time zone)
  LANGUAGE plpgsql
  STABLE SECURITY DEFINER
  SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
BEGIN
  IF NOT indicate_private.permission_has_platform_admin(p_actor_id)
     AND NOT EXISTS (SELECT 1 FROM public.memberships WHERE memberships.organization_id = invoice_list_for_org.p_organization_id AND memberships.user_id = p_actor_id AND memberships.status = 'active') THEN
    RAISE EXCEPTION 'platform permission required' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY SELECT i.id, i.organization_id, o.name, i.number, i.amount_idr, i.currency, i.status, i.paid_at, i.due_at, i.billing_note, i.payment_method, i.voided_at, i.void_reason, i.version, i.created_at
  FROM public.invoices i JOIN public.organizations o ON o.id = i.organization_id
  WHERE i.organization_id = p_organization_id ORDER BY i.paid_at DESC NULLS FIRST, i.created_at DESC;
END
$function$;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.invoice_list_for_org(uuid, uuid) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.invoice_list_for_org(uuid, uuid) TO indicate_runtime;--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (140, 'invoice_unpaid', 'sha256:207d0829a94ee9486889ef196ad9db9c5ae7d5fa075a242acea50c3260cc35f7');
