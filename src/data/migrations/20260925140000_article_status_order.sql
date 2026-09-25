-- Align the article_status enum order with the declared schema.
--
-- The live type was created as `{draft, active, archived, in_review, scheduled}`
-- while the Drizzle schema declares `draft, in_review, scheduled, active,
-- archived`. Enum order is semantic in Postgres: it drives `ORDER BY status`,
-- range aggregates, and any comparison that relies on the ordinal. Only
-- `articles.status` uses the type and nothing else depends on it, so the type
-- is recreated in the declared order and the column cast through text.
--
-- Body digest (reproducible): LF-normalize this file, substitute the 64-hex
-- checksum literal below with 64 zeros, SHA-256 the complete UTF-8 bytes.
CREATE TYPE public.article_status_ordered AS ENUM ('draft', 'in_review', 'scheduled', 'active', 'archived');--> statement-breakpoint
ALTER TABLE public.articles ALTER COLUMN status DROP DEFAULT;--> statement-breakpoint
ALTER TABLE public.articles
  ALTER COLUMN status TYPE public.article_status_ordered USING status::text::public.article_status_ordered;--> statement-breakpoint
DROP TYPE public.article_status;--> statement-breakpoint
ALTER TYPE public.article_status_ordered RENAME TO article_status;--> statement-breakpoint
ALTER TABLE public.articles ALTER COLUMN status SET DEFAULT 'draft'::public.article_status;--> statement-breakpoint
DO $$
BEGIN
  IF (SELECT enum_range(NULL::public.article_status)::text)
     <> '{draft,in_review,scheduled,active,archived}' THEN
    RAISE EXCEPTION 'article_status_order_mismatch after migration: %', enum_range(NULL::public.article_status)::text;
  END IF;
  IF (SELECT count(*) FROM public.articles WHERE status::text NOT IN ('draft', 'in_review', 'scheduled', 'active', 'archived')) > 0 THEN
    RAISE EXCEPTION 'article_status_order_mismatch: an article row holds an unknown status';
  END IF;
END;
$$;--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (182, 'article_status_order', 'sha256:f73cfeeb72c9172e4d7825dcb708093c0c488f35507f45641070426580dbc505');
