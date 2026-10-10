-- Register the selected low-cost Vercel AI Gateway model for all text-output AI tasks.
-- Google is the only permitted provider for the selected model; specialized image/audio output stays on dedicated models.
INSERT INTO public.ai_models (
  id, provider_id, model_name, display_name, description,
  context_window, input_token_limit, output_token_limit, supported_modalities,
  release_stage, rpm_limit, tpm_limit, rpd_limit, task_recommendation,
  supports_tools, supports_vision, is_default, is_active, priority
)
VALUES (
  'vercel-google-gemini-2-5-flash-lite',
  'vercel-gateway',
  'google/gemini-2.5-flash-lite',
  'Gemini 2.5 Flash-Lite via Vercel AI Gateway',
  'Low-cost text-output model for editorial AI, SEO, classification and audio/image-input extraction through Vercel AI Gateway.',
  1048576, 1048576, 65536, ARRAY['text','image','audio','video'],
  'stable', NULL, NULL, NULL, 'seo descriptions and taxonomy tags',
  true, true, false, true, 1
)
ON CONFLICT (id) DO UPDATE SET
  provider_id = EXCLUDED.provider_id,
  model_name = EXCLUDED.model_name,
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  context_window = EXCLUDED.context_window,
  input_token_limit = EXCLUDED.input_token_limit,
  output_token_limit = EXCLUDED.output_token_limit,
  supported_modalities = EXCLUDED.supported_modalities,
  release_stage = EXCLUDED.release_stage,
  task_recommendation = EXCLUDED.task_recommendation,
  supports_tools = EXCLUDED.supports_tools,
  supports_vision = EXCLUDED.supports_vision,
  is_default = false,
  is_active = true,
  priority = EXCLUDED.priority,
  updated_at = now();--> statement-breakpoint
UPDATE public.ai_models
SET is_active = false, is_default = false, updated_at = now()
WHERE provider_id = 'vercel-gateway'
  AND model_name = 'google/gemini-3.5-flash-lite';--> statement-breakpoint
UPDATE public.ai_routing_policies
SET primary_provider_id = 'vercel-gateway',
    default_model = 'google/gemini-2.5-flash-lite',
    fallback_provider_id = 'vercel-gateway',
    fallback_model = 'google/gemini-2.5-flash-lite',
    max_retries = 1,
    per_key_retry_limit = 1,
    chain_strategy = 'fallback',
    cost_mode = 'price',
    rotation_strategy = 'priority_based',
    version = version + 1,
    updated_at = now()
WHERE id = 'default';--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (278, 'seo_vercel_gateway_model', 'sha256:1002d8de1cd5a040f13c167874bc49d689c7f728f606077bfe1f89dd37e7f5de');
