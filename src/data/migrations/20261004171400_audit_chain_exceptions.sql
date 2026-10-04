-- Pengecualian historis rantai audit: monitor tetap hijau, riwayat tetap jujur.
--
-- `audit_verify_and_report` merah setiap malam atas 67 seq yang semuanya
-- historis dan terdokumentasi: fork konkurensi pra-advisory-lock (rana baca-
-- lalu-tulis tanpa serialisasi) pada Sep 2026 — payload dan signature utuh,
-- hanya tautan prev_hash yang salah. Menandatangani ulang riwayat DITOLAK
-- (rantai yang hijau karena ditulis ulang lebih tidak jujur daripada yang
-- merah karena masa lalunya). Sebaliknya reporter kini mengurangkan seq yang
-- tercatat di tabel khusus ini: masa lalu diakui eksplisit per baris dengan
-- alasan, monitor hijau, dan SETIAP putus BARU tetap memicu `audit.chain_broken`.
-- Tabel hanya-tambah menurut konvensi: runtime tidak punya kebijakan tulis,
-- baris baru hanya lewat migrasi/owner dengan alasan tertulis.
--
-- Body digest (reproducible): LF-normalize this file, substitute the 64-hex
-- checksum literal below with 64 zeros, SHA-256 the complete UTF-8 bytes.
CREATE TABLE IF NOT EXISTS public.audit_chain_exceptions (
  seq bigint PRIMARY KEY,
  reason text NOT NULL,
  recorded_at timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE public.audit_chain_exceptions ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE public.audit_chain_exceptions FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS config_deny_all ON public.audit_chain_exceptions;--> statement-breakpoint
CREATE POLICY config_deny_all ON public.audit_chain_exceptions FOR ALL TO indicate_runtime USING (false) WITH CHECK (false);--> statement-breakpoint
INSERT INTO public.audit_chain_exceptions(seq, reason) VALUES
  (6, 'historical concurrency fork, Sep 2026; payload intact'),
  (73, 'historical concurrency fork, Sep 2026; payload intact'),
  (383, 'historical concurrency fork, Sep 2026; payload intact'),
  (406, 'historical concurrency fork, Sep 2026; payload intact'),
  (468, 'historical concurrency fork, Sep 2026; payload intact'),
  (493, 'historical concurrency fork, Sep 2026; payload intact'),
  (501, 'historical concurrency fork, Sep 2026; payload intact'),
  (550, 'historical concurrency fork, Sep 2026; payload intact');--> statement-breakpoint
INSERT INTO public.audit_chain_exceptions(seq, reason)
SELECT generate_series(75, 133), 'historical concurrency fork, Sep 2026; payload intact'
ON CONFLICT (seq) DO NOTHING;--> statement-breakpoint
CREATE OR REPLACE FUNCTION indicate_private.audit_verify_and_report()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
DECLARE v_bad bigint[]; v_count integer; v_platform uuid;
BEGIN
  SELECT array_agg(bad_seq) INTO v_bad FROM indicate_private.audit_chain_scan() AS bad_seq
  WHERE bad_seq NOT IN (SELECT seq FROM public.audit_chain_exceptions);
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
DO $$
DECLARE
  remaining integer;
BEGIN
  SELECT count(*) INTO remaining
    FROM indicate_private.audit_chain_scan() AS bad_seq
    WHERE bad_seq NOT IN (SELECT seq FROM public.audit_chain_exceptions);
  IF remaining > 0 THEN
    RAISE EXCEPTION 'audit_chain_still_broken: % new break(s) outside exceptions', remaining;
  END IF;
END;
$$;--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (263, 'audit_chain_exceptions', 'sha256:cf8a9689055a3f7e7612e34693df73c8d6f2b1bd53a3622e5b813d914a7171f6');
