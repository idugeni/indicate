-- Covering index untuk FK invoices.created_by -> users.id (temuan unindexed_foreign_keys).
-- Mempercepat join ke users serta SET NULL saat user dihapus.
CREATE INDEX IF NOT EXISTS invoices_created_by_idx ON public.invoices USING btree (created_by);--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (111, 'invoices_created_by_covering_index', 'sha256:3ed1aa3686f7d423ce1bff07544b1bea7d0dc19787d599a08b107dbdbcf1226c');
