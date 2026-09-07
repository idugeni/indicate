-- Fase C legal-hardening: rantai hash jejak audit + stempel jam DB.
--
-- Aturan kanonikal tunggal (dipakai trigger, backfill, dan verifikasi):
--   kanonikal = (baris::jsonb TANPA seq/prev_hash/signature)::text || '|' || COALESCE(prev_hash,'GENESIS')
-- Urutan kunci json mengikuti urutan kolom tabel; SELECT di backfill/verify
-- mencantumkan kolom dalam urutan tabel agar serialisasi identik.
-- Setiap baris dirantai (prev_hash = signature baris sebelumnya,
-- signature = HMAC-SHA256 atas kanonikal dengan kunci Vault) dan occurred_at
-- selalu jam database (clock_timestamp) agar tidak dapat digeser aplikasi.
-- Kunci HMAC terpisah di Vault: peran runtime tidak dapat membacanya, hanya
-- fungsi SECURITY DEFINER di bawah. Trigger gagal fail-closed bila kunci
-- hilang. Backfill men-drop guard append-only sementara dalam migrasi yang
-- sama lalu menciptakannya kembali byte-identik; terapkan saat trafik rendah.
-- Body digest (reproducible): LF-normalize this file, substitute the 64-hex
-- checksum literal below with 64 zeros, SHA-256 the complete UTF-8 bytes.

ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS seq bigint GENERATED ALWAYS AS IDENTITY;--> statement-breakpoint
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS prev_hash text;--> statement-breakpoint
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS signature text;--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'audit_logs_seq_unique') THEN
    ALTER TABLE public.audit_logs ADD CONSTRAINT audit_logs_seq_unique UNIQUE (seq);
  END IF;
END
$$;--> statement-breakpoint

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'audit_hmac_key') THEN
    PERFORM vault.create_secret(encode(extensions.gen_random_bytes(32), 'base64'), 'audit_hmac_key', 'HMAC key for audit hash chain (Fase C)');
  END IF;
END
$$;--> statement-breakpoint

CREATE OR REPLACE FUNCTION indicate_private.audit_chain_input(p_row jsonb, p_prev_hash text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
  SELECT (p_row - 'seq' - 'prev_hash' - 'signature')::text || '|' || COALESCE(p_prev_hash, 'GENESIS')
$function$;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.audit_chain_input(jsonb, text) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.audit_chain_input(jsonb, text) TO indicate_runtime;--> statement-breakpoint

CREATE OR REPLACE FUNCTION indicate_private.audit_chain_fill()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
DECLARE v_prev text; v_key text;
BEGIN
  SELECT signature INTO v_prev FROM public.audit_logs ORDER BY seq DESC LIMIT 1 FOR UPDATE;
  NEW.occurred_at := clock_timestamp();
  NEW.prev_hash := v_prev;
  SELECT decrypted_secret INTO v_key FROM vault.decrypted_secrets WHERE name = 'audit_hmac_key' ORDER BY created_at DESC LIMIT 1;
  IF v_key IS NULL THEN
    RAISE EXCEPTION 'audit hmac key missing' USING ERRCODE = '42501';
  END IF;
  NEW.signature := encode(extensions.hmac(indicate_private.audit_chain_input(to_jsonb(NEW), NEW.prev_hash), v_key, 'sha256'), 'hex');
  RETURN NEW;
END
$function$;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.audit_chain_fill() FROM PUBLIC;--> statement-breakpoint

-- Backfill rantai untuk baris pra-chain dalam urutan seq (urutan verifikasi).
-- Kolom SELECT dalam urutan tabel persis (tanpa seq/prev_hash/signature).
DROP TRIGGER IF EXISTS audit_logs_append_only_guard ON public.audit_logs;--> statement-breakpoint
DO $$
DECLARE r record; v_prev text := NULL; v_key text; v_sig text;
BEGIN
  SELECT decrypted_secret INTO v_key FROM vault.decrypted_secrets WHERE name = 'audit_hmac_key' ORDER BY created_at DESC LIMIT 1;
  IF v_key IS NULL THEN
    RAISE EXCEPTION 'audit hmac key missing' USING ERRCODE = '42501';
  END IF;
  FOR r IN SELECT organization_id, id, actor_type, actor_id, entry_point, action, target_type, target_id, outcome, changed_fields, "before", "after", request_id, occurred_at FROM public.audit_logs ORDER BY seq LOOP
    v_sig := encode(extensions.hmac(indicate_private.audit_chain_input(to_jsonb(r), v_prev), v_key, 'sha256'), 'hex');
    UPDATE public.audit_logs SET prev_hash = v_prev, signature = v_sig WHERE organization_id = r.organization_id AND id = r.id;
    v_prev := v_sig;
  END LOOP;
END
$$;--> statement-breakpoint
CREATE TRIGGER audit_logs_append_only_guard
BEFORE UPDATE OR DELETE ON audit_logs
FOR EACH ROW EXECUTE FUNCTION indicate_private.reject_audit_mutation();--> statement-breakpoint

DROP TRIGGER IF EXISTS audit_logs_chain_trigger ON public.audit_logs;--> statement-breakpoint
CREATE TRIGGER audit_logs_chain_trigger
BEFORE INSERT ON public.audit_logs
FOR EACH ROW EXECUTE FUNCTION indicate_private.audit_chain_fill();--> statement-breakpoint

-- Verifikasi rantai: kembalikan seq yang rusak (kosong = sehat). Khusus
-- operator platform; pemindai sistem tanpa-gerbang ada di bawah untuk cron.
CREATE OR REPLACE FUNCTION indicate_private.audit_verify_chain(p_actor_id uuid)
 RETURNS TABLE(bad_seq bigint)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
DECLARE r record; v_prev text := NULL; v_key text; v_sig text;
BEGIN
  IF NOT indicate_private.permission_has_platform_admin(p_actor_id) THEN
    RAISE EXCEPTION 'platform permission required' USING ERRCODE = '42501';
  END IF;
  SELECT decrypted_secret INTO v_key FROM vault.decrypted_secrets WHERE name = 'audit_hmac_key' ORDER BY created_at DESC LIMIT 1;
  IF v_key IS NULL THEN
    RAISE EXCEPTION 'audit hmac key missing' USING ERRCODE = '42501';
  END IF;
  FOR r IN SELECT seq, organization_id, id, actor_type, actor_id, entry_point, action, target_type, target_id, outcome, changed_fields, "before", "after", request_id, occurred_at, prev_hash, signature FROM public.audit_logs ORDER BY seq LOOP
    v_sig := encode(extensions.hmac(indicate_private.audit_chain_input(to_jsonb(r) - 'seq' - 'prev_hash' - 'signature', r.prev_hash), v_key, 'sha256'), 'hex');
    IF r.signature IS DISTINCT FROM v_sig OR r.prev_hash IS DISTINCT FROM v_prev THEN
      bad_seq := r.seq; RETURN NEXT;
    END IF;
    v_prev := r.signature;
  END LOOP;
END
$function$;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.audit_verify_chain(uuid) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.audit_verify_chain(uuid) TO indicate_runtime;--> statement-breakpoint

-- Pemindai tanpa-gerbang untuk cron: hanya owner/cron yang dapat mengeksekusi
-- (tanpa GRANT ke peran runtime).
CREATE OR REPLACE FUNCTION indicate_private.audit_chain_scan()
 RETURNS TABLE(bad_seq bigint)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
DECLARE r record; v_prev text := NULL; v_key text; v_sig text;
BEGIN
  SELECT decrypted_secret INTO v_key FROM vault.decrypted_secrets WHERE name = 'audit_hmac_key' ORDER BY created_at DESC LIMIT 1;
  IF v_key IS NULL THEN
    RAISE EXCEPTION 'audit hmac key missing' USING ERRCODE = '42501';
  END IF;
  FOR r IN SELECT seq, organization_id, id, actor_type, actor_id, entry_point, action, target_type, target_id, outcome, changed_fields, "before", "after", request_id, occurred_at, prev_hash, signature FROM public.audit_logs ORDER BY seq LOOP
    v_sig := encode(extensions.hmac(indicate_private.audit_chain_input(to_jsonb(r) - 'seq' - 'prev_hash' - 'signature', r.prev_hash), v_key, 'sha256'), 'hex');
    IF r.signature IS DISTINCT FROM v_sig OR r.prev_hash IS DISTINCT FROM v_prev THEN
      bad_seq := r.seq; RETURN NEXT;
    END IF;
    v_prev := r.signature;
  END LOOP;
END
$function$;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.audit_chain_scan() FROM PUBLIC;--> statement-breakpoint

CREATE OR REPLACE FUNCTION indicate_private.audit_verify_and_report()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
DECLARE v_bad bigint[]; v_count integer; v_platform uuid;
BEGIN
  SELECT array_agg(bad_seq) INTO v_bad FROM indicate_private.audit_chain_scan();
  v_count := COALESCE(array_length(v_bad, 1), 0);
  IF v_count > 0 THEN
    SELECT organization_id INTO v_platform FROM public.platform_organizations LIMIT 1;
    IF v_platform IS NOT NULL THEN
      INSERT INTO public.audit_logs(organization_id, id, actor_type, actor_id, entry_point, action, target_type, target_id, outcome, changed_fields, after, request_id, occurred_at)
      VALUES (v_platform, gen_random_uuid(), 'system', 'audit-verifier', 'worker', 'audit.chain_broken', 'audit', 'chain', 'failed', ARRAY['status'], jsonb_build_object('badCount', v_count, 'badSeqs', v_bad), 'audit-verify', now());
    END IF;
  END IF;
  RETURN v_count;
END
$function$;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.audit_verify_and_report() FROM PUBLIC;--> statement-breakpoint

SELECT cron.schedule('indicate-audit-verify', '30 2 * * *', 'SELECT indicate_private.audit_verify_and_report()');--> statement-breakpoint

INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (74, 'audit_hash_chain', 'sha256:92c3f298c7765fc9057d6d1b18c675976e1fc68ee3f045da8f724a2d4b58ec61');
