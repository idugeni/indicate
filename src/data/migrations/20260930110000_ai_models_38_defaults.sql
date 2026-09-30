-- Refresh direktori model AI ke generasi 3.x + jadikan 3.8-flash default.
--
-- Angka konteks/limit di bawah diverifikasi dari GET /v1beta/models live.
-- Baris memakai ON CONFLICT DO NOTHING agar apply ulang aman; UPDATE
-- idempotent. Routing default pindah dari gemini-2.5-flash (404 untuk akun
-- baru) ke gemini-3.8-flash dengan fallback gemini-3.6-flash.
INSERT INTO public.ai_models (id, provider_id, model_name, display_name, description, context_window, input_token_limit, output_token_limit, supported_modalities, release_stage, rpm_limit, tpm_limit, rpd_limit, task_recommendation, supports_tools, supports_vision, is_default, is_active, priority)
VALUES
  ('gemini-3.8-flash', 'gemini', 'gemini-3.8-flash', 'Gemini 3.8 Flash', 'Flagship Flash for coding, agents, and enterprise workflows', 1048576, 1048576, 65536, ARRAY['text','image','audio','video'], 'stable', NULL, NULL, NULL, 'default chat', true, true, true, true, 5),
  ('gemini-3.5-flash', 'gemini', 'gemini-3.5-flash', 'Gemini 3.5 Flash', 'Routine high-throughput workloads', 1048576, 1048576, 65536, ARRAY['text','image','audio','video'], 'stable', NULL, NULL, NULL, 'general chat', true, true, false, true, 35),
  ('gemini-3.5-flash-lite', 'gemini', 'gemini-3.5-flash-lite', 'Gemini 3.5 Flash-Lite', 'Fastest cheapest high-volume execution', 1048576, 1048576, 65536, ARRAY['text','image','audio','video'], 'stable', NULL, NULL, NULL, 'high volume', true, true, false, true, 55),
  ('gemini-3.1-flash-image', 'gemini', 'gemini-3.1-flash-image', 'Nano Banana 2', 'Fast high-efficiency image generation and editing', 65536, 65536, 65536, ARRAY['text','image'], 'stable', NULL, NULL, NULL, 'image generation', false, true, false, true, 80),
  ('gemini-3.1-flash-lite-image', 'gemini', 'gemini-3.1-flash-lite-image', 'Nano Banana 2 Lite', 'Ultra-low-latency image generation for interactive use', 65536, 65536, 65536, ARRAY['text','image'], 'stable', NULL, NULL, NULL, 'image generation', false, true, false, true, 85),
  ('gemini-3.8-flash-tts', 'gemini', 'gemini-3.8-flash-tts', 'Gemini 3.8 Flash TTS', 'Studio-grade text-to-speech across 130 languages', 8192, 8192, 16384, ARRAY['text','audio'], 'stable', NULL, NULL, NULL, 'speech synthesis', false, false, false, true, 90),
  ('gemini-3.5-transcribe', 'gemini', 'gemini-3.5-transcribe', 'Gemini 3.5 Transcribe', 'Speech-to-text with diarization and word timestamps', 98304, 98304, 32768, ARRAY['audio','text'], 'stable', NULL, NULL, NULL, 'transcription', false, false, false, true, 95)
ON CONFLICT (id) DO NOTHING;--> statement-breakpoint
UPDATE public.ai_models SET context_window = 1048576, input_token_limit = 1048576, updated_at = now()
  WHERE id IN ('gemini-3.7-flash', 'gemini-2.5-pro') AND context_window != 1048576;--> statement-breakpoint
UPDATE public.ai_models SET is_default = (id = 'gemini-3.8-flash'), updated_at = now()
  WHERE is_default = true OR id = 'gemini-3.8-flash';--> statement-breakpoint
UPDATE public.ai_routing_policies SET default_model = 'gemini-3.8-flash', fallback_model = 'gemini-3.6-flash', updated_at = now()
  WHERE id = 'default';--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (230, 'ai_models_38_defaults', 'sha256:022cd799a2a8ac919f097d97eb8bb2eba218cdfedba61cd1b3a6f9a5888a6287');
