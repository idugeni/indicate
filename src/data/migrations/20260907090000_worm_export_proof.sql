-- F86: bukti export WORM via fungsi (perbaikan v81).
--
-- Modul ekspor menulis bukti langsung ke retention_runs sebagai indicate_runtime,
-- tetapi tabel itu function-only (USING false). Kini pencatatan lewat fungsi
-- allowlist SECURITY DEFINER berikut.
-- Checksum di bawah adalah sha256 heks dari isi berkas ini sebelum baris INSERT.
CREATE OR REPLACE FUNCTION indicate_private.worm_export_proof(p_category text, p_purged_count integer, p_started_at timestamp with time zone)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
BEGIN
  IF p_category NOT IN ('audit_worm_export') THEN
    RAISE EXCEPTION 'worm proof category not allowed' USING ERRCODE = '42501';
  END IF;
  INSERT INTO public.retention_runs(category, purged_count, started_at, finished_at)
  VALUES (p_category, p_purged_count, p_started_at, now());
END
$function$;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.worm_export_proof(text, integer, timestamptz) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.worm_export_proof(text, integer, timestamptz) TO indicate_runtime;--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (86, 'worm_export_proof', 'sha256:a9d8295b9cfa43811268a74c2055ae86bae4e23f991afd9c2911f6f396b3892b');
