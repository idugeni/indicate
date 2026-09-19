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
VALUES (138, 'site_settings_template_fk', 'sha256:5b2b4e03b95947db149393017f60c5630d008a9aacebe474fcf309c888b281b0');
