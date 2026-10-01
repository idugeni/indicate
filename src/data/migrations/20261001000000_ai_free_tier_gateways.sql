-- Seed provider gratis AI: Workers AI embedding + Vercel AI Gateway chat.
--
-- Baris memakai ON CONFLICT DO NOTHING agar apply ulang aman; tanpa secrets:
-- kredensial disimpan operator lewat panel AI (ai_credentials) setelah migrasi
-- di-apply. Workers AI embedding menghemat kuota Gemini untuk reindex dan
-- semantic-search; vercel-gateway menampung beban redaksi non-kritis lewat
-- free-tier bulanan dengan budget per organisasi+model di Redis (kode, bukan
-- kolom). Tanpa kredensial aktif, kedua provider di-skip oleh router.
--
-- Body digest (reproducible): LF-normalize this file, substitute the 64-hex
-- checksum literal below with 64 zeros, SHA-256 the complete UTF-8 bytes.
INSERT INTO public.ai_providers (id, name, description, is_active, is_primary, priority, created_at, updated_at)
VALUES
  ('workers-ai', 'Cloudflare Workers AI', 'Workers AI embeddings billed from the free Neurons allocation', true, false, 50, now(), now()),
  ('vercel-gateway', 'Vercel AI Gateway', 'Multi-provider gateway free-tier for editorial workloads', true, false, 60, now(), now())
ON CONFLICT (id) DO NOTHING;--> statement-breakpoint
INSERT INTO public.ai_models (id, provider_id, model_name, display_name, description, context_window, output_token_limit, supported_modalities, rpm_limit, tpm_limit, task_recommendation, supports_tools, supports_vision, is_default, is_active, priority, created_at, updated_at)
VALUES
  ('workers-ai-bge-base', 'workers-ai', '@cf/baai/bge-base-en-v1.5', 'BGE Base Embeddings', 'Free-tier text embeddings for archive semantic search', 512, NULL, ARRAY['text'], 60, 100000, 'embeddings', false, false, false, true, 10, now(), now())
ON CONFLICT (id) DO NOTHING;--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (237, 'ai_free_tier_gateways', 'sha256:67bfbcba1e0292a86d09fe1396aaf31ecc550045d1066f10610f8082b61bc5c5');
