-- Kunci search_path helper label atribusi (temuan advisor
-- function_search_path_mutable): mengikuti konvensi repo
-- (pg_catalog, public, indicate_private).
-- Idempoten. Checksum di bawah adalah sha256 heks dari isi berkas ini
-- sebelum baris INSERT.
ALTER FUNCTION indicate_private.short_attribution_label(text) SET search_path = pg_catalog, public, indicate_private;--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (128, 'function_search_path', 'sha256:6e2ce89c95f589b7255cf36e2861580c39ada0b8f63a851496da32fc3964906d');
