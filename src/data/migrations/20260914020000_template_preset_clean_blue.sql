INSERT INTO public.template_presets (id, name, description, category) VALUES
  ('clean-blue', 'Clean Blue Editorial', 'Layout editorial terang: ticker terkini, hero 2-kolom, kartu pilihan, dan panel newsletter.', 'news')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, category = EXCLUDED.category, updated_at = now();--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (107, 'template_preset_clean_blue', 'sha256:2ddd4a09cffb87d60f2886d80bf124b5d1d23a56ac148c8da18c451a3e91e5cf');
