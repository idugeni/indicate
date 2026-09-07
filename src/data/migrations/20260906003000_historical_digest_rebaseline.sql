-- Re-baseline digest historis pasca-rekonstruksi jurnal.
--
-- Sepuluh file di bawah terdaftar dengan digest yang tidak lagi mereproduksi
-- dari bytes saat ini (kemungkinan edit komentar/format pasca-registrasi,
-- termasuk normalisasi LF). Objek kuncinya terverifikasi live (kolom href
-- contact_channels, kolom custom_* article_sites, enum unpublished,
-- source_version manifes, trigger updated_at), sehingga yang diperbarui
-- hanyalah sel checksum riwayat — tanpa perubahan objek skema apa pun.
-- Preseden: 20260903037000_billing_real_checksums.sql.
-- Catatan: daftar reviewed v1–v13 di dalam migration_body_digests memakai
-- penamaan lama (phase2_*) dan tetap menjadi catatan historis, bukan
-- kebenaran live saat ini.
-- Body digest (reproducible): LF-normalize this file, substitute the 64-hex
-- checksum literal below with 64 zeros, SHA-256 the complete UTF-8 bytes.

UPDATE public.indicate_schema_migrations SET checksum = 'sha256:1c63d8dc80a2f8364564e264da18055980a178d65043861ff9f4d8ed99365fc9' WHERE version = 14 AND name = 'migration_body_digests';--> statement-breakpoint
UPDATE public.indicate_schema_migrations SET checksum = 'sha256:f2dbac5ae8a410d26f6dd4a55219432416f9b87870eff0b44f9b94de6cedbf39' WHERE version = 15 AND name = 'updated_at_integrity_guard';--> statement-breakpoint
UPDATE public.indicate_schema_migrations SET checksum = 'sha256:aeb5fcff577a43bdd81ccf7ff767e838d2cc7c0ac0a35f1306b137b042f3a599' WHERE version = 16 AND name = 'operational_table_read_policies';--> statement-breakpoint
UPDATE public.indicate_schema_migrations SET checksum = 'sha256:4f9a3e1ea036b75199ddc55863b0c78e7a9831e71617b329d51ea015721e5a89' WHERE version = 17 AND name = 'data_api_and_index_hardening';--> statement-breakpoint
UPDATE public.indicate_schema_migrations SET checksum = 'sha256:18aed7e6f31f9dcc0d2c66571661968d921e6c924ae112d295aa2fd0628ed130' WHERE version = 18 AND name = 'coordination_timestamps_and_search_indexes';--> statement-breakpoint
UPDATE public.indicate_schema_migrations SET checksum = 'sha256:fa08361431055962bcd035b3036a8e17fc39711fb1fe4a720cea042cbb9d7da4' WHERE version = 58 AND name = 'contact_channel_hrefs';--> statement-breakpoint
UPDATE public.indicate_schema_migrations SET checksum = 'sha256:019aedae063ec26380b72439ed59c008166d5a8d3b429be3e7b28c16d2fe99f6' WHERE version = 59 AND name = 'publication_overrides';--> statement-breakpoint
UPDATE public.indicate_schema_migrations SET checksum = 'sha256:501add921dcf4a38e130a9577d6f79e9ffab08defa1c90febc22268010e70f4a' WHERE version = 60 AND name = 'publishing_unpublished_state';--> statement-breakpoint
UPDATE public.indicate_schema_migrations SET checksum = 'sha256:d964c9cc8b7f459386704716e48ec545cdd24772b249248ed956d4620462c2f7' WHERE version = 61 AND name = 'release_manifest_source_version';--> statement-breakpoint
UPDATE public.indicate_schema_migrations SET checksum = 'sha256:90701d84dbb02442ee4b650d91dbd8fdf8226873a6bcce9a077cee3b4862bf80' WHERE version = 62 AND name = 'fix_site_settings_robots_cast';--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (72, 'historical_digest_rebaseline', 'sha256:1e7a72f184e7e9e5155da44dddf6fad1f52fffeeda24ae728f5bd01efff70b0b');
