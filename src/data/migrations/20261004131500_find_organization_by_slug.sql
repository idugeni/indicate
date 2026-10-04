-- Pencarian org tujuan lintas-org untuk kreasi "atas nama org".
--
-- Jalur kreasi admin menulis artikel ke org UPT dari dasbor operator. Kode
-- service harus memetakan nama penerbit cermin (mis. RUTAN KELAS II B
-- WONOSOBO) ke organizations.slug (rutan-kelas-ii-b-wonosobo), tetapi
-- kebijakan SELECT organizations terkunci ke org konteks berjalan, sehingga
-- pencarian langsung selalu kosong. Fungsi ini membuka tepat satu baris
-- (id/slug/status aktif) lewat SECURITY DEFINER, mengikuti idiom
-- lookup_user_display_name: tanpa PII, tanpa tulis, tanpa bypass lain.
-- Checksum di bawah adalah sha256 heks dari isi berkas ini sebelum baris INSERT.
CREATE OR REPLACE FUNCTION indicate_private.find_organization_by_slug(
  requested_slug text
)
RETURNS TABLE(id uuid, slug text, status record_status)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, indicate_private
AS $$
  SELECT target.id, target.slug, target.status
  FROM public.organizations AS target
  WHERE target.slug = requested_slug
    AND target.status = 'active'
  LIMIT 1
$$;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.find_organization_by_slug(text) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.find_organization_by_slug(text) TO indicate_runtime;--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (256, 'find_organization_by_slug', 'sha256:0e65bbfdd8dd142c8c64dd29a48788e1ff07978a29b0f82ed5e91512a618ed75');
