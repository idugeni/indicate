-- Kotak-masuk lintas-org: draf humas menunggu jembatan steward.
--
-- Humas menulis di org sendiri yang tanpa situs, sehingga artikelnya tak
-- pernah masuk antrean operator dan tak terlihat dasbor operator (isolasi
-- tenant per org). Steward platform butuh satu daftar lintas-org untuk
-- menjembatani draf-draf itu ke portal. Fungsi ini mengembalikannya:
-- hanya org customer aktif, hanya status draft/scheduled, hanya kolom
-- tampil (tanpa isi/body), terbaru dulu, dibatasi 200 baris. Tanpa PII,
-- tanpa token, tanpa bypass selain filter eksplisit di badan fungsi.
-- Checksum di bawah adalah sha256 heks dari isi berkas ini sebelum baris INSERT.
CREATE OR REPLACE FUNCTION indicate_private.list_bridge_inbox()
RETURNS TABLE(
  organization_id uuid, org_slug text, org_name text, article_id uuid,
  slug text, title text, status public.article_status, publisher_label text,
  region_slug text, updated_at timestamp with time zone
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, indicate_private
AS $$
  SELECT o.id, o.slug, o.name, a.id, a.slug, a.title, a.status,
    p.attribution_label, r.slug, a.updated_at
  FROM public.organizations AS o
  JOIN public.articles AS a
    ON a.organization_id = o.id AND a.status IN ('draft', 'scheduled')
  LEFT JOIN public.publishers AS p
    ON p.organization_id = a.organization_id AND p.id = a.publisher_id AND p.status = 'active'
  LEFT JOIN public.regions AS r
    ON r.organization_id = a.organization_id AND r.id = a.region_id AND r.status = 'active'
  WHERE o.kind = 'customer' AND o.status = 'active'
  ORDER BY a.updated_at DESC
  LIMIT 200
$$;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.list_bridge_inbox() FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.list_bridge_inbox() TO indicate_runtime;--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (261, 'list_bridge_inbox', 'sha256:376db88ad3440ee8467420f012507e1585faa0d188b8273adba3f1e40dee1680');
