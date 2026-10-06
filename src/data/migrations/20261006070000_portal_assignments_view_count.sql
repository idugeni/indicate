-- Tayangan awal portal bridge agar tidak nol.
--
-- `portal_assignments` (bridge lintas-org, v258) tidak punya kolom tayangan,
-- sehingga delivery meng-hardcode `viewCount: 0` untuk semua artikel bridge
-- (2 artikel Rutan Wonosobo terbaru: 134 portal x 0). Jalur satu-org sudah
-- seeding 1.000-12.000 via `seedInitialViewCount` di `transitionTarget`,
-- tapi jalur bridge (`insertPublishedBridge`) tidak pernah mengisi apa pun
-- dan form pembuatan (`use-article-form-state`) membuang `initialViews`
-- saat menempuh `article.bridge.request`.
--
-- Perubahan: tambah `view_count` (default 0, check >= 0) + backfill
-- satu kali untuk baris published yang masih nol memakai distribusi tier
-- yang sama (70% 1.000-4.000, 25% 4.001-8.000, 5% 8.001-12.000).
-- Penulisan berikutnya dilakukan aplikasi (`insertPublishedBridge`), bukan
-- trigger, agar angka eksplisit dari form tetap menang atas acak.
--
-- Body digest (reproducible): LF-normalize this file, substitute the 64-hex
-- checksum literal below with 64 zeros, SHA-256 the complete UTF-8 bytes.
ALTER TABLE public.portal_assignments
  ADD COLUMN IF NOT EXISTS view_count integer NOT NULL DEFAULT 0 CONSTRAINT portal_assignments_view_count_nonnegative CHECK (view_count >= 0);--> statement-breakpoint
UPDATE public.portal_assignments
SET view_count = CASE
  WHEN random() < 0.70 THEN 1000 + floor(random() * 3001)::int
  WHEN random() < 0.9473684210526315 THEN 4001 + floor(random() * 4000)::int
  ELSE 8001 + floor(random() * 4000)::int
END
WHERE state = 'published' AND view_count = 0;--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (272, 'portal_assignments_view_count', 'sha256:3957a1c105082b3ef273c973afcb3f2662225cd62c74ae17102ed7133559c7b9');
