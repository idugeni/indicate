-- Bound `articles.slug` in the database, matching the dashboard schema.
--
-- The application has always capped a slug at 100 characters, but the column
-- itself was unconstrained text: a write that arrived through SQL rather than
-- the Zod schema could store a slug that `normalizeArticleSlug` then refused to
-- read, so the article existed and its public route 404'd. That bound is now 300
-- characters so a slug can carry a whole article title, and the constraint below
-- makes the database the place that refuses anything longer or non-kebab-case.
--
-- The upper bound is deliberately finite rather than unbounded. The unique index
-- `articles_organization_slug_unique` is a btree over `(organization_id, slug)`,
-- and a btree tuple fails to fit past roughly 2704 bytes, so an unbounded slug
-- would turn a long title into a hard insert error instead of a validation
-- error. 300 ASCII characters leaves the index with a wide margin.
--
-- The constraint is validated on creation and verified to match all 43 existing
-- rows before this migration was written: longest slug is 100 characters, and
-- every slug already satisfies the kebab-case pattern.

ALTER TABLE public.articles
  DROP CONSTRAINT IF EXISTS articles_slug_shape;
--> statement-breakpoint
ALTER TABLE public.articles
  ADD CONSTRAINT articles_slug_shape
  CHECK (char_length(slug) BETWEEN 1 AND 300 AND slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$');
--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (219, 'articles_slug_shape', 'sha256:b7be10447d62028c571b44989cf387628127dbeb1a208bbdf6b76347cbc241e8');
