-- F3-DB: hapus konten fiktif + seed tier paket resmi.
--
-- 1. Testimoni dan etalase media berisi nama orang/media rekaan yang tayang
--    sebagai konten nyata — dihapus total (tabel dibiarkan kosong; section
--    otomatis sembunyi). FAQ dan kanal kontak adalah konten generik yang sah.
-- 2. Seed service_tiers cermin tabel packages (satu kebenaran harga):
--    Starter 99rb, Growth 249rb, Pro 399rb, Enterprise 550rb.

DELETE FROM public.testimonials WHERE id IN (
  '00000000-0000-4000-8000-000000007001',
  '00000000-0000-4000-8000-000000007002'
);--> statement-breakpoint
DELETE FROM public.media_showcase WHERE id IN (
  '00000000-0000-4000-8000-000000007021',
  '00000000-0000-4000-8000-000000007022',
  '00000000-0000-4000-8000-000000007023',
  '00000000-0000-4000-8000-000000007024',
  '00000000-0000-4000-8000-000000007025',
  '00000000-0000-4000-8000-000000007026',
  '00000000-0000-4000-8000-000000007027',
  '00000000-0000-4000-8000-000000007028'
);--> statement-breakpoint
INSERT INTO public.service_tiers (slug, name, target, summary, price, period, features, highlighted, cta, sort_order, active) VALUES
  ('starter', 'Starter', 'Solo — hingga 5 domain & situs', 'Untuk satu redaksi yang baru mulai.', 'Rp99.000', '/bulan', '["5 domain & 5 situs", "Solo — 1 anggota", "1 API key", "Antrean penerbitan + media privat"]', false, 'Bayar & Aktifkan', 1, true),
  ('growth', 'Growth', 'Solo — hingga 20 domain & situs', 'Untuk jaringan portal daerah yang tumbuh.', 'Rp249.000', '/bulan', '["20 domain & 20 situs", "Solo — 1 anggota", "3 API key", "REST API dan bot Telegram"]', false, 'Bayar & Aktifkan', 2, true),
  ('pro', 'Pro', 'Tim kecil — hingga 50 domain & situs', 'Untuk redaksi bertim dengan banyak kanal.', 'Rp399.000', '/bulan', '["50 domain & 50 situs", "3 anggota tim", "10 API key", "Prioritas purge cache Cloudflare"]', true, 'Bayar & Aktifkan', 3, true),
  ('enterprise', 'Enterprise', 'Tim — hingga 100 domain & situs', 'Onboarding terjadwal setelah peninjauan kebutuhan.', 'Rp550.000', '/bulan', '["100 domain & 100 situs", "10 anggota tim", "30 API key", "Dukungan migrasi data massal"]', false, 'Hubungi via WhatsApp', 4, true)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name, target = EXCLUDED.target, summary = EXCLUDED.summary,
  price = EXCLUDED.price, period = EXCLUDED.period, features = EXCLUDED.features,
  highlighted = EXCLUDED.highlighted, cta = EXCLUDED.cta, sort_order = EXCLUDED.sort_order,
  active = EXCLUDED.active, updated_at = now();--> statement-breakpoint

INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (48, 'billing_real_tiers_cleanup', 'sha256:7ba04bb79e2daedc1d3ae858e597b46b778dc11cceee3a10ded88e1b7fc15406');
