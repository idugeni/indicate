-- Kunci search_path helper label atribusi (temuan advisor
-- function_search_path_mutable): mengikuti konvensi repo
-- (pg_catalog, public, indicate_private).
-- Idempoten. Checksum di bawah adalah sha256 heks dari isi berkas ini
-- sebelum baris INSERT.
ALTER FUNCTION indicate_private.short_attribution_label(text) SET search_path = pg_catalog, public, indicate_private;--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (128, 'function_search_path', 'sha256:2d61210529f201fbcafb264b2a34654f215505b7884a0cb839d62202eb562844');
