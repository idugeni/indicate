-- Strategi rantai model: fallback (urutan tetap) vs round_robin (titik awal diputar).
--
-- rotation_strategy yang ada mengatur pemilihan kredensial di dalam satu
-- provider; chain_strategy mengatur urutan entri model primary → fallback
-- antar request. fallback mencoba sesuai urutan dan pindah ke entri
-- berikutnya saat gagal; round_robin memutar entri awal tiap request lewat
-- cursor Redis (fail-open ke urutan fallback) agar beban tersebar, dengan
-- failover ke entri berikutnya tetap berlaku. Rantai satu entri (tanpa
-- fallback) tidak terpengaruh strategi mana pun.
--
-- Body digest (reproducible): LF-normalize this file, substitute the 64-hex
-- checksum literal below with 64 zeros, SHA-256 the complete UTF-8 bytes.
ALTER TABLE public.ai_routing_policies
  ADD COLUMN IF NOT EXISTS chain_strategy text NOT NULL DEFAULT 'fallback';--> statement-breakpoint
DO $chain_check$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ai_routing_policies_chain_known') THEN
    ALTER TABLE public.ai_routing_policies
      ADD CONSTRAINT ai_routing_policies_chain_known CHECK (chain_strategy IN ('fallback', 'round_robin'));
  END IF;
END
$chain_check$;--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (248, 'ai_chain_strategy', 'sha256:b1491bc661e9190e3f95b3a8a2a219667ca5baa8ee5bb5a5f05bc0e845df2967');
