-- Hardening document_embeddings tanpa recreate (tabel milik 20260930050000).
--
-- Tabel ini menampung potongan artikel per tenant untuk pencarian arsip dasbor AI
-- (`chunk` ILIKE sebagai fallback sampai transport embedding tiba). Cakupan tenant
-- ditegakkan di lapisan aplikasi (setiap query memfilter `organization_id`, sejajar
-- dengan pola kredensial di `20260930030000_ai_control_plane.sql`); RLS di sini
-- mengikuti pola control plane internal: deny default, satu-satunya akses runtime
-- lewat policy `runtime_accessor` untuk `indicate_runtime`. Indeks kedua melayani
-- pola baca arsip (`organization_id` + `created_at DESC`); check panjang chunk
-- dijaga idempoten via DO block karena 050000 sudah mendefinisikannya.
ALTER TABLE public.document_embeddings ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE public.document_embeddings FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS runtime_accessor ON public.document_embeddings;--> statement-breakpoint
CREATE POLICY runtime_accessor ON public.document_embeddings FOR ALL TO indicate_runtime USING (true) WITH CHECK (true);--> statement-breakpoint
REVOKE ALL ON public.document_embeddings FROM PUBLIC;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON public.document_embeddings TO indicate_runtime;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS document_embeddings_org_created_idx ON public.document_embeddings (organization_id, created_at DESC);--> statement-breakpoint
DO $document_embeddings_chunk_check$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'document_embeddings_chunk_nonempty') THEN
    ALTER TABLE public.document_embeddings
      ADD CONSTRAINT document_embeddings_chunk_nonempty CHECK (char_length(chunk) BETWEEN 1 AND 2000);
  END IF;
END
$document_embeddings_chunk_check$;--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (226, 'document_embeddings_hardening', 'sha256:fb7999a1eabeb3399800294bd7b138f1a1a17ece167c617e424942627600375a');
