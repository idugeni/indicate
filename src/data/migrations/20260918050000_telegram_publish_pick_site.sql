-- Tambah langkah publish_pick_site untuk alur Telegram tanpa ketik ID (tombol portal).
-- Idempoten. Checksum di bawah adalah sha256 heks dari isi berkas ini
-- sebelum baris INSERT.
ALTER TYPE "public"."telegram_conversation_step" ADD VALUE IF NOT EXISTS 'publish_pick_site';--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (129, 'telegram_publish_pick_site', 'sha256:9ed140e6997f32fc27d0fc2828e10bd8e466213ea8d6a0fe75367970a8dcf99b');
