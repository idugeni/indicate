-- Covering index untuk FK site_settings.template_id.
--
-- Menutup temuan advisor `unindexed_foreign_keys` dari migrasi
-- `site_settings_template_fk`: hapus/ubah baris `template_presets` tidak
-- lagi memindai penuh `site_settings`.
CREATE INDEX site_settings_template_id_idx ON public.site_settings USING btree (template_id);--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (139, 'site_settings_template_fk_idx', 'sha256:ec1a9fc579d803cbe8de9d965c27154b807ac4fea84af531ef96b5d9b81a547c');
