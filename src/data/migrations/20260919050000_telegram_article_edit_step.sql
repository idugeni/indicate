-- Langkah article_edit dan article_edit_confirm untuk ubah artikel via tombol Telegram.
-- Idempoten. Checksum di bawah adalah sha256 heks dari isi berkas ini
-- sebelum baris INSERT.
ALTER TYPE "public"."telegram_conversation_step" ADD VALUE IF NOT EXISTS 'article_edit';--> statement-breakpoint
ALTER TYPE "public"."telegram_conversation_step" ADD VALUE IF NOT EXISTS 'article_edit_confirm';--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (134, 'telegram_article_edit_step', 'sha256:21697c7a60a4a1575b88b493ae1f5d998001f0e415eca77901a49ff0138ff0d7');
