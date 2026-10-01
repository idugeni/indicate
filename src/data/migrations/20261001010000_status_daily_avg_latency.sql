-- Riwayat latensi harian untuk sparkline halaman status.
--
-- Kolom nullable: hari lama tetap NULL (tanpa backfill khayalan), penulis
-- agregat harian mengisinya mulai apply ini. Tanpa indeks baru dan tanpa
-- backfill massal; satu ALTER ringan yang tidak mengunci baca.
--
-- Body digest (reproducible): LF-normalize this file, substitute the 64-hex
-- checksum literal below with 64 zeros, SHA-256 the complete UTF-8 bytes.
ALTER TABLE public.status_daily ADD COLUMN IF NOT EXISTS avg_latency_ms integer;--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (238, 'status_daily_avg_latency', 'sha256:0f2abf06b09f08b178052e05f295c3bf24ffe147a31af871918ebee1c3083d93');
