-- F3-DB: kolom active untuk service_tiers.
--
-- Tabel konten lain (testimonials, faqs, media_showcase) sudah punya kolom
-- active; service_tiers tertinggal sehingga tier hanya bisa dihapus fisik.
-- Default true agar seed lama tetap tayang; bacaan publik memfilter active.

ALTER TABLE public.service_tiers ADD COLUMN IF NOT EXISTS "active" boolean DEFAULT true NOT NULL;--> statement-breakpoint

INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (47, 'billing_service_tiers_active', 'sha256:54615ffa36e6ae636759cbd536b6612a23e505a4d7c76fb4256cfba23e17756c');
