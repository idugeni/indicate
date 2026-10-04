-- Kategori default untuk 59 org UPT Jateng.
--
-- Tanpa satu pun kategori, kreasi artikel atas nama org UPT selalu gagal
-- (resolveArticleCategoryIds menolak tenant tanpa kategori). Satu kategori
-- `Berita` per org menutup celah terakhir agar dasbor UPT bisa dipakai
-- menulis; kategori khusus ditambah humas sendiri belakangan.
-- Idempoten: dijaga NOT EXISTS (slug per org).
-- Checksum di bawah adalah sha256 heks dari isi berkas ini sebelum baris INSERT.
INSERT INTO public.categories(organization_id, id, name, slug, status, version, created_at, updated_at)
SELECT o.id, gen_random_uuid(), 'Berita', 'berita', 'active', 1, now(), now()
FROM public.organizations o
WHERE o.customer_metadata->>'seed' = 'upt-jateng-59org'
  AND NOT EXISTS (SELECT 1 FROM public.categories c WHERE c.organization_id = o.id AND c.slug = 'berita');--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (257, 'upt_org_default_category', 'sha256:166061da9811215f8e00c5832bf170df64666649cdd99a562b7160a10e4b37f7');
