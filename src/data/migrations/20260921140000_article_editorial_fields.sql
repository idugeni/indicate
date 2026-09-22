-- Editorial P0/P1: dek, excerpt, canonical override, scheduled_at, status in_review/scheduled, article_revisions.
--
-- Kolom baru semuanya nullable sehingga backfill tidak diperlukan; arsip lama
-- memakai fallback runtime (dek/excerpt dari body, kanonis dari hostname+slug).
-- article_status bertambah 'in_review' dan 'scheduled' untuk alur review dan
-- jadwal terbit (penegakan jadwal oleh scheduler penerbitan, bukan migrasi ini).
-- article_revisions menyimpan snapshot isi per penyimpanan untuk diff/rollback;
-- ditulis jalur commit dasbor saat create dan saat konten berubah.
-- RLS + grant mengikuti pola article_site_view_days.
-- CATATAN APLIKASI: ALTER TYPE ... ADD VALUE tidak boleh di dalam blok
-- transaksi; terapkan berkas ini pernyataan-per-pernyataan (psql -f tanpa
-- -1, atau editor SQL Supabase), sesuai urutan journal.
-- Body digest (reproducible): LF-normalize this file, substitute the 64-hex
-- checksum literal below with 64 zeros, SHA-256 the complete UTF-8 bytes.
ALTER TYPE public.article_status ADD VALUE 'in_review';--> statement-breakpoint
ALTER TYPE public.article_status ADD VALUE 'scheduled';--> statement-breakpoint
ALTER TABLE public.articles ADD COLUMN dek text;--> statement-breakpoint
ALTER TABLE public.articles ADD COLUMN excerpt text;--> statement-breakpoint
ALTER TABLE public.articles ADD COLUMN canonical_url text;--> statement-breakpoint
ALTER TABLE public.articles ADD COLUMN scheduled_at timestamp with time zone;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS public.article_revisions (
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  article_id uuid NOT NULL,
  revision_number integer NOT NULL,
  title text NOT NULL,
  dek text,
  body text NOT NULL,
  snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT article_revisions_pk PRIMARY KEY (organization_id, id),
  CONSTRAINT article_revisions_id_unique UNIQUE (id),
  CONSTRAINT article_revisions_organization_article_number_unique UNIQUE (organization_id, article_id, revision_number),
  CONSTRAINT article_revisions_number_positive CHECK (revision_number > 0)
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS article_revisions_organization_article_idx
  ON public.article_revisions USING btree (organization_id, article_id, revision_number);--> statement-breakpoint
ALTER TABLE public.article_revisions ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE public.article_revisions FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON public.article_revisions;--> statement-breakpoint
CREATE POLICY tenant_isolation ON public.article_revisions
  USING (organization_id = indicate_private.current_organization_id())
  WITH CHECK (organization_id = indicate_private.current_organization_id());--> statement-breakpoint
GRANT SELECT, INSERT ON public.article_revisions TO indicate_runtime;--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (146, 'article_editorial_fields', 'sha256:b515681c5509093c1e6dace69cea95a3451810ecc81860138063407fa3070246');
