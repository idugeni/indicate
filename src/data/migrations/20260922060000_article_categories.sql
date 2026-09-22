-- Multi-category assignments: one article may belong to several categories.
--
-- `articles.category_id` stays the primary category (delivery, SEO, and
-- filters keep reading it), while this join table carries the full ordered
-- set. Position 1 mirrors the primary category. Existing assignments are
-- backfilled from `articles.category_id`, so no article loses its category.
-- Body digest (reproducible): LF-normalize this file, substitute the 64-hex
-- checksum literal below with 64 zeros, SHA-256 the complete UTF-8 bytes.
CREATE TABLE public.article_categories (
  organization_id uuid NOT NULL,
  article_id uuid NOT NULL,
  category_id uuid NOT NULL,
  position integer NOT NULL,
  CONSTRAINT article_categories_position_positive CHECK (position >= 1),
  PRIMARY KEY (organization_id, article_id, category_id),
  FOREIGN KEY (organization_id, article_id) REFERENCES public.articles(organization_id, id) ON DELETE CASCADE,
  FOREIGN KEY (organization_id, category_id) REFERENCES public.categories(organization_id, id) ON DELETE RESTRICT
);--> statement-breakpoint
CREATE INDEX article_categories_category_idx ON public.article_categories (organization_id, category_id);--> statement-breakpoint
INSERT INTO public.article_categories (organization_id, article_id, category_id, position)
SELECT organization_id, id, category_id, 1 FROM public.articles WHERE category_id IS NOT NULL;--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (153, 'article_categories', 'sha256:91d1edefe00c893b468d17f1f8411f6788ef965348d84eea370f5a5396ebd15c');
