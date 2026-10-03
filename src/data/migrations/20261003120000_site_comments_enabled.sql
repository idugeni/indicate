-- Give each site an explicit reader-comment switch, defaulting to off.
--
-- The platform ships one Disqus forum for the whole network, so the switch is
-- per site rather than per tenant account: an apex site and its regional
-- children decide independently whether their own article pages carry a
-- comment thread. Left at the database default, every existing and future site
-- inherits `false`, which is the only safe starting point -- the embed is a
-- third-party processor that profiles readers, and the public privacy copy
-- promises that reader pages install no third-party trackers.
--
-- A constant `NOT NULL DEFAULT false` needs no backfill statement and no table
-- rewrite on PostgreSQL 11 or newer: the default is materialized on read, so
-- the 4,422 existing rows are untouched and the ACCESS EXCLUSIVE lock is held
-- only for the catalog change. `IF NOT EXISTS` is there because this migration
-- is applied by hand, and a retry after a partial apply must not fail on a
-- column that is already there.
--
-- Ledger version 244 follows the live `max(version)`, which is 243. Journal idx
-- 243 (`backfill_article_author`) carries no self-registration row and was
-- never applied here, so the numbering offset that the missing migration 187
-- introduced closes at this row rather than skipping a version.
--
-- Body digest (reproducible): LF-normalize this file, substitute the 64-hex
-- checksum literal below with 64 zeros, SHA-256 the complete UTF-8 bytes.
ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS comments_enabled boolean NOT NULL DEFAULT false;--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (244, 'site_comments_enabled', 'sha256:8c542bde2f5c4772b183b9a3533fe3cf980a3546cbd3a3c0a81ab605d325fba2');