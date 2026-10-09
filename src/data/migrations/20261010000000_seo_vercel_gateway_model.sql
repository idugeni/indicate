-- Register the low-cost, structured-output-capable Vercel AI Gateway model used only by SEO metadata and taxonomy tasks.
-- Provider routing is pinned per request to Google AI Studio; application and gateway model/provider fallback are disabled for these tasks.
INSERT INTO public.ai_models (
  id, provider_id, model_name, display_name, description,
  context_window, input_token_limit, output_token_limit, supported_modalities,
  release_stage, rpm_limit, tpm_limit, rpd_limit, task_recommendation,
  supports_tools, supports_vision, is_default, is_active, priority
)
VALUES (
  'vercel-google-gemini-3-5-flash-lite',
  'vercel-gateway',
  'google/gemini-3.5-flash-lite',
  'Gemini 3.5 Flash-Lite via Vercel AI Gateway',
  'Low-cost structured-output model pinned to Google AI Studio for SEO meta descriptions and category/tag suggestions.',
  1000000, 1000000, 65000, ARRAY['text','image','video'],
  'stable', NULL, NULL, NULL, 'seo descriptions and taxonomy tags',
  true, true, false, true, 5
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
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (278, 'seo_vercel_gateway_model', 'sha256:44b70b329c4cc52bdf05beac3397c081a7af2d98e03803fec9c58ad6fb99f756);
