-- Covering index untuk FK invoices.created_by -> users.id (temuan unindexed_foreign_keys).
-- Mempercepat join ke users serta SET NULL saat user dihapus.
CREATE INDEX IF NOT EXISTS invoices_created_by_idx ON public.invoices USING btree (created_by);--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (111, 'invoices_created_by_covering_index', 'sha256:49660d2c16c090179637f6d66154f6716b27d5414377e0fd40801d4a76e259b0');
