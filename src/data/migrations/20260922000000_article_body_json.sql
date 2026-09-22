-- TipTap structured content (expand phase): nullable body_json beside legacy body.
--
-- articles.body_json stores the TipTap document JSON; article_revisions.body_json
-- snapshots it per content save. Both columns stay nullable so no backfill is
-- required: existing plain-text articles keep body_json NULL and render through
-- the legacy markup path (ArticleBodyView), while new saves dual-write the
-- legacy body column (plain-text derivation) for search, excerpts, and RSS.
-- Dropping or backfilling body is a later contract release, not this migration.
-- RLS and grants follow the parent tables (no new policy needed for columns).
-- Body digest (reproducible): LF-normalize this file, substitute the 64-hex
-- checksum literal below with 64 zeros, SHA-256 the complete UTF-8 bytes.
ALTER TABLE public.articles ADD COLUMN body_json jsonb;--> statement-breakpoint
ALTER TABLE public.article_revisions ADD COLUMN body_json jsonb;--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (147, 'article_body_json', 'sha256:5488332ef5dc84138cc1f76b70e9dc10ac6f4fab007ca5230f72fb252fca0ffb');
