-- Postur biaya routing AI: throughput (tercepat dulu, perilaku lama) atau price (termurah dulu).
--
-- Kolom dipakai adapter OpenAI-compatible untuk memilih `provider.sort`
-- OpenRouter per request; tanpa baris policy atau nilai tak dikenal,
-- pembaca memakai 'throughput'. Default menjaga perilaku existing.
--
-- Body digest (reproducible): LF-normalize this file, substitute the 64-hex
-- checksum literal below with 64 zeros, SHA-256 the complete UTF-8 bytes.
ALTER TABLE public.ai_routing_policies
  ADD COLUMN IF NOT EXISTS cost_mode text NOT NULL DEFAULT 'throughput';--> statement-breakpoint
DO $cost_mode_check$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ai_routing_policies_cost_known') THEN
    ALTER TABLE public.ai_routing_policies
      ADD CONSTRAINT ai_routing_policies_cost_known CHECK (cost_mode IN ('throughput', 'price'));
  END IF;
END
$cost_mode_check$;--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (264, 'ai_routing_cost_mode', 'sha256:43b344f1bc9675428c431a253b921ae6eefc7bef3fd4bb029bdff6c49d0fe2a3');
