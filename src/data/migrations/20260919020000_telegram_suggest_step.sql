-- Langkah suggest_sites untuk alur saran varian Telegram (tombol 💡 + /suggest).
-- Idempoten. Checksum di bawah adalah sha256 heks dari isi berkas ini
-- sebelum baris INSERT.
ALTER TYPE "public"."telegram_conversation_step" ADD VALUE IF NOT EXISTS 'suggest_sites';--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (131, 'telegram_suggest_step', 'sha256:15d16f8a5665dbfee39206939f0b06aa1364c448113c0ad07456bf0f914f9551');
