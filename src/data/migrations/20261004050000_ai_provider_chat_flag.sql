-- Kemampuan chat per provider: hanya provider chat yang boleh jadi primer/fallback.
--
-- `workers-ai` hanya jalur embedding (tanpa adapter chat), sehingga rantai
-- yang menunjuknya tidak pernah bisa menjawab. Flag ini dibaca validasi
-- kebijakan dan direktori panel; default true agar seed lama (gemini,
-- vercel-gateway, openrouter) tetap chat-capable tanpa backfill.
--
-- Body digest (reproducible): LF-normalize this file, substitute the 64-hex
-- checksum literal below with 64 zeros, SHA-256 the complete UTF-8 bytes.
ALTER TABLE public.ai_providers
  ADD COLUMN IF NOT EXISTS supports_chat boolean NOT NULL DEFAULT true;--> statement-breakpoint
UPDATE public.ai_providers SET supports_chat = false WHERE id = 'workers-ai';--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (250, 'ai_provider_chat_flag', 'sha256:1fa6c75394a16fe2fdd688bea10b9e635682ed7628d1a926104290901839be71');
