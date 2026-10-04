-- Article presentation modes, sponsored flag, video URL, and liveblog updates.
--
-- `articles.type` (enum `article_type`, six modes) defaults to `standard` and
-- `articles.is_sponsored` defaults to false; both backfill legacy rows before
-- the NOT NULL contract lands, so existing reads never see NULL. `video_url`
-- carries the canonical external watch/file URL for `video` mode (uploaded
-- video bytes keep living on `media` under purpose `article-video`).
-- `article_updates` holds ordered liveblog entries keyed to one article with a
-- composite FK (cascade: entries die with their article) and a body/sort
-- contract matching the Drizzle schema. Tenant RLS plus runtime grants mirror
-- `article_categories_rls`; the `updated_at` freshness guard picks the new
-- table up by column enumeration. `article_status` is untouched.
-- Ledger version 252 follows the live `max(version)`, which is 251.
--
-- Body digest (reproducible): LF-normalize this file, substitute the 64-hex
-- checksum literal below with 64 zeros, SHA-256 the complete UTF-8 bytes.
CREATE TYPE public.article_type AS ENUM ('standard', 'video', 'gallery', 'audio', 'liveblog', 'short');--> statement-breakpoint
ALTER TABLE public.articles ADD COLUMN type public.article_type;--> statement-breakpoint
ALTER TABLE public.articles ADD COLUMN is_sponsored boolean;--> statement-breakpoint
ALTER TABLE public.articles ADD COLUMN video_url text;--> statement-breakpoint
UPDATE public.articles SET type = 'standard' WHERE type IS NULL;--> statement-breakpoint
UPDATE public.articles SET is_sponsored = false WHERE is_sponsored IS NULL;--> statement-breakpoint
ALTER TABLE public.articles ALTER COLUMN type SET DEFAULT 'standard';--> statement-breakpoint
ALTER TABLE public.articles ALTER COLUMN is_sponsored SET DEFAULT false;--> statement-breakpoint
ALTER TABLE public.articles ALTER COLUMN type SET NOT NULL;--> statement-breakpoint
ALTER TABLE public.articles ALTER COLUMN is_sponsored SET NOT NULL;--> statement-breakpoint
ALTER TABLE public.articles ADD CONSTRAINT articles_video_url_shape CHECK (video_url IS NULL OR (char_length(video_url) BETWEEN 1 AND 2000 AND (video_url LIKE 'http://%' OR video_url LIKE 'https://%')));--> statement-breakpoint
CREATE INDEX IF NOT EXISTS articles_organization_type_idx ON public.articles (organization_id, type);--> statement-breakpoint
CREATE TABLE public.article_updates (
  organization_id uuid NOT NULL,
  id uuid NOT NULL,
  article_id uuid NOT NULL,
  body text NOT NULL,
  sort_order integer NOT NULL,
  published_at timestamp with time zone,
  created_by text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT article_updates_pk PRIMARY KEY (organization_id, id),
  CONSTRAINT article_updates_article_fk FOREIGN KEY (organization_id, article_id) REFERENCES public.articles(organization_id, id) ON DELETE CASCADE,
  CONSTRAINT article_updates_body_length CHECK (char_length(body) BETWEEN 1 AND 20000),
  CONSTRAINT article_updates_sort_positive CHECK (sort_order >= 1)
);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS article_updates_id_unique ON public.article_updates (id);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS article_updates_organization_article_sort_idx ON public.article_updates (organization_id, article_id, sort_order);--> statement-breakpoint
DO $verify_article_modes$
BEGIN
  IF EXISTS (SELECT 1 FROM public.articles WHERE type IS NULL OR is_sponsored IS NULL) THEN
    RAISE EXCEPTION 'article mode backfill incomplete';
  END IF;
END
$verify_article_modes$;--> statement-breakpoint
ALTER TABLE public.article_updates ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE public.article_updates FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON public.article_updates;--> statement-breakpoint
CREATE POLICY tenant_isolation ON public.article_updates TO indicate_runtime USING (organization_id = indicate_private.current_organization_id()) WITH CHECK (organization_id = indicate_private.current_organization_id());--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON public.article_updates TO indicate_runtime;--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (252, 'article_type_modes', 'sha256:1c635c27be81834b22c6abcf9f0c96356422f73911f40da0a0e0e83c7aa7ea41');
