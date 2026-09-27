-- Single-template consolidation: seluruh domain memakai Clean Blue Editorial.
-- 1) Pastikan baris clean-blue ada, 2) sinkronkan site_settings.colors ke
-- {"templateId":"clean-blue"} (buang presetId/warna warisan), 3) hapus
-- template lama, 4) drop tabel color_presets beserta policy/grants-nya.

INSERT INTO public.template_presets (id, name, description, category) VALUES
  ('clean-blue', 'Clean Blue Editorial', 'Layout editorial terang: ticker terkini, hero 2-kolom, kartu pilihan, dan panel newsletter.', 'news')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, category = EXCLUDED.category, updated_at = now();--> statement-breakpoint
UPDATE public.site_settings SET colors = ((colors - 'presetId' - 'primary' - 'accent' - 'headerBg') || '{"templateId": "clean-blue"}'::jsonb), updated_at = now();--> statement-breakpoint
DELETE FROM public.template_presets WHERE id <> 'clean-blue';--> statement-breakpoint
DROP TABLE IF EXISTS public.color_presets;--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (109, 'single_template_clean_blue', 'sha256:98c8a18f830ca37e646deb67553d8b3fa7abe15a71c0da916f4ca026e1895138');
