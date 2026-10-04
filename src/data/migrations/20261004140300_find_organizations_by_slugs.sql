-- Resolusi id org massal untuk dasbor steward.
--
-- Daftar editorial memuat puluhan penerbit cermin; memetakan tiap nama ke
-- org pemilik satu per satu berarti puluhan round trip per muat dasbor.
-- Fungsi ini melakukan hal yang sama dengan `find_organization_by_slug`
-- untuk sekumpulan slug sekaligus: hanya id/slug aktif, tanpa PII.
-- Checksum di bawah adalah sha256 heks dari isi berkas ini sebelum baris INSERT.
CREATE OR REPLACE FUNCTION indicate_private.find_organizations_by_slugs(
  requested_slugs text[]
)
RETURNS TABLE(id uuid, slug text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, indicate_private
AS $$
  SELECT target.id, target.slug
  FROM public.organizations AS target
  WHERE target.slug = ANY (requested_slugs)
    AND target.status = 'active'
$$;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.find_organizations_by_slugs(text[]) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.find_organizations_by_slugs(text[]) TO indicate_runtime;--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (260, 'find_organizations_by_slugs', 'sha256:f0fa4bf869605a7ae00eddd56a93f2feda14c51edfbe180b6eddf27737cbc2d5');
