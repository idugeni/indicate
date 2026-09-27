-- Kunci templateId site_settings ke katalog template_presets.
--
-- Kolom generated `template_id` menurunkan `colors->>'templateId'` lalu
-- mengikatnya sebagai FK ke `template_presets(id)`: id tak dikenal ditolak
-- saat tulis, bukan lagi jatuh diam-diam ke satu template. NULL tetap lolos
-- FK; baris tanpa template gagal keras saat render (`normalizeTemplateId`
-- melempar) alih-alih tampil sebagai template yang salah. Baris existing
-- sudah sinkron (dua puluh site memakai sepuluh id terdaftar).
ALTER TABLE public.site_settings ADD COLUMN template_id text GENERATED ALWAYS AS ((colors ->> 'templateId')) STORED;--> statement-breakpoint
ALTER TABLE public.site_settings ADD CONSTRAINT site_settings_template_id_fk FOREIGN KEY (template_id) REFERENCES public.template_presets(id);--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (138, 'site_settings_template_fk', 'sha256:3b38a50e8a2d2a32c72ae182f6c0249902b7e53b44ef261d5238ddd3d48712a3');
