-- Enterprise gallery + featured editorial fields for article media.
--
-- Gallery was `{url, thumbnailUrl}` ordered by upload time with synthesized
-- alt text; TipTap inline images already resolve by media id. This expands
-- `public.media` with durable editorial metadata so delivery can project a
-- real gallery contract without schema churn later:
-- `alt_text` (<=300), `caption` (<=500), `sort_order` (manual reorder,
-- defaults to upload order), and `focal_x`/`focal_y` (0-100 crop focus for
-- the featured cover, travel together, null means center).
-- Also consolidates the dead `article-image` purpose into `article-inline`:
-- covers are `article-cover` (public), body images are `article-inline`
-- (private, served by id). Object keys are untouched; only the purpose
-- column is normalized so old rows keep serving.
-- Body digest (reproducible): LF-normalize this file, substitute the 64-hex
-- checksum literal below with 64 zeros, SHA-256 the complete UTF-8 bytes.
ALTER TABLE public.media ADD COLUMN alt_text text;--> statement-breakpoint
ALTER TABLE public.media ADD COLUMN caption text;--> statement-breakpoint
ALTER TABLE public.media ADD COLUMN sort_order integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE public.media ADD COLUMN focal_x integer;--> statement-breakpoint
ALTER TABLE public.media ADD COLUMN focal_y integer;--> statement-breakpoint
ALTER TABLE public.media ADD CONSTRAINT media_alt_text_length CHECK (alt_text IS NULL OR (char_length(alt_text) BETWEEN 1 AND 300));--> statement-breakpoint
ALTER TABLE public.media ADD CONSTRAINT media_caption_length CHECK (caption IS NULL OR (char_length(caption) BETWEEN 1 AND 500));--> statement-breakpoint
ALTER TABLE public.media ADD CONSTRAINT media_focal_bounds CHECK ((focal_x IS NULL AND focal_y IS NULL) OR (focal_x IS NOT NULL AND focal_y IS NOT NULL AND focal_x >= 0 AND focal_x <= 100 AND focal_y >= 0 AND focal_y <= 100));--> statement-breakpoint
UPDATE public.media SET purpose = 'article-inline' WHERE purpose = 'article-image';--> statement-breakpoint
UPDATE public.media_key_reservations SET purpose = 'article-inline' WHERE purpose = 'article-image';--> statement-breakpoint
CREATE INDEX IF NOT EXISTS media_organization_article_gallery_idx ON public.media (organization_id, article_id, sort_order, created_at) WHERE state = 'active';--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (168, 'media_gallery_editorial', 'sha256:ce37b0e615fe15069fc28b65a6b95df7e7e258b8dd9d027f1193abf86a2958bf');
