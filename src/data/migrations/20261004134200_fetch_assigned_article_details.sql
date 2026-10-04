-- Pembaca detail artikel ter tugaskan lintas-org untuk delivery.
--
-- `fetch_assigned_articles` (v258) hanya mengembalikan id rujukan; delivery
-- butuh label penerbit/penulis/kategori plus isi untuk merender kartu dan
-- halaman detail portal penyaji. Fungsi ini menggabungkan semuanya dalam
-- satu pemanggilan SECURITY DEFINER yang memfilter eksplisit kedua parameter
-- (org pemilik + daftar id), hanya baris aktif/terbit, dan hanya kolom tampil
-- publik: tanpa token, rahasia, atau kontak internal (kolom contacts utuh
-- tidak ikut; yang ikut hanya logo/city/bio yang memang tampil publik).
-- Checksum di bawah adalah sha256 heks dari isi berkas ini sebelum baris INSERT.
CREATE OR REPLACE FUNCTION indicate_private.fetch_assigned_article_details(
  requested_organization_id uuid,
  requested_article_ids uuid[]
)
RETURNS TABLE(
  article_id uuid, slug text, title text, excerpt text, canonical_url text,
  tags text[], status public.article_status, article_type text, is_sponsored boolean,
  video_url text, audio_url text, duration_seconds integer,
  region_id uuid, category_slug text, category_name text,
  publisher_name text, attribution text, publisher_logo text, publisher_city text,
  publisher_bio text, publisher_verified boolean, publisher_type text,
  author_display text, author_bio text, author_avatar text, author_url text,
  cover_image_url text, published_at timestamp with time zone,
  updated_at timestamp with time zone, body text, body_json jsonb
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, indicate_private
AS $$
  SELECT a.id, a.slug, a.title, a.excerpt, a.canonical_url,
    a.tags, a.status, a.type::text, a.is_sponsored,
    a.video_url, a.audio_url, a.duration_seconds,
    a.region_id, c.slug, c.name,
    p.name, p.attribution_label,
    p.contacts->>'logoUrl', p.contacts->>'city', p.contacts->>'bio',
    p.verification_status = 'verified', p.type::text,
    au.display_name, au.bio, au.avatar_url, au.website_url,
    a.cover_image_url, a.published_at,
    a.updated_at, a.body, a.body_json
  FROM public.articles AS a
  LEFT JOIN public.publishers AS p
    ON p.organization_id = a.organization_id AND p.id = a.publisher_id AND p.status = 'active'
  LEFT JOIN public.authors AS au
    ON au.organization_id = a.organization_id AND au.id = a.author_id AND au.status = 'active'
  LEFT JOIN public.categories AS c
    ON c.organization_id = a.organization_id AND c.id = a.category_id AND c.status = 'active'
  WHERE a.organization_id = requested_organization_id
    AND a.id = ANY (requested_article_ids)
    AND a.status = 'active'
    AND a.published_at IS NOT NULL
$$;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.fetch_assigned_article_details(uuid, uuid[]) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.fetch_assigned_article_details(uuid, uuid[]) TO indicate_runtime;--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (259, 'fetch_assigned_article_details', 'sha256:9b00b2c840cb12b83e7dd7827518f66351cc28d379c3d42ad26590b010103002');
