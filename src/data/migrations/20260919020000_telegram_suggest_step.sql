-- Langkah suggest_sites untuk alur saran varian Telegram (tombol 💡 + /suggest).
-- Idempoten. Checksum di bawah adalah sha256 heks dari isi berkas ini
-- sebelum baris INSERT.
ALTER TYPE "public"."telegram_conversation_step" ADD VALUE IF NOT EXISTS 'suggest_sites';--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (131, 'telegram_suggest_step', 'sha256:3ecf7b5f24876b5bd5b2524f8ae9fbf7b7036759be6ef9a4539d2c757868ae53');
