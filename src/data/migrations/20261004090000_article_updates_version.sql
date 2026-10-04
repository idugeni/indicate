-- Optimistic-lock version for liveblog entries.
--
-- `article_updates.version` starts at 1 for the (zero) existing rows via the
-- column default; writers predicate on it exactly like `articles.version`, so
-- two editors racing on one entry resolve to a conflict instead of last-wins.
-- Ledger version 254 follows the live `max(version)`, which is 253.
--
-- Body digest (reproducible): LF-normalize this file, substitute the 64-hex
-- checksum literal below with 64 zeros, SHA-256 the complete UTF-8 bytes.
ALTER TABLE public.article_updates ADD COLUMN version integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE public.article_updates ADD CONSTRAINT article_updates_version_positive CHECK (version > 0);--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (254, 'article_updates_version', 'sha256:9db5b29123f853321a882b7f3af149b2abb68668940cc5b461199515ad72b6af');
