-- Seed provider OpenRouter: OpenAI-compatible gateway multi-model.
--
-- Baris memakai ON CONFLICT DO NOTHING agar apply ulang aman; tanpa secrets:
-- kredensial disimpan operator lewat panel AI (ai_credentials) setelah migrasi
-- di-apply. Routing policy tidak diubah di sini; operator memilih
-- primary_provider_id=openrouter lewat panel setelah kredensial aktif.
-- Tanpa kredensial aktif, provider di-skip oleh router.
--
-- Body digest (reproducible): LF-normalize this file, substitute the 64-hex
-- checksum literal below with 64 zeros, SHA-256 the complete UTF-8 bytes.
INSERT INTO public.ai_providers (id, name, description, is_active, is_primary, priority, created_at, updated_at)
VALUES ('openrouter', 'OpenRouter', 'OpenAI-compatible multi-model gateway', true, false, 20, now(), now())
ON CONFLICT (id) DO NOTHING;--> statement-breakpoint
INSERT INTO public.ai_models (id, provider_id, model_name, display_name, description, context_window, output_token_limit, supported_modalities, rpm_limit, tpm_limit, task_recommendation, supports_tools, supports_vision, is_default, is_active, priority, created_at, updated_at)
VALUES
  ('openrouter-gpt-4o-mini', 'openrouter', 'openai/gpt-4o-mini', 'GPT-4o Mini via OpenRouter', 'Default chat workhorse', 128000, 16384, ARRAY['text'], NULL, NULL, 'default chat', true, true, false, true, 10, now(), now()),
  ('openrouter-claude-haiku', 'openrouter', 'anthropic/claude-3.5-haiku', 'Claude Haiku via OpenRouter', 'Failover editorial', 200000, 8192, ARRAY['text'], NULL, NULL, 'failover', true, true, false, true, 20, now(), now())
ON CONFLICT (id) DO NOTHING;--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (247, 'ai_openrouter_provider', 'sha256:c3c86ccd706847cefeda1e3aca9f14009fc6c5392eb5d60ef7222909330a30b9');
