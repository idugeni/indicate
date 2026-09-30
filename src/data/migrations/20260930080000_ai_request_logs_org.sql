-- Atribusi log request AI per organisasi (full-DB, tanpa env baru).
--
-- `ai_request_logs` lahir tanpa `organization_id` di
-- `20260930030000_ai_control_plane.sql`, sehingga ringkasan token per organisasi
-- (`getTokenUsageByOrg`) tidak punya kunci agregat. Kolom ini NULL-able agar
-- insert lama tanpa kolom tetap aman, dan baris pra-migrasi terbaca sebagai grup
-- global (NULL) di agregat.
ALTER TABLE public.ai_request_logs
  ADD COLUMN IF NOT EXISTS organization_id uuid NULL REFERENCES public.organizations(id) ON DELETE SET NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS ai_request_logs_org_created_idx ON public.ai_request_logs (organization_id, created_at DESC);--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (227, 'ai_request_logs_org', 'sha256:174d8f794a727857b5c0a0310031dba0fa1994497f03d19c28ecaa6e49731eb7');
