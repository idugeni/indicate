-- Langkah article_edit dan article_edit_confirm untuk ubah artikel via tombol Telegram.
-- Idempoten. Checksum di bawah adalah sha256 heks dari isi berkas ini
-- sebelum baris INSERT.
ALTER TYPE "public"."telegram_conversation_step" ADD VALUE IF NOT EXISTS 'article_edit';--> statement-breakpoint
ALTER TYPE "public"."telegram_conversation_step" ADD VALUE IF NOT EXISTS 'article_edit_confirm';--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (134, 'telegram_article_edit_step', 'sha256:e120edbbbe7cef9a935f491d0d9eb8cc5fa981a92720a53221c25bff4c60f35e');
