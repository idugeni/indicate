-- Agregat harian tayangan per penyaluran untuk grafik dasbor.
--
-- view_count di article_sites tetap total lifetime; tabel ini menampung delta
-- harian yang ditulis view-flush (satu baris per organisasi/relasi/hari) agar
-- analitik tidak lagi mengelompokkan SUM lifetime berdasar state_occurred_at.
-- Baris historis tidak di-backfill: grafik terisi mulai hari migrasi applied.
-- RLS + grant mengikuti pola cache_bypasses (isolasi tenant + cakupan region
-- lewat sites agar aktor region-scoped tidak melebar ke satu organisasi).
-- Body digest (reproducible): LF-normalize this file, substitute the 64-hex
-- checksum literal below with 64 zeros, SHA-256 the complete UTF-8 bytes.

CREATE TABLE IF NOT EXISTS public.article_site_view_days (
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  article_site_id uuid NOT NULL,
  site_id uuid NOT NULL,
  day date NOT NULL,
  views integer NOT NULL DEFAULT 0,
  CONSTRAINT article_site_view_days_pk PRIMARY KEY (organization_id, article_site_id, day),
  CONSTRAINT article_site_view_days_views_nonnegative CHECK (views >= 0)
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS article_site_view_days_organization_day_idx
  ON public.article_site_view_days USING btree (organization_id, day DESC);--> statement-breakpoint
ALTER TABLE public.article_site_view_days ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE public.article_site_view_days FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON public.article_site_view_days;--> statement-breakpoint
CREATE POLICY tenant_isolation ON public.article_site_view_days
  USING (organization_id = indicate_private.current_organization_id() AND ((SELECT indicate_private.current_region_id()) IS NULL OR EXISTS (SELECT 1 FROM public.sites s WHERE s.organization_id = article_site_view_days.organization_id AND s.id = article_site_view_days.site_id AND (s.region_id IS NULL OR s.region_id = (SELECT indicate_private.current_region_id())))))
  WITH CHECK (organization_id = indicate_private.current_organization_id());--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON public.article_site_view_days TO indicate_runtime;--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (144, 'article_site_view_days', 'sha256:dbf21bed2a4fa48758f06ed4b70d38f98d5e903603d1b7763918dd5ed796ce87');
