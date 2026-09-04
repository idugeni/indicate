-- User profile columns: avatar reference, bio, and locale preferences.
--
-- Curated from the `drizzle-kit generate` diff (kept verbatim): four nullable
-- columns with no defaults, so existing rows are untouched. avatar_url holds
-- either an https:// URL (OAuth provider avatar or user-supplied link) or an
-- `r2:`-prefixed private-bucket key resolved to a short-lived signed URL at
-- render time; writers validate the shape in application code. The existing
-- self-predicate RLS policies and the identity-immutability trigger already
-- cover these columns (no policy change required).

ALTER TABLE "users" ADD COLUMN "avatar_url" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "bio" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "locale" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "timezone" text;

INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (38, 'user_profile', 'user-profile-v1');
