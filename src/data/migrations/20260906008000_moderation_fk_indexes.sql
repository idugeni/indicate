-- Tindak lanjut advisor: indeks penutup untuk FK moderasi (unindexed_foreign_keys).
--
-- Tanpa perubahan perilaku; mempercepat pemeriksaan FK dan-latensi daftar.
-- Body digest (reproducible): LF-normalize this file, substitute the 64-hex
-- checksum literal below with 64 zeros, SHA-256 the complete UTF-8 bytes.

CREATE INDEX IF NOT EXISTS content_reports_org_site_idx ON public.content_reports USING btree (organization_id, site_id);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS content_reports_org_article_idx ON public.content_reports USING btree (organization_id, article_id);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS privacy_requests_requester_idx ON public.privacy_requests USING btree (requester_user_id);--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (77, 'moderation_fk_indexes', 'sha256:f8799c2d1ad497273583a39f9c8805efe10623a6d9cb55a253efb8780e7d91b9');
