-- Covering index untuk FK invoices.created_by -> users.id (temuan unindexed_foreign_keys).
-- Mempercepat join ke users serta SET NULL saat user dihapus.
CREATE INDEX IF NOT EXISTS invoices_created_by_idx ON public.invoices USING btree (created_by);--> statement-breakpoint
