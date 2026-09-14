-- SEO metadata hardening: validasi anti thin/duplicate + backfill diferensiasi per tenant.
--
-- 1) authors: kolom nullable bio/avatar_url/website_url (diisi dari data yang tersedia saja, tanpa mengarang).
-- 2) article_sites: CHECK panjang custom_title (10-160) dan custom_description (50-500).
-- 3) publishers.contacts.logoUrl: backfill fallback instansi bila belum disematkan.
-- 4) article_sites: backfill custom_* yang masih NULL dari data nyata tenant
--    (judul kanonik + nama situs; deskripsi kutipan body + konteks situs/kota).
--    Sudut lokal Wonosobo memakai kota dari contacts publisher bila tersedia.
-- 5) site_settings: backfill seo defaults yang masih NULL dari name/description.
-- Idempoten: semua DDL dijaga IF NOT EXISTS / DROP IF EXISTS; backfill hanya
-- menyentuh baris NULL dan menghormati batas CHECK.

ALTER TABLE public.authors ADD COLUMN IF NOT EXISTS bio text;--> statement-breakpoint
ALTER TABLE public.authors ADD COLUMN IF NOT EXISTS avatar_url text;--> statement-breakpoint
ALTER TABLE public.authors ADD COLUMN IF NOT EXISTS website_url text;--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'authors_bio_length') THEN
    ALTER TABLE public.authors ADD CONSTRAINT authors_bio_length CHECK (bio IS NULL OR (char_length(bio) BETWEEN 1 AND 2000));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'authors_avatar_shape') THEN
    ALTER TABLE public.authors ADD CONSTRAINT authors_avatar_shape CHECK (avatar_url IS NULL OR (avatar_url LIKE '/%' OR avatar_url LIKE 'https://%'));
  END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'article_sites_custom_title_shape') THEN
    ALTER TABLE public.article_sites ADD CONSTRAINT article_sites_custom_title_shape CHECK (custom_title IS NULL OR (char_length(custom_title) BETWEEN 10 AND 160));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'article_sites_custom_description_shape') THEN
    ALTER TABLE public.article_sites ADD CONSTRAINT article_sites_custom_description_shape CHECK (custom_description IS NULL OR (char_length(custom_description) BETWEEN 50 AND 500));
  END IF;
END $$;--> statement-breakpoint
UPDATE public.publishers
SET contacts = contacts || '{"logoUrl": "/brand/logo-kemenimipas.png"}'::jsonb, updated_at = now()
WHERE (contacts ->> 'logoUrl') IS NULL OR btrim(contacts ->> 'logoUrl') = '';--> statement-breakpoint
UPDATE public.site_settings
SET seo_default_title = name, updated_at = now()
WHERE seo_default_title IS NULL;--> statement-breakpoint
UPDATE public.site_settings
SET seo_default_description = description, updated_at = now()
WHERE seo_default_description IS NULL;--> statement-breakpoint
UPDATE public.site_settings
SET seo_open_graph_site_name = name, updated_at = now()
WHERE seo_open_graph_site_name IS NULL;--> statement-breakpoint
UPDATE public.article_sites AS ras
SET custom_title = left(a.title || ' | ' || s.name, 160), updated_at = now()
FROM public.articles AS a
JOIN public.site_settings AS s
  ON s.organization_id = ras.organization_id AND s.site_id = ras.site_id
WHERE ras.organization_id = a.organization_id
  AND ras.article_id = a.id
  AND ras.custom_title IS NULL
  AND char_length(a.title || ' | ' || s.name) BETWEEN 10 AND 160;--> statement-breakpoint
UPDATE public.article_sites AS ras
SET custom_description = left(
  regexp_replace(a.body, '\s+', ' ', 'g')
  || ' — ' || s.name
  || COALESCE(' (' || NULLIF(btrim(p.contacts ->> 'city'), '') || ')', ''),
  500
), updated_at = now()
FROM public.articles AS a
JOIN public.site_settings AS s
  ON s.organization_id = ras.organization_id AND s.site_id = ras.site_id
LEFT JOIN public.publishers AS p
  ON p.organization_id = a.organization_id AND p.id = a.publisher_id
WHERE ras.organization_id = a.organization_id
  AND ras.article_id = a.id
  AND ras.custom_description IS NULL
  AND char_length(
    regexp_replace(a.body, '\s+', ' ', 'g')
    || ' — ' || s.name
    || COALESCE(' (' || NULLIF(btrim(p.contacts ->> 'city'), '') || ')', '')
  ) BETWEEN 50 AND 500;--> statement-breakpoint
