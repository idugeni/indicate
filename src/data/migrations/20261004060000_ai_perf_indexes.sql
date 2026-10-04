-- Indeks baca AI: lookup katalog model dan rotasi kredensial.
--
-- `ai_models_model_name_idx` mempercepat validasi rantai (owner lookup per
-- nama model) dan probe Test (`probeModelFor`). Indeks kredensial gabungan
-- mempercepat pemilihan kunci rotasi per (provider, status, prioritas,
-- pemakaian terakhir) tanpa memuat ulang seluruh pool. Keduanya
-- `IF NOT EXISTS` agar apply ulang aman; tanpa secrets, tanpa data.
--
-- Body digest (reproducible): LF-normalize this file, substitute the 64-hex
-- checksum literal below with 64 zeros, SHA-256 the complete UTF-8 bytes.
CREATE INDEX IF NOT EXISTS ai_models_model_name_idx ON public.ai_models (model_name);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS ai_credentials_provider_status_priority_used_idx ON public.ai_credentials (provider_id, status, priority, last_used_at);--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (251, 'ai_perf_indexes', 'sha256:58babaf06f3a1f963454deb0f903f2e5a174e6b4dea9cefd49ad9d6bfa0e1f0d');
