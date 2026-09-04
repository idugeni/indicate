-- F3-DB: checksum sha256 asli untuk migrasi v42-v51.
--
-- Kolom checksum memakai algoritma yang didokumentasikan migrasi
-- 20260903010500_migration_body_digests: normalisasi CRLF ke LF, ganti
-- literal checksum pada baris registrasi-diri dengan sentinel
-- sha256:0000000000000000000000000000000000000000000000000000000000000000,
-- lalu SHA-256 atas seluruh file UTF-8. Siapa pun bisa memverifikasi ulang
-- dengan satu perintah. Label '-v1' bukan checksum dan tidak dipakai lagi.

UPDATE public.indicate_schema_migrations SET checksum = 'sha256:b64b1190545cc4e03ef08cedf935312a070df9caaa5cbd40f92a4e4764784e92' WHERE version = 42;--> statement-breakpoint
UPDATE public.indicate_schema_migrations SET checksum = 'sha256:919acef65aada477471ff27155d13c3e455028c50bdd429661f18483d6e4e33f' WHERE version = 43;--> statement-breakpoint
UPDATE public.indicate_schema_migrations SET checksum = 'sha256:6c4febf5f09e1780c26c03a3334217e7c5f41d95541a6d8b9f6342e62b0376e2' WHERE version = 44;--> statement-breakpoint
UPDATE public.indicate_schema_migrations SET checksum = 'sha256:0fc95f920d1dd57d9e38f71044490497542fc01323c641762f3c87bf0597e8e1' WHERE version = 45;--> statement-breakpoint
UPDATE public.indicate_schema_migrations SET checksum = 'sha256:f0717e92e585c501992a871a0e8b1b88c12f121675388f6531c6f3c7ddfc14f7' WHERE version = 46;--> statement-breakpoint
UPDATE public.indicate_schema_migrations SET checksum = 'sha256:54615ffa36e6ae636759cbd536b6612a23e505a4d7c76fb4256cfba23e17756c' WHERE version = 47;--> statement-breakpoint
UPDATE public.indicate_schema_migrations SET checksum = 'sha256:7ba04bb79e2daedc1d3ae858e597b46b778dc11cceee3a10ded88e1b7fc15406' WHERE version = 48;--> statement-breakpoint
UPDATE public.indicate_schema_migrations SET checksum = 'sha256:7842175ae1c49ecac59af3ca022583d40fbe99747c439ef44b5f3751cac524b7' WHERE version = 49;--> statement-breakpoint
UPDATE public.indicate_schema_migrations SET checksum = 'sha256:03cae1232fe49299bc566bb4a749187df51b06ae221fb384a736a41b1c1625c8' WHERE version = 50;--> statement-breakpoint
UPDATE public.indicate_schema_migrations SET checksum = 'sha256:bcabfe159c0a78ab0ae5b9b3fde8c2ffd55faa1840f761bb8b7c03e461bbbe30' WHERE version = 51;--> statement-breakpoint

INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (52, 'billing_real_checksums', 'sha256:fefdf3bf26bf9c7fa8de15cdf77c4033a33a7d6e3fb50b3f6ccfafa8c891d059');
