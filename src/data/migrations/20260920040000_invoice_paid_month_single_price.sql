-- Faktur ikut bulan bayar, harga tunggal Rp550.000, dan terbitkan ulang.
--
-- Nomor IND-{ORG5}-{YYMM}-{SEQ4}-{RAND4} memakai YYMM dari p_paid_at (bulan
-- dana diterima) bukan p_now (saat admin mencatat), agar arsip bulanan rapi
-- walau faktur dibuat belakangan. invoice_create menolak nominal selain
-- 550000; CHECK NOT VALID menjaga baris baru tanpa menolak arsip lama.
-- invoice_reissue membuat pengganti paid dari faktur void (salin
-- organisasi/nominal/paid_at/catatan/metode, nomor baru, audit reissue).
-- Kedua overload invoice_create (7-arg lama, 8-arg metode) diperbarui.
-- Checksum di bawah adalah sha256 heks dari isi berkas ini sebelum baris INSERT.
ALTER TABLE public.invoices ADD CONSTRAINT invoices_amount_single CHECK (amount_idr = 550000) NOT VALID;--> statement-breakpoint
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
  IF p_amount IS NULL OR p_amount <> 550000 THEN
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
  IF p_amount IS NULL OR p_amount <> 550000 THEN
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
CREATE OR REPLACE FUNCTION indicate_private.invoice_reissue(p_actor_id uuid, p_request_id text, p_invoice_id uuid, p_expected_version integer, p_reason text, p_now timestamp with time zone)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
DECLARE v_src public.invoices%ROWTYPE; v_id uuid := gen_random_uuid(); v_slug text; v_number text;
BEGIN
  IF NOT indicate_private.permission_has_platform_admin(p_actor_id) THEN
    RAISE EXCEPTION 'platform permission required' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO v_src FROM public.invoices WHERE id = p_invoice_id FOR UPDATE;
  IF v_src.id IS NULL OR v_src.status <> 'voided' OR v_src.version <> p_expected_version THEN
    RETURN NULL;
  END IF;
  SELECT slug INTO v_slug FROM public.organizations WHERE id = v_src.organization_id;
  IF v_slug IS NULL THEN
    RAISE EXCEPTION 'organization required' USING ERRCODE = '42501';
  END IF;
  v_number := 'IND-'
    || upper(substr(md5(v_slug), 1, 5))
    || '-' || to_char(v_src.paid_at, 'YYMM-')
    || lpad(nextval('public.invoice_number_seq')::text, 4, '0')
    || '-' || (SELECT string_agg(substr('ABCDEFGHJKMNPQRSTUVWXYZ23456789', (floor(random() * 31) + 1)::integer, 1), '' ORDER BY s) FROM generate_series(1, 4) AS s);
  INSERT INTO public.invoices(id, organization_id, number, amount_idr, status, paid_at, billing_note, payment_method, created_by, version, created_at, updated_at)
  VALUES (v_id, v_src.organization_id, v_number, v_src.amount_idr, 'paid', v_src.paid_at, v_src.billing_note, v_src.payment_method, p_actor_id, 1, p_now, p_now);
  INSERT INTO public.audit_logs(organization_id, id, actor_type, actor_id, entry_point, action, target_type, target_id, outcome, changed_fields, after, request_id, occurred_at)
  VALUES (v_src.organization_id, gen_random_uuid(), 'user', p_actor_id::text, 'dashboard', 'invoice.reissue', 'invoice', v_id::text, 'succeeded', ARRAY['number','replaces'], jsonb_build_object('number', v_number, 'replaces', p_invoice_id, 'reason', p_reason), p_request_id, p_now);
  RETURN v_id;
END
$function$;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.invoice_reissue(uuid, text, uuid, integer, text, timestamptz) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.invoice_reissue(uuid, text, uuid, integer, text, timestamptz) TO indicate_runtime;--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (137, 'invoice_paid_month_single_price', 'sha256:2195e850eb0180bf790c738c90eafaf27bd6ea156bd58d47ee297c371f888d0a');
