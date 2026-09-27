-- F90: covering index untuk FK baru (advisor unindexed_foreign_keys).
-- org_erasure_requests.organization_id dan telegram_outbox.organization_id
-- tidak tercakup index (hanya due_idx yang kolom pertamanya status).
-- Checksum di bawah adalah sha256 heks dari isi berkas ini sebelum baris INSERT.
CREATE INDEX IF NOT EXISTS org_erasure_requests_organization_idx ON public.org_erasure_requests USING btree (organization_id);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS telegram_outbox_organization_idx ON public.telegram_outbox USING btree (organization_id);--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (90, 'ops_fk_covering_indexes', 'sha256:48163e00653ecc84984b636052ba6e281be4819503186c1f7223b8baa416cfb3');
