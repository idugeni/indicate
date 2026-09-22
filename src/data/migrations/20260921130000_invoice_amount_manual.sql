-- Nominal faktur manual: harga tunggal menjadi bawaan, bukan kunci.
--
-- invoice_create (kedua overload) dan invoice_issue sebelumnya menolak nominal
-- selain 550000; kini menerima bilangan bulat positif (>= 1) sehingga admin
-- dapat mencatat nominal manual dengan bawaan harga tunggal dari aplikasi.
-- CHECK invoices_amount_single diganti invoices_amount_positive; arsip lama
-- (semuanya 550000) tetap lolos check baru. invoice_reissue menyalin nominal
-- dari faktur asal sehingga tidak berubah.
ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS invoices_amount_single;--> statement-breakpoint
ALTER TABLE public.invoices ADD CONSTRAINT invoices_amount_positive CHECK (amount_idr > 0) NOT VALID;--> statement-breakpoint
CREATE OR REPLACE FUNCTION indicate_private.invoice_create(p_actor_id uuid, p_request_id text, p_organization_id uuid, p_amount integer, p_paid_at timestamp with time zone, p_note text, p_now timestamp with time zone)
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
  IF p_amount IS NULL OR p_amount < 1 THEN
    RAISE EXCEPTION 'amount invalid' USING ERRCODE = '42501';
  END IF;
  IF p_paid_at IS NULL THEN
    RAISE EXCEPTION 'paid_at required' USING ERRCODE = '42501';
  END IF;
  v_number := 'IND-'
    || upper(substr(md5(v_slug), 1, 5))
    || '-' || to_char(p_paid_at, 'YYMM-')
    || lpad(nextval('public.invoice_number_seq')::text, 4, '0')
    || '-' || (SELECT string_agg(substr('ABCDEFGHJKMNPQRSTUVWXYZ23456789', (floor(random() * 31) + 1)::integer, 1), '' ORDER BY s) FROM generate_series(1, 4) AS s);
  INSERT INTO public.invoices(id, organization_id, number, amount_idr, status, paid_at, billing_note, payment_method, created_by, version, created_at, updated_at)
  VALUES (v_id, p_organization_id, v_number, p_amount, 'paid', p_paid_at, nullif(p_note, ''), 'Transfer bank', p_actor_id, 1, p_now, p_now);
  INSERT INTO public.audit_logs(organization_id, id, actor_type, actor_id, entry_point, action, target_type, target_id, outcome, changed_fields, after, request_id, occurred_at)
  VALUES (p_organization_id, gen_random_uuid(), 'user', p_actor_id::text, 'dashboard', 'invoice.create', 'invoice', v_id::text, 'succeeded', ARRAY['number','amount','paidAt','paymentMethod'], jsonb_build_object('number', v_number, 'amount', p_amount, 'paidAt', p_paid_at, 'paymentMethod', 'Transfer bank'), p_request_id, p_now);
  RETURN v_id;
END
$function$;--> statement-breakpoint
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
  IF p_amount IS NULL OR p_amount < 1 THEN
    RAISE EXCEPTION 'amount invalid' USING ERRCODE = '42501';
  END IF;
  IF p_paid_at IS NULL THEN
    RAISE EXCEPTION 'paid_at required' USING ERRCODE = '42501';
  END IF;
  v_method := COALESCE(NULLIF(p_payment_method, ''), 'Transfer bank');
  v_number := 'IND-'
    || upper(substr(md5(v_slug), 1, 5))
    || '-' || to_char(p_paid_at, 'YYMM-')
    || lpad(nextval('public.invoice_number_seq')::text, 4, '0')
    || '-' || (SELECT string_agg(substr('ABCDEFGHJKMNPQRSTUVWXYZ23456789', (floor(random() * 31) + 1)::integer, 1), '' ORDER BY s) FROM generate_series(1, 4) AS s);
  INSERT INTO public.invoices(id, organization_id, number, amount_idr, status, paid_at, billing_note, payment_method, created_by, version, created_at, updated_at)
  VALUES (v_id, p_organization_id, v_number, p_amount, 'paid', p_paid_at, nullif(p_note, ''), v_method, p_actor_id, 1, p_now, p_now);
  INSERT INTO public.audit_logs(organization_id, id, actor_type, actor_id, entry_point, action, target_type, target_id, outcome, changed_fields, after, request_id, occurred_at)
  VALUES (p_organization_id, gen_random_uuid(), 'user', p_actor_id::text, 'dashboard', 'invoice.create', 'invoice', v_id::text, 'succeeded', ARRAY['number','amount','paidAt','paymentMethod'], jsonb_build_object('number', v_number, 'amount', p_amount, 'paidAt', p_paid_at, 'paymentMethod', v_method), p_request_id, p_now);
  RETURN v_id;
END
$function$;--> statement-breakpoint
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
  IF p_amount IS NULL OR p_amount < 1 THEN
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
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (145, 'invoice_amount_manual', 'sha256:c2890287772320e4d87771f54a84c23967426f445dcc56ecd282e313d60bfb00');
