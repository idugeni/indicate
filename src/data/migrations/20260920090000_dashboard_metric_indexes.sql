-- Indeks komposit untuk hitungan metrik dashboard (dashboardCounts) dan agregasi analitik.
--
-- Menutup pemindaian berurutan pada filter (organization_id, state/status):
-- publishing_jobs.state, article_sites.state, sites.status. Tanpa perubahan perilaku;
-- hanya mempercepat count(*) dan GROUP BY per organisasi.
-- Body digest (reproducible): LF-normalize this file, substitute the 64-hex
-- checksum literal below with 64 zeros, SHA-256 the complete UTF-8 bytes.

CREATE INDEX IF NOT EXISTS publishing_jobs_organization_state_idx ON public.publishing_jobs USING btree (organization_id, state);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS article_sites_organization_state_idx ON public.article_sites USING btree (organization_id, state);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS sites_organization_status_idx ON public.sites USING btree (organization_id, status);--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (142, 'dashboard_metric_indexes', 'sha256:9d0b7442a791cfd15ce4b0152231c4fdfd3284b58ae47369839c3daca4835b3d');
