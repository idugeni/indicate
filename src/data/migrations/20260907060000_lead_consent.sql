-- F84: consent trail lead publik + linking Telegram (PENDING A6).
--
-- 1. enterprise_leads + telegram_identity_mappings: kolom consented_at,
--    consent_text_version, ip_hash (sha256 heks IP pemohon; NULL bila IP tidak
--    teramati, mis. penautan via dasbor admin).
-- 2. billing_lead_create 3-arg diganti versi 6-arg yang mewajibkan consent;
--    grant runtime diterbitkan ulang (grant tidak terbawa saat signatur berubah).
-- Teks persetujuan versi lead-consent/1 dan telegram-link/1 hidup di kode.
-- Checksum di bawah adalah sha256 heks dari isi berkas ini sebelum baris INSERT.
ALTER TABLE public.enterprise_leads
  ADD COLUMN IF NOT EXISTS consented_at timestamp with time zone NULL,
  ADD COLUMN IF NOT EXISTS consent_text_version text NULL,
  ADD COLUMN IF NOT EXISTS ip_hash text NULL CHECK (ip_hash IS NULL OR ip_hash ~ '^[0-9a-f]{64}$');--> statement-breakpoint
ALTER TABLE public.telegram_identity_mappings
  ADD COLUMN IF NOT EXISTS consented_at timestamp with time zone NULL,
  ADD COLUMN IF NOT EXISTS consent_text_version text NULL,
  ADD COLUMN IF NOT EXISTS ip_hash text NULL CHECK (ip_hash IS NULL OR ip_hash ~ '^[0-9a-f]{64}$');--> statement-breakpoint
DROP FUNCTION IF EXISTS indicate_private.billing_lead_create(text, text, text);--> statement-breakpoint
CREATE OR REPLACE FUNCTION indicate_private.billing_lead_create(p_nama text, p_email text, p_kebutuhan text, p_consented_at timestamp with time zone, p_consent_text_version text, p_ip_hash text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
DECLARE v_id uuid := gen_random_uuid();
BEGIN
  IF p_nama IS NULL OR length(p_nama) NOT BETWEEN 1 AND 200 OR p_email IS NULL OR length(p_email) NOT BETWEEN 3 AND 320 OR p_kebutuhan IS NULL OR length(p_kebutuhan) NOT BETWEEN 1 AND 4000 THEN
    RAISE EXCEPTION 'lead fields invalid' USING ERRCODE = '42501';
  END IF;
  IF p_consented_at IS NULL OR p_consent_text_version IS NULL OR length(p_consent_text_version) NOT BETWEEN 1 AND 64 OR p_ip_hash IS NULL OR p_ip_hash !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION 'lead consent invalid' USING ERRCODE = '42501';
  END IF;
  INSERT INTO public.enterprise_leads(id, nama, email, kebutuhan, consented_at, consent_text_version, ip_hash)
  VALUES (v_id, p_nama, p_email, p_kebutuhan, p_consented_at, p_consent_text_version, p_ip_hash);
  RETURN v_id;
END
$function$;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.billing_lead_create(text, text, text, timestamptz, text, text) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.billing_lead_create(text, text, text, timestamptz, text, text) TO indicate_runtime;--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (84, 'lead_consent', 'sha256:cbc059697c94ba7dbaccfb7ae03d1331193de18903a87a7bc0210d434083a060');
