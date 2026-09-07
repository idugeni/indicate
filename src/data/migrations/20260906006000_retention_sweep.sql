-- Fase C legal-hardening: penyapuan retensi terjadwal + bukti penghapusan.
--
-- Setiap kategori kedaluwarsa dihapus dan dihitung ke retention_runs sebagai
-- bukti jadwal penghapusan (UU PDP). Kategori: undangan basi (>90 hari
-- sejak diterima/kedaluwarsa), klaim replay kedaluwarsa, tugas cleanup
-- selesai >90 hari, percakapan Telegram kedaluwarsa (efemeral by design).
-- Penghapusan operasional organisasi penuh tetap mengikuti desain erasure
-- khusus (Fase C2) — sweep ini tidak menyentuh data akun/konten/transaksi.
-- Body digest (reproducible): LF-normalize this file, substitute the 64-hex
-- checksum literal below with 64 zeros, SHA-256 the complete UTF-8 bytes.

CREATE TABLE IF NOT EXISTS public.retention_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,
  purged_count integer NOT NULL DEFAULT 0,
  started_at timestamp with time zone NOT NULL DEFAULT now(),
  finished_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT retention_runs_count_nonnegative CHECK (purged_count >= 0)
);--> statement-breakpoint
ALTER TABLE public.retention_runs ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE public.retention_runs FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS retention_function_only ON public.retention_runs;--> statement-breakpoint
CREATE POLICY retention_function_only ON public.retention_runs FOR ALL TO indicate_runtime USING (false) WITH CHECK (false);--> statement-breakpoint
REVOKE ALL ON public.retention_runs FROM PUBLIC;--> statement-breakpoint

CREATE OR REPLACE FUNCTION indicate_private.retention_sweep()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
DECLARE v_total integer := 0; v_count integer; v_started timestamptz := now();
BEGIN
  DELETE FROM public.org_invitations
  WHERE (accepted_at IS NOT NULL AND accepted_at < now() - interval '90 days')
     OR (accepted_at IS NULL AND expires_at < now() - interval '90 days');
  GET DIAGNOSTICS v_count = ROW_COUNT;
  INSERT INTO public.retention_runs(category, purged_count, started_at, finished_at)
  VALUES ('org_invitations', v_count, v_started, now());
  v_total := v_total + v_count;

  DELETE FROM public.webhook_replay_claims WHERE expires_at < now();
  GET DIAGNOSTICS v_count = ROW_COUNT;
  INSERT INTO public.retention_runs(category, purged_count, started_at, finished_at)
  VALUES ('webhook_replay_claims', v_count, v_started, now());
  v_total := v_total + v_count;

  DELETE FROM public.object_cleanup_tasks WHERE status = 'completed' AND updated_at < now() - interval '90 days';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  INSERT INTO public.retention_runs(category, purged_count, started_at, finished_at)
  VALUES ('object_cleanup_tasks', v_count, v_started, now());
  v_total := v_total + v_count;

  DELETE FROM public.telegram_conversations WHERE expires_at < now();
  GET DIAGNOSTICS v_count = ROW_COUNT;
  INSERT INTO public.retention_runs(category, purged_count, started_at, finished_at)
  VALUES ('telegram_conversations', v_count, v_started, now());
  v_total := v_total + v_count;

  RETURN v_total;
END
$function$;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.retention_sweep() FROM PUBLIC;--> statement-breakpoint

SELECT cron.schedule('indicate-retention-sweep', '0 3 * * *', 'SELECT indicate_private.retention_sweep()');--> statement-breakpoint

INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (75, 'retention_sweep', 'sha256:1c109296242329265a883c69af3e0b22afec215064d96e85f60ed92b48a2c9f4');
