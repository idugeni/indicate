-- Mengaktifkan fallback satu provider yang diniatkan v230.
--
-- v230 memindahkan default ke gemini-3.8-flash "dengan fallback
-- gemini-3.6-flash", tetapi fallback_provider_id dibiarkan NULL sehingga
-- rantai failover tidak pernah terbentuk: setiap 503 model utama langsung
-- menjadi DEPENDENCY_UNAVAILABLE. Baris ini mengikat fallback ke provider
-- primary agar panel menampilkan rantai eksplisit; kode membaca NULL
-- sebagai primary sehingga perilaku tetap sama tanpa migrasi ini. Guard
-- IS NULL menjaga baris yang operator ubah lewat panel setelah v230.
--
-- Body digest (reproducible): LF-normalize this file, substitute the 64-hex
-- checksum literal below with 64 zeros, SHA-256 the complete UTF-8 bytes.
UPDATE public.ai_routing_policies SET fallback_provider_id = 'gemini', updated_at = now()
  WHERE id = 'default' AND fallback_provider_id IS NULL;--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (239, 'ai_routing_fallback_wire', 'sha256:9d046ce50cc38913ea88b6d24c7ae017702af42cc875c8f836e8b180e5284f4c');
