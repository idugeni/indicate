-- Covering index untuk FK site_settings.template_id.
--
-- Menutup temuan advisor `unindexed_foreign_keys` dari migrasi
-- `site_settings_template_fk`: hapus/ubah baris `template_presets` tidak
-- lagi memindai penuh `site_settings`.
CREATE INDEX site_settings_template_id_idx ON public.site_settings USING btree (template_id);--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (139, 'site_settings_template_fk_idx', 'sha256:5ce19ae165d62eaa17b8afa2f7959e623d583a8e36db498026e3ac09509a3b8c');
