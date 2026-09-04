-- Delivery activation hardening: closed value sets become enums, the orphan
-- `phase` column is removed, and the missing `activation_state` column is
-- added. All three touched tables were verified empty before this migration,
-- so every conversion is a metadata-only rewrite with no row mapping risk.
--
-- Deliberately NOT converted to enums (open-ended by design):
-- - `activation_state` carries provider-driven states (pending, processing,
--   deactivating, probe_verified, cloudflare_verified, vercel_associated,
--   completed, failed) that grow with each provider integration.
-- - webhook `source`, media `purpose`, invalidation `reason`, release
--   `category`, and subscription `plan` are free-form or caller-supplied.

-- 1. New enum types.
CREATE TYPE "public"."activation_operation" AS ENUM('activate', 'deactivate');
CREATE TYPE "public"."telegram_conversation_step" AS ENUM('idle', 'article_region', 'article_title', 'article_body', 'article_source', 'article_slug', 'article_sites', 'article_image', 'publication_status');
CREATE TYPE "public"."seo_robots_directive" AS ENUM('index,follow', 'noindex,nofollow');

-- 2. domain_activation_attempts: add the missing activation_state column that
-- the delivery repository writes on every activation request, and drop the
-- orphan phase column that no code references.
ALTER TABLE "public"."domain_activation_attempts" ADD COLUMN "activation_state" text NOT NULL;
ALTER TABLE "public"."domain_activation_attempts" DROP COLUMN "phase";

-- 3. operation text + CHECK -> enum (the CHECK becomes redundant).
ALTER TABLE "public"."domain_activation_attempts" DROP CONSTRAINT "domain_activation_attempts_operation_check";
ALTER TABLE "public"."domain_activation_attempts" ALTER COLUMN "operation" DROP DEFAULT;
ALTER TABLE "public"."domain_activation_attempts" ALTER COLUMN "operation" TYPE "public"."activation_operation" USING "operation"::"public"."activation_operation";
ALTER TABLE "public"."domain_activation_attempts" ALTER COLUMN "operation" SET DEFAULT 'activate';

-- 4. telegram_conversations.step text -> enum (closed 9-step workflow).
-- The length() CHECK becomes invalid on an enum type (length(enum) does not
-- exist) and redundant: every enum label is 1-100 chars, so drop it first.
ALTER TABLE "public"."telegram_conversations" DROP CONSTRAINT "telegram_conversations_bounded_step";
ALTER TABLE "public"."telegram_conversations" ALTER COLUMN "step" TYPE "public"."telegram_conversation_step" USING "step"::"public"."telegram_conversation_step";

-- 5. site_settings.seo_robots_directive text -> enum (validated upstream by
-- SEO_ROBOTS_DIRECTIVES; writers pass text which Postgres casts on assignment
-- and rejects fail-closed when invalid). The text-equality CHECK becomes a
-- type error on an enum column and redundant, so drop it first.
ALTER TABLE "public"."site_settings" DROP CONSTRAINT "site_settings_seo_robots_directive_shape";
ALTER TABLE "public"."site_settings" ALTER COLUMN "seo_robots_directive" TYPE "public"."seo_robots_directive" USING "seo_robots_directive"::"public"."seo_robots_directive";

INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (29, 'delivery_activation_enums', 'delivery-activation-enums-v1');
