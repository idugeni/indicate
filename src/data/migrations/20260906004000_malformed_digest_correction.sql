-- Koreksi literal digest malformed (bukan 64-hex) pada dua file.
--
-- `billing_packages_plan_unique` (67 chars, suffix "059") dan
-- `billing_tier_ladder` (43 chars, terpotong) memiliki literal yang bukan
-- SHA-256 valid; digest sejati dari bytes file adalah 64-char prefix yang
-- kini tertulis di file. Yang diperbarui hanyalah sel checksum riwayat —
-- tanpa perubahan objek skema apa pun.
-- Body digest (reproducible): LF-normalize this file, substitute the 64-hex
-- checksum literal below with 64 zeros, SHA-256 the complete UTF-8 bytes.

UPDATE public.indicate_schema_migrations SET checksum = 'sha256:d0deed2abb01bd3527ddd9643a238cdbce7bdeae792b56863a3b9214efb1c44d' WHERE version = 53 AND name = 'billing_packages_plan_unique';--> statement-breakpoint
UPDATE public.indicate_schema_migrations SET checksum = 'sha256:2b383ecff5460252d7e8d2e8ef3d7cf7530c933157c75ef3d7bd40703884dc0c' WHERE version = 56 AND name = 'billing_tier_ladder';--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (73, 'malformed_digest_correction', 'sha256:82951df8af4bba4c063daedf099d7d972e3a8c33c2c99c14f26b721ccb7ab954');
