-- Tambah langkah publish_pick_site untuk alur Telegram tanpa ketik ID (tombol portal).
-- Idempoten. Checksum di bawah adalah sha256 heks dari isi berkas ini
-- sebelum baris INSERT.
ALTER TYPE "public"."telegram_conversation_step" ADD VALUE IF NOT EXISTS 'publish_pick_site';--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (129, 'telegram_publish_pick_site', 'sha256:b3c9dcbb60ef2f4a32180d2ada330294ff70a570fea01342020e6b2e41898fbd');
