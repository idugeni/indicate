-- F2-DB: tangga paket berpatokan Pro 100 domain @ Rp550rb.
--
-- starter: 5 -> 10 domain @ Rp149rb; growth: 20 -> 50 domain @ Rp299rb.
-- Nilai per domain menurun ke atas (14,9rb -> 6rb -> 5,5rb) sehingga Pro
-- selalu paling worth it. Enterprise custom tidak berubah.

UPDATE public.plan_quotas SET max_domains = 10, max_sites = 10 WHERE plan = 'starter';--> statement-breakpoint
UPDATE public.plan_quotas SET max_domains = 50, max_sites = 50 WHERE plan = 'growth';--> statement-breakpoint
UPDATE public.packages SET price_idr = 149000, max_domains = 10, max_sites = 10, updated_at = now() WHERE plan = 'starter';--> statement-breakpoint
UPDATE public.packages SET price_idr = 299000, max_domains = 50, max_sites = 50, updated_at = now() WHERE plan = 'growth';--> statement-breakpoint
UPDATE public.service_tiers SET price = 'Rp149.000', target = 'Punya 10 portal berita sendiri mulai hari ini', features = '["10 website berita siap tayang", "Desain cantik tinggal pilih", "Domain, hosting, dan keamanan kami yang urus", "Bantuan ramah lewat email"]', updated_at = now() WHERE slug = 'starter';--> statement-breakpoint
UPDATE public.service_tiers SET price = 'Rp299.000', target = 'Satu redaksi untuk 50 portal daerah', features = '["50 website berita siap tayang", "Terbit sekali, tayang di mana-mana", "Kelola dari HP, kerja dari mana saja", "Bantuan prioritas yang cepat tanggap"]', updated_at = now() WHERE slug = 'growth';--> statement-breakpoint

INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (56, 'billing_tier_ladder', 'sha256:2b383ecff5460252d7e8d2e8ef3d7bd40703884dc0c');
