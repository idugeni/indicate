INSERT INTO public.template_presets (id, name, description, category) VALUES
  ('clean-blue', 'Clean Blue Editorial', 'Layout editorial terang: ticker terkini, hero 2-kolom, kartu pilihan, dan panel newsletter.', 'news')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, category = EXCLUDED.category, updated_at = now();--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (107, 'template_preset_clean_blue', 'sha256:73e40efa094ed2089c84460be27ffd955b8f0430f4ff7a3c31ed26de9d821149');
