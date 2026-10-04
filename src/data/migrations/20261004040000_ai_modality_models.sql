-- Seed model modalitas Gemini: TTS, transkripsi, dan cover-image.
--
-- Ketiganya dipakai kode lewat `modelOverride`, dan router memakai katalog
-- ini untuk menjalankan override di provider pemiliknya — bukan di primary.
-- Tanpa baris ini, primary non-Gemini (mis. openrouter) menerima nama model
-- Gemini dan gagal di provider. Baris memakai ON CONFLICT DO NOTHING agar
-- apply ulang aman; tanpa secrets dan tanpa mengubah routing policy.
--
-- Body digest (reproducible): LF-normalize this file, substitute the 64-hex
-- checksum literal below with 64 zeros, SHA-256 the complete UTF-8 bytes.
INSERT INTO public.ai_models (id, provider_id, model_name, display_name, description, context_window, output_token_limit, supported_modalities, rpm_limit, tpm_limit, task_recommendation, supports_tools, supports_vision, is_default, is_active, priority, created_at, updated_at)
VALUES
  ('gemini-3.8-flash-tts', 'gemini', 'gemini-3.8-flash-tts', 'Gemini 3.8 Flash TTS', 'Article text-to-speech', 32000, 2048, ARRAY['text', 'audio'], NULL, NULL, 'tts', false, false, false, true, 80, now(), now()),
  ('gemini-3.5-transcribe', 'gemini', 'gemini-3.5-transcribe', 'Gemini 3.5 Transcribe', 'Interview audio transcription', 1048576, 8192, ARRAY['audio', 'text'], NULL, NULL, 'transcribe', false, false, false, true, 81, now(), now()),
  ('gemini-3.1-flash-image', 'gemini', 'gemini-3.1-flash-image', 'Gemini 3.1 Flash Image', 'Cover image generation', 1048576, 8192, ARRAY['text', 'image'], NULL, NULL, 'cover-image', false, true, false, true, 82, now(), now())
ON CONFLICT (id) DO NOTHING;--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (249, 'ai_modality_models', 'sha256:19c363fa01922e8e792ee14e8e76251b7a6e57302bbd3b31bb603987ebb7c423');
