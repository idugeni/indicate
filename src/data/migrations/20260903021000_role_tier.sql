-- Membership tier bound to roles: 'admin' holds full control, 'user' works
-- within granted permissions. Existing roles keep their names; tiers are
-- backfilled from the naming convention (names containing 'admin' become
-- admin, everything else becomes user) and can be corrected through the
-- normal role-update path afterwards. New roles default to 'user'.
CREATE TYPE "public"."role_tier" AS ENUM('admin', 'user');
ALTER TABLE "public"."roles" ADD COLUMN "tier" "public"."role_tier" DEFAULT 'user' NOT NULL;
UPDATE "public"."roles" SET "tier" = 'admin' WHERE lower("name") LIKE '%admin%';

INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (28, 'role_tier', 'role-tier-v1');
