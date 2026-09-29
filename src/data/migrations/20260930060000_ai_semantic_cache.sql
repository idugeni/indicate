-- Fase lanjutan: cache semantik respons AI per tenant (full-DB, tanpa env baru).
--
-- Satu baris menyimpan satu respons model untuk satu prompt yang dinormalisasi,
-- dikunci oleh sha256 hex (prompt ternormalisasi + nama model) di `prompt_hash`.
-- `organization_id` NULL menandai entri global bersama; baris tenant hanya boleh
-- dibaca lewat filter aplikasi `(organization_id IS NULL OR organization_id = $org)`
-- di `src/modules/ai/ai-semantic-cache.ts`, sejajar dengan pola kredensial global
-- di `20260930030000_ai_control_plane.sql`. Vektor embedding menyusul bersama
-- transport embedding; kolom ini hanya menyimpan teks respons agar arsip ILIKE
-- dan cache hit tidak bergantung ekstensi pgvector.
-- Tanpa secrets: hanya teks respons yang sudah diredaksi yang disimpan.
CREATE TABLE IF NOT EXISTS public.ai_semantic_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  model_name text NOT NULL,
  prompt_hash text NOT NULL,
  prompt_prefix text NOT NULL,
  response_text text NOT NULL,
  hits integer NOT NULL DEFAULT 0,
  expires_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT ai_semantic_cache_model_name_shape CHECK (char_length(model_name) BETWEEN 1 AND 200),
  CONSTRAINT ai_semantic_cache_prompt_hash_shape CHECK (prompt_hash ~ '^[0-9a-f]{64}$'),
  CONSTRAINT ai_semantic_cache_prompt_prefix_shape CHECK (char_length(prompt_prefix) BETWEEN 1 AND 300),
  CONSTRAINT ai_semantic_cache_response_shape CHECK (char_length(response_text) BETWEEN 1 AND 8000),
  CONSTRAINT ai_semantic_cache_hits_nonnegative CHECK (hits >= 0)
);--> statement-breakpoint
DO $ai_semantic_cache_unique$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ai_semantic_cache_org_model_hash_unique') THEN
    ALTER TABLE public.ai_semantic_cache
      ADD CONSTRAINT ai_semantic_cache_org_model_hash_unique UNIQUE NULLS NOT DISTINCT (organization_id, model_name, prompt_hash);
  END IF;
END
$ai_semantic_cache_unique$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS ai_semantic_cache_expires_idx ON public.ai_semantic_cache (expires_at);--> statement-breakpoint
ALTER TABLE public.ai_semantic_cache ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE public.ai_semantic_cache FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS runtime_accessor ON public.ai_semantic_cache;--> statement-breakpoint
CREATE POLICY runtime_accessor ON public.ai_semantic_cache FOR ALL TO indicate_runtime USING (true) WITH CHECK (true);--> statement-breakpoint
REVOKE ALL ON public.ai_semantic_cache FROM PUBLIC;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_semantic_cache TO indicate_runtime;--> statement-breakpoint
