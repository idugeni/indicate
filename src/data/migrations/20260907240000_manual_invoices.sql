-- Invoice manual era aktivasi manual: dicatat superadmin setelah pembayaran
-- terkonfirmasi (tanpa order). Nomor profesional berurutan per bulan
-- (INV/YYYY/MM/NNNN via sequence; aman konkuren). Status hanya paid/voided;
-- org membaca invoice miliknya sendiri, tulis hanya platform.
-- Checksum di bawah adalah sha256 heks dari isi berkas ini sebelum baris INSERT.
CREATE TYPE "public"."invoice_status" AS ENUM('paid', 'voided');--> statement-breakpoint
CREATE SEQUENCE public.invoice_number_seq;--> statement-breakpoint
CREATE TABLE "public"."invoices" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id" uuid NOT NULL REFERENCES "public"."organizations"("id") ON DELETE restrict,
  "number" text NOT NULL,
  "amount_idr" integer NOT NULL,
  "currency" text NOT NULL DEFAULT 'IDR',
  "status" "public"."invoice_status" NOT NULL DEFAULT 'paid',
  "paid_at" timestamptz NOT NULL,
  "billing_note" text,
  "created_by" uuid REFERENCES "public"."users"("id") ON DELETE SET NULL,
  "voided_at" timestamptz,
  "void_reason" text,
  "version" integer NOT NULL DEFAULT 1,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "invoices_number_unique" UNIQUE ("number"),
  CONSTRAINT "invoices_amount_nonnegative" CHECK ("amount_idr" >= 0),
  CONSTRAINT "invoices_version_positive" CHECK ("version" > 0)
);--> statement-breakpoint
CREATE INDEX "invoices_org_paid_idx" ON "public"."invoices" USING btree ("organization_id", "paid_at" DESC);--> statement-breakpoint
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE public.invoices FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY invoices_function_only ON public.invoices FOR ALL TO indicate_runtime USING (false) WITH CHECK (false);--> statement-breakpoint
CREATE OR REPLACE FUNCTION indicate_private.invoice_create(p_actor_id uuid, p_request_id text, p_organization_id uuid, p_amount integer, p_paid_at timestamp with time zone, p_note text, p_now timestamp with time zone)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
DECLARE v_id uuid := gen_random_uuid(); v_number text;
BEGIN
  IF NOT indicate_private.permission_has_platform_admin(p_actor_id) THEN
    RAISE EXCEPTION 'platform permission required' USING ERRCODE = '42501';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.organizations WHERE id = p_organization_id) THEN
    RAISE EXCEPTION 'organization required' USING ERRCODE = '42501';
  END IF;
  IF p_amount IS NULL OR p_amount < 0 THEN
    RAISE EXCEPTION 'amount invalid' USING ERRCODE = '42501';
  END IF;
  IF p_paid_at IS NULL THEN
    RAISE EXCEPTION 'paid_at required' USING ERRCODE = '42501';
  END IF;
  v_number := 'INV/' || to_char(p_now, 'YYYY/MM/') || lpad(nextval('public.invoice_number_seq')::text, 4, '0');
  INSERT INTO public.invoices(id, organization_id, number, amount_idr, status, paid_at, billing_note, created_by, version, created_at, updated_at)
  VALUES (v_id, p_organization_id, v_number, p_amount, 'paid', p_paid_at, nullif(p_note, ''), p_actor_id, 1, p_now, p_now);
  INSERT INTO public.audit_logs(organization_id, id, actor_type, actor_id, entry_point, action, target_type, target_id, outcome, changed_fields, after, request_id, occurred_at)
  VALUES (p_organization_id, gen_random_uuid(), 'user', p_actor_id::text, 'dashboard', 'invoice.create', 'invoice', v_id::text, 'succeeded', ARRAY['number','amount','paidAt'], jsonb_build_object('number', v_number, 'amount', p_amount, 'paidAt', p_paid_at), p_request_id, p_now);
  RETURN v_id;
END
$function$;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.invoice_create(uuid, text, uuid, integer, timestamptz, text, timestamptz) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.invoice_create(uuid, text, uuid, integer, timestamptz, text, timestamptz) TO indicate_runtime;--> statement-breakpoint
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
  WHERE id = p_invoice_id AND version = p_expected_version AND status = 'paid';
  IF NOT FOUND THEN RETURN false; END IF;
  INSERT INTO public.audit_logs(organization_id, id, actor_type, actor_id, entry_point, action, target_type, target_id, outcome, changed_fields, after, request_id, occurred_at)
  SELECT organization_id, gen_random_uuid(), 'user', p_actor_id::text, 'dashboard', 'invoice.void', 'invoice', p_invoice_id::text, 'succeeded', ARRAY['status'], jsonb_build_object('status', 'voided'), p_request_id, p_now
  FROM public.invoices WHERE id = p_invoice_id;
  RETURN true;
END
$function$;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.invoice_void(uuid, text, uuid, integer, text, timestamptz) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.invoice_void(uuid, text, uuid, integer, text, timestamptz) TO indicate_runtime;--> statement-breakpoint
CREATE OR REPLACE FUNCTION indicate_private.invoice_list_for_org(p_actor_id uuid, p_organization_id uuid)
 RETURNS TABLE(id uuid, organization_id uuid, number text, amount_idr integer, currency text, status invoice_status, paid_at timestamp with time zone, billing_note text, voided_at timestamp with time zone, void_reason text, version integer, created_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
BEGIN
  IF NOT indicate_private.permission_has_platform_admin(p_actor_id)
     AND NOT EXISTS (SELECT 1 FROM public.memberships WHERE memberships.organization_id = invoice_list_for_org.p_organization_id AND memberships.user_id = p_actor_id AND memberships.status = 'active') THEN
    RAISE EXCEPTION 'platform permission required' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY SELECT i.id, i.organization_id, i.number, i.amount_idr, i.currency, i.status, i.paid_at, i.billing_note, i.voided_at, i.void_reason, i.version, i.created_at
  FROM public.invoices i WHERE i.organization_id = p_organization_id ORDER BY i.paid_at DESC, i.created_at DESC;
END
$function$;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.invoice_list_for_org(uuid, uuid) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.invoice_list_for_org(uuid, uuid) TO indicate_runtime;--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (101, 'manual_invoices', 'sha256:14ed1f59fba43eaadc3770b356d99abb15508a5618210852d995ae347f3af020');

