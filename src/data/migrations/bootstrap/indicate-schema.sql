-- Indicate database bootstrap
--
-- GENERATED FILE. Do not edit by hand; run `npm run db:bootstrap` instead.
--
-- Applies the complete reviewed forward migration sequence to one empty
-- PostgreSQL 17 database and records the Drizzle ledger, so a later
-- `npm run db:migrate` against the same database is a no-op. Run this with a
-- migration-owner credential, never an application runtime credential.
--
-- The digests below are the Drizzle ledger digests: SHA-256 over each raw
-- migration file. They are deliberately distinct from the reviewed checksums
-- in src/features/release/migration-manifest.ts, which canonicalize each body
-- before hashing. Both are verified against these files by the test suite.
--
-- Reviewed sources, in journal order (41 migrations):
--   01  20260903000000_core_schema  ledger sha256:f7163225de73270a59d8675e2d44f0ea9706a96a01bde339f36b487e65218dc0
--   02  20260903000500_security  ledger sha256:99d793ebab12f68ad323375409cef6cf7ef60460e36ff13d490173c18698b244
--   03  20260903001000_publisher_actor_constraints  ledger sha256:3aa4a6b1ff287d891612bab6f7334887e3def437124c198b7766220177b806e2
--   04  20260903001500_authorization_hardening  ledger sha256:873465b97cc0d7578ffb238880c52bca4c7ee38db108b9cbe4e295490b7b2c5f
--   05  20260903002000_verified_user_context  ledger sha256:1e6283c7f210cda854399aa89f2be245f4c300c406825e1e22023af1c505cd5c
--   06  20260903002500_discovery_outcome_timestamp  ledger sha256:9180df7f535a9478eb51a3c876e76e1994289862a07c24dd245754be75def14c
--   07  20260903003000_media_publication_runtime  ledger sha256:5a2a9d1eaf668693fff3ad36574cc57f59887a2c625ec5d634f52df74e5e0d58
--   08  20260903003500_public_delivery  ledger sha256:3837f494d00c231fa3e3346a0c73cc1a7aad7a25e68fe1635f79c4b3305475a2
--   09  20260903004000_production_boundaries  ledger sha256:c3b768c21be4fc85681741599684e912ed94785a92760b4ef3bc77cd68d38151
--   10  20260903004500_external_entrypoints  ledger sha256:a1d6d4028023fb4dabd9d3af61e7cd170276a2b4e40d2a93fa1224dfc0401f8b
--   11  20260903005000_security_hardening  ledger sha256:987a2378aab0e316808333f442443a5f94b1ee593932f46fd1fd0b0932cc8ae4
--   12  20260903005500_strict_platform_authorization  ledger sha256:4b4d4b75f140c83779d6b05875f63c961f87d35da06910f1eb27e18e57c4ea82
--   13  20260903010000_readiness_discovery  ledger sha256:298c1fcb059c7e0919caf08343ebfadc2a89bd836f2d29e9e878fc215c48f483
--   14  20260903010500_migration_body_digests  ledger sha256:5d1dc5f31933a365cf607f7657701bee7ea8e4f40c76c5ed0ffc6947aaadd609
--   15  20260903011000_updated_at_integrity_guard  ledger sha256:3e69727b634009e416c8f51efb8815d4893b5b98066894c9cba84e29a168536b
--   16  20260903011500_operational_table_read_policies  ledger sha256:8c8db47f78aa865d3539bc99998d2123783ce6524fff5b429526519ed708f4a7
--   17  20260903012000_data_api_and_index_hardening  ledger sha256:e20fd39f4580bd7fd079a59acfc3e523ee35355502b0ce1f75cdfa7e41424465
--   18  20260903012500_coordination_timestamps_and_search_indexes  ledger sha256:6ad51e0a682eb6d0578684160cc4adb3e3243c81d5a8dc951128eaf866f7d9fd
--   19  20260903013000_runtime_config_core  ledger sha256:f206704cc04ffdbb4d4aa7815e66340b07ff6444d9309ec6a325102a0d80a34b
--   20  20260903013500_runtime_config_audit_invalidation  ledger sha256:fabb8acb0d1b6c2ce6f3ab3dcf0cafca0390bec91a378f7a83fceecaa6b5889f
--   21  20260903014000_runtime_config_rollout  ledger sha256:6fa4c0f9303df49afcb3b7ee72fb30d2409ca8c4a5312b6828254c82db4a76fe
--   22  20260903014500_runtime_config_site_settings_zone_rls  ledger sha256:9bca35529083f22ae188b8ba8d98be4b8cbb8ca58bf53b9c396415e125d4a1e3
--   23  20260903015000_runtime_config_functions  ledger sha256:2671a870865b139376dccdd8ab8f9e2a56310c70caa554b36c1e94d79bbeb991
--   24  20260903015500_runtime_config_constraints_triggers  ledger sha256:61602bbd86ddef9b644bc768bfa0d098303afe161755eff354201df63bd11122
--   25  20260903020000_runtime_config_mutations  ledger sha256:777f279fa3779a3b5f72d3499f4b03933d9a117b1324d17cc1b0f446e468456b
--   26  20260903020300_de_object_rename_timestamp  ledger sha256:a9ead169f3359671ae906d7de87369f28bd555e3e0e9913af572ff85532d8d19
--   27  20260903020500_dashboard_entry_point  ledger sha256:cd31f0386fbe834eade6ed0fc9c7d24c8f33078195fa8f30ea73992be14f2833
--   28  20260903021000_role_tier  ledger sha256:05d22165ed36cd8d2d925af798bef877c03aa2595c145b39fa81846feab9fe7a
--   29  20260903021500_delivery_activation_enums  ledger sha256:06a93da7661b717e14ca71411fd3d44767b777b1dba10e7ed4510cef6281db63
--   30  20260903022000_schema_reconciliation  ledger sha256:e14501607ab9aab829aedf14cd3aae1061be2254e83b927a97b024ea658e261b
--   31  20260903022500_stale_object_cleanup  ledger sha256:0569003d119c76c9fc283b5b825d139a53c365da0a4d2122b81ad74c0267fb81
--   32  20260903023000_policy_singleton_key  ledger sha256:ed06cfaedf668c6c93c66c57190a0fe8533c9e5b6a544ef18b87789d4f46c174
--   33  20260903023500_function_api_reconciliation  ledger sha256:116bb8a6e08edb8a15b2b134bb4208ee9ce2b562efddfec88a4fed9643615c56
--   34  20260903024000_residual_constraint_cleanup  ledger sha256:726130658b3725bb2c2af1f15e070fe91e0fbff3023b666f19926a4ce4ac743e
--   35  20260903024500_column_default_alignment  ledger sha256:99026932cf79fb5e161b22b314f3b36328747f9ffb0e83487b46a07836305739
--   36  20260903025000_rls_operation_split  ledger sha256:db6492db464a4d64b19b52716863a86b420b32561eb80517afa6fbb37b970838
--   37  20260903025500_rls_write_hardening  ledger sha256:93aeb0997e4f98316b7e0e2e5f229562da32e25b34a2bfdeed1e0b858f3701d0
--   38  20260903030000_user_profile  ledger sha256:b0a2f2516827b4a87d07a8864d51f30a9556802a6c73062e10e39ea253163018
--   39  20260903030500_delivery_helpers  ledger sha256:0e075f7ef930dc4571d5341b931dbbea2a5b047781e6c7485884890f576a0231
--   40  20260903031000_subscription_tiers  ledger sha256:0d782559f1b08512714755fcce900a8bc33ebf7f1e5bb13c53f2d5e4b62b3c29
--   41  20260903031500_dynamic_content  ledger sha256:4a973a9327843ce673e23f44af30287ecf7d803c925f88bbaa2bc23cb01fde7c

BEGIN;

CREATE SCHEMA IF NOT EXISTS drizzle;
CREATE TABLE IF NOT EXISTS drizzle."__drizzle_migrations" (
  id SERIAL PRIMARY KEY,
  hash text NOT NULL,
  created_at bigint
);

-- Fail closed rather than replaying reviewed migrations over existing state.
DO $bootstrap$
BEGIN
  IF EXISTS (SELECT 1 FROM drizzle."__drizzle_migrations") THEN
    RAISE EXCEPTION 'indicate_bootstrap_requires_empty_database';
  END IF;
END
$bootstrap$;
-- ----------------------------------------------------------------------
-- 20260903000000_core_schema
-- ----------------------------------------------------------------------
CREATE TYPE "public"."article_status" AS ENUM('draft', 'active', 'archived');
CREATE TYPE "public"."audit_actor_type" AS ENUM('user', 'api_key', 'telegram', 'system');
CREATE TYPE "public"."audit_entry_point" AS ENUM('cms', 'api', 'telegram', 'worker', 'reconciler');
CREATE TYPE "public"."audit_outcome" AS ENUM('succeeded', 'denied', 'failed');
CREATE TYPE "public"."media_state" AS ENUM('reserved', 'active', 'rejected', 'archived');
CREATE TYPE "public"."publisher_type" AS ENUM('government_institution', 'correctional_institution', 'public_relations_office', 'company', 'organization', 'community', 'independent_publisher');
CREATE TYPE "public"."publisher_verification_status" AS ENUM('unverified', 'pending', 'verified', 'rejected');
CREATE TYPE "public"."publishing_state" AS ENUM('queued', 'processing', 'published', 'failed', 'retrying');
CREATE TYPE "public"."reservation_status" AS ENUM('reserved', 'used', 'occupied', 'expired');
CREATE TYPE "public"."task_status" AS ENUM('pending', 'processing', 'completed', 'failed');
CREATE TYPE "public"."api_key_status" AS ENUM('active', 'revoked', 'expired');
CREATE TYPE "public"."permission_scope" AS ENUM('organization', 'platform');
CREATE TYPE "public"."record_status" AS ENUM('active', 'inactive', 'archived');
CREATE TYPE "public"."site_activation_state" AS ENUM('inactive', 'pending', 'active', 'failed');
CREATE TYPE "public"."subscription_status" AS ENUM('trialing', 'active', 'past_due', 'suspended', 'cancelled');
CREATE TYPE "public"."dispatch_status" AS ENUM('pending', 'scheduled', 'leased', 'acknowledged', 'failed');
CREATE TYPE "public"."replay_claim_status" AS ENUM('claimed', 'processed', 'rejected');
CREATE TYPE "public"."seed_run_status" AS ENUM('running', 'completed', 'failed');
CREATE TABLE "article_sites" (
	"organization_id" uuid NOT NULL,
	"id" uuid NOT NULL,
	"article_id" uuid NOT NULL,
	"site_id" uuid NOT NULL,
	"state" "publishing_state" DEFAULT 'queued' NOT NULL,
	"published_url" text,
	"published_at" timestamp with time zone,
	"sanitized_failure" jsonb,
	"attempt" integer DEFAULT 0 NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "article_sites_pk" PRIMARY KEY("organization_id","id"),
	CONSTRAINT "article_sites_id_unique" UNIQUE("id"),
	CONSTRAINT "article_sites_organization_article_site_unique" UNIQUE("organization_id","article_id","site_id"),
	CONSTRAINT "article_sites_attempt_nonnegative" CHECK ("article_sites"."attempt" >= 0 AND "article_sites"."version" > 0),
	CONSTRAINT "article_sites_published_outcome" CHECK ("article_sites"."state" <> 'published' OR ("article_sites"."published_url" IS NOT NULL AND "article_sites"."published_at" IS NOT NULL))
);

CREATE TABLE "articles" (
	"organization_id" uuid NOT NULL,
	"id" uuid NOT NULL,
	"region_id" uuid NOT NULL,
	"publisher_id" uuid,
	"category_id" uuid,
	"author_id" uuid,
	"lead_media_id" uuid,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"source" text NOT NULL,
	"status" "article_status" DEFAULT 'draft' NOT NULL,
	"published_at" timestamp with time zone,
	"archived_at" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "articles_pk" PRIMARY KEY("organization_id","id"),
	CONSTRAINT "articles_id_unique" UNIQUE("id"),
	CONSTRAINT "articles_organization_slug_unique" UNIQUE("organization_id","slug"),
	CONSTRAINT "articles_version_positive" CHECK ("articles"."version" > 0)
);

CREATE TABLE "audit_logs" (
	"organization_id" uuid NOT NULL,
	"id" uuid NOT NULL,
	"actor_type" "audit_actor_type" NOT NULL,
	"actor_id" text NOT NULL,
	"entry_point" "audit_entry_point" NOT NULL,
	"action" text NOT NULL,
	"target_type" text NOT NULL,
	"target_id" text,
	"outcome" "audit_outcome" NOT NULL,
	"changed_fields" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"before" jsonb,
	"after" jsonb,
	"request_id" text NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "audit_logs_pk" PRIMARY KEY("organization_id","id")
);

CREATE TABLE "authors" (
	"organization_id" uuid NOT NULL,
	"id" uuid NOT NULL,
	"display_name" text NOT NULL,
	"byline" text NOT NULL,
	"status" "record_status" DEFAULT 'active' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "authors_pk" PRIMARY KEY("organization_id","id"),
	CONSTRAINT "authors_id_unique" UNIQUE("id")
);

CREATE TABLE "categories" (
	"organization_id" uuid NOT NULL,
	"id" uuid NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"status" "record_status" DEFAULT 'active' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "categories_pk" PRIMARY KEY("organization_id","id"),
	CONSTRAINT "categories_id_unique" UNIQUE("id"),
	CONSTRAINT "categories_organization_slug_unique" UNIQUE("organization_id","slug")
);

CREATE TABLE "domain_activation_attempts" (
	"organization_id" uuid NOT NULL,
	"id" uuid NOT NULL,
	"site_id" uuid NOT NULL,
	"hostname" text NOT NULL,
	"activation_state" text NOT NULL,
	"status" "task_status" DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"next_attempt_at" timestamp with time zone DEFAULT now() NOT NULL,
	"external_status" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "domain_activation_attempts_pk" PRIMARY KEY("organization_id","id"),
	CONSTRAINT "domain_activation_attempts_nonnegative" CHECK ("domain_activation_attempts"."attempts" >= 0)
);

CREATE TABLE "invalidation_tasks" (
	"organization_id" uuid NOT NULL,
	"id" uuid NOT NULL,
	"site_id" uuid NOT NULL,
	"previous_hostname" text,
	"current_hostname" text,
	"tags" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"urls" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"reason" text NOT NULL,
	"status" "task_status" DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"next_attempt_at" timestamp with time zone DEFAULT now() NOT NULL,
	"sanitized_failure" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "invalidation_tasks_pk" PRIMARY KEY("organization_id","id")
);

CREATE TABLE "media" (
	"organization_id" uuid NOT NULL,
	"id" uuid NOT NULL,
	"object_key" text NOT NULL,
	"purpose" text NOT NULL,
	"media_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"checksum" text NOT NULL,
	"state" "media_state" DEFAULT 'reserved' NOT NULL,
	"article_id" uuid,
	"site_id" uuid,
	"organization_asset" boolean DEFAULT false NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "media_pk" PRIMARY KEY("organization_id","id"),
	CONSTRAINT "media_id_unique" UNIQUE("id"),
	CONSTRAINT "media_object_key_unique" UNIQUE("object_key"),
	CONSTRAINT "media_exactly_one_owner" CHECK (num_nonnulls("media"."article_id", "media"."site_id") + CASE WHEN "media"."organization_asset" THEN 1 ELSE 0 END = 1),
	CONSTRAINT "media_owner_prefix" CHECK ((
    ("media"."article_id" IS NOT NULL AND "media"."object_key" LIKE ('articles/' || "media"."article_id"::text || '/%'))
    OR ("media"."site_id" IS NOT NULL AND "media"."object_key" LIKE ('sites/' || "media"."site_id"::text || '/%'))
    OR ("media"."organization_asset" AND "media"."object_key" LIKE 'assets/%')
  )),
	CONSTRAINT "media_size_positive" CHECK ("media"."size_bytes" > 0 AND "media"."version" > 0)
);

CREATE TABLE "media_key_reservations" (
	"organization_id" uuid NOT NULL,
	"id" uuid NOT NULL,
	"object_key" text NOT NULL,
	"purpose" text NOT NULL,
	"article_id" uuid,
	"site_id" uuid,
	"organization_asset" boolean DEFAULT false NOT NULL,
	"expected_media_type" text NOT NULL,
	"expected_size_bytes" integer NOT NULL,
	"expected_checksum" text,
	"status" "reservation_status" DEFAULT 'reserved' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "media_key_reservations_pk" PRIMARY KEY("organization_id","id"),
	CONSTRAINT "media_key_reservations_object_key_unique" UNIQUE("object_key"),
	CONSTRAINT "media_key_reservation_exactly_one_owner" CHECK (num_nonnulls("media_key_reservations"."article_id", "media_key_reservations"."site_id") + CASE WHEN "media_key_reservations"."organization_asset" THEN 1 ELSE 0 END = 1),
	CONSTRAINT "media_key_reservation_size_positive" CHECK ("media_key_reservations"."expected_size_bytes" > 0)
);

CREATE TABLE "object_cleanup_tasks" (
	"organization_id" uuid NOT NULL,
	"id" uuid NOT NULL,
	"object_key" text NOT NULL,
	"reason" text NOT NULL,
	"status" "task_status" DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"next_attempt_at" timestamp with time zone DEFAULT now() NOT NULL,
	"sanitized_failure" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "object_cleanup_tasks_pk" PRIMARY KEY("organization_id","id"),
	CONSTRAINT "object_cleanup_tasks_attempts_nonnegative" CHECK ("object_cleanup_tasks"."attempts" >= 0)
);

CREATE TABLE "official_affiliations" (
	"organization_id" uuid NOT NULL,
	"id" uuid NOT NULL,
	"publisher_id" uuid NOT NULL,
	"site_id" uuid NOT NULL,
	"institution_name" text NOT NULL,
	"claim_scopes" text[] NOT NULL,
	"evidence_reference" text NOT NULL,
	"active" boolean DEFAULT false NOT NULL,
	"verified_at" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "official_affiliations_pk" PRIMARY KEY("organization_id","id"),
	CONSTRAINT "official_affiliations_org_publisher_site_institution_unique" UNIQUE("organization_id","publisher_id","site_id","institution_name")
);

CREATE TABLE "publishers" (
	"organization_id" uuid NOT NULL,
	"id" uuid NOT NULL,
	"name" text NOT NULL,
	"type" "publisher_type" NOT NULL,
	"verification_status" "publisher_verification_status" DEFAULT 'unverified' NOT NULL,
	"attribution_label" text NOT NULL,
	"contacts" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"evidence_reference" text,
	"submitted_by" uuid,
	"submitted_at" timestamp with time zone,
	"verified_by" uuid,
	"verified_at" timestamp with time zone,
	"rejection_reason" text,
	"status" "record_status" DEFAULT 'active' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "publishers_pk" PRIMARY KEY("organization_id","id"),
	CONSTRAINT "publishers_id_unique" UNIQUE("id"),
	CONSTRAINT "publishers_version_positive" CHECK ("publishers"."version" > 0)
);

CREATE TABLE "site_settings" (
	"organization_id" uuid NOT NULL,
	"site_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"colors" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"social_links" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"seo" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"navigation" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"logo_media_id" uuid,
	"favicon_media_id" uuid,
	"fallback_media_id" uuid,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "site_settings_pk" PRIMARY KEY("organization_id","site_id"),
	CONSTRAINT "site_settings_version_positive" CHECK ("site_settings"."version" > 0)
);

CREATE TABLE "api_keys" (
	"organization_id" uuid NOT NULL,
	"id" uuid NOT NULL,
	"lookup_id" text NOT NULL,
	"salt" text NOT NULL,
	"verification_hash" text NOT NULL,
	"scopes" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"status" "api_key_status" DEFAULT 'active' NOT NULL,
	"predecessor_id" uuid,
	"expires_at" timestamp with time zone,
	"last_used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "api_keys_pk" PRIMARY KEY("organization_id","id"),
	CONSTRAINT "api_keys_lookup_id_unique" UNIQUE("lookup_id")
);

CREATE TABLE "domains" (
	"organization_id" uuid NOT NULL,
	"id" uuid NOT NULL,
	"normalized_hostname" text NOT NULL,
	"status" "record_status" DEFAULT 'inactive' NOT NULL,
	"cloudflare_zone_id" text,
	"routing_version" integer DEFAULT 1 NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "domains_pk" PRIMARY KEY("organization_id","id"),
	CONSTRAINT "domains_id_unique" UNIQUE("id"),
	CONSTRAINT "domains_normalized_hostname_unique" UNIQUE("normalized_hostname"),
	CONSTRAINT "domains_hostname_length" CHECK (length("domains"."normalized_hostname") BETWEEN 3 AND 253),
	CONSTRAINT "domains_versions_positive" CHECK ("domains"."routing_version" > 0 AND "domains"."version" > 0)
);

CREATE TABLE "memberships" (
	"organization_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role_id" uuid NOT NULL,
	"status" "record_status" DEFAULT 'active' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "memberships_pk" PRIMARY KEY("organization_id","user_id"),
	CONSTRAINT "memberships_version_positive" CHECK ("memberships"."version" > 0)
);

CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"status" "record_status" DEFAULT 'active' NOT NULL,
	"customer_metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "organizations_slug_unique" UNIQUE("slug"),
	CONSTRAINT "organizations_version_positive" CHECK ("organizations"."version" > 0)
);

CREATE TABLE "permissions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid,
	"name" text NOT NULL,
	"scope" "permission_scope" NOT NULL,
	"description" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "permissions_scope_organization_check" CHECK ((
    ("permissions"."scope" = 'platform' AND "permissions"."organization_id" IS NULL)
    OR ("permissions"."scope" = 'organization' AND "permissions"."organization_id" IS NOT NULL)
  ))
);

CREATE TABLE "regions" (
	"organization_id" uuid NOT NULL,
	"id" uuid NOT NULL,
	"external_key" text NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"status" "record_status" DEFAULT 'active' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "regions_pk" PRIMARY KEY("organization_id","id"),
	CONSTRAINT "regions_id_unique" UNIQUE("id"),
	CONSTRAINT "regions_organization_external_key_unique" UNIQUE("organization_id","external_key"),
	CONSTRAINT "regions_organization_slug_unique" UNIQUE("organization_id","slug"),
	CONSTRAINT "regions_slug_format" CHECK ("regions"."slug" ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

CREATE TABLE "role_permissions" (
	"organization_id" uuid NOT NULL,
	"role_id" uuid NOT NULL,
	"permission_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "role_permissions_pk" PRIMARY KEY("organization_id","role_id","permission_id")
);

CREATE TABLE "roles" (
	"organization_id" uuid NOT NULL,
	"id" uuid NOT NULL,
	"name" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "roles_pk" PRIMARY KEY("organization_id","id"),
	CONSTRAINT "roles_organization_name_unique" UNIQUE("organization_id","name"),
	CONSTRAINT "roles_version_positive" CHECK ("roles"."version" > 0)
);

CREATE TABLE "sites" (
	"organization_id" uuid NOT NULL,
	"id" uuid NOT NULL,
	"domain_id" uuid NOT NULL,
	"region_id" uuid,
	"normalized_hostname" text NOT NULL,
	"status" "record_status" DEFAULT 'inactive' NOT NULL,
	"activation_state" "site_activation_state" DEFAULT 'inactive' NOT NULL,
	"routing_version" integer DEFAULT 1 NOT NULL,
	"content_version" integer DEFAULT 1 NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sites_pk" PRIMARY KEY("organization_id","id"),
	CONSTRAINT "sites_id_unique" UNIQUE("id"),
	CONSTRAINT "sites_normalized_hostname_unique" UNIQUE("normalized_hostname"),
	CONSTRAINT "sites_versions_positive" CHECK ("sites"."routing_version" > 0 AND "sites"."content_version" > 0 AND "sites"."version" > 0)
);

CREATE TABLE "subscriptions" (
	"organization_id" uuid PRIMARY KEY NOT NULL,
	"plan" text NOT NULL,
	"status" "subscription_status" NOT NULL,
	"period_starts_at" timestamp with time zone,
	"period_ends_at" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "subscriptions_version_positive" CHECK ("subscriptions"."version" > 0)
);

CREATE TABLE "telegram_identity_mappings" (
	"organization_id" uuid NOT NULL,
	"id" uuid NOT NULL,
	"telegram_user_id" text NOT NULL,
	"telegram_chat_id" text NOT NULL,
	"user_id" uuid NOT NULL,
	"role_id" uuid NOT NULL,
	"status" "record_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "telegram_identity_mappings_pk" PRIMARY KEY("organization_id","id"),
	CONSTRAINT "telegram_identity_org_user_chat_unique" UNIQUE("organization_id","telegram_user_id","telegram_chat_id")
);

CREATE TABLE "users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"auth_user_id" uuid NOT NULL,
	"display_name" text NOT NULL,
	"email" text,
	"status" "record_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_auth_user_id_unique" UNIQUE("auth_user_id")
);

CREATE TABLE "migration_gate_events" (
	"id" uuid PRIMARY KEY NOT NULL,
	"required_version" integer NOT NULL,
	"actual_version" integer,
	"status" "task_status" NOT NULL,
	"checked_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "migration_gate_required_version_positive" CHECK ("migration_gate_events"."required_version" > 0)
);

CREATE TABLE "indicate_schema_migrations" (
	"version" integer PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"checksum" text NOT NULL,
	"applied_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "publication_transition_receipts" (
	"organization_id" uuid NOT NULL,
	"id" uuid NOT NULL,
	"transition_id" uuid NOT NULL,
	"job_id" uuid NOT NULL,
	"target_id" uuid,
	"from_state" "publishing_state" NOT NULL,
	"to_state" "publishing_state" NOT NULL,
	"fencing_token" integer NOT NULL,
	"acknowledged_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "publication_transition_receipts_pk" PRIMARY KEY("organization_id","id"),
	CONSTRAINT "publication_transition_receipts_transition_unique" UNIQUE("transition_id")
);

CREATE TABLE "publishing_job_targets" (
	"organization_id" uuid NOT NULL,
	"id" uuid NOT NULL,
	"job_id" uuid NOT NULL,
	"article_site_id" uuid NOT NULL,
	"state" "publishing_state" DEFAULT 'queued' NOT NULL,
	"attempt" integer DEFAULT 0 NOT NULL,
	"fencing_token" integer DEFAULT 0 NOT NULL,
	"next_attempt_at" timestamp with time zone DEFAULT now() NOT NULL,
	"started_at" timestamp with time zone,
	"finished_at" timestamp with time zone,
	"sanitized_error" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "publishing_job_targets_pk" PRIMARY KEY("organization_id","id"),
	CONSTRAINT "publishing_job_targets_id_unique" UNIQUE("id"),
	CONSTRAINT "publishing_job_targets_job_article_site_unique" UNIQUE("organization_id","job_id","article_site_id"),
	CONSTRAINT "publishing_job_targets_bounded_fields" CHECK ("publishing_job_targets"."attempt" >= 0 AND "publishing_job_targets"."fencing_token" >= 0)
);

CREATE TABLE "publishing_jobs" (
	"organization_id" uuid NOT NULL,
	"id" uuid NOT NULL,
	"article_id" uuid NOT NULL,
	"idempotency_key" text NOT NULL,
	"fingerprint" text NOT NULL,
	"fingerprint_version" integer DEFAULT 1 NOT NULL,
	"state" "publishing_state" DEFAULT 'queued' NOT NULL,
	"options" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"dispatch_status" "dispatch_status" DEFAULT 'pending' NOT NULL,
	"dispatch_attempts" integer DEFAULT 0 NOT NULL,
	"next_dispatch_at" timestamp with time zone DEFAULT now() NOT NULL,
	"lease_owner" text,
	"lease_expires_at" timestamp with time zone,
	"fencing_token" integer DEFAULT 0 NOT NULL,
	"finalized_at" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "publishing_jobs_pk" PRIMARY KEY("organization_id","id"),
	CONSTRAINT "publishing_jobs_id_unique" UNIQUE("id"),
	CONSTRAINT "publishing_jobs_organization_idempotency_unique" UNIQUE("organization_id","idempotency_key"),
	CONSTRAINT "publishing_jobs_bounded_fields" CHECK ("publishing_jobs"."fingerprint_version" > 0 AND "publishing_jobs"."dispatch_attempts" >= 0 AND "publishing_jobs"."fencing_token" >= 0 AND "publishing_jobs"."version" > 0),
	CONSTRAINT "publishing_jobs_idempotency_length" CHECK (length("publishing_jobs"."idempotency_key") BETWEEN 1 AND 200)
);

CREATE TABLE "seed_runs" (
	"organization_id" uuid NOT NULL,
	"id" uuid NOT NULL,
	"config_fingerprint" text NOT NULL,
	"status" "seed_run_status" NOT NULL,
	"created_count" integer DEFAULT 0 NOT NULL,
	"updated_count" integer DEFAULT 0 NOT NULL,
	"unchanged_count" integer DEFAULT 0 NOT NULL,
	"failed_count" integer DEFAULT 0 NOT NULL,
	"sanitized_failure" jsonb,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	CONSTRAINT "seed_runs_pk" PRIMARY KEY("organization_id","id"),
	CONSTRAINT "seed_runs_counts_nonnegative" CHECK ("seed_runs"."created_count" >= 0 AND "seed_runs"."updated_count" >= 0 AND "seed_runs"."unchanged_count" >= 0 AND "seed_runs"."failed_count" >= 0)
);

CREATE TABLE "webhook_replay_claims" (
	"source" text NOT NULL,
	"replay_id" text NOT NULL,
	"organization_id" uuid,
	"status" "replay_claim_status" DEFAULT 'claimed' NOT NULL,
	"outcome_reference" text,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	CONSTRAINT "webhook_replay_claims_pk" PRIMARY KEY("source","replay_id"),
	CONSTRAINT "webhook_replay_claims_bounded_identity" CHECK (length("webhook_replay_claims"."source") BETWEEN 1 AND 100 AND length("webhook_replay_claims"."replay_id") BETWEEN 1 AND 255)
);

ALTER TABLE "article_sites" ADD CONSTRAINT "article_sites_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "article_sites" ADD CONSTRAINT "article_sites_article_fk" FOREIGN KEY ("organization_id","article_id") REFERENCES "public"."articles"("organization_id","id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "article_sites" ADD CONSTRAINT "article_sites_site_fk" FOREIGN KEY ("organization_id","site_id") REFERENCES "public"."sites"("organization_id","id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "articles" ADD CONSTRAINT "articles_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "articles" ADD CONSTRAINT "articles_region_fk" FOREIGN KEY ("organization_id","region_id") REFERENCES "public"."regions"("organization_id","id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "articles" ADD CONSTRAINT "articles_publisher_fk" FOREIGN KEY ("organization_id","publisher_id") REFERENCES "public"."publishers"("organization_id","id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "articles" ADD CONSTRAINT "articles_category_fk" FOREIGN KEY ("organization_id","category_id") REFERENCES "public"."categories"("organization_id","id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "articles" ADD CONSTRAINT "articles_author_fk" FOREIGN KEY ("organization_id","author_id") REFERENCES "public"."authors"("organization_id","id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "authors" ADD CONSTRAINT "authors_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "categories" ADD CONSTRAINT "categories_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "domain_activation_attempts" ADD CONSTRAINT "domain_activation_attempts_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "domain_activation_attempts" ADD CONSTRAINT "domain_activation_attempts_site_fk" FOREIGN KEY ("organization_id","site_id") REFERENCES "public"."sites"("organization_id","id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "invalidation_tasks" ADD CONSTRAINT "invalidation_tasks_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "invalidation_tasks" ADD CONSTRAINT "invalidation_tasks_site_fk" FOREIGN KEY ("organization_id","site_id") REFERENCES "public"."sites"("organization_id","id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "media" ADD CONSTRAINT "media_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "media" ADD CONSTRAINT "media_article_fk" FOREIGN KEY ("organization_id","article_id") REFERENCES "public"."articles"("organization_id","id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "media" ADD CONSTRAINT "media_site_fk" FOREIGN KEY ("organization_id","site_id") REFERENCES "public"."sites"("organization_id","id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "media_key_reservations" ADD CONSTRAINT "media_key_reservations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "media_key_reservations" ADD CONSTRAINT "media_key_reservations_article_fk" FOREIGN KEY ("organization_id","article_id") REFERENCES "public"."articles"("organization_id","id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "media_key_reservations" ADD CONSTRAINT "media_key_reservations_site_fk" FOREIGN KEY ("organization_id","site_id") REFERENCES "public"."sites"("organization_id","id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "object_cleanup_tasks" ADD CONSTRAINT "object_cleanup_tasks_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "official_affiliations" ADD CONSTRAINT "official_affiliations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "official_affiliations" ADD CONSTRAINT "official_affiliations_publisher_fk" FOREIGN KEY ("organization_id","publisher_id") REFERENCES "public"."publishers"("organization_id","id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "official_affiliations" ADD CONSTRAINT "official_affiliations_site_fk" FOREIGN KEY ("organization_id","site_id") REFERENCES "public"."sites"("organization_id","id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "publishers" ADD CONSTRAINT "publishers_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_site_fk" FOREIGN KEY ("organization_id","site_id") REFERENCES "public"."sites"("organization_id","id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_logo_media_fk" FOREIGN KEY ("organization_id","logo_media_id") REFERENCES "public"."media"("organization_id","id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_favicon_media_fk" FOREIGN KEY ("organization_id","favicon_media_id") REFERENCES "public"."media"("organization_id","id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_fallback_media_fk" FOREIGN KEY ("organization_id","fallback_media_id") REFERENCES "public"."media"("organization_id","id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_predecessor_fk" FOREIGN KEY ("organization_id","predecessor_id") REFERENCES "public"."api_keys"("organization_id","id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "domains" ADD CONSTRAINT "domains_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_role_fk" FOREIGN KEY ("organization_id","role_id") REFERENCES "public"."roles"("organization_id","id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "permissions" ADD CONSTRAINT "permissions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "regions" ADD CONSTRAINT "regions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_permissions_id_fk" FOREIGN KEY ("permission_id") REFERENCES "public"."permissions"("id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_fk" FOREIGN KEY ("organization_id","role_id") REFERENCES "public"."roles"("organization_id","id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "roles" ADD CONSTRAINT "roles_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "sites" ADD CONSTRAINT "sites_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "sites" ADD CONSTRAINT "sites_domain_fk" FOREIGN KEY ("organization_id","domain_id") REFERENCES "public"."domains"("organization_id","id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "sites" ADD CONSTRAINT "sites_region_fk" FOREIGN KEY ("organization_id","region_id") REFERENCES "public"."regions"("organization_id","id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "telegram_identity_mappings" ADD CONSTRAINT "telegram_identity_mappings_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "telegram_identity_mappings" ADD CONSTRAINT "telegram_identity_membership_fk" FOREIGN KEY ("organization_id","user_id") REFERENCES "public"."memberships"("organization_id","user_id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "telegram_identity_mappings" ADD CONSTRAINT "telegram_identity_role_fk" FOREIGN KEY ("organization_id","role_id") REFERENCES "public"."roles"("organization_id","id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "publication_transition_receipts" ADD CONSTRAINT "publication_transition_receipts_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "publication_transition_receipts" ADD CONSTRAINT "publication_transition_receipts_job_fk" FOREIGN KEY ("organization_id","job_id") REFERENCES "public"."publishing_jobs"("organization_id","id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "publication_transition_receipts" ADD CONSTRAINT "publication_transition_receipts_target_fk" FOREIGN KEY ("organization_id","target_id") REFERENCES "public"."publishing_job_targets"("organization_id","id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "publishing_job_targets" ADD CONSTRAINT "publishing_job_targets_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "publishing_job_targets" ADD CONSTRAINT "publishing_job_targets_job_fk" FOREIGN KEY ("organization_id","job_id") REFERENCES "public"."publishing_jobs"("organization_id","id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "publishing_job_targets" ADD CONSTRAINT "publishing_job_targets_article_site_fk" FOREIGN KEY ("organization_id","article_site_id") REFERENCES "public"."article_sites"("organization_id","id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "publishing_jobs" ADD CONSTRAINT "publishing_jobs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "publishing_jobs" ADD CONSTRAINT "publishing_jobs_article_fk" FOREIGN KEY ("organization_id","article_id") REFERENCES "public"."articles"("organization_id","id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "seed_runs" ADD CONSTRAINT "seed_runs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "webhook_replay_claims" ADD CONSTRAINT "webhook_replay_claims_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;
CREATE INDEX "article_sites_site_state_date_idx" ON "article_sites" USING btree ("organization_id","site_id","state","published_at");
CREATE INDEX "articles_organization_status_date_idx" ON "articles" USING btree ("organization_id","status","published_at");
CREATE INDEX "articles_organization_region_idx" ON "articles" USING btree ("organization_id","region_id");
CREATE INDEX "articles_organization_category_idx" ON "articles" USING btree ("organization_id","category_id");
CREATE INDEX "audit_logs_organization_date_idx" ON "audit_logs" USING btree ("organization_id","occurred_at");
CREATE INDEX "audit_logs_organization_action_target_idx" ON "audit_logs" USING btree ("organization_id","action","target_type");
CREATE INDEX "audit_logs_organization_actor_outcome_idx" ON "audit_logs" USING btree ("organization_id","actor_id","outcome");
CREATE INDEX "authors_organization_status_name_idx" ON "authors" USING btree ("organization_id","status","display_name");
CREATE INDEX "categories_organization_status_idx" ON "categories" USING btree ("organization_id","status");
CREATE INDEX "domain_activation_attempts_due_idx" ON "domain_activation_attempts" USING btree ("status","next_attempt_at");
CREATE INDEX "invalidation_tasks_due_idx" ON "invalidation_tasks" USING btree ("status","next_attempt_at");
CREATE INDEX "media_organization_state_idx" ON "media" USING btree ("organization_id","state");
CREATE INDEX "media_key_reservations_expiry_status_idx" ON "media_key_reservations" USING btree ("status","expires_at");
CREATE INDEX "object_cleanup_tasks_due_idx" ON "object_cleanup_tasks" USING btree ("status","next_attempt_at");
CREATE INDEX "official_affiliations_active_idx" ON "official_affiliations" USING btree ("organization_id","publisher_id","site_id","active");
CREATE INDEX "publishers_organization_status_type_idx" ON "publishers" USING btree ("organization_id","status","type");
CREATE INDEX "api_keys_organization_status_idx" ON "api_keys" USING btree ("organization_id","status");
CREATE INDEX "domains_organization_status_idx" ON "domains" USING btree ("organization_id","status");
CREATE INDEX "memberships_user_status_idx" ON "memberships" USING btree ("user_id","status");
CREATE INDEX "memberships_organization_role_idx" ON "memberships" USING btree ("organization_id","role_id","status");
CREATE INDEX "organizations_status_idx" ON "organizations" USING btree ("status");
CREATE UNIQUE INDEX "permissions_platform_name_unique" ON "permissions" USING btree ("name") WHERE "permissions"."scope" = 'platform';
CREATE UNIQUE INDEX "permissions_organization_name_unique" ON "permissions" USING btree ("organization_id","name") WHERE "permissions"."scope" = 'organization';
CREATE INDEX "regions_organization_status_idx" ON "regions" USING btree ("organization_id","status");
CREATE INDEX "roles_organization_active_idx" ON "roles" USING btree ("organization_id","active");
CREATE INDEX "sites_exact_active_hostname_idx" ON "sites" USING btree ("normalized_hostname","status","activation_state");
CREATE INDEX "sites_organization_domain_idx" ON "sites" USING btree ("organization_id","domain_id");
CREATE INDEX "telegram_identity_status_idx" ON "telegram_identity_mappings" USING btree ("organization_id","status");
CREATE INDEX "users_status_idx" ON "users" USING btree ("status");
CREATE INDEX "publication_transition_receipts_unacknowledged_idx" ON "publication_transition_receipts" USING btree ("acknowledged_at");
CREATE UNIQUE INDEX "publishing_job_targets_active_article_site_unique" ON "publishing_job_targets" USING btree ("organization_id","article_site_id") WHERE "publishing_job_targets"."state" IN ('queued', 'processing', 'retrying');
CREATE INDEX "publishing_job_targets_job_state_idx" ON "publishing_job_targets" USING btree ("organization_id","job_id","state");
CREATE INDEX "publishing_job_targets_retry_due_idx" ON "publishing_job_targets" USING btree ("state","next_attempt_at");
CREATE INDEX "publishing_jobs_dispatch_due_idx" ON "publishing_jobs" USING btree ("dispatch_status","next_dispatch_at");
CREATE INDEX "publishing_jobs_state_lease_idx" ON "publishing_jobs" USING btree ("state","lease_expires_at");
CREATE INDEX "publishing_jobs_organization_date_idx" ON "publishing_jobs" USING btree ("organization_id","created_at");
CREATE UNIQUE INDEX "seed_runs_successful_fingerprint_unique" ON "seed_runs" USING btree ("organization_id","config_fingerprint") WHERE "seed_runs"."status" = 'completed';
CREATE INDEX "webhook_replay_claims_expiry_idx" ON "webhook_replay_claims" USING btree ("expires_at");

INSERT INTO drizzle."__drizzle_migrations" ("hash", "created_at") VALUES ('f7163225de73270a59d8675e2d44f0ea9706a96a01bde339f36b487e65218dc0', 1788105281761);

-- ----------------------------------------------------------------------
-- 20260903000500_security
-- ----------------------------------------------------------------------
-- Phase 2 defense-in-depth security, coherence, grants, and migration gate metadata.
CREATE SCHEMA IF NOT EXISTS indicate_private;

CREATE OR REPLACE FUNCTION indicate_private.current_organization_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(current_setting('app.organization_id', true), '')::uuid
$$;

CREATE OR REPLACE FUNCTION indicate_private.current_auth_user_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(current_setting('app.auth_user_id', true), '')::uuid
$$;

CREATE OR REPLACE FUNCTION indicate_private.set_tenant_context(
  requested_organization_id uuid,
  requested_actor_id text,
  requested_request_id text
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  existing_organization_id text;
BEGIN
  IF requested_organization_id IS NULL OR requested_actor_id IS NULL OR requested_request_id IS NULL THEN
    RAISE EXCEPTION 'tenant context is required' USING ERRCODE = '42501';
  END IF;
  existing_organization_id := current_setting('app.organization_id', true);
  IF existing_organization_id IS NOT NULL AND existing_organization_id <> ''
     AND existing_organization_id <> requested_organization_id::text THEN
    RAISE EXCEPTION 'tenant context conflict' USING ERRCODE = '42501';
  END IF;
  PERFORM set_config('app.organization_id', requested_organization_id::text, true);
  PERFORM set_config('app.actor_id', requested_actor_id, true);
  PERFORM set_config('app.request_id', requested_request_id, true);
END;
$$;

ALTER TABLE "articles"
  ADD CONSTRAINT "articles_lead_media_fk"
  FOREIGN KEY ("organization_id", "lead_media_id")
  REFERENCES "media" ("organization_id", "id")
  ON DELETE RESTRICT;

CREATE OR REPLACE FUNCTION indicate_private.enforce_role_permission_scope()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  permission_record permissions%ROWTYPE;
BEGIN
  SELECT * INTO permission_record FROM permissions WHERE id = NEW.permission_id;
  IF NOT FOUND OR (
    permission_record.scope = 'organization'
    AND permission_record.organization_id IS DISTINCT FROM NEW.organization_id
  ) THEN
    RAISE EXCEPTION 'role permission organization mismatch' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER role_permissions_scope_guard
BEFORE INSERT OR UPDATE ON role_permissions
FOR EACH ROW EXECUTE FUNCTION indicate_private.enforce_role_permission_scope();

CREATE OR REPLACE FUNCTION indicate_private.enforce_telegram_membership_role()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM memberships
    WHERE organization_id = NEW.organization_id
      AND user_id = NEW.user_id
      AND role_id = NEW.role_id
      AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'telegram mapping membership mismatch' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER telegram_mapping_membership_role_guard
BEFORE INSERT OR UPDATE ON telegram_identity_mappings
FOR EACH ROW EXECUTE FUNCTION indicate_private.enforce_telegram_membership_role();

CREATE OR REPLACE FUNCTION indicate_private.enforce_site_hostname_shape()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  root_hostname text;
  region_slug text;
BEGIN
  SELECT normalized_hostname INTO root_hostname
  FROM domains WHERE organization_id = NEW.organization_id AND id = NEW.domain_id;
  IF root_hostname IS NULL THEN
    RAISE EXCEPTION 'site domain unavailable' USING ERRCODE = '23503';
  END IF;
  IF NEW.region_id IS NULL THEN
    IF NEW.normalized_hostname <> root_hostname THEN
      RAISE EXCEPTION 'apex site hostname mismatch' USING ERRCODE = '23514';
    END IF;
  ELSE
    SELECT slug INTO region_slug
    FROM regions WHERE organization_id = NEW.organization_id AND id = NEW.region_id;
    IF region_slug IS NULL OR NEW.normalized_hostname <> region_slug || '.' || root_hostname THEN
      RAISE EXCEPTION 'regional site hostname mismatch' USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER sites_hostname_shape_guard
BEFORE INSERT OR UPDATE OF organization_id, domain_id, region_id, normalized_hostname ON sites
FOR EACH ROW EXECUTE FUNCTION indicate_private.enforce_site_hostname_shape();

CREATE OR REPLACE FUNCTION indicate_private.enforce_job_target_article()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  job_article_id uuid;
  target_article_id uuid;
BEGIN
  SELECT article_id INTO job_article_id FROM publishing_jobs
    WHERE organization_id = NEW.organization_id AND id = NEW.job_id;
  SELECT article_id INTO target_article_id FROM article_sites
    WHERE organization_id = NEW.organization_id AND id = NEW.article_site_id;
  IF job_article_id IS NULL OR target_article_id IS NULL OR job_article_id <> target_article_id THEN
    RAISE EXCEPTION 'publishing target article mismatch' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER publishing_job_targets_article_guard
BEFORE INSERT OR UPDATE ON publishing_job_targets
FOR EACH ROW EXECUTE FUNCTION indicate_private.enforce_job_target_article();

CREATE OR REPLACE FUNCTION indicate_private.reject_audit_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'audit logs are append-only' USING ERRCODE = '42501';
END;
$$;

CREATE TRIGGER audit_logs_append_only_guard
BEFORE UPDATE OR DELETE ON audit_logs
FOR EACH ROW EXECUTE FUNCTION indicate_private.reject_audit_mutation();

DO $$
DECLARE
  table_name text;
  tenant_tables constant text[] := ARRAY[
    'roles', 'memberships', 'role_permissions', 'domains', 'regions', 'sites',
    'subscriptions', 'api_keys', 'telegram_identity_mappings', 'publishers',
    'official_affiliations', 'categories', 'authors', 'articles', 'article_sites',
    'media', 'site_settings', 'media_key_reservations', 'object_cleanup_tasks',
    'audit_logs', 'domain_activation_attempts', 'invalidation_tasks',
    'publishing_jobs', 'publishing_job_targets', 'publication_transition_receipts',
    'seed_runs'
  ];
BEGIN
  FOREACH table_name IN ARRAY tenant_tables LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', table_name);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I USING (organization_id = indicate_private.current_organization_id()) WITH CHECK (organization_id = indicate_private.current_organization_id())',
      table_name
    );
  END LOOP;
END
$$;

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON organizations
  USING (id = indicate_private.current_organization_id())
  WITH CHECK (id = indicate_private.current_organization_id());

ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions FORCE ROW LEVEL SECURITY;
CREATE POLICY permission_scope_isolation ON permissions
  USING (scope = 'platform' OR organization_id = indicate_private.current_organization_id())
  WITH CHECK (scope = 'platform' OR organization_id = indicate_private.current_organization_id());

ALTER TABLE webhook_replay_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_replay_claims FORCE ROW LEVEL SECURITY;
CREATE POLICY webhook_replay_tenant_isolation ON webhook_replay_claims
  USING (organization_id IS NULL OR organization_id = indicate_private.current_organization_id())
  WITH CHECK (organization_id IS NULL OR organization_id = indicate_private.current_organization_id());

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE users FORCE ROW LEVEL SECURITY;
CREATE POLICY auth_identity_isolation ON users
  USING (auth_user_id = indicate_private.current_auth_user_id())
  WITH CHECK (auth_user_id = indicate_private.current_auth_user_id());

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'indicate_runtime') THEN
    CREATE ROLE indicate_runtime LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
  END IF;
END
$$;

REVOKE ALL ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public, indicate_private TO indicate_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO indicate_runtime;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON permissions FROM indicate_runtime;
GRANT SELECT ON permissions TO indicate_runtime;
REVOKE UPDATE, DELETE, TRUNCATE ON audit_logs FROM indicate_runtime;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON indicate_schema_migrations, migration_gate_events FROM indicate_runtime;
GRANT SELECT ON indicate_schema_migrations TO indicate_runtime;
GRANT EXECUTE ON FUNCTION indicate_private.set_tenant_context(uuid, text, text) TO indicate_runtime;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO indicate_runtime;

INSERT INTO indicate_schema_migrations (version, name, checksum)
VALUES
  (1, 'core_schema', 'drizzle-0000'),
  (2, 'security', 'drizzle-0001')
ON CONFLICT (version) DO NOTHING;

INSERT INTO drizzle."__drizzle_migrations" ("hash", "created_at") VALUES ('99d793ebab12f68ad323375409cef6cf7ef60460e36ff13d490173c18698b244', 1788105298677);

-- ----------------------------------------------------------------------
-- 20260903001000_publisher_actor_constraints
-- ----------------------------------------------------------------------
ALTER TABLE "publishers" ADD CONSTRAINT "publishers_submitter_membership_fk" FOREIGN KEY ("organization_id","submitted_by") REFERENCES "public"."memberships"("organization_id","user_id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "publishers" ADD CONSTRAINT "publishers_verifier_membership_fk" FOREIGN KEY ("organization_id","verified_by") REFERENCES "public"."memberships"("organization_id","user_id") ON DELETE restrict ON UPDATE no action;

INSERT INTO indicate_schema_migrations (version, name, checksum)
VALUES (3, 'publisher_actor_constraints', 'drizzle-0002')
ON CONFLICT (version) DO NOTHING;

INSERT INTO drizzle."__drizzle_migrations" ("hash", "created_at") VALUES ('3aa4a6b1ff287d891612bab6f7334887e3def437124c198b7766220177b806e2', 1788106167567);

-- ----------------------------------------------------------------------
-- 20260903001500_authorization_hardening
-- ----------------------------------------------------------------------
-- Phase 2 reciprocal Telegram coherence and authorization hardening.
CREATE OR REPLACE FUNCTION indicate_private.enforce_telegram_membership_role()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status <> 'active' THEN
    RETURN NEW;
  END IF;
  PERFORM 1
  FROM memberships
  WHERE organization_id = NEW.organization_id
    AND user_id = NEW.user_id
    AND role_id = NEW.role_id
    AND status = 'active'
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'telegram mapping membership mismatch' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION indicate_private.enforce_membership_telegram_coherence()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM telegram_identity_mappings
    WHERE organization_id = NEW.organization_id
      AND user_id = NEW.user_id
      AND status = 'active'
      AND (NEW.status <> 'active' OR role_id <> NEW.role_id)
  ) THEN
    RAISE EXCEPTION 'membership telegram mapping mismatch' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER membership_telegram_mapping_guard
BEFORE UPDATE OF role_id, status ON memberships
FOR EACH ROW EXECUTE FUNCTION indicate_private.enforce_membership_telegram_coherence();

INSERT INTO indicate_schema_migrations (version, name, checksum)
VALUES (4, 'authorization_hardening', 'drizzle-0003')
ON CONFLICT (version) DO NOTHING;

INSERT INTO drizzle."__drizzle_migrations" ("hash", "created_at") VALUES ('873465b97cc0d7578ffb238880c52bca4c7ee38db108b9cbe4e295490b7b2c5f', 1788107000000);

-- ----------------------------------------------------------------------
-- 20260903002000_verified_user_context
-- ----------------------------------------------------------------------
-- Phase 3 verified Supabase Auth context and narrow User projections.
-- Forced users RLS remains unchanged: runtime code must establish a verified identity
-- before any User-backed Membership projection is available.
CREATE OR REPLACE FUNCTION indicate_private.set_verified_user_context(
  requested_auth_user_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, indicate_private
AS $$
DECLARE
  requested_actor_id text;
BEGIN
  requested_actor_id := current_setting('app.actor_id', true);
  IF requested_auth_user_id IS NULL OR requested_actor_id IS NULL OR requested_actor_id = '' THEN
    RAISE EXCEPTION 'verified user context is required' USING ERRCODE = '42501';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.users
    WHERE id::text = requested_actor_id
      AND auth_user_id = requested_auth_user_id
      AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'verified user context mismatch' USING ERRCODE = '42501';
  END IF;
  PERFORM set_config('app.auth_user_id', requested_auth_user_id::text, true);
END;
$$;

CREATE OR REPLACE FUNCTION indicate_private.current_verified_user_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, indicate_private
AS $$
  SELECT id
  FROM public.users
  WHERE auth_user_id = indicate_private.current_auth_user_id()
    AND id::text = current_setting('app.actor_id', true)
    AND status = 'active'
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION indicate_private.lookup_user_display_name(
  requested_user_id uuid
)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, indicate_private
AS $$
  SELECT target_user.display_name
  FROM public.users AS target_user
  WHERE target_user.id = requested_user_id
    AND indicate_private.current_verified_user_id() IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.memberships AS caller_membership
      WHERE caller_membership.organization_id = indicate_private.current_organization_id()
        AND caller_membership.user_id = indicate_private.current_verified_user_id()
        AND caller_membership.status = 'active'
    )
  LIMIT 1
$$;

REVOKE ALL ON FUNCTION indicate_private.set_verified_user_context(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION indicate_private.current_verified_user_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION indicate_private.lookup_user_display_name(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.set_verified_user_context(uuid) TO indicate_runtime;
GRANT EXECUTE ON FUNCTION indicate_private.current_verified_user_id() TO indicate_runtime;
GRANT EXECUTE ON FUNCTION indicate_private.lookup_user_display_name(uuid) TO indicate_runtime;

INSERT INTO indicate_schema_migrations (version, name, checksum)
VALUES (5, 'verified_user_context', 'drizzle-0004')
ON CONFLICT (version) DO NOTHING;

INSERT INTO drizzle."__drizzle_migrations" ("hash", "created_at") VALUES ('1e6283c7f210cda854399aa89f2be245f4c300c406825e1e22023af1c505cd5c', 1788108000000);

-- ----------------------------------------------------------------------
-- 20260903002500_discovery_outcome_timestamp
-- ----------------------------------------------------------------------
-- Phase 3 verified organization discovery and stable Article-Site outcome dates.
-- Existing rows use the best durable historical signal available: published_at for
-- published outcomes, otherwise updated_at, with created_at as the final fallback.
ALTER TABLE public.article_sites
  ADD COLUMN state_occurred_at timestamp with time zone;

UPDATE public.article_sites
SET state_occurred_at = CASE
  WHEN state = 'published' THEN COALESCE(published_at, updated_at, created_at)
  ELSE COALESCE(updated_at, created_at)
END
WHERE state_occurred_at IS NULL;

ALTER TABLE public.article_sites
  ALTER COLUMN state_occurred_at SET DEFAULT now(),
  ALTER COLUMN state_occurred_at SET NOT NULL;

CREATE INDEX article_sites_outcome_date_idx
  ON public.article_sites (organization_id, site_id, state, state_occurred_at);

CREATE OR REPLACE FUNCTION indicate_private.preserve_article_site_state_occurred_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public, indicate_private
AS $$
BEGIN
  IF NEW.state IS DISTINCT FROM OLD.state THEN
    IF NEW.state_occurred_at IS NOT DISTINCT FROM OLD.state_occurred_at THEN
      NEW.state_occurred_at := statement_timestamp();
    END IF;
  ELSE
    NEW.state_occurred_at := OLD.state_occurred_at;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER article_sites_state_occurred_at_guard
BEFORE UPDATE OF state, state_occurred_at ON public.article_sites
FOR EACH ROW EXECUTE FUNCTION indicate_private.preserve_article_site_state_occurred_at();

CREATE OR REPLACE FUNCTION indicate_private.list_active_organizations_for_verified_user()
RETURNS TABLE(id uuid, name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, indicate_private
AS $$
  SELECT organization.id, organization.name
  FROM public.users AS caller
  INNER JOIN public.memberships AS membership
    ON membership.user_id = caller.id
   AND membership.status = 'active'
  INNER JOIN public.organizations AS organization
    ON organization.id = membership.organization_id
   AND organization.status = 'active'
  INNER JOIN public.roles AS role
    ON role.organization_id = membership.organization_id
   AND role.id = membership.role_id
   AND role.active = true
  WHERE caller.id = indicate_private.current_verified_user_id()
    AND caller.status = 'active'
  ORDER BY organization.name, organization.id
$$;

REVOKE ALL ON FUNCTION indicate_private.list_active_organizations_for_verified_user() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.list_active_organizations_for_verified_user() TO indicate_runtime;

INSERT INTO indicate_schema_migrations (version, name, checksum)
VALUES (6, 'discovery_outcome_timestamp', 'drizzle-0005')
ON CONFLICT (version) DO NOTHING;

INSERT INTO drizzle."__drizzle_migrations" ("hash", "created_at") VALUES ('9180df7f535a9478eb51a3c876e76e1994289862a07c24dd245754be75def14c', 1788110000000);

-- ----------------------------------------------------------------------
-- 20260903003000_media_publication_runtime
-- ----------------------------------------------------------------------
-- Phase 4 exact media reservations, immutable publication outcomes, strict transitions, and claimed reconciliation.
ALTER TABLE public.media_key_reservations
  ADD CONSTRAINT media_key_reservation_owner_prefix CHECK (
    (article_id IS NOT NULL AND object_key LIKE ('articles/' || article_id::text || '/%'))
    OR (site_id IS NOT NULL AND object_key LIKE ('sites/' || site_id::text || '/%'))
    OR (organization_asset AND object_key LIKE 'assets/%')
  );

UPDATE public.media_key_reservations
SET status = 'occupied', expected_checksum = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA='
WHERE expected_checksum IS NULL;
ALTER TABLE public.media_key_reservations
  ALTER COLUMN expected_checksum SET NOT NULL,
  ADD CONSTRAINT media_key_reservation_sha256_checksum CHECK (expected_checksum ~ '^[A-Za-z0-9+/]{43}=$');

ALTER TABLE public.publishing_job_targets
  ADD COLUMN published_url text,
  ADD COLUMN published_at timestamptz,
  ADD CONSTRAINT publishing_job_targets_published_outcome CHECK (
    state <> 'published' OR (published_url IS NOT NULL AND published_at IS NOT NULL)
  );

ALTER TABLE public.publishing_jobs
  ADD COLUMN reconciliation_claim_token uuid,
  ADD COLUMN reconciliation_claim_expires_at timestamptz;

ALTER TABLE public.publication_transition_receipts
  ADD COLUMN reconciliation_claim_token uuid,
  ADD COLUMN reconciliation_claim_expires_at timestamptz;

ALTER TABLE public.object_cleanup_tasks
  ADD COLUMN reconciliation_claim_token uuid,
  ADD COLUMN reconciliation_claim_expires_at timestamptz;

CREATE INDEX publishing_jobs_reconciliation_claim_idx
  ON public.publishing_jobs (dispatch_status, reconciliation_claim_expires_at);
CREATE INDEX publication_transition_receipts_claim_idx
  ON public.publication_transition_receipts (acknowledged_at, reconciliation_claim_expires_at);
CREATE INDEX object_cleanup_tasks_claim_idx
  ON public.object_cleanup_tasks (status, reconciliation_claim_expires_at);
CREATE INDEX articles_organization_lead_media_idx
  ON public.articles (organization_id, lead_media_id)
  WHERE lead_media_id IS NOT NULL;

CREATE OR REPLACE FUNCTION indicate_private.enforce_job_transition()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public, indicate_private
AS $$
BEGIN
  IF NEW.state = OLD.state THEN RETURN NEW; END IF;
  IF NOT (
    (OLD.state = 'queued' AND NEW.state IN ('processing', 'retrying', 'failed')) OR
    (OLD.state = 'processing' AND NEW.state IN ('published', 'retrying', 'failed')) OR
    (OLD.state = 'retrying' AND NEW.state IN ('processing', 'failed'))
  ) THEN
    RAISE EXCEPTION 'invalid publishing job state transition' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER publishing_job_transition_guard
BEFORE UPDATE OF state ON public.publishing_jobs
FOR EACH ROW EXECUTE FUNCTION indicate_private.enforce_job_transition();

CREATE OR REPLACE FUNCTION indicate_private.enforce_target_transition()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public, indicate_private
AS $$
BEGIN
  IF NEW.state = OLD.state THEN
    IF OLD.state IN ('published', 'failed') THEN
      NEW.finished_at := OLD.finished_at;
      NEW.published_url := OLD.published_url;
      NEW.published_at := OLD.published_at;
      NEW.sanitized_error := OLD.sanitized_error;
    END IF;
    RETURN NEW;
  END IF;
  IF NOT (
    (OLD.state = 'queued' AND NEW.state = 'processing') OR
    (OLD.state = 'processing' AND NEW.state IN ('published', 'retrying', 'failed')) OR
    (OLD.state = 'retrying' AND NEW.state IN ('processing', 'failed'))
  ) THEN
    RAISE EXCEPTION 'invalid publishing target state transition' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER publishing_target_transition_guard
BEFORE UPDATE OF state ON public.publishing_job_targets
FOR EACH ROW EXECUTE FUNCTION indicate_private.enforce_target_transition();

-- article_sites is the mutable current projection. Normal transitions match target transitions;
-- terminal -> queued is permitted only after a new durable queued job target exists for this relation.
CREATE OR REPLACE FUNCTION indicate_private.enforce_article_site_transition()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public, indicate_private
AS $$
BEGIN
  IF NEW.state = OLD.state THEN RETURN NEW; END IF;
  IF (
    (OLD.state = 'queued' AND NEW.state = 'processing') OR
    (OLD.state = 'processing' AND NEW.state IN ('published', 'retrying', 'failed')) OR
    (OLD.state = 'retrying' AND NEW.state IN ('processing', 'failed'))
  ) THEN RETURN NEW; END IF;
  IF OLD.state IN ('published', 'failed') AND NEW.state = 'queued' AND EXISTS (
    SELECT 1
    FROM public.publishing_job_targets AS target
    INNER JOIN public.publishing_jobs AS job
      ON job.organization_id = target.organization_id AND job.id = target.job_id
    WHERE target.organization_id = OLD.organization_id
      AND target.article_site_id = OLD.id
      AND target.state = 'queued'
      AND job.state = 'queued'
  ) THEN RETURN NEW; END IF;
  RAISE EXCEPTION 'invalid article site current-projection transition' USING ERRCODE = '23514';
END;
$$;

CREATE TRIGGER article_site_transition_guard
BEFORE UPDATE OF state ON public.article_sites
FOR EACH ROW EXECUTE FUNCTION indicate_private.enforce_article_site_transition();

CREATE OR REPLACE FUNCTION indicate_private.claim_dispatch_gaps(
  requested_now timestamptz,
  requested_limit integer,
  requested_token uuid,
  requested_claim_expires_at timestamptz
)
RETURNS TABLE(organization_id uuid, job_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, indicate_private
AS $$
BEGIN
  RETURN QUERY
  WITH candidates AS (
    SELECT job.organization_id, job.id
    FROM public.publishing_jobs AS job
    WHERE job.state IN ('queued', 'retrying')
      AND job.dispatch_status = 'pending'
      AND job.next_dispatch_at <= requested_now
      AND (job.reconciliation_claim_expires_at IS NULL OR job.reconciliation_claim_expires_at <= requested_now)
    ORDER BY job.next_dispatch_at, job.id
    FOR UPDATE SKIP LOCKED
    LIMIT LEAST(GREATEST(requested_limit, 1), 100)
  )
  UPDATE public.publishing_jobs AS job
  SET reconciliation_claim_token = requested_token,
      reconciliation_claim_expires_at = requested_claim_expires_at
  FROM candidates
  WHERE job.organization_id = candidates.organization_id AND job.id = candidates.id
  RETURNING job.organization_id, job.id;
END;
$$;

CREATE OR REPLACE FUNCTION indicate_private.find_expired_leases(requested_now timestamptz, requested_limit integer)
RETURNS TABLE(organization_id uuid, job_id uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, indicate_private
AS $$
  SELECT job.organization_id, job.id
  FROM public.publishing_jobs AS job
  WHERE job.state = 'processing' AND job.lease_expires_at <= requested_now
  ORDER BY job.lease_expires_at, job.id
  LIMIT LEAST(GREATEST(requested_limit, 1), 100)
$$;

CREATE OR REPLACE FUNCTION indicate_private.claim_transition_receipts(
  requested_now timestamptz,
  requested_limit integer,
  requested_token uuid,
  requested_claim_expires_at timestamptz
)
RETURNS TABLE(organization_id uuid, receipt_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, indicate_private
AS $$
BEGIN
  RETURN QUERY
  WITH candidates AS (
    SELECT receipt.organization_id, receipt.id
    FROM public.publication_transition_receipts AS receipt
    WHERE receipt.acknowledged_at IS NULL
      AND (receipt.reconciliation_claim_expires_at IS NULL OR receipt.reconciliation_claim_expires_at <= requested_now)
    ORDER BY receipt.created_at, receipt.id
    FOR UPDATE SKIP LOCKED
    LIMIT LEAST(GREATEST(requested_limit, 1), 100)
  )
  UPDATE public.publication_transition_receipts AS receipt
  SET reconciliation_claim_token = requested_token,
      reconciliation_claim_expires_at = requested_claim_expires_at
  FROM candidates
  WHERE receipt.organization_id = candidates.organization_id AND receipt.id = candidates.id
  RETURNING receipt.organization_id, receipt.id;
END;
$$;

CREATE OR REPLACE FUNCTION indicate_private.claim_cleanup_tasks(
  requested_now timestamptz,
  requested_limit integer,
  requested_token uuid,
  requested_claim_expires_at timestamptz
)
RETURNS TABLE(organization_id uuid, task_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, indicate_private
AS $$
BEGIN
  RETURN QUERY
  WITH candidates AS (
    SELECT task.organization_id, task.id
    FROM public.object_cleanup_tasks AS task
    WHERE task.status IN ('pending', 'processing')
      AND task.next_attempt_at <= requested_now
      AND (task.reconciliation_claim_expires_at IS NULL OR task.reconciliation_claim_expires_at <= requested_now)
    ORDER BY task.next_attempt_at, task.id
    FOR UPDATE SKIP LOCKED
    LIMIT LEAST(GREATEST(requested_limit, 1), 100)
  )
  UPDATE public.object_cleanup_tasks AS task
  SET status = 'processing',
      reconciliation_claim_token = requested_token,
      reconciliation_claim_expires_at = requested_claim_expires_at,
      updated_at = requested_now
  FROM candidates
  WHERE task.organization_id = candidates.organization_id AND task.id = candidates.id
  RETURNING task.organization_id, task.id;
END;
$$;

REVOKE ALL ON FUNCTION indicate_private.claim_dispatch_gaps(timestamptz, integer, uuid, timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION indicate_private.find_expired_leases(timestamptz, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION indicate_private.claim_transition_receipts(timestamptz, integer, uuid, timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION indicate_private.claim_cleanup_tasks(timestamptz, integer, uuid, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.claim_dispatch_gaps(timestamptz, integer, uuid, timestamptz) TO indicate_runtime;
GRANT EXECUTE ON FUNCTION indicate_private.find_expired_leases(timestamptz, integer) TO indicate_runtime;
GRANT EXECUTE ON FUNCTION indicate_private.claim_transition_receipts(timestamptz, integer, uuid, timestamptz) TO indicate_runtime;
GRANT EXECUTE ON FUNCTION indicate_private.claim_cleanup_tasks(timestamptz, integer, uuid, timestamptz) TO indicate_runtime;

INSERT INTO indicate_schema_migrations (version, name, checksum)
VALUES (7, 'media_publication_runtime', 'drizzle-0006')
ON CONFLICT (version) DO NOTHING;

INSERT INTO drizzle."__drizzle_migrations" ("hash", "created_at") VALUES ('5a2a9d1eaf668693fff3ad36574cc57f59887a2c625ec5d634f52df74e5e0d58', 1788112000000);

-- ----------------------------------------------------------------------
-- 20260903003500_public_delivery
-- ----------------------------------------------------------------------
-- Phase 5 durable public routing, exact-domain activation, and recoverable cache invalidation.
ALTER TABLE public.invalidation_tasks
  ADD COLUMN paths text[] NOT NULL DEFAULT ARRAY[]::text[],
  ADD COLUMN reconciliation_claim_token uuid,
  ADD COLUMN reconciliation_claim_expires_at timestamptz,
  ADD CONSTRAINT invalidation_tasks_attempts_nonnegative CHECK (attempts >= 0);
ALTER TABLE public.invalidation_tasks
  ADD CONSTRAINT invalidation_tasks_id_unique UNIQUE (id);
CREATE INDEX invalidation_tasks_claim_idx
  ON public.invalidation_tasks (status, reconciliation_claim_expires_at);

CREATE TABLE public.cache_bypasses (
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  site_id uuid NOT NULL,
  bypass boolean NOT NULL DEFAULT true,
  version integer NOT NULL DEFAULT 1,
  reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT cache_bypasses_pk PRIMARY KEY (organization_id, site_id),
  CONSTRAINT cache_bypasses_site_fk FOREIGN KEY (organization_id, site_id) REFERENCES public.sites(organization_id, id) ON DELETE CASCADE,
  CONSTRAINT cache_bypasses_version_positive CHECK (version > 0)
);
ALTER TABLE public.cache_bypasses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cache_bypasses FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON public.cache_bypasses
  USING (organization_id = indicate_private.current_organization_id())
  WITH CHECK (organization_id = indicate_private.current_organization_id());
GRANT SELECT, INSERT, UPDATE ON public.cache_bypasses TO indicate_runtime;

CREATE OR REPLACE FUNCTION indicate_private.claim_invalidation_tasks(
  p_now timestamptz,
  p_limit integer,
  p_claim_token uuid,
  p_claim_expires_at timestamptz
) RETURNS SETOF public.invalidation_tasks
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public, indicate_private
AS $$
BEGIN
  RETURN QUERY
  WITH candidates AS (
    SELECT organization_id, id
    FROM public.invalidation_tasks
    WHERE status IN ('pending', 'processing')
      AND next_attempt_at <= p_now
      AND (reconciliation_claim_expires_at IS NULL OR reconciliation_claim_expires_at <= p_now)
    ORDER BY next_attempt_at, id
    FOR UPDATE SKIP LOCKED
    LIMIT greatest(1, least(p_limit, 100))
  )
  UPDATE public.invalidation_tasks task
  SET status = 'processing', reconciliation_claim_token = p_claim_token,
      reconciliation_claim_expires_at = p_claim_expires_at, updated_at = p_now
  FROM candidates
  WHERE task.organization_id = candidates.organization_id AND task.id = candidates.id
  RETURNING task.*;
END;
$$;
REVOKE ALL ON FUNCTION indicate_private.claim_invalidation_tasks(timestamptz, integer, uuid, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.claim_invalidation_tasks(timestamptz, integer, uuid, timestamptz) TO indicate_runtime;

CREATE OR REPLACE FUNCTION indicate_private.site_hostname_guard()
RETURNS trigger LANGUAGE plpgsql
SET search_path = pg_catalog, public, indicate_private
AS $$
DECLARE parent_host text; region_slug text;
BEGIN
  SELECT normalized_hostname INTO parent_host FROM public.domains
   WHERE organization_id = NEW.organization_id AND id = NEW.domain_id;
  IF parent_host IS NULL THEN RAISE EXCEPTION 'RESOURCE_UNAVAILABLE'; END IF;
  IF NEW.region_id IS NULL THEN
    IF NEW.normalized_hostname <> parent_host THEN RAISE EXCEPTION 'INVALID_SITE_HOSTNAME'; END IF;
  ELSE
    SELECT slug INTO region_slug FROM public.regions
     WHERE organization_id = NEW.organization_id AND id = NEW.region_id;
    IF region_slug IS NULL OR NEW.normalized_hostname <> region_slug || '.' || parent_host THEN RAISE EXCEPTION 'INVALID_SITE_HOSTNAME'; END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER site_hostname_guard
BEFORE INSERT OR UPDATE OF organization_id, domain_id, region_id, normalized_hostname ON public.sites
FOR EACH ROW EXECUTE FUNCTION indicate_private.site_hostname_guard();

INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (8, 'public_delivery', 'public-delivery-v1');

INSERT INTO drizzle."__drizzle_migrations" ("hash", "created_at") VALUES ('3837f494d00c231fa3e3346a0c73cc1a7aad7a25e68fe1635f79c4b3305475a2', 1788114000000);

-- ----------------------------------------------------------------------
-- 20260903004000_production_boundaries
-- ----------------------------------------------------------------------
-- Phase 5 production-boundary hardening: RLS-safe discovery, durable recovery, and fenced invalidation.
ALTER TABLE public.domain_activation_attempts
  ADD COLUMN previous_hostname text,
  ADD COLUMN operation text NOT NULL DEFAULT 'activate',
  ADD COLUMN reconciliation_claim_token uuid,
  ADD COLUMN reconciliation_claim_expires_at timestamptz,
  ADD COLUMN sanitized_failure jsonb,
  ADD CONSTRAINT domain_activation_attempts_operation_check CHECK (operation IN ('activate', 'deactivate'));
CREATE INDEX domain_activation_attempts_claim_idx
  ON public.domain_activation_attempts (status, next_attempt_at, reconciliation_claim_expires_at);

CREATE OR REPLACE FUNCTION indicate_private.resolve_public_host(p_hostname text)
RETURNS TABLE (
  normalized_hostname text,
  organization_id uuid,
  domain_id uuid,
  site_id uuid,
  region_id uuid,
  routing_version integer,
  content_version integer
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog, public, indicate_private
AS $$
  SELECT s.normalized_hostname, s.organization_id, s.domain_id, s.id,
         s.region_id, s.routing_version, s.content_version
  FROM public.sites s
  JOIN public.domains d
    ON d.organization_id = s.organization_id AND d.id = s.domain_id
  LEFT JOIN public.regions r
    ON r.organization_id = s.organization_id AND r.id = s.region_id
  WHERE s.normalized_hostname = p_hostname
    AND s.status = 'active'
    AND s.activation_state = 'active'
    AND d.status = 'active'
    AND (s.region_id IS NULL OR r.status = 'active')
  ORDER BY s.organization_id, s.id
  LIMIT 2
$$;
REVOKE ALL ON FUNCTION indicate_private.resolve_public_host(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.resolve_public_host(text) TO indicate_runtime;

CREATE OR REPLACE FUNCTION indicate_private.is_pending_host(p_hostname text, p_attempt_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog, public, indicate_private
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.domain_activation_attempts a
    JOIN public.sites s
      ON s.organization_id = a.organization_id AND s.id = a.site_id
    WHERE a.id = p_attempt_id
      AND a.hostname = p_hostname
      AND a.operation = 'activate'
      AND a.status IN ('pending', 'processing')
      AND a.activation_state IN ('pending', 'cloudflare_verified', 'vercel_associated')
      AND s.normalized_hostname = p_hostname
      AND s.status = 'inactive'
      AND s.activation_state = 'pending'
  )
$$;
REVOKE ALL ON FUNCTION indicate_private.is_pending_host(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.is_pending_host(text, uuid) TO indicate_runtime;

CREATE OR REPLACE FUNCTION indicate_private.is_previous_host_owned(
  p_organization_id uuid,
  p_site_id uuid,
  p_hostname text
) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog, public, indicate_private
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.domain_activation_attempts a
    WHERE a.organization_id = p_organization_id
      AND a.site_id = p_site_id
      AND a.hostname = p_hostname
  ) AND NOT EXISTS (
    SELECT 1
    FROM public.sites s
    WHERE s.normalized_hostname = p_hostname
      AND (s.organization_id, s.id) <> (p_organization_id, p_site_id)
  )
$$;
REVOKE ALL ON FUNCTION indicate_private.is_previous_host_owned(uuid, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.is_previous_host_owned(uuid, uuid, text) TO indicate_runtime;

CREATE OR REPLACE FUNCTION indicate_private.claim_activation_attempts(
  p_now timestamptz,
  p_limit integer,
  p_claim_token uuid,
  p_claim_expires_at timestamptz
) RETURNS SETOF public.domain_activation_attempts
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public, indicate_private
AS $$
BEGIN
  RETURN QUERY
  WITH candidates AS (
    SELECT organization_id, id
    FROM public.domain_activation_attempts
    WHERE status IN ('pending', 'processing')
      AND next_attempt_at <= p_now
      AND (reconciliation_claim_expires_at IS NULL OR reconciliation_claim_expires_at <= p_now)
    ORDER BY next_attempt_at, id
    FOR UPDATE SKIP LOCKED
    LIMIT greatest(1, least(p_limit, 100))
  )
  UPDATE public.domain_activation_attempts attempt
  SET status = 'processing', reconciliation_claim_token = p_claim_token,
      reconciliation_claim_expires_at = p_claim_expires_at, updated_at = p_now
  FROM candidates
  WHERE attempt.organization_id = candidates.organization_id AND attempt.id = candidates.id
  RETURNING attempt.*;
END;
$$;
REVOKE ALL ON FUNCTION indicate_private.claim_activation_attempts(timestamptz, integer, uuid, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.claim_activation_attempts(timestamptz, integer, uuid, timestamptz) TO indicate_runtime;

CREATE OR REPLACE FUNCTION indicate_private.enable_cache_bypass_on_enqueue()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public, indicate_private
AS $$
BEGIN
  INSERT INTO public.cache_bypasses(
    organization_id, site_id, bypass, version, reason, created_at, updated_at
  ) VALUES (
    NEW.organization_id, NEW.site_id, true, 1, 'invalidation_pending', NEW.created_at, NEW.updated_at
  )
  ON CONFLICT (organization_id, site_id) DO UPDATE
    SET bypass = true,
        version = public.cache_bypasses.version + 1,
        reason = 'invalidation_pending',
        updated_at = EXCLUDED.updated_at;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION indicate_private.enable_cache_bypass_on_enqueue() FROM PUBLIC;
CREATE TRIGGER invalidation_tasks_enable_cache_bypass
AFTER INSERT ON public.invalidation_tasks
FOR EACH ROW EXECUTE FUNCTION indicate_private.enable_cache_bypass_on_enqueue();

CREATE OR REPLACE FUNCTION indicate_private.complete_invalidation(
  p_organization_id uuid,
  p_task_id uuid,
  p_claim_token uuid,
  p_now timestamptz
) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public, indicate_private
AS $$
DECLARE v_site_id uuid;
BEGIN
  UPDATE public.invalidation_tasks
  SET status = 'completed', reconciliation_claim_token = NULL,
      reconciliation_claim_expires_at = NULL, sanitized_failure = NULL, updated_at = p_now
  WHERE organization_id = p_organization_id AND id = p_task_id
    AND status = 'processing' AND reconciliation_claim_token = p_claim_token
    AND reconciliation_claim_expires_at > p_now
  RETURNING site_id INTO v_site_id;
  IF v_site_id IS NULL THEN RETURN false; END IF;
  PERFORM 1
  FROM public.cache_bypasses
  WHERE organization_id = p_organization_id AND site_id = v_site_id
  FOR UPDATE;
  IF NOT EXISTS (
    SELECT 1
    FROM public.invalidation_tasks
    WHERE organization_id = p_organization_id AND site_id = v_site_id
      AND status <> 'completed'
  ) THEN
    INSERT INTO public.cache_bypasses(organization_id, site_id, bypass, version, reason, created_at, updated_at)
    VALUES (p_organization_id, v_site_id, false, 1, 'invalidation_completed', p_now, p_now)
    ON CONFLICT (organization_id, site_id) DO UPDATE
      SET bypass = false, version = public.cache_bypasses.version + 1,
          reason = 'invalidation_completed', updated_at = p_now;
  END IF;
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION indicate_private.complete_invalidation(uuid, uuid, uuid, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.complete_invalidation(uuid, uuid, uuid, timestamptz) TO indicate_runtime;

CREATE OR REPLACE FUNCTION indicate_private.fail_invalidation(
  p_organization_id uuid,
  p_task_id uuid,
  p_claim_token uuid,
  p_failure jsonb,
  p_next_attempt_at timestamptz,
  p_terminal boolean,
  p_now timestamptz
) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public, indicate_private
AS $$
DECLARE v_site_id uuid;
BEGIN
  UPDATE public.invalidation_tasks
  SET status = CASE WHEN p_terminal THEN 'failed'::public.task_status ELSE 'pending'::public.task_status END,
      attempts = attempts + 1, next_attempt_at = p_next_attempt_at,
      reconciliation_claim_token = NULL, reconciliation_claim_expires_at = NULL,
      sanitized_failure = p_failure, updated_at = p_now
  WHERE organization_id = p_organization_id AND id = p_task_id
    AND status = 'processing' AND reconciliation_claim_token = p_claim_token
    AND reconciliation_claim_expires_at > p_now
  RETURNING site_id INTO v_site_id;
  IF v_site_id IS NULL THEN RETURN false; END IF;
  INSERT INTO public.cache_bypasses(organization_id, site_id, bypass, version, reason, created_at, updated_at)
  VALUES (p_organization_id, v_site_id, true, 1, 'invalidation_failed', p_now, p_now)
  ON CONFLICT (organization_id, site_id) DO UPDATE
    SET bypass = true, version = public.cache_bypasses.version + 1,
        reason = 'invalidation_failed', updated_at = p_now;
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION indicate_private.fail_invalidation(uuid, uuid, uuid, jsonb, timestamptz, boolean, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.fail_invalidation(uuid, uuid, uuid, jsonb, timestamptz, boolean, timestamptz) TO indicate_runtime;

INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (9, 'production_boundaries', 'production-boundaries-v1');

INSERT INTO drizzle."__drizzle_migrations" ("hash", "created_at") VALUES ('c3b768c21be4fc85681741599684e912ed94785a92760b4ef3bc77cd68d38151', 1788115000000);

-- ----------------------------------------------------------------------
-- 20260903004500_external_entrypoints
-- ----------------------------------------------------------------------
-- Phase 6 external entry points: credential metadata, durable Telegram conversations,
-- replay outcomes, and narrow platform-administration functions.
ALTER TABLE public.api_keys
  ADD COLUMN name text NOT NULL DEFAULT 'API key',
  ADD COLUMN version integer NOT NULL DEFAULT 1,
  ADD CONSTRAINT api_keys_version_positive CHECK (version > 0),
  ADD CONSTRAINT api_keys_bounded_identity CHECK (length(lookup_id) BETWEEN 16 AND 128 AND length(name) BETWEEN 1 AND 120);

ALTER TABLE public.telegram_identity_mappings
  ADD COLUMN version integer NOT NULL DEFAULT 1,
  ADD CONSTRAINT telegram_identity_mappings_version_positive CHECK (version > 0);

ALTER TABLE public.webhook_replay_claims
  ADD COLUMN body_digest text NOT NULL DEFAULT repeat('0', 64),
  ADD COLUMN outcome jsonb,
  ADD COLUMN processed_at timestamptz,
  ADD CONSTRAINT webhook_replay_claims_body_digest_check CHECK (length(body_digest) = 64);

CREATE TABLE public.telegram_conversations (
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  mapping_id uuid NOT NULL,
  telegram_user_id text NOT NULL,
  telegram_chat_id text NOT NULL,
  step text NOT NULL,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT telegram_conversations_pk PRIMARY KEY (organization_id, telegram_chat_id, telegram_user_id),
  CONSTRAINT telegram_conversations_mapping_fk FOREIGN KEY (organization_id, mapping_id)
    REFERENCES public.telegram_identity_mappings(organization_id, id) ON DELETE CASCADE,
  CONSTRAINT telegram_conversations_bounded_step CHECK (length(step) BETWEEN 1 AND 100)
);
CREATE INDEX telegram_conversations_expiry_idx ON public.telegram_conversations(expires_at);
ALTER TABLE public.telegram_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telegram_conversations FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON public.telegram_conversations
  USING (organization_id = indicate_private.current_organization_id())
  WITH CHECK (organization_id = indicate_private.current_organization_id());
GRANT SELECT, INSERT, UPDATE, DELETE ON public.telegram_conversations TO indicate_runtime;

INSERT INTO public.permissions(id, organization_id, name, scope, description)
VALUES ('00000000-0000-4000-8000-000000006001', NULL, 'platform.customer.admin', 'platform', 'Administer customer Organizations and subscriptions')
ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION indicate_private.ensure_org_permissions(p_organization_id uuid)
RETURNS void
LANGUAGE sql SECURITY DEFINER
SET search_path = pg_catalog, public, indicate_private
AS $$
  INSERT INTO public.permissions(id, organization_id, name, scope, description)
  SELECT gen_random_uuid(), p_organization_id, value.name, 'organization'::public.permission_scope, value.description
  FROM (VALUES
    ('api_key.read', 'Read API key metadata'), ('api_key.manage', 'Issue, rotate, and revoke API keys'),
    ('telegram.manage', 'Manage Telegram identity mappings'), ('subscription.read', 'Read Organization subscription'),
    ('subscription.manage', 'Manage Organization subscription')
  ) AS value(name, description)
  ON CONFLICT DO NOTHING
$$;
REVOKE ALL ON FUNCTION indicate_private.ensure_org_permissions(uuid) FROM PUBLIC;
SELECT indicate_private.ensure_org_permissions(id) FROM public.organizations;

CREATE OR REPLACE FUNCTION indicate_private.resolve_api_key_lookup(p_lookup_id text)
RETURNS TABLE (
  organization_id uuid, id uuid, lookup_id text, name text, salt text,
  verification_hash text, scopes text[], status public.api_key_status,
  predecessor_id uuid, expires_at timestamptz, last_used_at timestamptz,
  version integer, created_at timestamptz, updated_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog, public, indicate_private
AS $$
  SELECT k.organization_id, k.id, k.lookup_id, k.name, k.salt,
         k.verification_hash, k.scopes, k.status, k.predecessor_id,
         k.expires_at, k.last_used_at, k.version, k.created_at, k.updated_at
  FROM public.api_keys k
  WHERE k.lookup_id = p_lookup_id
  LIMIT 1
$$;
REVOKE ALL ON FUNCTION indicate_private.resolve_api_key_lookup(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.resolve_api_key_lookup(text) TO indicate_runtime;

CREATE OR REPLACE FUNCTION indicate_private.resolve_telegram_identity(p_user_id text, p_chat_id text)
RETURNS TABLE (
  mapping_id uuid, organization_id uuid, user_id uuid, role_id uuid,
  telegram_user_id text, telegram_chat_id text, permissions text[]
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog, public, indicate_private
AS $$
  WITH eligible AS (
    SELECT m.id, m.organization_id, m.user_id, m.role_id, m.telegram_user_id, m.telegram_chat_id
    FROM public.telegram_identity_mappings m
    JOIN public.memberships membership
      ON membership.organization_id = m.organization_id AND membership.user_id = m.user_id
     AND membership.role_id = m.role_id AND membership.status = 'active'
    JOIN public.roles r
      ON r.organization_id = membership.organization_id AND r.id = membership.role_id AND r.active
    WHERE m.telegram_user_id = p_user_id AND m.telegram_chat_id = p_chat_id AND m.status = 'active'
  ), single_mapping AS (
    SELECT * FROM eligible WHERE (SELECT count(*) FROM eligible) = 1
  )
  SELECT m.id, m.organization_id, m.user_id, m.role_id, m.telegram_user_id,
         m.telegram_chat_id, coalesce(array_agg(DISTINCT p.name) FILTER (WHERE p.name IS NOT NULL), ARRAY[]::text[])
  FROM single_mapping m
  LEFT JOIN public.role_permissions rp
    ON rp.organization_id = m.organization_id AND rp.role_id = m.role_id
  LEFT JOIN public.permissions p ON p.id = rp.permission_id
  GROUP BY m.id, m.organization_id, m.user_id, m.role_id, m.telegram_user_id, m.telegram_chat_id
$$;
REVOKE ALL ON FUNCTION indicate_private.resolve_telegram_identity(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.resolve_telegram_identity(text, text) TO indicate_runtime;

CREATE OR REPLACE FUNCTION indicate_private.replay_claim_organization(p_source text, p_replay_id text)
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog, public, indicate_private
AS $$
  SELECT organization_id FROM public.webhook_replay_claims
  WHERE source = p_source AND replay_id = p_replay_id
$$;
REVOKE ALL ON FUNCTION indicate_private.replay_claim_organization(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.replay_claim_organization(text, text) TO indicate_runtime;

CREATE OR REPLACE FUNCTION indicate_private.claim_replay(
  p_source text, p_replay_id text, p_organization_id uuid, p_body_digest text,
  p_received_at timestamptz, p_expires_at timestamptz
) RETURNS TABLE (
  created boolean, source text, replay_id text, organization_id uuid, body_digest text,
  status public.replay_claim_status, outcome jsonb, received_at timestamptz, expires_at timestamptz
)
LANGUAGE sql SECURITY DEFINER
SET search_path = pg_catalog, public, indicate_private
AS $$
  WITH inserted AS (
    INSERT INTO public.webhook_replay_claims(source, replay_id, organization_id, body_digest, status, received_at, expires_at)
    VALUES (p_source, p_replay_id, p_organization_id, p_body_digest, 'claimed', p_received_at, p_expires_at)
    ON CONFLICT (source, replay_id) DO NOTHING
    RETURNING *
  )
  SELECT true, i.source, i.replay_id, i.organization_id, i.body_digest, i.status, i.outcome, i.received_at, i.expires_at FROM inserted i
  UNION ALL
  SELECT false, c.source, c.replay_id, c.organization_id, c.body_digest, c.status, c.outcome, c.received_at, c.expires_at
  FROM public.webhook_replay_claims c
  WHERE c.source = p_source AND c.replay_id = p_replay_id AND NOT EXISTS (SELECT 1 FROM inserted)
  LIMIT 1
$$;
REVOKE ALL ON FUNCTION indicate_private.claim_replay(text, text, uuid, text, timestamptz, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.claim_replay(text, text, uuid, text, timestamptz, timestamptz) TO indicate_runtime;

CREATE OR REPLACE FUNCTION indicate_private.finish_replay(
  p_source text, p_replay_id text, p_body_digest text, p_status public.replay_claim_status,
  p_outcome jsonb, p_now timestamptz
) RETURNS TABLE (
  source text, replay_id text, organization_id uuid, body_digest text,
  status public.replay_claim_status, outcome jsonb, received_at timestamptz, expires_at timestamptz
)
LANGUAGE sql SECURITY DEFINER
SET search_path = pg_catalog, public, indicate_private
AS $$
  WITH changed AS (
    UPDATE public.webhook_replay_claims
    SET status = p_status, outcome = p_outcome, processed_at = p_now
    WHERE source = p_source AND replay_id = p_replay_id AND body_digest = p_body_digest AND status = 'claimed'
    RETURNING *
  )
  SELECT c.source, c.replay_id, c.organization_id, c.body_digest, c.status, c.outcome, c.received_at, c.expires_at FROM changed c
  UNION ALL
  SELECT c.source, c.replay_id, c.organization_id, c.body_digest, c.status, c.outcome, c.received_at, c.expires_at
  FROM public.webhook_replay_claims c
  WHERE c.source = p_source AND c.replay_id = p_replay_id AND c.body_digest = p_body_digest AND NOT EXISTS (SELECT 1 FROM changed)
  LIMIT 1
$$;
REVOKE ALL ON FUNCTION indicate_private.finish_replay(text, text, text, public.replay_claim_status, jsonb, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.finish_replay(text, text, text, public.replay_claim_status, jsonb, timestamptz) TO indicate_runtime;

CREATE OR REPLACE FUNCTION indicate_private.has_platform_permission(p_actor_id uuid, p_permission text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog, public, indicate_private
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.memberships m
    JOIN public.roles r ON r.organization_id = m.organization_id AND r.id = m.role_id AND r.active
    JOIN public.role_permissions rp ON rp.organization_id = r.organization_id AND rp.role_id = r.id
    JOIN public.permissions p ON p.id = rp.permission_id
    JOIN public.users u ON u.id = m.user_id AND u.status = 'active'
    WHERE m.user_id = p_actor_id AND m.status = 'active'
      AND p.scope = 'platform' AND p.name = p_permission
  )
$$;
REVOKE ALL ON FUNCTION indicate_private.has_platform_permission(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.has_platform_permission(uuid, text) TO indicate_runtime;

CREATE OR REPLACE FUNCTION indicate_private.has_tenant_permission(p_actor_id uuid, p_organization_id uuid, p_permission text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog, public, indicate_private
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.memberships m
    JOIN public.roles r ON r.organization_id = m.organization_id AND r.id = m.role_id AND r.active
    JOIN public.role_permissions rp ON rp.organization_id = r.organization_id AND rp.role_id = r.id
    JOIN public.permissions p ON p.id = rp.permission_id
    JOIN public.users u ON u.id = m.user_id AND u.status = 'active'
    WHERE m.user_id = p_actor_id AND m.organization_id = p_organization_id
      AND m.status = 'active' AND p.name = p_permission
  )
$$;
REVOKE ALL ON FUNCTION indicate_private.has_tenant_permission(uuid, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.has_tenant_permission(uuid, uuid, text) TO indicate_runtime;

CREATE OR REPLACE FUNCTION indicate_private.list_customers(p_actor_id uuid)
RETURNS TABLE (
  id uuid, name text, slug text, status public.record_status, customer_metadata jsonb,
  version integer, created_at timestamptz, updated_at timestamptz,
  subscription_plan text, subscription_status public.subscription_status,
  period_starts_at timestamptz, period_ends_at timestamptz, subscription_version integer,
  subscription_created_at timestamptz, subscription_updated_at timestamptz
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = pg_catalog, public, indicate_private
AS $$
BEGIN
  IF NOT indicate_private.has_platform_permission(p_actor_id, 'platform.customer.admin') THEN
    RAISE EXCEPTION 'platform permission required' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY SELECT o.id, o.name, o.slug, o.status, o.customer_metadata, o.version, o.created_at, o.updated_at,
    s.plan, s.status, s.period_starts_at, s.period_ends_at, s.version, s.created_at, s.updated_at
  FROM public.organizations o LEFT JOIN public.subscriptions s ON s.organization_id = o.id
  ORDER BY o.name, o.id;
END
$$;
REVOKE ALL ON FUNCTION indicate_private.list_customers(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.list_customers(uuid) TO indicate_runtime;

CREATE OR REPLACE FUNCTION indicate_private.create_customer(
  p_actor_id uuid, p_request_id text, p_organization_id uuid, p_name text, p_slug text,
  p_metadata jsonb, p_subscription jsonb, p_now timestamptz
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public, indicate_private
AS $$
BEGIN
  IF NOT indicate_private.has_platform_permission(p_actor_id, 'platform.customer.admin') THEN
    RAISE EXCEPTION 'platform permission required' USING ERRCODE = '42501';
  END IF;
  INSERT INTO public.organizations(id, name, slug, status, customer_metadata, version, created_at, updated_at)
  VALUES (p_organization_id, p_name, p_slug, 'active', p_metadata, 1, p_now, p_now);
  PERFORM indicate_private.ensure_org_permissions(p_organization_id);
  IF p_subscription IS NOT NULL THEN
    INSERT INTO public.subscriptions(organization_id, plan, status, period_starts_at, period_ends_at, version, created_at, updated_at)
    VALUES (p_organization_id, p_subscription->>'plan', (p_subscription->>'status')::public.subscription_status,
      (p_subscription->>'periodStartsAt')::timestamptz, (p_subscription->>'periodEndsAt')::timestamptz, 1, p_now, p_now);
  END IF;
  INSERT INTO public.audit_logs(organization_id, id, actor_type, actor_id, entry_point, action, target_type, target_id, outcome, changed_fields, after, request_id, occurred_at)
  VALUES (p_organization_id, gen_random_uuid(), 'user', p_actor_id::text, 'cms', 'customer.create', 'organization', p_organization_id::text, 'succeeded', ARRAY['name','slug','status'], jsonb_build_object('name', p_name, 'slug', p_slug, 'status', 'active'), p_request_id, p_now);
END
$$;
REVOKE ALL ON FUNCTION indicate_private.create_customer(uuid, text, uuid, text, text, jsonb, jsonb, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.create_customer(uuid, text, uuid, text, text, jsonb, jsonb, timestamptz) TO indicate_runtime;

CREATE OR REPLACE FUNCTION indicate_private.update_customer(
  p_actor_id uuid, p_request_id text, p_organization_id uuid, p_expected_version integer,
  p_name text, p_slug text, p_status public.record_status, p_metadata jsonb, p_now timestamptz
) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public, indicate_private
AS $$
BEGIN
  IF NOT indicate_private.has_platform_permission(p_actor_id, 'platform.customer.admin') THEN
    RAISE EXCEPTION 'platform permission required' USING ERRCODE = '42501';
  END IF;
  UPDATE public.organizations SET name = p_name, slug = p_slug, status = p_status,
    customer_metadata = p_metadata, version = version + 1, updated_at = p_now
  WHERE id = p_organization_id AND version = p_expected_version;
  IF NOT FOUND THEN RETURN false; END IF;
  INSERT INTO public.audit_logs(organization_id, id, actor_type, actor_id, entry_point, action, target_type, target_id, outcome, changed_fields, after, request_id, occurred_at)
  VALUES (p_organization_id, gen_random_uuid(), 'user', p_actor_id::text, 'cms', 'customer.update', 'organization', p_organization_id::text, 'succeeded', ARRAY['name','slug','status','customerMetadata'], jsonb_build_object('name', p_name, 'slug', p_slug, 'status', p_status, 'customerMetadata', p_metadata), p_request_id, p_now);
  RETURN true;
END
$$;
REVOKE ALL ON FUNCTION indicate_private.update_customer(uuid, text, uuid, integer, text, text, public.record_status, jsonb, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.update_customer(uuid, text, uuid, integer, text, text, public.record_status, jsonb, timestamptz) TO indicate_runtime;

CREATE OR REPLACE FUNCTION indicate_private.update_subscription(
  p_actor_id uuid, p_request_id text, p_organization_id uuid, p_expected_version integer,
  p_plan text, p_status public.subscription_status, p_period_starts_at timestamptz,
  p_period_ends_at timestamptz, p_now timestamptz
) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public, indicate_private
AS $$
DECLARE v_platform boolean;
BEGIN
  v_platform := indicate_private.has_platform_permission(p_actor_id, 'platform.customer.admin');
  IF NOT v_platform AND (
    indicate_private.current_organization_id() IS DISTINCT FROM p_organization_id
    OR NOT indicate_private.has_tenant_permission(p_actor_id, p_organization_id, 'subscription.manage')
  ) THEN
    RAISE EXCEPTION 'subscription permission required' USING ERRCODE = '42501';
  END IF;
  IF p_expected_version IS NULL THEN
    INSERT INTO public.subscriptions(organization_id, plan, status, period_starts_at, period_ends_at, version, created_at, updated_at)
    VALUES (p_organization_id, p_plan, p_status, p_period_starts_at, p_period_ends_at, 1, p_now, p_now)
    ON CONFLICT (organization_id) DO NOTHING;
    IF NOT FOUND THEN RETURN false; END IF;
  ELSE
    UPDATE public.subscriptions SET plan = p_plan, status = p_status, period_starts_at = p_period_starts_at,
      period_ends_at = p_period_ends_at, version = version + 1, updated_at = p_now
    WHERE organization_id = p_organization_id AND version = p_expected_version;
    IF NOT FOUND THEN RETURN false; END IF;
  END IF;
  INSERT INTO public.audit_logs(organization_id, id, actor_type, actor_id, entry_point, action, target_type, target_id, outcome, changed_fields, after, request_id, occurred_at)
  VALUES (p_organization_id, gen_random_uuid(), 'user', p_actor_id::text, 'cms', 'subscription.update', 'subscription', p_organization_id::text, 'succeeded', ARRAY['plan','status','periodStartsAt','periodEndsAt'], jsonb_build_object('plan', p_plan, 'status', p_status, 'periodStartsAt', p_period_starts_at, 'periodEndsAt', p_period_ends_at), p_request_id, p_now);
  RETURN true;
END
$$;
REVOKE ALL ON FUNCTION indicate_private.update_subscription(uuid, text, uuid, integer, text, public.subscription_status, timestamptz, timestamptz, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.update_subscription(uuid, text, uuid, integer, text, public.subscription_status, timestamptz, timestamptz, timestamptz) TO indicate_runtime;

INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (10, 'external_entrypoints', 'external-entrypoints-v1');

INSERT INTO drizzle."__drizzle_migrations" ("hash", "created_at") VALUES ('a1d6d4028023fb4dabd9d3af61e7cd170276a2b4e40d2a93fa1224dfc0401f8b', 1788117000000);

-- ----------------------------------------------------------------------
-- 20260903005000_security_hardening
-- ----------------------------------------------------------------------
-- Phase 6 security hardening: isolate platform authority from tenant roles and make
-- replay outcomes recoverable through leased claims plus a durable prepared outcome.
CREATE TABLE public.platform_user_permissions (
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  permission_id uuid NOT NULL REFERENCES public.permissions(id) ON DELETE RESTRICT,
  provisioned_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT platform_user_permissions_pk PRIMARY KEY (user_id, permission_id)
);
CREATE INDEX platform_user_permissions_user_idx ON public.platform_user_permissions(user_id);
REVOKE ALL ON public.platform_user_permissions FROM PUBLIC, indicate_runtime;

CREATE OR REPLACE FUNCTION indicate_private.role_permission_scope_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, indicate_private
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.permissions p
    WHERE p.id = NEW.permission_id
      AND p.scope = 'organization'
      AND p.organization_id = NEW.organization_id
  ) THEN
    RAISE EXCEPTION 'tenant roles may grant only same-organization permissions' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END
$$;
REVOKE ALL ON FUNCTION indicate_private.role_permission_scope_guard() FROM PUBLIC;
DROP TRIGGER IF EXISTS role_permission_scope_guard ON public.role_permissions;
CREATE TRIGGER role_permission_scope_guard
BEFORE INSERT OR UPDATE ON public.role_permissions
FOR EACH ROW EXECUTE FUNCTION indicate_private.role_permission_scope_guard();
DELETE FROM public.role_permissions rp
USING public.permissions p
WHERE p.id = rp.permission_id AND (p.scope <> 'organization' OR p.organization_id IS DISTINCT FROM rp.organization_id);

CREATE OR REPLACE FUNCTION indicate_private.provision_platform_permission(
  p_user_id uuid, p_permission text, p_provisioned_by text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, indicate_private
AS $$
DECLARE v_permission_id uuid;
BEGIN
  SELECT id INTO v_permission_id FROM public.permissions
  WHERE scope = 'platform' AND organization_id IS NULL AND name = p_permission;
  IF v_permission_id IS NULL OR length(trim(p_provisioned_by)) < 1 THEN
    RAISE EXCEPTION 'invalid platform permission provisioning request' USING ERRCODE = '42501';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = p_user_id AND status = 'active') THEN
    RAISE EXCEPTION 'active platform user required' USING ERRCODE = '42501';
  END IF;
  INSERT INTO public.platform_user_permissions(user_id, permission_id, provisioned_by)
  VALUES (p_user_id, v_permission_id, p_provisioned_by)
  ON CONFLICT DO NOTHING;
END
$$;
REVOKE ALL ON FUNCTION indicate_private.provision_platform_permission(uuid, text, text) FROM PUBLIC, indicate_runtime;

CREATE OR REPLACE FUNCTION indicate_private.list_platform_permissions(p_user_id uuid)
RETURNS TABLE (name text)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = pg_catalog, public, indicate_private
AS $$
BEGIN
  IF nullif(current_setting('app.actor_id', true), '')::uuid IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'platform permission lookup denied' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
  SELECT p.name
  FROM public.platform_user_permissions grant_row
  JOIN public.permissions p ON p.id = grant_row.permission_id
  JOIN public.users u ON u.id = grant_row.user_id AND u.status = 'active'
  WHERE grant_row.user_id = p_user_id AND p.scope = 'platform' AND p.organization_id IS NULL;
END
$$;
REVOKE ALL ON FUNCTION indicate_private.list_platform_permissions(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.list_platform_permissions(uuid) TO indicate_runtime;

CREATE OR REPLACE FUNCTION indicate_private.has_platform_permission(p_actor_id uuid, p_permission text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog, public, indicate_private
AS $$
  SELECT indicate_private.current_verified_user_id() = p_actor_id
    AND nullif(current_setting('app.actor_id', true), '')::uuid = p_actor_id
    AND EXISTS (
      SELECT 1
      FROM public.platform_user_permissions grant_row
      JOIN public.permissions p ON p.id = grant_row.permission_id
      JOIN public.users u ON u.id = grant_row.user_id AND u.status = 'active'
      WHERE grant_row.user_id = p_actor_id
        AND p.scope = 'platform' AND p.organization_id IS NULL AND p.name = p_permission
    )
$$;
REVOKE ALL ON FUNCTION indicate_private.has_platform_permission(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.has_platform_permission(uuid, text) TO indicate_runtime;

ALTER TABLE public.webhook_replay_claims
  ADD COLUMN identity_binding_digest text,
  ADD COLUMN claim_token uuid NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN business_receipt jsonb,
  ADD COLUMN pending_status public.replay_claim_status,
  ADD COLUMN lease_expires_at timestamptz,
  ADD COLUMN attempt_count integer NOT NULL DEFAULT 1,
  ADD COLUMN outcome_ready_at timestamptz;
UPDATE public.webhook_replay_claims
SET lease_expires_at = received_at,
    pending_status = CASE WHEN status IN ('processed', 'rejected') THEN status ELSE NULL END
WHERE lease_expires_at IS NULL;
ALTER TABLE public.webhook_replay_claims
  ALTER COLUMN lease_expires_at SET NOT NULL,
  ADD CONSTRAINT webhook_replay_claims_identity_binding_check CHECK (identity_binding_digest IS NULL OR length(identity_binding_digest) = 64),
  ADD CONSTRAINT webhook_replay_claims_attempt_count_check CHECK (attempt_count > 0),
  ADD CONSTRAINT webhook_replay_claims_pending_terminal_check CHECK (pending_status IS NULL OR pending_status IN ('processed', 'rejected'));
CREATE INDEX webhook_replay_claims_reconciliation_idx ON public.webhook_replay_claims(status, pending_status, lease_expires_at);

DROP FUNCTION IF EXISTS indicate_private.claim_replay(text, text, uuid, text, timestamptz, timestamptz);
DROP FUNCTION IF EXISTS indicate_private.finish_replay(text, text, text, public.replay_claim_status, jsonb, timestamptz);

CREATE FUNCTION indicate_private.claim_replay(
  p_source text, p_replay_id text, p_organization_id uuid, p_body_digest text,
  p_received_at timestamptz, p_lease_expires_at timestamptz, p_expires_at timestamptz
) RETURNS TABLE (
  claim_kind text, source text, replay_id text, organization_id uuid, body_digest text,
  identity_binding_digest text, claim_token uuid, business_receipt jsonb, status public.replay_claim_status, pending_status public.replay_claim_status,
  outcome jsonb, received_at timestamptz, lease_expires_at timestamptz, attempt_count integer, expires_at timestamptz
)
LANGUAGE sql SECURITY DEFINER
SET search_path = pg_catalog, public, indicate_private
AS $$
  WITH inserted AS (
    INSERT INTO public.webhook_replay_claims(
      source, replay_id, organization_id, body_digest, status, received_at, lease_expires_at, expires_at
    ) VALUES (
      p_source, p_replay_id, p_organization_id, p_body_digest, 'claimed', p_received_at, p_lease_expires_at, p_expires_at
    ) ON CONFLICT (source, replay_id) DO NOTHING
    RETURNING *
  ), reclaimed AS (
    UPDATE public.webhook_replay_claims c
    SET lease_expires_at = p_lease_expires_at, claim_token = gen_random_uuid(), attempt_count = c.attempt_count + 1
    WHERE c.source = p_source AND c.replay_id = p_replay_id
      AND NOT EXISTS (SELECT 1 FROM inserted)
      AND c.status = 'claimed' AND c.pending_status IS NULL AND c.business_receipt IS NULL
      AND c.lease_expires_at <= p_received_at AND c.expires_at > p_received_at
      AND c.body_digest = p_body_digest
      AND (p_organization_id IS NULL OR c.organization_id IS NULL OR c.organization_id = p_organization_id)
    RETURNING *
  ), selected AS (
    SELECT 'created'::text AS claim_kind, i.* FROM inserted i
    UNION ALL
    SELECT 'reclaimed'::text AS claim_kind, r.* FROM reclaimed r
    UNION ALL
    SELECT 'duplicate'::text AS claim_kind, c.* FROM public.webhook_replay_claims c
    WHERE c.source = p_source AND c.replay_id = p_replay_id
      AND NOT EXISTS (SELECT 1 FROM inserted) AND NOT EXISTS (SELECT 1 FROM reclaimed)
  )
  SELECT s.claim_kind, s.source, s.replay_id, s.organization_id, s.body_digest,
    s.identity_binding_digest, s.claim_token, s.business_receipt, s.status, s.pending_status, s.outcome, s.received_at,
    s.lease_expires_at, s.attempt_count, s.expires_at
  FROM selected s LIMIT 1
$$;
REVOKE ALL ON FUNCTION indicate_private.claim_replay(text, text, uuid, text, timestamptz, timestamptz, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.claim_replay(text, text, uuid, text, timestamptz, timestamptz, timestamptz) TO indicate_runtime;

CREATE FUNCTION indicate_private.bind_replay_identity(
  p_source text, p_replay_id text, p_body_digest text, p_claim_token uuid, p_organization_id uuid, p_identity_binding_digest text
) RETURNS TABLE (
  source text, replay_id text, organization_id uuid, body_digest text,
  identity_binding_digest text, claim_token uuid, business_receipt jsonb, status public.replay_claim_status, pending_status public.replay_claim_status,
  outcome jsonb, received_at timestamptz, lease_expires_at timestamptz, attempt_count integer, expires_at timestamptz
)
LANGUAGE sql SECURITY DEFINER
SET search_path = pg_catalog, public, indicate_private
AS $$
  WITH changed AS (
    UPDATE public.webhook_replay_claims c
    SET organization_id = p_organization_id, identity_binding_digest = p_identity_binding_digest
    WHERE c.source = p_source AND c.replay_id = p_replay_id AND c.body_digest = p_body_digest
      AND c.claim_token = p_claim_token
      AND c.status = 'claimed'
      AND (c.organization_id IS NULL OR c.organization_id = p_organization_id)
      AND (c.identity_binding_digest IS NULL OR c.identity_binding_digest = p_identity_binding_digest)
    RETURNING *
  )
  SELECT c.source, c.replay_id, c.organization_id, c.body_digest, c.identity_binding_digest, c.claim_token, c.business_receipt,
    c.status, c.pending_status, c.outcome, c.received_at, c.lease_expires_at, c.attempt_count, c.expires_at
  FROM changed c LIMIT 1
$$;
REVOKE ALL ON FUNCTION indicate_private.bind_replay_identity(text, text, text, uuid, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.bind_replay_identity(text, text, text, uuid, uuid, text) TO indicate_runtime;

CREATE FUNCTION indicate_private.prepare_replay_outcome(
  p_source text, p_replay_id text, p_body_digest text, p_claim_token uuid, p_status public.replay_claim_status,
  p_outcome jsonb, p_now timestamptz
) RETURNS TABLE (
  source text, replay_id text, organization_id uuid, body_digest text,
  identity_binding_digest text, claim_token uuid, business_receipt jsonb, status public.replay_claim_status, pending_status public.replay_claim_status,
  outcome jsonb, received_at timestamptz, lease_expires_at timestamptz, attempt_count integer, expires_at timestamptz
)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public, indicate_private
AS $$
BEGIN
  IF p_status NOT IN ('processed', 'rejected') THEN RETURN; END IF;
  RETURN QUERY
  WITH changed AS (
    UPDATE public.webhook_replay_claims c
    SET pending_status = p_status, outcome = p_outcome, outcome_ready_at = p_now
    WHERE c.source = p_source AND c.replay_id = p_replay_id AND c.body_digest = p_body_digest
      AND c.claim_token = p_claim_token
      AND c.status = 'claimed'
      AND (c.pending_status IS NULL OR (c.pending_status = p_status AND c.outcome = p_outcome))
    RETURNING *
  )
  SELECT c.source, c.replay_id, c.organization_id, c.body_digest, c.identity_binding_digest, c.claim_token, c.business_receipt,
    c.status, c.pending_status, c.outcome, c.received_at, c.lease_expires_at, c.attempt_count, c.expires_at
  FROM changed c
  UNION ALL
  SELECT c.source, c.replay_id, c.organization_id, c.body_digest, c.identity_binding_digest, c.claim_token, c.business_receipt,
    c.status, c.pending_status, c.outcome, c.received_at, c.lease_expires_at, c.attempt_count, c.expires_at
  FROM public.webhook_replay_claims c
  WHERE c.source = p_source AND c.replay_id = p_replay_id AND c.body_digest = p_body_digest
    AND c.claim_token = p_claim_token
    AND c.status IN ('processed', 'rejected') AND c.outcome = p_outcome
    AND NOT EXISTS (SELECT 1 FROM changed)
  LIMIT 1;
END
$$;
REVOKE ALL ON FUNCTION indicate_private.prepare_replay_outcome(text, text, text, uuid, public.replay_claim_status, jsonb, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.prepare_replay_outcome(text, text, text, uuid, public.replay_claim_status, jsonb, timestamptz) TO indicate_runtime;

CREATE FUNCTION indicate_private.finalize_replay(
  p_source text, p_replay_id text, p_body_digest text, p_claim_token uuid, p_now timestamptz
) RETURNS TABLE (
  source text, replay_id text, organization_id uuid, body_digest text,
  identity_binding_digest text, claim_token uuid, business_receipt jsonb, status public.replay_claim_status, pending_status public.replay_claim_status,
  outcome jsonb, received_at timestamptz, lease_expires_at timestamptz, attempt_count integer, expires_at timestamptz
)
LANGUAGE sql SECURITY DEFINER
SET search_path = pg_catalog, public, indicate_private
AS $$
  WITH changed AS (
    UPDATE public.webhook_replay_claims c
    SET status = c.pending_status, pending_status = NULL, processed_at = p_now
    WHERE c.source = p_source AND c.replay_id = p_replay_id AND c.body_digest = p_body_digest
      AND c.claim_token = p_claim_token
      AND c.status = 'claimed' AND c.pending_status IN ('processed', 'rejected') AND c.outcome IS NOT NULL
    RETURNING *
  )
  SELECT c.source, c.replay_id, c.organization_id, c.body_digest, c.identity_binding_digest, c.claim_token, c.business_receipt,
    c.status, c.pending_status, c.outcome, c.received_at, c.lease_expires_at, c.attempt_count, c.expires_at
  FROM changed c
  UNION ALL
  SELECT c.source, c.replay_id, c.organization_id, c.body_digest, c.identity_binding_digest, c.claim_token, c.business_receipt,
    c.status, c.pending_status, c.outcome, c.received_at, c.lease_expires_at, c.attempt_count, c.expires_at
  FROM public.webhook_replay_claims c
  WHERE c.source = p_source AND c.replay_id = p_replay_id AND c.body_digest = p_body_digest
    AND c.claim_token = p_claim_token
    AND c.status IN ('processed', 'rejected') AND NOT EXISTS (SELECT 1 FROM changed)
  LIMIT 1
$$;
REVOKE ALL ON FUNCTION indicate_private.finalize_replay(text, text, text, uuid, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.finalize_replay(text, text, text, uuid, timestamptz) TO indicate_runtime;

CREATE OR REPLACE FUNCTION indicate_private.resolve_telegram_identity(p_user_id text, p_chat_id text)
RETURNS TABLE (
  mapping_id uuid, organization_id uuid, user_id uuid, role_id uuid,
  telegram_user_id text, telegram_chat_id text, permissions text[]
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog, public, indicate_private
AS $$
  WITH eligible AS (
    SELECT m.id, m.organization_id, m.user_id, m.role_id, m.telegram_user_id, m.telegram_chat_id
    FROM public.telegram_identity_mappings m
    JOIN public.memberships membership
      ON membership.organization_id = m.organization_id AND membership.user_id = m.user_id
     AND membership.role_id = m.role_id AND membership.status = 'active'
    JOIN public.roles r
      ON r.organization_id = membership.organization_id AND r.id = membership.role_id AND r.active
    WHERE m.telegram_user_id = p_user_id AND m.telegram_chat_id = p_chat_id AND m.status = 'active'
  ), single_mapping AS (
    SELECT * FROM eligible WHERE (SELECT count(*) FROM eligible) = 1
  )
  SELECT m.id, m.organization_id, m.user_id, m.role_id, m.telegram_user_id,
         m.telegram_chat_id, coalesce(array_agg(DISTINCT p.name) FILTER (WHERE p.name IS NOT NULL), ARRAY[]::text[])
  FROM single_mapping m
  LEFT JOIN public.role_permissions rp
    ON rp.organization_id = m.organization_id AND rp.role_id = m.role_id
  LEFT JOIN public.permissions p
    ON p.id = rp.permission_id AND p.scope = 'organization' AND p.organization_id = m.organization_id
  GROUP BY m.id, m.organization_id, m.user_id, m.role_id, m.telegram_user_id, m.telegram_chat_id
$$;
REVOKE ALL ON FUNCTION indicate_private.resolve_telegram_identity(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.resolve_telegram_identity(text, text) TO indicate_runtime;

CREATE OR REPLACE FUNCTION indicate_private.has_tenant_permission(p_actor_id uuid, p_organization_id uuid, p_permission text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog, public, indicate_private
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.memberships m
    JOIN public.roles r ON r.organization_id = m.organization_id AND r.id = m.role_id AND r.active
    JOIN public.role_permissions rp ON rp.organization_id = r.organization_id AND rp.role_id = r.id
    JOIN public.permissions p ON p.id = rp.permission_id
      AND p.scope = 'organization' AND p.organization_id = m.organization_id
    JOIN public.users u ON u.id = m.user_id AND u.status = 'active'
    WHERE m.user_id = p_actor_id AND m.organization_id = p_organization_id
      AND m.status = 'active' AND p.name = p_permission
  )
$$;
REVOKE ALL ON FUNCTION indicate_private.has_tenant_permission(uuid, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.has_tenant_permission(uuid, uuid, text) TO indicate_runtime;

CREATE OR REPLACE FUNCTION indicate_private.capture_replay_business_receipt()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public, indicate_private
AS $$
DECLARE
  v_replay_id text;
  v_body_digest text;
  v_claim_token uuid;
BEGIN
  IF NEW.request_id NOT LIKE 'telegram-replay:%' THEN RETURN NEW; END IF;
  v_replay_id := split_part(NEW.request_id, ':', 2);
  v_body_digest := split_part(NEW.request_id, ':', 3);
  BEGIN
    v_claim_token := split_part(NEW.request_id, ':', 4)::uuid;
  EXCEPTION WHEN invalid_text_representation THEN
    RAISE EXCEPTION 'invalid replay fence' USING ERRCODE = '42501';
  END;
  IF length(v_body_digest) <> 64 OR split_part(NEW.request_id, ':', 5) <> '' OR NOT EXISTS (
    SELECT 1 FROM public.webhook_replay_claims claim
    WHERE claim.source = 'telegram' AND claim.replay_id = v_replay_id
      AND claim.body_digest = v_body_digest AND claim.claim_token = v_claim_token
      AND claim.status = 'claimed'
  ) THEN
    RAISE EXCEPTION 'stale replay worker' USING ERRCODE = '42501';
  END IF;
  IF NEW.outcome = 'succeeded' AND NEW.action IN ('article.create', 'article.sites.assign', 'media.activate', 'publication.request') THEN
    UPDATE public.webhook_replay_claims
    SET business_receipt = jsonb_build_object(
      'action', NEW.action, 'targetType', NEW.target_type, 'targetId', NEW.target_id,
      'after', coalesce(NEW.after, '{}'::jsonb), 'occurredAt', NEW.occurred_at
    )
    WHERE source = 'telegram' AND replay_id = v_replay_id
      AND body_digest = v_body_digest AND claim_token = v_claim_token AND status = 'claimed';
  END IF;
  RETURN NEW;
END
$$;
REVOKE ALL ON FUNCTION indicate_private.capture_replay_business_receipt() FROM PUBLIC;
DROP TRIGGER IF EXISTS capture_replay_business_receipt ON public.audit_logs;
CREATE TRIGGER capture_replay_business_receipt
AFTER INSERT ON public.audit_logs
FOR EACH ROW EXECUTE FUNCTION indicate_private.capture_replay_business_receipt();

INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (11, 'security_hardening', 'security-hardening-v1');

INSERT INTO drizzle."__drizzle_migrations" ("hash", "created_at") VALUES ('987a2378aab0e316808333f442443a5f94b1ee593932f46fd1fd0b0932cc8ae4', 1788118000000);

-- ----------------------------------------------------------------------
-- 20260903005500_strict_platform_authorization
-- ----------------------------------------------------------------------
-- Phase 6 authorization correction: platform checks must fail closed when the
-- transaction has no verified actor context. Provisioning remains owner-only.
CREATE OR REPLACE FUNCTION indicate_private.has_platform_permission(p_actor_id uuid, p_permission text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog, public, indicate_private
AS $$
  SELECT COALESCE(
    indicate_private.current_verified_user_id() = p_actor_id
      AND nullif(current_setting('app.actor_id', true), '')::uuid = p_actor_id
      AND EXISTS (
        SELECT 1
        FROM public.platform_user_permissions grant_row
        JOIN public.permissions p ON p.id = grant_row.permission_id
        JOIN public.users u ON u.id = grant_row.user_id AND u.status = 'active'
        WHERE grant_row.user_id = p_actor_id
          AND p.scope = 'platform' AND p.organization_id IS NULL AND p.name = p_permission
      ),
    false
  )
$$;
REVOKE ALL ON FUNCTION indicate_private.has_platform_permission(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.has_platform_permission(uuid, text) TO indicate_runtime;

INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (12, 'strict_platform_authorization', 'strict-platform-authorization-v1');

INSERT INTO drizzle."__drizzle_migrations" ("hash", "created_at") VALUES ('4b4d4b75f140c83779d6b05875f63c961f87d35da06910f1eb27e18e57c4ea82', 1788119000000);

-- ----------------------------------------------------------------------
-- 20260903010000_readiness_discovery
-- ----------------------------------------------------------------------
-- Phase 7 production-readiness boundary: bounded exact-host discovery for the
-- NOBYPASSRLS runtime role without granting direct cross-tenant table access.
CREATE OR REPLACE FUNCTION indicate_private.discover_active_hosts(p_hostnames text[])
RETURNS TABLE (
  hostname text,
  organization_id uuid,
  domain_id uuid,
  site_id uuid,
  region_id uuid,
  region_external_key text,
  region_slug text,
  coherent boolean
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog, public, indicate_private
AS $$
  WITH requested(hostname) AS (
    SELECT DISTINCT normalized.hostname
    FROM unnest(
      CASE
        WHEN p_hostnames IS NOT NULL
          AND cardinality(p_hostnames) BETWEEN 1 AND 100
          AND array_position(p_hostnames, NULL) IS NULL
        THEN p_hostnames
        ELSE ARRAY[]::text[]
      END
    ) AS supplied(hostname)
    CROSS JOIN LATERAL (
      SELECT lower(trim(trailing '.' FROM supplied.hostname)) AS hostname
    ) normalized
    WHERE normalized.hostname = supplied.hostname
      AND octet_length(normalized.hostname) BETWEEN 1 AND 253
  )
  SELECT s.normalized_hostname,
         s.organization_id,
         s.domain_id,
         s.id,
         s.region_id,
         r.external_key,
         r.slug,
         true
  FROM requested requested_host
  JOIN public.sites s
    ON s.normalized_hostname = requested_host.hostname
  JOIN public.organizations o
    ON o.id = s.organization_id
  JOIN public.domains d
    ON d.organization_id = s.organization_id
   AND d.id = s.domain_id
  LEFT JOIN public.regions r
    ON r.organization_id = s.organization_id
   AND r.id = s.region_id
  WHERE o.status = 'active'
    AND d.status = 'active'
    AND s.status = 'active'
    AND s.activation_state = 'active'
    AND (
      (s.region_id IS NULL AND s.normalized_hostname = d.normalized_hostname)
      OR
      (s.region_id IS NOT NULL
       AND r.status = 'active'
       AND s.normalized_hostname = r.slug || '.' || d.normalized_hostname)
    )
  ORDER BY s.normalized_hostname, s.organization_id, s.id
$$;
REVOKE ALL ON FUNCTION indicate_private.discover_active_hosts(text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.discover_active_hosts(text[]) TO indicate_runtime;

INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (13, 'readiness_discovery', 'readiness-discovery-v1');

INSERT INTO drizzle."__drizzle_migrations" ("hash", "created_at") VALUES ('298c1fcb059c7e0919caf08343ebfadc2a89bd836f2d29e9e878fc215c48f483', 1788120000000);

-- ----------------------------------------------------------------------
-- 20260903010500_migration_body_digests
-- ----------------------------------------------------------------------
-- Phase 7 migration integrity hardening.
-- Canonical body digest algorithm: normalize CRLF to LF, replace only the
-- checksum literal in the migration's unique self-registration row with the
-- stable checksum sentinel, then SHA-256 the complete UTF-8 migration file.
-- Migration 0000 has no registration and hashes its complete normalized file.
-- Missing, malformed, or duplicate required registrations fail closed.
WITH reviewed(version, name, checksum) AS (
  VALUES
    (1, 'phase2_core_schema', 'sha256:764efddc6939f7f70b9b4785d34bd2c8fb9446a7776882a4f9a39258e0370c19'),
    (2, 'phase2_security', 'sha256:d187379d73d8530491c07291e03645d966c3502fd59003ee3d081487ccc33612'),
    (3, 'phase2_publisher_actor_constraints', 'sha256:b65dea61b09170247f44aacbe52d3a7c6687495b1e2318394635a0ee17fe004e'),
    (4, 'phase2_authorization_hardening', 'sha256:d636b41314ba61c3ef3c886b01a6ef9e020614914cb8a752055167a6095dfc33'),
    (5, 'phase3_verified_user_context', 'sha256:ad79ad7685de14a73868c2403a78c6a5d3e495da33737bc98f197b18fe8219df'),
    (6, 'phase3_discovery_outcome_timestamp', 'sha256:10883f849abef3ddb2fcddd5a220f341203bdcf4485b7091f6f94d986071473c'),
    (7, 'phase4_media_publication_runtime', 'sha256:7390ee7325ab9676609742ec9945df0964c3e96f6a7f075d35d61dd9b7c824f8'),
    (8, 'phase5_public_delivery', 'sha256:e36dc3ee32ca440b97f0a0e6692b6e05b30206dd57cef78e16a69159f251b7dd'),
    (9, 'phase5_production_boundaries', 'sha256:70bd40399a4cf9758e9570c534420fc51cc3e87d2d3117503d9328f827540159'),
    (10, 'phase6_external_entrypoints', 'sha256:cb5c138af7c4182294bc54aee08134315c3e86517606ed462c254904f30d1ecd'),
    (11, 'phase6_security_hardening', 'sha256:8d33e5da644155416d28567a3992444834bb88613ab3c3457e8fca231fcebf96'),
    (12, 'phase6_strict_platform_authorization', 'sha256:0e9e078d1aec2aec90325ac809cc77aa99c62710322547b35be8191a1079042a'),
    (13, 'phase7_readiness_discovery', 'sha256:0fc0a7777f7e96a3dc1167b2f897fe3ca983c45d347352b2fa7fb532aca63993')
)
UPDATE public.indicate_schema_migrations applied
SET checksum = reviewed.checksum
FROM reviewed
WHERE applied.version = reviewed.version
  AND applied.name = reviewed.name;

DO $$
DECLARE matched integer;
BEGIN
  SELECT count(*) INTO matched
  FROM public.indicate_schema_migrations applied
  JOIN (VALUES
    (1, 'phase2_core_schema', 'sha256:764efddc6939f7f70b9b4785d34bd2c8fb9446a7776882a4f9a39258e0370c19'),
    (2, 'phase2_security', 'sha256:d187379d73d8530491c07291e03645d966c3502fd59003ee3d081487ccc33612'),
    (3, 'phase2_publisher_actor_constraints', 'sha256:b65dea61b09170247f44aacbe52d3a7c6687495b1e2318394635a0ee17fe004e'),
    (4, 'phase2_authorization_hardening', 'sha256:d636b41314ba61c3ef3c886b01a6ef9e020614914cb8a752055167a6095dfc33'),
    (5, 'phase3_verified_user_context', 'sha256:ad79ad7685de14a73868c2403a78c6a5d3e495da33737bc98f197b18fe8219df'),
    (6, 'phase3_discovery_outcome_timestamp', 'sha256:10883f849abef3ddb2fcddd5a220f341203bdcf4485b7091f6f94d986071473c'),
    (7, 'phase4_media_publication_runtime', 'sha256:7390ee7325ab9676609742ec9945df0964c3e96f6a7f075d35d61dd9b7c824f8'),
    (8, 'phase5_public_delivery', 'sha256:e36dc3ee32ca440b97f0a0e6692b6e05b30206dd57cef78e16a69159f251b7dd'),
    (9, 'phase5_production_boundaries', 'sha256:70bd40399a4cf9758e9570c534420fc51cc3e87d2d3117503d9328f827540159'),
    (10, 'phase6_external_entrypoints', 'sha256:cb5c138af7c4182294bc54aee08134315c3e86517606ed462c254904f30d1ecd'),
    (11, 'phase6_security_hardening', 'sha256:8d33e5da644155416d28567a3992444834bb88613ab3c3457e8fca231fcebf96'),
    (12, 'phase6_strict_platform_authorization', 'sha256:0e9e078d1aec2aec90325ac809cc77aa99c62710322547b35be8191a1079042a'),
    (13, 'phase7_readiness_discovery', 'sha256:0fc0a7777f7e96a3dc1167b2f897fe3ca983c45d347352b2fa7fb532aca63993')
  ) reviewed(version, name, checksum)
    ON applied.version = reviewed.version
   AND applied.name = reviewed.name
   AND applied.checksum = reviewed.checksum;
  IF matched <> 13 THEN
    RAISE EXCEPTION 'historical migration manifest mismatch';
  END IF;
END
$$;

INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (14, 'migration_body_digests', 'sha256:81a82af6942df1ae906d6e3b76d4bd9906dfc5efb65cd30cb8e2aabd372c91a3');

INSERT INTO drizzle."__drizzle_migrations" ("hash", "created_at") VALUES ('5d1dc5f31933a365cf607f7657701bee7ea8e4f40c76c5ed0ffc6947aaadd609', 1788121000000);

-- ----------------------------------------------------------------------
-- 20260903011000_updated_at_integrity_guard
-- ----------------------------------------------------------------------
-- Freshness guard for updated_at.
--
-- Before this migration updated_at was maintained only by application code and
-- SQL functions. Any direct UPDATE that omitted the column silently left a stale
-- timestamp, and nothing in the database refused it.
--
-- The guard deliberately does not force now() unconditionally: this codebase
-- injects an explicit clock (updated_at = p_now) so tests stay deterministic and
-- reconcilers can record the instant they claimed work. Overwriting those values
-- would destroy that control. The trigger therefore only fills the column when
-- the writer left it untouched, so explicit values survive and omissions cannot.
--
-- Triggers are attached by enumerating live columns rather than a hand-written
-- table list, so no table with updated_at can be missed now or later, and the
-- final assertion fails the migration closed if any table remains uncovered.
CREATE OR REPLACE FUNCTION indicate_private.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public, indicate_private
AS $$
BEGIN
  IF NEW.updated_at IS NOT DISTINCT FROM OLD.updated_at THEN
    NEW.updated_at := now();
  END IF;
  RETURN NEW;
END
$$;

REVOKE ALL ON FUNCTION indicate_private.touch_updated_at() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.touch_updated_at() TO indicate_runtime;

DO $guard$
DECLARE target record;
BEGIN
  FOR target IN
    SELECT columns.table_name AS name
      FROM information_schema.columns
      JOIN information_schema.tables
        ON tables.table_schema = columns.table_schema
       AND tables.table_name = columns.table_name
     WHERE columns.table_schema = 'public'
       AND columns.column_name = 'updated_at'
       AND tables.table_type = 'BASE TABLE'
     ORDER BY columns.table_name
  LOOP
    EXECUTE format(
      'CREATE OR REPLACE TRIGGER %I BEFORE UPDATE ON public.%I FOR EACH ROW WHEN ((old.* IS DISTINCT FROM new.*)) EXECUTE FUNCTION indicate_private.touch_updated_at()',
      left(target.name || '_touch_updated_at', 63),
      target.name
    );
  END LOOP;
END
$guard$;

DO $verify$
DECLARE uncovered text;
BEGIN
  SELECT string_agg(candidate.name, ', ' ORDER BY candidate.name) INTO uncovered
    FROM (
      SELECT columns.table_name AS name
        FROM information_schema.columns
        JOIN information_schema.tables
          ON tables.table_schema = columns.table_schema
         AND tables.table_name = columns.table_name
       WHERE columns.table_schema = 'public'
         AND columns.column_name = 'updated_at'
         AND tables.table_type = 'BASE TABLE'
    ) candidate
   WHERE NOT EXISTS (
     SELECT 1
       FROM pg_trigger
       JOIN pg_class ON pg_class.oid = pg_trigger.tgrelid
       JOIN pg_namespace ON pg_namespace.oid = pg_class.relnamespace
      WHERE pg_namespace.nspname = 'public'
        AND pg_class.relname = candidate.name
        AND pg_trigger.tgname = left(candidate.name || '_touch_updated_at', 63)
        AND NOT pg_trigger.tgisinternal
   );
  IF uncovered IS NOT NULL THEN
    RAISE EXCEPTION 'updated_at guard missing for: %', uncovered;
  END IF;
END
$verify$;

INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (15, 'updated_at_integrity_guard', 'sha256:b980b8f0cf65f832609501512308a36d92a27252b7771a9ab0bc3784ca8b0ca7');

INSERT INTO drizzle."__drizzle_migrations" ("hash", "created_at") VALUES ('3e69727b634009e416c8f51efb8815d4893b5b98066894c9cba84e29a168536b', 1788122000000);

-- ----------------------------------------------------------------------
-- 20260903011500_operational_table_read_policies
-- ----------------------------------------------------------------------
-- Restore the schema gate's read path on Supabase.
--
-- Supabase installs an event trigger named ensure_rls on ddl_command_end that
-- enables row level security on every table created in the public schema. Two of
-- this schema's tables are operational rather than tenant-scoped and therefore
-- never received a policy in 0001: indicate_schema_migrations and
-- migration_gate_events. Row level security with no policy denies every row, so
-- the GRANT SELECT issued in 0001 became inert and the runtime role observed an
-- empty ledger.
--
-- The visible consequence was that `db:check` reported actualVersion null and the
-- production readiness schema_version check could never pass, while remaining
-- green in CI because vanilla PostgreSQL has no such event trigger. The defect was
-- therefore invisible on every platform except the one that matters.
--
-- Both tables hold no tenant data, and 0001 already revoked INSERT, UPDATE,
-- DELETE, and TRUNCATE on them from indicate_runtime, so a read-only policy
-- scoped to that role restores the gate without widening write authority. Row
-- level security stays enabled so the tables keep failing closed for every other
-- role, including anon and authenticated.
DROP POLICY IF EXISTS indicate_runtime_read ON public.indicate_schema_migrations;
CREATE POLICY indicate_runtime_read ON public.indicate_schema_migrations
  FOR SELECT TO indicate_runtime USING (true);

DROP POLICY IF EXISTS indicate_runtime_read ON public.migration_gate_events;
CREATE POLICY indicate_runtime_read ON public.migration_gate_events
  FOR SELECT TO indicate_runtime USING (true);

-- Guard against the same class of defect returning. Any future public table that
-- the runtime role can select from must either carry a policy or lose the grant,
-- otherwise its reads silently return nothing.
DO $verify$
DECLARE unreadable text;
BEGIN
  SELECT string_agg(candidate.relname, ', ' ORDER BY candidate.relname) INTO unreadable
    FROM (
      SELECT c.oid, c.relname
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
       WHERE n.nspname = 'public'
         AND c.relkind = 'r'
         AND c.relrowsecurity
         AND has_table_privilege('indicate_runtime', c.oid, 'SELECT')
    ) candidate
   WHERE NOT EXISTS (SELECT 1 FROM pg_policy p WHERE p.polrelid = candidate.oid);
  IF unreadable IS NOT NULL THEN
    RAISE EXCEPTION 'row level security denies every row for indicate_runtime on: %', unreadable;
  END IF;
END
$verify$;

INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (16, 'operational_table_read_policies', 'sha256:8e8c93740aaae7782c45713b92e7ac4fd81220bc6a4f3647e7d8273be75cc144');

INSERT INTO drizzle."__drizzle_migrations" ("hash", "created_at") VALUES ('8c8db47f78aa865d3539bc99998d2123783ce6524fff5b429526519ed708f4a7', 1788123000000);

-- ----------------------------------------------------------------------
-- 20260903012000_data_api_and_index_hardening
-- ----------------------------------------------------------------------
-- Close the Supabase Data API surface, correct the updated_at guard, and index
-- the foreign keys that had no usable index.
--
-- 1. Data API exposure.
--
-- Supabase grants table privileges to anon and authenticated by default so that
-- PostgREST can serve the Data API. This application never uses PostgREST: every
-- query runs through Drizzle as indicate_runtime over the pooled connection, and
-- the Supabase client is used only for Auth, which lives in the auth schema with
-- its own roles. The REVOKE ALL ON SCHEMA public FROM PUBLIC issued in 0001 does
-- not remove explicit grants, so anon retained SELECT on all tables.
--
-- That mattered because thirty-two policies were created without a TO clause and
-- therefore apply to every role, and two of their predicates are satisfied without
-- any tenant context:
--   webhook_replay_claims  USING (organization_id IS NULL OR ...)
--   permissions            USING (scope = 'platform' OR ...)
-- With the publishable anon key present in the browser bundle by design, platform
-- scoped rows in those tables were readable by anyone who read the bundle,
-- including body and identity digests and webhook outcomes.
--
-- Revoking the grants removes the surface outright rather than restating thirty-two
-- policies, and it keeps working for tables added later through default privileges.
-- Role names are resolved dynamically because vanilla PostgreSQL, which CI uses,
-- has no anon or authenticated role.
DO $revoke$
DECLARE present text[];
BEGIN
  SELECT coalesce(array_agg(quote_ident(rolname)), ARRAY[]::text[]) INTO present
    FROM pg_roles WHERE rolname IN ('anon', 'authenticated');
  IF cardinality(present) = 0 THEN
    RAISE NOTICE 'no Supabase Data API roles present; nothing to revoke';
    RETURN;
  END IF;

  EXECUTE format('REVOKE ALL ON ALL TABLES IN SCHEMA public FROM %s', array_to_string(present, ', '));
  EXECUTE format('REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM %s', array_to_string(present, ', '));
  EXECUTE format('REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM %s', array_to_string(present, ', '));
  EXECUTE format('REVOKE ALL ON SCHEMA public FROM %s', array_to_string(present, ', '));
  EXECUTE format(
    'ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public REVOKE ALL ON TABLES FROM %s',
    current_user, array_to_string(present, ', ')
  );
  EXECUTE format(
    'ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public REVOKE ALL ON SEQUENCES FROM %s',
    current_user, array_to_string(present, ', ')
  );
END
$revoke$;

-- 2. updated_at guard correctness.
--
-- 0014 filled updated_at whenever NEW.updated_at matched OLD.updated_at. That
-- predicate cannot tell "the writer omitted the column" from "the writer wrote the
-- same value it already had", because PostgreSQL copies unlisted columns into NEW.
-- An idempotent rewrite that sets updated_at = p_now twice with the same p_now
-- therefore received a real now() on the second write, defeating the injected clock
-- the guard was written to preserve.
--
-- Adding WHEN (OLD.* IS DISTINCT FROM NEW.*) means a write that changes nothing
-- fires nothing, so a repeated identical write leaves the timestamp untouched.
DO $reattach$
DECLARE target record;
BEGIN
  FOR target IN
    SELECT columns.table_name AS name
      FROM information_schema.columns
      JOIN information_schema.tables
        ON tables.table_schema = columns.table_schema
       AND tables.table_name = columns.table_name
     WHERE columns.table_schema = 'public'
       AND columns.column_name = 'updated_at'
       AND tables.table_type = 'BASE TABLE'
     ORDER BY columns.table_name
  LOOP
    EXECUTE format(
      'CREATE OR REPLACE TRIGGER %I BEFORE UPDATE ON public.%I FOR EACH ROW WHEN (OLD.* IS DISTINCT FROM NEW.*) EXECUTE FUNCTION indicate_private.touch_updated_at()',
      left(target.name || '_touch_updated_at', 63),
      target.name
    );
  END LOOP;
END
$reattach$;

-- 3. Foreign keys with no usable index.
--
-- PostgreSQL indexes the referenced side of a foreign key, never the referencing
-- side. These four had no index whose leading column matched the constraint, so
-- every delete or key update on the parent forced a sequential scan on the child.
-- The two permissions indexes that exist are partial and cannot serve a general
-- referential check.
CREATE INDEX IF NOT EXISTS permissions_organization_idx
  ON public.permissions(organization_id);
CREATE INDEX IF NOT EXISTS platform_user_permissions_permission_idx
  ON public.platform_user_permissions(permission_id);
CREATE INDEX IF NOT EXISTS role_permissions_permission_idx
  ON public.role_permissions(organization_id, permission_id);
CREATE INDEX IF NOT EXISTS webhook_replay_claims_organization_idx
  ON public.webhook_replay_claims(organization_id);

-- 4. Verification.
--
-- The row level security assertion introduced in 0015 only proved that a policy
-- existed. A table carrying nothing but an INSERT policy, or a policy scoped to a
-- different role, satisfied it while still denying every read to indicate_runtime.
-- This form requires a permissive policy that covers SELECT and either applies to
-- every role or names indicate_runtime.
DO $verify$
DECLARE unreadable text;
DECLARE exposed text;
BEGIN
  SELECT string_agg(candidate.relname, ', ' ORDER BY candidate.relname) INTO unreadable
    FROM (
      SELECT c.oid, c.relname
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
       WHERE n.nspname = 'public'
         AND c.relkind = 'r'
         AND c.relrowsecurity
         AND has_table_privilege('indicate_runtime', c.oid, 'SELECT')
    ) candidate
   WHERE NOT EXISTS (
     SELECT 1
       FROM pg_policy p
      WHERE p.polrelid = candidate.oid
        AND p.polpermissive
        AND p.polcmd IN ('r', '*')
        AND (p.polroles = '{0}' OR 'indicate_runtime'::regrole::oid = ANY(p.polroles))
   );
  IF unreadable IS NOT NULL THEN
    RAISE EXCEPTION 'no permissive SELECT policy applies to indicate_runtime on: %', unreadable;
  END IF;

  SELECT string_agg(c.relname, ', ' ORDER BY c.relname) INTO exposed
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_roles r ON r.rolname IN ('anon', 'authenticated')
   WHERE n.nspname = 'public'
     AND c.relkind = 'r'
     AND has_table_privilege(r.oid, c.oid, 'SELECT');
  IF exposed IS NOT NULL THEN
    RAISE EXCEPTION 'Data API roles retain SELECT on: %', exposed;
  END IF;
END
$verify$;

INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (17, 'data_api_and_index_hardening', 'sha256:8f72552e4142ce585137c6cf1604184a67d669e1642032cc973ae6c1711c9dfc');

INSERT INTO drizzle."__drizzle_migrations" ("hash", "created_at") VALUES ('e20fd39f4580bd7fd079a59acfc3e523ee35355502b0ce1f75cdfa7e41424465', 1788124000000);

-- ----------------------------------------------------------------------
-- 20260903012500_coordination_timestamps_and_search_indexes
-- ----------------------------------------------------------------------
-- Close three measured gaps: an unusable foreign-key index, coordination tables
-- with no change timestamp, and an unindexable public search path.
--
-- 1. Foreign key index correction.
--
-- 0016 created role_permissions(organization_id, permission_id) to cover the
-- foreign key on permission_id. A composite index only serves a constraint whose
-- first column matches the index's first column, so that index led with the wrong
-- column and the constraint remained uncovered. Every delete or key update on
-- permissions still forced a sequential scan on role_permissions.
CREATE INDEX IF NOT EXISTS role_permissions_permission_lookup_idx
  ON public.role_permissions(permission_id);

-- 2. Change timestamps on coordination tables.
--
-- These three are among the most frequently written tables in the system:
-- webhook_replay_claims moves through status, pending_status, lease_expires_at,
-- attempt_count and processed_at; seed_runs through status and completed_at;
-- publication_transition_receipts through acknowledged_at and its reconciliation
-- claim fields. None recorded when a row last changed, so the guard added in 0014
-- had no column to protect and operators had no way to spot a stalled lease.
--
-- Existing rows adopt the best durable signal available rather than the migration
-- instant, so a backfilled value never claims a change that did not happen.
ALTER TABLE public.webhook_replay_claims
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
UPDATE public.webhook_replay_claims
   SET updated_at = COALESCE(processed_at, lease_expires_at, received_at, updated_at);

ALTER TABLE public.seed_runs
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
UPDATE public.seed_runs
   SET updated_at = COALESCE(completed_at, started_at, updated_at);

ALTER TABLE public.publication_transition_receipts
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
UPDATE public.publication_transition_receipts
   SET updated_at = COALESCE(acknowledged_at, created_at, updated_at);

-- Re-attach the freshness guard so the three new columns are covered. Enumerating
-- live columns keeps this correct without a hand-written table list.
DO $reattach$
DECLARE target record;
BEGIN
  FOR target IN
    SELECT columns.table_name AS name
      FROM information_schema.columns
      JOIN information_schema.tables
        ON tables.table_schema = columns.table_schema
       AND tables.table_name = columns.table_name
     WHERE columns.table_schema = 'public'
       AND columns.column_name = 'updated_at'
       AND tables.table_type = 'BASE TABLE'
     ORDER BY columns.table_name
  LOOP
    EXECUTE format(
      'CREATE OR REPLACE TRIGGER %I BEFORE UPDATE ON public.%I FOR EACH ROW WHEN (OLD.* IS DISTINCT FROM NEW.*) EXECUTE FUNCTION indicate_private.touch_updated_at()',
      left(target.name || '_touch_updated_at', 63),
      target.name
    );
  END LOOP;
END
$reattach$;

-- 3. Indexable public search.
--
-- The public search surface matches articles.title and articles.body with ILIKE
-- and a leading wildcard. A leading wildcard defeats every btree index, and
-- articles.body holds full article text, so each query scanned the table. The
-- surface is unauthenticated, which makes the cost reachable without an account.
--
-- Trigram GIN indexes serve that predicate. The extension schema differs between
-- Supabase, which keeps extensions out of public, and vanilla PostgreSQL as used
-- in CI, so both the extension and the operator class are resolved dynamically
-- instead of assuming one layout.
DO $extension$
BEGIN
  IF to_regnamespace('extensions') IS NOT NULL THEN
    EXECUTE 'CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions';
  ELSE
    EXECUTE 'CREATE EXTENSION IF NOT EXISTS pg_trgm';
  END IF;
END
$extension$;

DO $search$
DECLARE opclass_schema text;
BEGIN
  SELECT namespace.nspname INTO opclass_schema
    FROM pg_opclass opclass
    JOIN pg_namespace namespace ON namespace.oid = opclass.opcnamespace
   WHERE opclass.opcname = 'gin_trgm_ops'
   LIMIT 1;
  IF opclass_schema IS NULL THEN
    RAISE EXCEPTION 'pg_trgm operator class unavailable after extension creation';
  END IF;
  EXECUTE format(
    'CREATE INDEX IF NOT EXISTS articles_title_trgm_idx ON public.articles USING gin (title %I.gin_trgm_ops)',
    opclass_schema
  );
  EXECUTE format(
    'CREATE INDEX IF NOT EXISTS articles_body_trgm_idx ON public.articles USING gin (body %I.gin_trgm_ops)',
    opclass_schema
  );
END
$search$;

-- Verification. Every foreign key must now have an index whose leading column
-- matches the constraint's leading column, and the three new columns must carry
-- the freshness guard.
DO $verify$
DECLARE uncovered text;
DECLARE unguarded text;
BEGIN
  SELECT string_agg(format('%s(%s)', child.relname, child.attname), ', ') INTO uncovered
    FROM (
      SELECT constraint_class.relname, attribute.attname
        FROM pg_constraint constraint_row
        JOIN pg_class constraint_class ON constraint_class.oid = constraint_row.conrelid
        JOIN pg_namespace constraint_namespace ON constraint_namespace.oid = constraint_class.relnamespace
        JOIN pg_attribute attribute
          ON attribute.attrelid = constraint_row.conrelid
         AND attribute.attnum = constraint_row.conkey[1]
       WHERE constraint_row.contype = 'f'
         AND constraint_namespace.nspname = 'public'
         AND NOT EXISTS (
           SELECT 1 FROM pg_index index_row
            WHERE index_row.indrelid = constraint_row.conrelid
              AND index_row.indkey[0] = constraint_row.conkey[1]
              AND index_row.indpred IS NULL
         )
    ) child;
  IF uncovered IS NOT NULL THEN
    RAISE EXCEPTION 'foreign keys without a usable index: %', uncovered;
  END IF;

  SELECT string_agg(candidate.name, ', ' ORDER BY candidate.name) INTO unguarded
    FROM (VALUES ('webhook_replay_claims'), ('seed_runs'), ('publication_transition_receipts')) AS candidate(name)
   WHERE NOT EXISTS (
     SELECT 1
       FROM pg_trigger trigger_row
       JOIN pg_class trigger_class ON trigger_class.oid = trigger_row.tgrelid
      WHERE trigger_class.relname = candidate.name
        AND trigger_row.tgname = left(candidate.name || '_touch_updated_at', 63)
        AND NOT trigger_row.tgisinternal
   );
  IF unguarded IS NOT NULL THEN
    RAISE EXCEPTION 'updated_at guard missing for: %', unguarded;
  END IF;
END
$verify$;

INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (18, 'coordination_timestamps_and_search_indexes', 'sha256:b3f4bd44d558f6b5699c98bb30a428ecce4f24d1e08c47fedb1deb7f20df0b71');

INSERT INTO drizzle."__drizzle_migrations" ("hash", "created_at") VALUES ('6ad51e0a682eb6d0578684160cc4adb3e3243c81d5a8dc951128eaf866f7d9fd', 1788125000000);

-- ----------------------------------------------------------------------
-- 20260903013000_runtime_config_core
-- ----------------------------------------------------------------------
-- Runtime config core tables and enums (expand migration, additive).
-- Enums finite; configuration versions positive; singleton guards follow later.

CREATE TYPE public.runtime_config_environment AS ENUM ('development', 'test', 'production');
CREATE TYPE public.runtime_config_mutation_kind AS ENUM (
  'shared_deployment_config', 'media_policy', 'publication_policy', 'webhook_policy',
  'cache_policy', 'rate_limit_policy', 'domain_provider_mapping', 'site_settings'
);
CREATE TYPE public.rate_limit_endpoint_class AS ENUM ('mutation', 'webhook', 'public_read');

CREATE TABLE public.runtime_config_revisions (
  version bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  environment public.runtime_config_environment NOT NULL,
  committed_at timestamptz NOT NULL,
  mutation_kind public.runtime_config_mutation_kind NOT NULL
);
CREATE INDEX runtime_config_revisions_environment_idx ON public.runtime_config_revisions (environment);

CREATE TABLE public.shared_deployment_config (
  id text PRIMARY KEY,
  supabase_project_ref text NOT NULL,
  cloudflare_account_id text NOT NULL,
  vercel_project_id text NOT NULL,
  vercel_team_id text NOT NULL,
  vercel_production_target_hostname text NOT NULL,
  r2_account_id text NOT NULL,
  r2_bucket_name text NOT NULL,
  upstash_redis_resource_id text NOT NULL,
  version integer NOT NULL,
  updated_at timestamptz NOT NULL,
  CONSTRAINT shared_deployment_config_id_singleton CHECK (id = 'singleton'),
  CONSTRAINT shared_deployment_config_version_positive CHECK (version > 0)
);

CREATE TABLE public.media_policy (
  id text PRIMARY KEY,
  allowed_mime_types text[] NOT NULL,
  max_object_bytes integer NOT NULL,
  upload_authorization_seconds integer NOT NULL,
  read_authorization_seconds integer NOT NULL,
  version integer NOT NULL,
  updated_at timestamptz NOT NULL,
  CONSTRAINT media_policy_id_singleton CHECK (id = 'singleton'),
  CONSTRAINT media_policy_version_positive CHECK (version > 0),
  CONSTRAINT media_policy_max_bytes_positive CHECK (max_object_bytes > 0),
  CONSTRAINT media_policy_upload_positive CHECK (upload_authorization_seconds > 0),
  CONSTRAINT media_policy_read_positive CHECK (read_authorization_seconds > 0),
  CONSTRAINT media_policy_mimes_nonempty CHECK (cardinality(allowed_mime_types) > 0)
);

CREATE TABLE public.publication_policy (
  id text PRIMARY KEY,
  max_attempts integer NOT NULL,
  retry_delays_seconds integer[] NOT NULL,
  lease_seconds integer NOT NULL,
  batch_size integer NOT NULL,
  function_deadline_seconds integer NOT NULL,
  version integer NOT NULL,
  updated_at timestamptz NOT NULL,
  CONSTRAINT publication_policy_id_singleton CHECK (id = 'singleton'),
  CONSTRAINT publication_policy_max_attempts_bounds CHECK (max_attempts BETWEEN 1 AND 10),
  CONSTRAINT publication_policy_lease_bounds CHECK (lease_seconds BETWEEN 10 AND 300),
  CONSTRAINT publication_policy_batch_bounds CHECK (batch_size BETWEEN 1 AND 100),
  CONSTRAINT publication_policy_deadline_bounds CHECK (function_deadline_seconds BETWEEN 10 AND 300),
  CONSTRAINT publication_policy_retry_count CHECK (cardinality(retry_delays_seconds) BETWEEN 1 AND 9),
  CONSTRAINT publication_policy_retry_le_attempts CHECK (cardinality(retry_delays_seconds) <= max_attempts - 1),
  CONSTRAINT publication_policy_version_positive CHECK (version > 0)
);

CREATE TABLE public.webhook_policy (
  id text PRIMARY KEY,
  freshness_seconds integer NOT NULL,
  replay_retention_seconds integer NOT NULL,
  version integer NOT NULL,
  updated_at timestamptz NOT NULL,
  CONSTRAINT webhook_policy_id_singleton CHECK (id = 'singleton'),
  CONSTRAINT webhook_policy_freshness_bounds CHECK (freshness_seconds BETWEEN 1 AND 900),
  CONSTRAINT webhook_policy_replay_bounds CHECK (replay_retention_seconds BETWEEN 1 AND 86400),
  CONSTRAINT webhook_policy_replay_ge_freshness CHECK (replay_retention_seconds >= freshness_seconds),
  CONSTRAINT webhook_policy_version_positive CHECK (version > 0)
);

CREATE TABLE public.cache_policy (
  id text PRIMARY KEY,
  public_cache_seconds integer NOT NULL,
  cache_version integer NOT NULL,
  version integer NOT NULL,
  updated_at timestamptz NOT NULL,
  CONSTRAINT cache_policy_id_singleton CHECK (id = 'singleton'),
  CONSTRAINT cache_policy_public_cache_bounds CHECK (public_cache_seconds BETWEEN 0 AND 3600),
  CONSTRAINT cache_policy_cache_version_positive CHECK (cache_version > 0),
  CONSTRAINT cache_policy_version_positive CHECK (version > 0)
);

CREATE TABLE public.rate_limit_policies (
  endpoint_class public.rate_limit_endpoint_class PRIMARY KEY,
  allowance integer NOT NULL,
  window_seconds integer NOT NULL,
  version integer NOT NULL,
  updated_at timestamptz NOT NULL,
  CONSTRAINT rate_limit_policies_allowance_positive CHECK (allowance > 0),
  CONSTRAINT rate_limit_policies_window_bounds CHECK (window_seconds BETWEEN 1 AND 3600),
  CONSTRAINT rate_limit_policies_version_positive CHECK (version > 0)
);

-- Rate-limit allowance caps per endpoint class (hard safety caps).
ALTER TABLE public.rate_limit_policies
  ADD CONSTRAINT rate_limit_policies_mutation_cap CHECK (
    endpoint_class <> 'mutation' OR allowance <= 1000
  );
ALTER TABLE public.rate_limit_policies
  ADD CONSTRAINT rate_limit_policies_webhook_cap CHECK (
    endpoint_class <> 'webhook' OR allowance <= 2000
  );
ALTER TABLE public.rate_limit_policies
  ADD CONSTRAINT rate_limit_policies_public_read_cap CHECK (
    endpoint_class <> 'public_read' OR allowance <= 10000
  );

INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (19, 'runtime_config_core', 'runtime-config-core-v1');

INSERT INTO drizzle."__drizzle_migrations" ("hash", "created_at") VALUES ('f206704cc04ffdbb4d4aa7815e66340b07ff6444d9309ec6a325102a0d80a34b', 1788318971869);

-- ----------------------------------------------------------------------
-- 20260903013500_runtime_config_audit_invalidation
-- ----------------------------------------------------------------------
-- Runtime config audit log and durable invalidation intents.
-- Audit is append-only (trigger + grant revokes below); invalidation supports
-- fenced claim/complete/fail reconcilers (claim token columns).

CREATE TYPE public.config_audit_actor_type AS ENUM ('user', 'api_key', 'telegram', 'system', 'migration');
CREATE TYPE public.config_audit_outcome AS ENUM ('succeeded', 'denied', 'conflicted', 'failed');
CREATE TYPE public.invalidation_partition_kind AS ENUM ('shared', 'domain', 'site', 'policy', 'all');

CREATE TABLE public.runtime_config_audit_logs (
  id uuid PRIMARY KEY,
  organization_id uuid,
  actor_type public.config_audit_actor_type NOT NULL,
  actor_id uuid,
  environment public.runtime_config_environment NOT NULL,
  action text NOT NULL,
  target_type text NOT NULL,
  target_id uuid,
  expected_version integer,
  resulting_version integer,
  changed_fields text[] NOT NULL,
  outcome public.config_audit_outcome NOT NULL,
  request_id text,
  occurred_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX runtime_config_audit_org_time_idx ON public.runtime_config_audit_logs (organization_id, occurred_at);

CREATE TABLE public.runtime_config_invalidation_intents (
  id uuid PRIMARY KEY,
  runtime_revision bigint NOT NULL REFERENCES public.runtime_config_revisions (version) ON DELETE RESTRICT,
  environment public.runtime_config_environment NOT NULL,
  partition_kind public.invalidation_partition_kind NOT NULL,
  organization_id uuid,
  domain_id uuid,
  site_id uuid,
  status text NOT NULL DEFAULT 'pending',
  attempts integer NOT NULL DEFAULT 0,
  next_attempt_at timestamptz,
  claim_token uuid,
  claim_expires_at timestamptz,
  failure_category text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT runtime_config_invalidation_attempts_nonnegative CHECK (attempts >= 0),
  CONSTRAINT runtime_config_invalidation_unique UNIQUE (runtime_revision, partition_kind, organization_id, domain_id, site_id)
);
CREATE INDEX runtime_config_invalidation_due_idx ON public.runtime_config_invalidation_intents (status, next_attempt_at);

-- Append-only guard on configuration audit; mirrors the audit_logs pattern.
CREATE OR REPLACE FUNCTION indicate_private.reject_config_audit_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public, indicate_private
AS $$
BEGIN
  RAISE EXCEPTION 'configuration audit logs are append-only' USING ERRCODE = '42501';
END
$$;
CREATE TRIGGER runtime_config_audit_logs_append_only_guard
BEFORE UPDATE OR DELETE ON public.runtime_config_audit_logs
FOR EACH ROW EXECUTE FUNCTION indicate_private.reject_config_audit_mutation();

-- Revoke mutation rights on shared tables; reads/writes go through the
-- security-definer functions (added in 0022). Tenant-scoped audit/invalidation
-- rows remain RLS-protected via grant + forced policy.
REVOKE ALL ON TABLE public.runtime_config_audit_logs, public.runtime_config_invalidation_intents
FROM PUBLIC;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLE public.runtime_config_audit_logs,
  public.runtime_config_invalidation_intents FROM indicate_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.runtime_config_audit_logs,
  public.runtime_config_invalidation_intents TO indicate_runtime;

INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (20, 'runtime_config_audit_invalidation', 'runtime-config-audit-invalidation-v1');

INSERT INTO drizzle."__drizzle_migrations" ("hash", "created_at") VALUES ('fabb8acb0d1b6c2ce6f3ab3dcf0cafca0390bec91a378f7a83fceecaa6b5889f', 1788318972869);

-- ----------------------------------------------------------------------
-- 20260903014000_runtime_config_rollout
-- ----------------------------------------------------------------------
-- Rollout tables: immutable release manifest, explicit Domain-to-zone mapping,
-- idempotent backfill accounting, and sanitized parity evidence. Used by the
-- deferred parity/cutover tooling; added now so the schema evolves forward-only
-- before behavior depends on it.

CREATE TABLE public.runtime_config_release_manifests (
  id uuid PRIMARY KEY,
  grammar_version integer NOT NULL,
  parity_start timestamptz NOT NULL,
  parity_end timestamptz NOT NULL,
  legacy_source_version text NOT NULL,
  expected_source_count integer NOT NULL,
  target_schema_version integer NOT NULL,
  candidate_app_version text NOT NULL,
  rollback_app_version text NOT NULL,
  rollback_schema_min integer NOT NULL,
  rollback_schema_max integer NOT NULL,
  status text NOT NULL DEFAULT 'proposed',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT runtime_config_release_manifests_grammar_positive CHECK (grammar_version > 0),
  CONSTRAINT runtime_config_release_manifests_source_positive CHECK (expected_source_count > 0),
  CONSTRAINT runtime_config_release_manifests_parity_window CHECK ((parity_end - parity_start) <= interval '7 days'),
  CONSTRAINT runtime_config_release_manifests_schema_bounds CHECK (rollback_schema_max >= rollback_schema_min)
);

CREATE TABLE public.runtime_config_release_domain_zones (
  manifest_id uuid NOT NULL REFERENCES public.runtime_config_release_manifests (id) ON DELETE CASCADE,
  domain_id uuid NOT NULL,
  zone_id text NOT NULL,
  PRIMARY KEY (manifest_id, domain_id),
  CONSTRAINT runtime_config_release_domain_zones_zone_unique UNIQUE (zone_id)
);

CREATE TABLE public.runtime_config_backfill_runs (
  id uuid PRIMARY KEY,
  manifest_id uuid NOT NULL REFERENCES public.runtime_config_release_manifests (id) ON DELETE CASCADE,
  source_version text NOT NULL,
  schema_version integer NOT NULL,
  created_count integer NOT NULL,
  updated_count integer NOT NULL,
  unchanged_count integer NOT NULL,
  conflicted_count integer NOT NULL,
  failed_count integer NOT NULL,
  processed_count integer NOT NULL,
  started_at timestamptz NOT NULL,
  completed_at timestamptz,
  CONSTRAINT runtime_config_backfill_counts_nonnegative CHECK (
    created_count >= 0 AND updated_count >= 0 AND unchanged_count >= 0 AND conflicted_count >= 0 AND failed_count >= 0 AND processed_count >= 0
  ),
  CONSTRAINT runtime_config_backfill_sum CHECK (
    created_count + updated_count + unchanged_count + conflicted_count + failed_count = processed_count
  )
);

CREATE TABLE public.runtime_config_parity_evidence (
  id uuid PRIMARY KEY,
  manifest_id uuid NOT NULL REFERENCES public.runtime_config_release_manifests (id) ON DELETE CASCADE,
  check_name text NOT NULL,
  source_version text NOT NULL,
  persisted_version integer NOT NULL,
  authorized_target_id uuid,
  category text NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT now()
);

-- Manifests and mapping rows are immutable after insert.
CREATE OR REPLACE FUNCTION indicate_private.reject_rollout_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public, indicate_private
AS $$
BEGIN
  RAISE EXCEPTION 'runtime config rollout records are immutable' USING ERRCODE = '42501';
END
$$;
CREATE TRIGGER runtime_config_release_manifests_immutable_guard
BEFORE UPDATE OR DELETE OR TRUNCATE ON public.runtime_config_release_manifests
FOR EACH STATEMENT EXECUTE FUNCTION indicate_private.reject_rollout_mutation();
CREATE TRIGGER runtime_config_release_domain_zones_immutable_guard
BEFORE UPDATE OR DELETE OR TRUNCATE ON public.runtime_config_release_domain_zones
FOR EACH STATEMENT EXECUTE FUNCTION indicate_private.reject_rollout_mutation();
CREATE TRIGGER runtime_config_parity_evidence_immutable_guard
BEFORE UPDATE OR DELETE ON public.runtime_config_parity_evidence
FOR EACH ROW EXECUTE FUNCTION indicate_private.reject_rollout_mutation();

REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLE public.runtime_config_release_manifests,
  public.runtime_config_release_domain_zones, public.runtime_config_backfill_runs,
  public.runtime_config_parity_evidence FROM indicate_runtime;
GRANT SELECT ON TABLE public.runtime_config_release_manifests,
  public.runtime_config_release_domain_zones, public.runtime_config_backfill_runs,
  public.runtime_config_parity_evidence TO indicate_runtime;

INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (21, 'runtime_config_rollout', 'runtime-config-rollout-v1');

INSERT INTO drizzle."__drizzle_migrations" ("hash", "created_at") VALUES ('6fa4c0f9303df49afcb3b7ee72fb30d2409ca8c4a5312b6828254c82db4a76fe', 1788318973869);

-- ----------------------------------------------------------------------
-- 20260903014500_runtime_config_site_settings_zone_rls
-- ----------------------------------------------------------------------
-- Extend existing relations for database-backed runtime configuration:
-- typed Site Settings columns, global unique non-null Cloudflare zone IDs,
-- permission seeds, and forced RLS on the tenant-scoped config tables.

-- Typed Site Settings columns. Nullable during backfill; a deferred active-Site
-- guard (0023) makes them required once backfilled data satisfies it.
ALTER TABLE public.site_settings
  ADD COLUMN locale text NULL,
  ADD COLUMN seo_default_title text NULL,
  ADD COLUMN seo_default_description text NULL,
  ADD COLUMN seo_robots_directive text NULL,
  ADD COLUMN seo_open_graph_site_name text NULL,
  ADD COLUMN seo_schema_version integer NULL;

ALTER TABLE public.site_settings
  ADD CONSTRAINT site_settings_locale_shape CHECK (locale IS NULL OR locale ~ '^[a-z]{2}-[A-Z]{2}$'),
  ADD CONSTRAINT site_settings_seo_robots_directive_shape CHECK (
    seo_robots_directive IS NULL OR seo_robots_directive IN ('index,follow', 'noindex,nofollow')
  ),
  ADD CONSTRAINT site_settings_seo_schema_version_bounds CHECK (
    seo_schema_version IS NULL OR (seo_schema_version BETWEEN 1 AND 2147483647)
  );

-- Global uniqueness of non-null Cloudflare Zone IDs across Domain records.
CREATE UNIQUE INDEX domains_cloudflare_zone_id_unique
  ON public.domains (cloudflare_zone_id)
  WHERE cloudflare_zone_id IS NOT NULL;

-- Platform runtime-config and Site Settings manage permissions. Explicitly not
-- assigned to any Role; administrators attach them to approved Roles.
INSERT INTO public.permissions (id, organization_id, name, scope, description)
VALUES
  ('00000000-0000-4000-8000-000000006002', NULL, 'platform.runtime_config.manage', 'platform', 'Mutate shared runtime configuration and provider mappings'),
  ('00000000-0000-4000-8000-000000006003', NULL, 'site_settings.manage', 'platform', 'Mutate Site Settings for a Site')
ON CONFLICT DO NOTHING;

-- Forced RLS on tenant-scoped configuration tables. Shared tables and policy
-- tables remain governed by revoked-DML + security-definer functions instead.
ALTER TABLE public.runtime_config_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.runtime_config_audit_logs FORCE ROW LEVEL SECURITY;
ALTER TABLE public.runtime_config_invalidation_intents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.runtime_config_invalidation_intents FORCE ROW LEVEL SECURITY;

-- Tenant isolation: same-Organization predicate for the config audit log. Denials
-- and cross-tenant reads store null org and remain readable only in context.
CREATE POLICY runtime_config_audit_tenant_isolation
  ON public.runtime_config_audit_logs
  USING (
    organization_id IS NULL
      OR organization_id = indicate_private.current_organization_id()
  )
  WITH CHECK (
    organization_id IS NULL
      OR organization_id = indicate_private.current_organization_id()
  );

CREATE POLICY runtime_config_invalidation_tenant_isolation
  ON public.runtime_config_invalidation_intents
  USING (
    organization_id IS NULL
      OR organization_id = indicate_private.current_organization_id()
  )
  WITH CHECK (
    organization_id IS NULL
      OR organization_id = indicate_private.current_organization_id()
  );

INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (22, 'runtime_config_site_settings_zone_rls', 'runtime-config-site-settings-zone-rls-v1');

INSERT INTO drizzle."__drizzle_migrations" ("hash", "created_at") VALUES ('9bca35529083f22ae188b8ba8d98be4b8cbb8ca58bf53b9c396415e125d4a1e3', 1788318974869);

-- ----------------------------------------------------------------------
-- 20260903015000_runtime_config_functions
-- ----------------------------------------------------------------------
-- Security-definer runtime configuration functions plus grants. All reads and
-- writes on the shared/policy config tables flow through these fixed-shape
-- functions; direct table DML remains revoked. Follows the Phase 6 pattern:
-- explicit search_path, REVOKE ... FROM PUBLIC, GRANT EXECUTE to indicate_runtime
-- only, no dynamic SQL, no credential-bearing return columns.

-- =============================================================================
-- READ FUNCTIONS (fixed return shapes, runtime role enumerates config)
-- =============================================================================
CREATE OR REPLACE FUNCTION indicate_private.read_runtime_config_revision(p_environment text)
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, indicate_private
AS $$
  SELECT max(version)
  FROM public.runtime_config_revisions
  WHERE environment::text = p_environment
$$;
REVOKE ALL ON FUNCTION indicate_private.read_runtime_config_revision(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.read_runtime_config_revision(text) TO indicate_runtime;

CREATE OR REPLACE FUNCTION indicate_private.read_runtime_config_shared()
RETURNS TABLE (
  supabase_project_ref text,
  cloudflare_account_id text,
  vercel_project_id text,
  vercel_team_id text,
  vercel_production_target_hostname text,
  r2_account_id text,
  r2_bucket_name text,
  upstash_redis_resource_id text,
  version integer,
  updated_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, indicate_private
AS $$
BEGIN
  RETURN QUERY
  SELECT s.supabase_project_ref, s.cloudflare_account_id, s.vercel_project_id, s.vercel_team_id,
         s.vercel_production_target_hostname, s.r2_account_id, s.r2_bucket_name,
         s.upstash_redis_resource_id, s.version, s.updated_at
  FROM public.shared_deployment_config AS s
  LIMIT 1;
END
$$;
REVOKE ALL ON FUNCTION indicate_private.read_runtime_config_shared() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.read_runtime_config_shared() TO indicate_runtime;

CREATE OR REPLACE FUNCTION indicate_private.read_runtime_config_policies()
RETURNS TABLE (
  policy_kind text,
  endpoint_class text,
  fields jsonb
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, indicate_private
AS $$
BEGIN
  RETURN QUERY
    SELECT 'media_policy'::text,
           NULL::text,
           jsonb_build_object(
             'allowedMimeTypes', mp.allowed_mime_types,
             'maxObjectBytes', mp.max_object_bytes,
             'uploadAuthorizationSeconds', mp.upload_authorization_seconds,
             'readAuthorizationSeconds', mp.read_authorization_seconds,
             'version', mp.version
           )
    FROM public.media_policy AS mp
  UNION ALL
    SELECT 'publication_policy', NULL,
           jsonb_build_object(
             'maxAttempts', pp.max_attempts,
             'retryDelaysSeconds', pp.retry_delays_seconds,
             'leaseSeconds', pp.lease_seconds,
             'batchSize', pp.batch_size,
             'functionDeadlineSeconds', pp.function_deadline_seconds,
             'version', pp.version
           )
    FROM public.publication_policy AS pp
  UNION ALL
    SELECT 'webhook_policy', NULL,
           jsonb_build_object(
             'freshnessSeconds', wp.freshness_seconds,
             'replayRetentionSeconds', wp.replay_retention_seconds,
             'version', wp.version
           )
    FROM public.webhook_policy AS wp
  UNION ALL
    SELECT 'cache_policy', NULL,
           jsonb_build_object(
             'publicCacheSeconds', cp.public_cache_seconds,
             'cacheVersion', cp.cache_version,
             'version', cp.version
           )
    FROM public.cache_policy AS cp
  UNION ALL
    SELECT 'rate_limit_policy'::text, rl.endpoint_class::text,
           jsonb_build_object(
             'allowance', rl.allowance,
             'windowSeconds', rl.window_seconds,
             'version', rl.version
           )
    FROM public.rate_limit_policies AS rl;
END
$$;
REVOKE ALL ON FUNCTION indicate_private.read_runtime_config_policies() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.read_runtime_config_policies() TO indicate_runtime;

CREATE OR REPLACE FUNCTION indicate_private.read_runtime_config_active_domains()
RETURNS TABLE (
  organization_id uuid,
  domain_id uuid,
  normalized_hostname text,
  cloudflare_zone_id text,
  routing_version integer,
  version integer
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, indicate_private
AS $$
BEGIN
  RETURN QUERY
  SELECT d.organization_id, d.id, d.normalized_hostname, d.cloudflare_zone_id,
         d.routing_version, d.version
  FROM public.domains AS d
  WHERE d.status = 'active'
    AND d.cloudflare_zone_id IS NOT NULL
  ORDER BY d.normalized_hostname;
END
$$;
REVOKE ALL ON FUNCTION indicate_private.read_runtime_config_active_domains() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.read_runtime_config_active_domains() TO indicate_runtime;

CREATE OR REPLACE FUNCTION indicate_private.read_runtime_config_active_sites()
RETURNS TABLE (
  organization_id uuid,
  site_id uuid,
  domain_id uuid,
  normalized_hostname text,
  region_id uuid,
  routing_version integer,
  content_version integer,
  version integer,
  domain_organization_id uuid,
  domain_normalized_hostname text,
  settings_version integer
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, indicate_private
AS $$
BEGIN
  RETURN QUERY
  SELECT s.organization_id, s.id, s.domain_id, s.normalized_hostname, s.region_id,
         s.routing_version, s.content_version, s.version,
         d.organization_id, d.normalized_hostname,
         COALESCE(ss.version, 0)
  FROM public.sites AS s
  JOIN public.domains AS d ON d.organization_id = s.organization_id AND d.id = s.domain_id
  LEFT JOIN public.site_settings AS ss
    ON ss.organization_id = s.organization_id AND ss.site_id = s.id
  WHERE s.status = 'active'
    AND s.activation_state = 'active'
  ORDER BY s.normalized_hostname;
END
$$;
REVOKE ALL ON FUNCTION indicate_private.read_runtime_config_active_sites() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.read_runtime_config_active_sites() TO indicate_runtime;

CREATE OR REPLACE FUNCTION indicate_private.read_runtime_config_site_settings()
RETURNS TABLE (
  organization_id uuid,
  site_id uuid,
  locale text,
  seo_default_title text,
  seo_default_description text,
  seo_robots_directive text,
  seo_open_graph_site_name text,
  seo_schema_version integer,
  fallback_media_id uuid,
  fallback_media_object_key text,
  fallback_media_state text,
  fallback_media_organization_id uuid,
  version integer
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, indicate_private
AS $$
BEGIN
  RETURN QUERY
  SELECT ss.organization_id, ss.site_id, ss.locale, ss.seo_default_title,
         ss.seo_default_description, ss.seo_robots_directive,
         ss.seo_open_graph_site_name, ss.seo_schema_version,
         ss.fallback_media_id, m.object_key, m.state::text, m.organization_id,
         ss.version
  FROM public.site_settings AS ss
  LEFT JOIN public.media AS m
    ON m.organization_id = ss.organization_id AND m.id = ss.fallback_media_id
  ORDER BY ss.organization_id, ss.site_id;
END
$$;
REVOKE ALL ON FUNCTION indicate_private.read_runtime_config_site_settings() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.read_runtime_config_site_settings() TO indicate_runtime;

-- =============================================================================
-- MUTATION FUNCTIONS (optimistic; one transaction for value+revision+audit+intent)
-- =============================================================================
CREATE OR REPLACE FUNCTION indicate_private.mutate_runtime_config_shared(
  p_actor_id uuid,
  p_expected_version integer,
  p_supabase_project_ref text,
  p_cloudflare_account_id text,
  p_vercel_project_id text,
  p_vercel_team_id text,
  p_vercel_production_target_hostname text,
  p_r2_account_id text,
  p_r2_bucket_name text,
  p_upstash_redis_resource_id text
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, indicate_private
AS $$
DECLARE
  v_after integer;
  v_revision bigint;
BEGIN
  IF NOT indicate_private.has_platform_permission(p_actor_id, 'platform.runtime_config.manage') THEN
    RAISE EXCEPTION 'platform runtime config permission denied' USING ERRCODE = '42501';
  END IF;

  UPDATE public.shared_deployment_config AS s
     SET supabase_project_ref = p_supabase_project_ref,
         cloudflare_account_id = p_cloudflare_account_id,
         vercel_project_id = p_vercel_project_id,
         vercel_team_id = p_vercel_team_id,
         vercel_production_target_hostname = p_vercel_production_target_hostname,
         r2_account_id = p_r2_account_id,
         r2_bucket_name = p_r2_bucket_name,
         upstash_redis_resource_id = p_upstash_redis_resource_id,
         version = version + 1,
         updated_at = now()
   WHERE s.id = 'singleton' AND s.version = p_expected_version
   RETURNING s.version INTO v_after;

  IF v_after IS NULL THEN
    RAISE EXCEPTION 'runtime config version conflict' USING ERRCODE = '55000';
  END IF;

  v_revision := nextval(pg_get_serial_sequence('public.runtime_config_revisions', 'version'));
  INSERT INTO public.runtime_config_revisions (version, environment, committed_at, mutation_kind)
  VALUES (v_revision, current_setting('app.environment', true), now(), 'shared_deployment_config');

  INSERT INTO public.runtime_config_audit_logs (
    id, organization_id, actor_type, actor_id, environment, action, target_type,
    target_id, expected_version, resulting_version, changed_fields, outcome, request_id
  ) VALUES (
    gen_random_uuid(), NULL, 'user', p_actor_id, current_setting('app.environment', true),
    'update', 'shared_deployment_config', NULL, p_expected_version, v_after,
    ARRAY['supabase_project_ref','cloudflare_account_id','vercel_project_id','vercel_team_id',
          'vercel_production_target_hostname','r2_account_id','r2_bucket_name',
          'upstash_redis_resource_id'],
    'succeeded', current_setting('app.request_id', true)
  );

  INSERT INTO public.runtime_config_invalidation_intents (
    id, runtime_revision, environment, partition_kind, status, attempts, next_attempt_at
  ) VALUES (
    gen_random_uuid(), v_revision, current_setting('app.environment', true), 'shared',
    'pending', 0, now()
  );

  RETURN v_after;
END
$$;
REVOKE ALL ON FUNCTION indicate_private.mutate_runtime_config_shared(uuid, integer, text, text, text, text, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.mutate_runtime_config_shared(uuid, integer, text, text, text, text, text, text, text, text) TO indicate_runtime;

CREATE OR REPLACE FUNCTION indicate_private.claim_runtime_config_invalidations(
  p_limit integer,
  p_lease_until timestamptz
)
RETURNS TABLE (
  intent_id uuid,
  runtime_revision bigint,
  partition_kind text,
  organization_id uuid,
  domain_id uuid,
  site_id uuid,
  claim_token uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, indicate_private
AS $$
BEGIN
  UPDATE public.runtime_config_invalidation_intents AS i
     SET status = 'claimed',
         attempts = attempts + 1,
         claim_token = gen_random_uuid(),
         claim_expires_at = p_lease_until,
         updated_at = now()
   WHERE i.id IN (
     SELECT i2.id
     FROM public.runtime_config_invalidation_intents AS i2
     WHERE i2.status = 'pending'
        OR (i2.status = 'failed' AND i2.next_attempt_at <= now())
     LIMIT p_limit
   )
   RETURNING i.id, i.runtime_revision, i.partition_kind::text, i.organization_id,
             i.domain_id, i.site_id, i.claim_token;
END
$$;
REVOKE ALL ON FUNCTION indicate_private.claim_runtime_config_invalidations(integer, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.claim_runtime_config_invalidations(integer, timestamptz) TO indicate_runtime;

CREATE OR REPLACE FUNCTION indicate_private.complete_runtime_config_invalidation(
  p_intent_id uuid,
  p_claim_token uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, indicate_private
AS $$
BEGIN
  UPDATE public.runtime_config_invalidation_intents
     SET status = 'completed',
         updated_at = now()
   WHERE id = p_intent_id AND claim_token = p_claim_token AND status = 'claimed';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'invalidation claim stale or unknown' USING ERRCODE = '55000';
  END IF;
END
$$;
REVOKE ALL ON FUNCTION indicate_private.complete_runtime_config_invalidation(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.complete_runtime_config_invalidation(uuid, uuid) TO indicate_runtime;

CREATE OR REPLACE FUNCTION indicate_private.fail_runtime_config_invalidation(
  p_intent_id uuid,
  p_claim_token uuid,
  p_category text,
  p_next_attempt_at timestamptz
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, indicate_private
AS $$
BEGIN
  UPDATE public.runtime_config_invalidation_intents
     SET status = 'failed',
         failure_category = p_category,
         next_attempt_at = p_next_attempt_at,
         updated_at = now()
   WHERE id = p_intent_id AND claim_token = p_claim_token AND status = 'claimed';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'invalidation claim stale or unknown' USING ERRCODE = '55000';
  END IF;
END
$$;
REVOKE ALL ON FUNCTION indicate_private.fail_runtime_config_invalidation(uuid, uuid, text, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.fail_runtime_config_invalidation(uuid, uuid, text, timestamptz) TO indicate_runtime;

INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (23, 'runtime_config_functions', 'runtime-config-functions-v1');

INSERT INTO drizzle."__drizzle_migrations" ("hash", "created_at") VALUES ('2671a870865b139376dccdd8ab8f9e2a56310c70caa554b36c1e94d79bbeb991', 1788318975869);

-- ----------------------------------------------------------------------
-- 20260903015500_runtime_config_constraints_triggers
-- ----------------------------------------------------------------------
-- Final runtime-config constraints and triggers. Deferred guards prevent an
-- Active Site from losing valid locale/SEO/fallback state; activation requires
-- a non-null Cloudflare zone ID; policy arrays get per-element bounds.

-- Per-element publication retry bounds + distinctness hint.
CREATE OR REPLACE FUNCTION indicate_private.validate_publication_retry_delays()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public, indicate_private
AS $$
DECLARE
  v_delay integer;
  v_index integer;
BEGIN
  IF cardinality(NEW.retry_delays_seconds) < 1 OR cardinality(NEW.retry_delays_seconds) > 9 THEN
    RAISE EXCEPTION 'publication retry delays must hold 1..9 entries' USING ERRCODE = '23514';
  END IF;
  IF NEW.max_attempts < 1 OR cardinality(NEW.retry_delays_seconds) > NEW.max_attempts - 1 THEN
    RAISE EXCEPTION 'publication retry count exceeds max_attempts-1' USING ERRCODE = '23514';
  END IF;
  FOR v_index IN 1 .. cardinality(NEW.retry_delays_seconds) LOOP
    v_delay := NEW.retry_delays_seconds[v_index];
    IF v_delay < 1 OR v_delay > 3600 THEN
      RAISE EXCEPTION 'publication retry delay out of bounds' USING ERRCODE = '23514';
    END IF;
    IF cardinality(array_positions(NEW.retry_delays_seconds, v_delay)) > 1 THEN
      RAISE EXCEPTION 'publication retry delays must be distinct' USING ERRCODE = '23514';
    END IF;
  END LOOP;
  RETURN NEW;
END
$$;
CREATE TRIGGER publication_policy_retry_delays_guard
BEFORE INSERT OR UPDATE ON public.publication_policy
FOR EACH ROW EXECUTE FUNCTION indicate_private.validate_publication_retry_delays();

-- Non-empty distinct allowed MIME types.
CREATE OR REPLACE FUNCTION indicate_private.validate_media_policy_mimes()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public, indicate_private
AS $$
DECLARE
  v_mime text;
  v_seen text[] := '{}';
BEGIN
  IF cardinality(NEW.allowed_mime_types) < 1 THEN
    RAISE EXCEPTION 'media policy requires at least one MIME type' USING ERRCODE = '23514';
  END IF;
  FOREACH v_mime IN ARRAY NEW.allowed_mime_types LOOP
    IF v_mime = ANY (v_seen) THEN
      RAISE EXCEPTION 'media policy MIME types must be distinct' USING ERRCODE = '23514';
    END IF;
    v_seen := v_seen || v_mime;
  END LOOP;
  RETURN NEW;
END
$$;
CREATE TRIGGER media_policy_mimes_guard
BEFORE INSERT OR UPDATE ON public.media_policy
FOR EACH ROW EXECUTE FUNCTION indicate_private.validate_media_policy_mimes();

-- Domain activation requires a non-null Cloudflare zone ID.
CREATE OR REPLACE FUNCTION indicate_private.guard_active_domain_zone()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public, indicate_private
AS $$
BEGIN
  IF NEW.status = 'active' AND NEW.cloudflare_zone_id IS NULL THEN
    RAISE EXCEPTION 'active domain requires a Cloudflare zone id' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END
$$;
CREATE TRIGGER domains_active_requires_zone_guard
BEFORE INSERT OR UPDATE ON public.domains
FOR EACH ROW EXECUTE FUNCTION indicate_private.guard_active_domain_zone();

-- Deferred guard: an Active Site must have complete valid Same-Organization
-- locale/SEO/fallback settings. Runs at commit so a multi-statement activation
-- transaction can build state before verification.
CREATE OR REPLACE FUNCTION indicate_private.guard_active_site_settings()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public, indicate_private
AS $$
BEGIN
  IF NEW.status = 'active' AND NEW.activation_state = 'active' THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.site_settings AS ss
      WHERE ss.organization_id = NEW.organization_id
        AND ss.site_id = NEW.id
        AND ss.locale IS NOT NULL
        AND ss.seo_default_title IS NOT NULL
        AND ss.seo_default_description IS NOT NULL
        AND ss.seo_robots_directive IS NOT NULL
        AND ss.seo_open_graph_site_name IS NOT NULL
        AND ss.seo_schema_version IS NOT NULL
        AND ss.fallback_media_id IS NOT NULL
        AND EXISTS (
          SELECT 1
          FROM public.media AS m
          WHERE m.organization_id = ss.organization_id
            AND m.id = ss.fallback_media_id
            AND m.state = 'active'
        )
    ) THEN
      RAISE EXCEPTION 'active site requires complete same-organization site settings and active fallback media' USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END
$$;
CREATE CONSTRAINT TRIGGER sites_settings_guard_deferred
AFTER INSERT OR UPDATE ON public.sites
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION indicate_private.guard_active_site_settings();

-- Guard: valid Site Settings cannot be deleted or invalidated while the Site is active.
CREATE OR REPLACE FUNCTION indicate_private.guard_site_settings_against_active_site()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public, indicate_private
AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.sites AS s
    WHERE s.organization_id = OLD.organization_id
      AND s.id = OLD.site_id
      AND s.status = 'active'
      AND s.activation_state = 'active'
  ) AND (
    OLD.locale IS NULL OR OLD.seo_default_title IS NULL OR OLD.seo_default_description IS NULL
    OR OLD.seo_robots_directive IS NULL OR OLD.seo_open_graph_site_name IS NULL OR OLD.seo_schema_version IS NULL
    OR OLD.fallback_media_id IS NULL
  ) THEN
    RAISE EXCEPTION 'cannot invalidate site settings while the site is active' USING ERRCODE = '23514';
  END IF;
  RETURN OLD;
END
$$;
CREATE TRIGGER site_settings_active_site_guard
BEFORE UPDATE OR DELETE ON public.site_settings
FOR EACH ROW EXECUTE FUNCTION indicate_private.guard_site_settings_against_active_site();

INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (24, 'runtime_config_constraints_triggers', 'runtime-config-constraints-triggers-v1');

INSERT INTO drizzle."__drizzle_migrations" ("hash", "created_at") VALUES ('61602bbd86ddef9b644bc768bfa0d098303afe161755eff354201df63bd11122', 1788318976869);

-- ----------------------------------------------------------------------
-- 20260903020000_runtime_config_mutations
-- ----------------------------------------------------------------------
-- Security-definer runtime configuration mutation functions for policy singletons,
-- Domain provider-mapping, and per-Site Settings. These complement the shared
-- config mutation added in 0022 and follow the same transaction shape: revalidate
-- authorization, optimistically version-predicated UPDATE, appending a runtime
-- revision, a sanitized audit event, and every durable invalidation intent in the
-- same transaction. Platform functions require the explicit platform permission
-- `platform.runtime_config.manage`; the Site Settings function requires an active
-- Membership holding `site_settings.manage` for the exact Organization/Site.
-- Follows the Phase 6 pattern: explicit search_path, REVOKE ... FROM PUBLIC,
-- GRANT EXECUTE to indicate_runtime only, no dynamic SQL, no credential-bearing
-- return columns.

-- =============================================================================
-- POLICY MUTATIONS (optimistic; one transaction for value+revision+audit+intent)
-- =============================================================================

CREATE OR REPLACE FUNCTION indicate_private.mutate_runtime_config_media_policy(
  p_actor_id uuid,
  p_expected_version integer,
  p_allowed_mime_types text[],
  p_max_object_bytes integer,
  p_upload_authorization_seconds integer,
  p_read_authorization_seconds integer
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, indicate_private
AS $$
DECLARE
  v_after integer;
  v_revision bigint;
BEGIN
  IF NOT indicate_private.has_platform_permission(p_actor_id, 'platform.runtime_config.manage') THEN
    RAISE EXCEPTION 'platform runtime config permission denied' USING ERRCODE = '42501';
  END IF;

  UPDATE public.media_policy AS m
     SET allowed_mime_types = p_allowed_mime_types,
         max_object_bytes = p_max_object_bytes,
         upload_authorization_seconds = p_upload_authorization_seconds,
         read_authorization_seconds = p_read_authorization_seconds,
         version = version + 1,
         updated_at = now()
   WHERE m.id = 'singleton' AND m.version = p_expected_version
   RETURNING m.version INTO v_after;

  IF v_after IS NULL THEN
    RAISE EXCEPTION 'runtime config version conflict' USING ERRCODE = '55000';
  END IF;

  v_revision := nextval(pg_get_serial_sequence('public.runtime_config_revisions', 'version'));
  INSERT INTO public.runtime_config_revisions (version, environment, committed_at, mutation_kind)
  VALUES (v_revision, current_setting('app.environment', true), now(), 'media_policy');

  INSERT INTO public.runtime_config_audit_logs (
    id, organization_id, actor_type, actor_id, environment, action, target_type,
    target_id, expected_version, resulting_version, changed_fields, outcome, request_id
  ) VALUES (
    gen_random_uuid(), NULL, 'user', p_actor_id, current_setting('app.environment', true),
    'update', 'media_policy', NULL, p_expected_version, v_after,
    ARRAY['allowed_mime_types','max_object_bytes','upload_authorization_seconds','read_authorization_seconds'],
    'succeeded', current_setting('app.request_id', true)
  );

  INSERT INTO public.runtime_config_invalidation_intents (
    id, runtime_revision, environment, partition_kind, status, attempts, next_attempt_at
  ) VALUES (
    gen_random_uuid(), v_revision, current_setting('app.environment', true), 'policy',
    'pending', 0, now()
  );

  RETURN v_after;
END
$$;
REVOKE ALL ON FUNCTION indicate_private.mutate_runtime_config_media_policy(uuid, integer, text[], integer, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.mutate_runtime_config_media_policy(uuid, integer, text[], integer, integer, integer) TO indicate_runtime;

CREATE OR REPLACE FUNCTION indicate_private.mutate_runtime_config_publication_policy(
  p_actor_id uuid,
  p_expected_version integer,
  p_max_attempts integer,
  p_retry_delays_seconds integer[],
  p_lease_seconds integer,
  p_batch_size integer,
  p_function_deadline_seconds integer
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, indicate_private
AS $$
DECLARE
  v_after integer;
  v_revision bigint;
BEGIN
  IF NOT indicate_private.has_platform_permission(p_actor_id, 'platform.runtime_config.manage') THEN
    RAISE EXCEPTION 'platform runtime config permission denied' USING ERRCODE = '42501';
  END IF;

  UPDATE public.publication_policy AS pp
     SET max_attempts = p_max_attempts,
         retry_delays_seconds = p_retry_delays_seconds,
         lease_seconds = p_lease_seconds,
         batch_size = p_batch_size,
         function_deadline_seconds = p_function_deadline_seconds,
         version = version + 1,
         updated_at = now()
   WHERE pp.id = 'singleton' AND pp.version = p_expected_version
   RETURNING pp.version INTO v_after;

  IF v_after IS NULL THEN
    RAISE EXCEPTION 'runtime config version conflict' USING ERRCODE = '55000';
  END IF;

  v_revision := nextval(pg_get_serial_sequence('public.runtime_config_revisions', 'version'));
  INSERT INTO public.runtime_config_revisions (version, environment, committed_at, mutation_kind)
  VALUES (v_revision, current_setting('app.environment', true), now(), 'publication_policy');

  INSERT INTO public.runtime_config_audit_logs (
    id, organization_id, actor_type, actor_id, environment, action, target_type,
    target_id, expected_version, resulting_version, changed_fields, outcome, request_id
  ) VALUES (
    gen_random_uuid(), NULL, 'user', p_actor_id, current_setting('app.environment', true),
    'update', 'publication_policy', NULL, p_expected_version, v_after,
    ARRAY['max_attempts','retry_delays_seconds','lease_seconds','batch_size','function_deadline_seconds'],
    'succeeded', current_setting('app.request_id', true)
  );

  INSERT INTO public.runtime_config_invalidation_intents (
    id, runtime_revision, environment, partition_kind, status, attempts, next_attempt_at
  ) VALUES (
    gen_random_uuid(), v_revision, current_setting('app.environment', true), 'policy',
    'pending', 0, now()
  );

  RETURN v_after;
END
$$;
REVOKE ALL ON FUNCTION indicate_private.mutate_runtime_config_publication_policy(uuid, integer, integer, integer[], integer, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.mutate_runtime_config_publication_policy(uuid, integer, integer, integer[], integer, integer, integer) TO indicate_runtime;

CREATE OR REPLACE FUNCTION indicate_private.mutate_runtime_config_webhook_policy(
  p_actor_id uuid,
  p_expected_version integer,
  p_freshness_seconds integer,
  p_replay_retention_seconds integer
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, indicate_private
AS $$
DECLARE
  v_after integer;
  v_revision bigint;
BEGIN
  IF NOT indicate_private.has_platform_permission(p_actor_id, 'platform.runtime_config.manage') THEN
    RAISE EXCEPTION 'platform runtime config permission denied' USING ERRCODE = '42501';
  END IF;

  UPDATE public.webhook_policy AS wp
     SET freshness_seconds = p_freshness_seconds,
         replay_retention_seconds = p_replay_retention_seconds,
         version = version + 1,
         updated_at = now()
   WHERE wp.id = 'singleton' AND wp.version = p_expected_version
   RETURNING wp.version INTO v_after;

  IF v_after IS NULL THEN
    RAISE EXCEPTION 'runtime config version conflict' USING ERRCODE = '55000';
  END IF;

  v_revision := nextval(pg_get_serial_sequence('public.runtime_config_revisions', 'version'));
  INSERT INTO public.runtime_config_revisions (version, environment, committed_at, mutation_kind)
  VALUES (v_revision, current_setting('app.environment', true), now(), 'webhook_policy');

  INSERT INTO public.runtime_config_audit_logs (
    id, organization_id, actor_type, actor_id, environment, action, target_type,
    target_id, expected_version, resulting_version, changed_fields, outcome, request_id
  ) VALUES (
    gen_random_uuid(), NULL, 'user', p_actor_id, current_setting('app.environment', true),
    'update', 'webhook_policy', NULL, p_expected_version, v_after,
    ARRAY['freshness_seconds','replay_retention_seconds'],
    'succeeded', current_setting('app.request_id', true)
  );

  INSERT INTO public.runtime_config_invalidation_intents (
    id, runtime_revision, environment, partition_kind, status, attempts, next_attempt_at
  ) VALUES (
    gen_random_uuid(), v_revision, current_setting('app.environment', true), 'policy',
    'pending', 0, now()
  );

  RETURN v_after;
END
$$;
REVOKE ALL ON FUNCTION indicate_private.mutate_runtime_config_webhook_policy(uuid, integer, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.mutate_runtime_config_webhook_policy(uuid, integer, integer, integer) TO indicate_runtime;

CREATE OR REPLACE FUNCTION indicate_private.mutate_runtime_config_cache_policy(
  p_actor_id uuid,
  p_expected_version integer,
  p_public_cache_seconds integer,
  p_cache_version integer
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, indicate_private
AS $$
DECLARE
  v_after integer;
  v_revision bigint;
BEGIN
  IF NOT indicate_private.has_platform_permission(p_actor_id, 'platform.runtime_config.manage') THEN
    RAISE EXCEPTION 'platform runtime config permission denied' USING ERRCODE = '42501';
  END IF;

  UPDATE public.cache_policy AS cp
     SET public_cache_seconds = p_public_cache_seconds,
         cache_version = p_cache_version,
         version = version + 1,
         updated_at = now()
   WHERE cp.id = 'singleton' AND cp.version = p_expected_version
   RETURNING cp.version INTO v_after;

  IF v_after IS NULL THEN
    RAISE EXCEPTION 'runtime config version conflict' USING ERRCODE = '55000';
  END IF;

  v_revision := nextval(pg_get_serial_sequence('public.runtime_config_revisions', 'version'));
  INSERT INTO public.runtime_config_revisions (version, environment, committed_at, mutation_kind)
  VALUES (v_revision, current_setting('app.environment', true), now(), 'cache_policy');

  INSERT INTO public.runtime_config_audit_logs (
    id, organization_id, actor_type, actor_id, environment, action, target_type,
    target_id, expected_version, resulting_version, changed_fields, outcome, request_id
  ) VALUES (
    gen_random_uuid(), NULL, 'user', p_actor_id, current_setting('app.environment', true),
    'update', 'cache_policy', NULL, p_expected_version, v_after,
    ARRAY['public_cache_seconds','cache_version'],
    'succeeded', current_setting('app.request_id', true)
  );

  INSERT INTO public.runtime_config_invalidation_intents (
    id, runtime_revision, environment, partition_kind, status, attempts, next_attempt_at
  ) VALUES (
    gen_random_uuid(), v_revision, current_setting('app.environment', true), 'policy',
    'pending', 0, now()
  );

  RETURN v_after;
END
$$;
REVOKE ALL ON FUNCTION indicate_private.mutate_runtime_config_cache_policy(uuid, integer, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.mutate_runtime_config_cache_policy(uuid, integer, integer, integer) TO indicate_runtime;

CREATE OR REPLACE FUNCTION indicate_private.mutate_runtime_config_rate_limit_policy(
  p_actor_id uuid,
  p_endpoint_class public.rate_limit_endpoint_class,
  p_expected_version integer,
  p_allowance integer,
  p_window_seconds integer
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, indicate_private
AS $$
DECLARE
  v_after integer;
  v_revision bigint;
BEGIN
  IF NOT indicate_private.has_platform_permission(p_actor_id, 'platform.runtime_config.manage') THEN
    RAISE EXCEPTION 'platform runtime config permission denied' USING ERRCODE = '42501';
  END IF;

  UPDATE public.rate_limit_policies AS r
     SET allowance = p_allowance,
         window_seconds = p_window_seconds,
         version = version + 1,
         updated_at = now()
   WHERE r.endpoint_class = p_endpoint_class AND r.version = p_expected_version
   RETURNING r.version INTO v_after;

  IF v_after IS NULL THEN
    RAISE EXCEPTION 'runtime config version conflict' USING ERRCODE = '55000';
  END IF;

  v_revision := nextval(pg_get_serial_sequence('public.runtime_config_revisions', 'version'));
  INSERT INTO public.runtime_config_revisions (version, environment, committed_at, mutation_kind)
  VALUES (v_revision, current_setting('app.environment', true), now(), 'rate_limit_policy');

  INSERT INTO public.runtime_config_audit_logs (
    id, organization_id, actor_type, actor_id, environment, action, target_type,
    target_id, expected_version, resulting_version, changed_fields, outcome, request_id
  ) VALUES (
    gen_random_uuid(), NULL, 'user', p_actor_id, current_setting('app.environment', true),
    'update', 'rate_limit_policy', NULL, p_expected_version, v_after,
    ARRAY['allowance','window_seconds'],
    'succeeded', current_setting('app.request_id', true)
  );

  INSERT INTO public.runtime_config_invalidation_intents (
    id, runtime_revision, environment, partition_kind, status, attempts, next_attempt_at
  ) VALUES (
    gen_random_uuid(), v_revision, current_setting('app.environment', true), 'policy',
    'pending', 0, now()
  );

  RETURN v_after;
END
$$;
REVOKE ALL ON FUNCTION indicate_private.mutate_runtime_config_rate_limit_policy(uuid, public.rate_limit_endpoint_class, integer, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.mutate_runtime_config_rate_limit_policy(uuid, public.rate_limit_endpoint_class, integer, integer, integer) TO indicate_runtime;

-- =============================================================================
-- DOMAIN PROVIDER MAPPING (assign a Cloudflare zone to a Domain)
-- =============================================================================

CREATE OR REPLACE FUNCTION indicate_private.mutate_domain_provider_mapping(
  p_actor_id uuid,
  p_domain_id uuid,
  p_zone_id text,
  p_expected_version integer
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, indicate_private
AS $$
DECLARE
  v_after integer;
  v_revision bigint;
  v_org uuid;
BEGIN
  IF NOT indicate_private.has_platform_permission(p_actor_id, 'platform.runtime_config.manage') THEN
    RAISE EXCEPTION 'platform runtime config permission denied' USING ERRCODE = '42501';
  END IF;

  UPDATE public.domains AS d
     SET cloudflare_zone_id = p_zone_id,
         version = version + 1,
         updated_at = now()
   WHERE d.id = p_domain_id AND d.version = p_expected_version
   RETURNING d.version, d.organization_id INTO v_after, v_org;

  IF v_after IS NULL THEN
    RAISE EXCEPTION 'runtime config version conflict' USING ERRCODE = '55000';
  END IF;

  v_revision := nextval(pg_get_serial_sequence('public.runtime_config_revisions', 'version'));
  INSERT INTO public.runtime_config_revisions (version, environment, committed_at, mutation_kind)
  VALUES (v_revision, current_setting('app.environment', true), now(), 'domain_provider_mapping');

  INSERT INTO public.runtime_config_audit_logs (
    id, organization_id, actor_type, actor_id, environment, action, target_type,
    target_id, expected_version, resulting_version, changed_fields, outcome, request_id
  ) VALUES (
    gen_random_uuid(), v_org, 'user', p_actor_id, current_setting('app.environment', true),
    'update', 'domain', p_domain_id, p_expected_version, v_after,
    ARRAY['cloudflare_zone_id'],
    'succeeded', current_setting('app.request_id', true)
  );

  INSERT INTO public.runtime_config_invalidation_intents (
    id, runtime_revision, environment, partition_kind, organization_id, domain_id, status, attempts, next_attempt_at
  ) VALUES (
    gen_random_uuid(), v_revision, current_setting('app.environment', true), 'domain', v_org, p_domain_id,
    'pending', 0, now()
  );

  RETURN v_after;
END
$$;
REVOKE ALL ON FUNCTION indicate_private.mutate_domain_provider_mapping(uuid, uuid, text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.mutate_domain_provider_mapping(uuid, uuid, text, integer) TO indicate_runtime;

-- =============================================================================
-- SITE SETTINGS MUTATION (same-Organization/active-Membership/permission checked)
-- =============================================================================

CREATE OR REPLACE FUNCTION indicate_private.mutate_site_settings(
  p_actor_id uuid,
  p_org_id uuid,
  p_site_id uuid,
  p_locale text,
  p_seo_default_title text,
  p_seo_default_description text,
  p_seo_robots_directive text,
  p_seo_open_graph_site_name text,
  p_seo_schema_version integer,
  p_fallback_media_id uuid,
  p_expected_version integer
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, indicate_private
AS $$
DECLARE
  v_after integer;
  v_revision bigint;
BEGIN
  IF NOT indicate_private.has_tenant_permission(p_actor_id, p_org_id, 'site_settings.manage') THEN
    RAISE EXCEPTION 'site settings mutation denied' USING ERRCODE = '42501';
  END IF;

  UPDATE public.site_settings AS ss
     SET locale = p_locale,
         seo_default_title = p_seo_default_title,
         seo_default_description = p_seo_default_description,
         seo_robots_directive = p_seo_robots_directive,
         seo_open_graph_site_name = p_seo_open_graph_site_name,
         seo_schema_version = p_seo_schema_version,
         fallback_media_id = p_fallback_media_id,
         version = version + 1,
         updated_at = now()
   WHERE ss.organization_id = p_org_id
     AND ss.site_id = p_site_id
     AND ss.version = p_expected_version
   RETURNING ss.version INTO v_after;

  IF v_after IS NULL THEN
    RAISE EXCEPTION 'runtime config version conflict' USING ERRCODE = '55000';
  END IF;

  v_revision := nextval(pg_get_serial_sequence('public.runtime_config_revisions', 'version'));
  INSERT INTO public.runtime_config_revisions (version, environment, committed_at, mutation_kind)
  VALUES (v_revision, current_setting('app.environment', true), now(), 'site_settings');

  INSERT INTO public.runtime_config_audit_logs (
    id, organization_id, actor_type, actor_id, environment, action, target_type,
    target_id, expected_version, resulting_version, changed_fields, outcome, request_id
  ) VALUES (
    gen_random_uuid(), p_org_id, 'user', p_actor_id, current_setting('app.environment', true),
    'update', 'site_settings', p_site_id, p_expected_version, v_after,
    ARRAY['locale','seo_default_title','seo_default_description','seo_robots_directive',
          'seo_open_graph_site_name','seo_schema_version','fallback_media_id'],
    'succeeded', current_setting('app.request_id', true)
  );

  INSERT INTO public.runtime_config_invalidation_intents (
    id, runtime_revision, environment, partition_kind, organization_id, site_id, status, attempts, next_attempt_at
  ) VALUES (
    gen_random_uuid(), v_revision, current_setting('app.environment', true), 'site', p_org_id, p_site_id,
    'pending', 0, now()
  );

  RETURN v_after;
END
$$;
REVOKE ALL ON FUNCTION indicate_private.mutate_site_settings(uuid, uuid, uuid, text, text, text, text, text, integer, uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.mutate_site_settings(uuid, uuid, uuid, text, text, text, text, text, integer, uuid, integer) TO indicate_runtime;

INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (25, 'runtime_config_mutations', 'runtime-config-mutations-v1');

INSERT INTO drizzle."__drizzle_migrations" ("hash", "created_at") VALUES ('777f279fa3779a3b5f72d3499f4b03933d9a117b1324d17cc1b0f446e468456b', 1788350776449);

-- ----------------------------------------------------------------------
-- 20260903020300_de_object_rename_timestamp
-- ----------------------------------------------------------------------
-- Delivery-object rename timestamp accounting.
--
-- Marker migration: the production database recorded version 26 as
-- `de_object_rename_timestamp` (applied 2026-09-02, checksum
-- `de-object-rename-timestamp-v1`) before this repository tracked the change
-- as a reviewed file. No schema object in the current database state requires
-- a replayable DDL body — every statement this version ever carried is already
-- reflected in the live schema — so this file only carries the ledger
-- registration that keeps the journal, the reviewed manifest, and
-- `indicate_schema_migrations` in exact agreement. Do not add DDL here; any
-- new schema change belongs in a new forward migration.

INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (26, 'de_object_rename_timestamp', 'de-object-rename-timestamp-v1');

INSERT INTO drizzle."__drizzle_migrations" ("hash", "created_at") VALUES ('a9ead169f3359671ae906d7de87369f28bd555e3e0e9913af572ff85532d8d19', 1788350776450);

-- ----------------------------------------------------------------------
-- 20260903020500_dashboard_entry_point
-- ----------------------------------------------------------------------
-- Domain rename: audit entry point 'cms' becomes 'dashboard'.
--
-- Follows the rename of the application EntryPoint union and the
-- audit_entry_point enum in src/database/schema/editorial.ts. Applied
-- databases created the enum label 'cms'; fresh installs use the bootstrap
-- script, which already declares 'dashboard'. RENAME VALUE preserves the
-- label position and transparently retargets existing audit rows, so no data
-- rewrite is required. The enum type name itself is unchanged.

ALTER TYPE "public"."audit_entry_point" RENAME VALUE 'cms' TO 'dashboard';

INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (27, 'dashboard_entry_point', 'dashboard-entry-point-v1');

INSERT INTO drizzle."__drizzle_migrations" ("hash", "created_at") VALUES ('cd31f0386fbe834eade6ed0fc9c7d24c8f33078195fa8f30ea73992be14f2833', 1788350776451);

-- ----------------------------------------------------------------------
-- 20260903021000_role_tier
-- ----------------------------------------------------------------------
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

INSERT INTO drizzle."__drizzle_migrations" ("hash", "created_at") VALUES ('05d22165ed36cd8d2d925af798bef877c03aa2595c145b39fa81846feab9fe7a', 1788350776452);

-- ----------------------------------------------------------------------
-- 20260903021500_delivery_activation_enums
-- ----------------------------------------------------------------------
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

INSERT INTO drizzle."__drizzle_migrations" ("hash", "created_at") VALUES ('06a93da7661b717e14ca71411fd3d44767b777b1dba10e7ed4510cef6281db63', 1788350776453);

-- ----------------------------------------------------------------------
-- 20260903022000_schema_reconciliation
-- ----------------------------------------------------------------------
-- Schema reconciliation: enforce constraints declared in src/database/schema
-- that the live database is missing.
--
-- Curated from the `drizzle-kit generate` diff of schema.ts against snapshot
-- 0002 (everything else that diff reported — tables, columns, enum types,
-- indexes — is already reflected in the live schema through an earlier
-- migration and is deliberately NOT repeated here, so this file stays
-- replayable). Every touched table was verified empty before this migration,
-- so each ADD CONSTRAINT is a metadata-only change with no row risk.
--
-- 1. Foreign keys declared via inline references() that were never created:
--    cache_bypasses, platform_user_permissions (x2), telegram_conversations,
--    and the three runtime_config release-manifest dependents.
-- 2. `domain_activation_attempts_operation_check` in its enum-compatible
--    IN form (the text-era form was dropped by 20260903021500; schema.ts
--    still declares the check, longest label fits, so restore it).
-- 3. `webhook_replay_claims_bounded_identity` upgraded to the expression
--    schema.ts declares (adds body_digest/identity_binding_digest/attempt
--    bounds), plus the missing `webhook_replay_claims_pending_terminal`.

ALTER TABLE "cache_bypasses" ADD CONSTRAINT "cache_bypasses_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "platform_user_permissions" ADD CONSTRAINT "platform_user_permissions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "platform_user_permissions" ADD CONSTRAINT "platform_user_permissions_permission_id_permissions_id_fk" FOREIGN KEY ("permission_id") REFERENCES "public"."permissions"("id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "telegram_conversations" ADD CONSTRAINT "telegram_conversations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "runtime_config_backfill_runs" ADD CONSTRAINT "runtime_config_backfill_runs_manifest_id_runtime_config_release_manifests_id_fk" FOREIGN KEY ("manifest_id") REFERENCES "public"."runtime_config_release_manifests"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "runtime_config_parity_evidence" ADD CONSTRAINT "runtime_config_parity_evidence_manifest_id_runtime_config_release_manifests_id_fk" FOREIGN KEY ("manifest_id") REFERENCES "public"."runtime_config_release_manifests"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "runtime_config_release_domain_zones" ADD CONSTRAINT "runtime_config_release_domain_zones_manifest_id_runtime_config_release_manifests_id_fk" FOREIGN KEY ("manifest_id") REFERENCES "public"."runtime_config_release_manifests"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "domain_activation_attempts" ADD CONSTRAINT "domain_activation_attempts_operation_check" CHECK ("domain_activation_attempts"."operation" IN ('activate', 'deactivate'));
ALTER TABLE "webhook_replay_claims" DROP CONSTRAINT "webhook_replay_claims_bounded_identity";
ALTER TABLE "webhook_replay_claims" ADD CONSTRAINT "webhook_replay_claims_pending_terminal" CHECK ("webhook_replay_claims"."pending_status" IS NULL OR "webhook_replay_claims"."pending_status" IN ('processed', 'rejected'));
ALTER TABLE "webhook_replay_claims" ADD CONSTRAINT "webhook_replay_claims_bounded_identity" CHECK (length("webhook_replay_claims"."source") BETWEEN 1 AND 100 AND length("webhook_replay_claims"."replay_id") BETWEEN 1 AND 255 AND length("webhook_replay_claims"."body_digest") = 64 AND ("webhook_replay_claims"."identity_binding_digest" IS NULL OR length("webhook_replay_claims"."identity_binding_digest") = 64) AND "webhook_replay_claims"."attempt_count" > 0);

INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (30, 'schema_reconciliation', 'schema-reconciliation-v1');

INSERT INTO drizzle."__drizzle_migrations" ("hash", "created_at") VALUES ('e14501607ab9aab829aedf14cd3aae1061be2254e83b927a97b024ea658e261b', 1788453622423);

-- ----------------------------------------------------------------------
-- 20260903022500_stale_object_cleanup
-- ----------------------------------------------------------------------
-- Stale object cleanup: drop constraints that schema.ts no longer declares
-- and rename the rest to their declared names.
--
-- Context: several hand-written migrations created auto-named foreign keys,
-- duplicate bounding checks, and misnamed checks that schema.ts never
-- declared, while a few declared names exceed Postgres' 63-byte identifier
-- limit and were truncated on creation. Every touched table was verified
-- empty before this migration, so every statement below is metadata-only.
--
-- 1. Drop superseded auto-named foreign keys (replaced by the explicit
--    short-named constraints from 20260903022000, or renamed below).
-- 2. Drop the truncated over-long constraints created by 20260903022000
--    (Postgres truncates identifiers to 63 bytes; schema.ts now declares
--    short explicit names instead).
-- 3. Rename surviving constraints to their schema.ts names.
-- 4. Drop stale checks: duplicate webhook bounds, singleton checks on policy
--    tables that schema.ts does not declare (uniqueness is enforced by the
--    primary key), and the duplicate publication retry check.
-- 5. Add the parity-evidence timestamps schema.ts declares.

ALTER TABLE "cache_bypasses" DROP CONSTRAINT "cache_bypasses_organization_id_fkey";
ALTER TABLE "platform_user_permissions" DROP CONSTRAINT "platform_user_permissions_user_id_fkey";
ALTER TABLE "platform_user_permissions" DROP CONSTRAINT "platform_user_permissions_permission_id_fkey";
ALTER TABLE "telegram_conversations" DROP CONSTRAINT "telegram_conversations_organization_id_fkey";
ALTER TABLE "runtime_config_backfill_runs" DROP CONSTRAINT "runtime_config_backfill_runs_manifest_id_runtime_config_release";
ALTER TABLE "runtime_config_parity_evidence" DROP CONSTRAINT "runtime_config_parity_evidence_manifest_id_runtime_config_relea";
ALTER TABLE "runtime_config_release_domain_zones" DROP CONSTRAINT "runtime_config_release_domain_zones_manifest_id_runtime_config_";
ALTER TABLE "runtime_config_backfill_runs" RENAME CONSTRAINT "runtime_config_backfill_runs_manifest_id_fkey" TO "runtime_config_backfill_runs_manifest_fk";
ALTER TABLE "runtime_config_parity_evidence" RENAME CONSTRAINT "runtime_config_parity_evidence_manifest_id_fkey" TO "runtime_config_parity_evidence_manifest_fk";
ALTER TABLE "runtime_config_release_domain_zones" RENAME CONSTRAINT "runtime_config_release_domain_zones_manifest_id_fkey" TO "runtime_config_release_domain_zones_manifest_fk";
ALTER TABLE "runtime_config_release_domain_zones" RENAME CONSTRAINT "runtime_config_release_domain_zones_pkey" TO "runtime_config_release_domain_zones_pk";
ALTER TABLE "publication_transition_receipts" RENAME CONSTRAINT "publication_transition_receipts_organization_id_organizations_i" TO "publication_transition_receipts_organization_fk";
ALTER TABLE "runtime_config_backfill_runs" RENAME CONSTRAINT "runtime_config_backfill_counts_nonnegative" TO "runtime_config_backfill_created_nonnegative";
ALTER TABLE "media_policy" RENAME CONSTRAINT "media_policy_mimes_nonempty" TO "media_policy_mime_nonempty";
ALTER TABLE "shared_deployment_config" RENAME CONSTRAINT "shared_deployment_config_id_singleton" TO "shared_deployment_config_singleton";
ALTER TABLE "webhook_replay_claims" DROP CONSTRAINT "webhook_replay_claims_attempt_count_check";
ALTER TABLE "webhook_replay_claims" DROP CONSTRAINT "webhook_replay_claims_body_digest_check";
ALTER TABLE "webhook_replay_claims" DROP CONSTRAINT "webhook_replay_claims_identity_binding_check";
ALTER TABLE "webhook_replay_claims" DROP CONSTRAINT "webhook_replay_claims_pending_terminal_check";
ALTER TABLE "cache_policy" DROP CONSTRAINT "cache_policy_id_singleton";
ALTER TABLE "media_policy" DROP CONSTRAINT "media_policy_id_singleton";
ALTER TABLE "publication_policy" DROP CONSTRAINT "publication_policy_id_singleton";
ALTER TABLE "webhook_policy" DROP CONSTRAINT "webhook_policy_id_singleton";
ALTER TABLE "publication_policy" DROP CONSTRAINT "publication_policy_retry_le_attempts";
ALTER TABLE "articles" DROP CONSTRAINT "articles_lead_media_fk";
ALTER TABLE "runtime_config_parity_evidence" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "runtime_config_parity_evidence" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;

INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (31, 'stale_object_cleanup', 'stale-object-cleanup-v1');

INSERT INTO drizzle."__drizzle_migrations" ("hash", "created_at") VALUES ('0569003d119c76c9fc283b5b825d139a53c365da0a4d2122b81ad74c0267fb81', 1788454000000);

-- ----------------------------------------------------------------------
-- 20260903023000_policy_singleton_key
-- ----------------------------------------------------------------------
-- Policy singleton key alignment: the four policy tables and their mutation
-- functions were created with an `id` column, while schema.ts (and therefore
-- every Drizzle-ORM query path) addresses `singleton_key`. Rename the columns
-- so the ORM and the stored functions agree. The retired `*_id_singleton`
-- checks were already removed by 20260903022500; nothing else references the
-- old name. Also adds the two parity-evidence timestamps and the publisher
-- verification timestamp that schema.ts declares but the live schema lacks.
-- Every touched table was verified empty: metadata-only, no row risk.

ALTER TABLE "cache_policy" RENAME COLUMN "id" TO "singleton_key";
ALTER TABLE "media_policy" RENAME COLUMN "id" TO "singleton_key";
ALTER TABLE "publication_policy" RENAME COLUMN "id" TO "singleton_key";
ALTER TABLE "webhook_policy" RENAME COLUMN "id" TO "singleton_key";
ALTER TABLE "runtime_config_parity_evidence" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "runtime_config_parity_evidence" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "publishers" ADD COLUMN "verified_at" timestamp with time zone;

INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (32, 'policy_singleton_key', 'policy-singleton-key-v1');

INSERT INTO drizzle."__drizzle_migrations" ("hash", "created_at") VALUES ('ed06cfaedf668c6c93c66c57190a0fe8533c9e5b6a544ef18b87789d4f46c174', 1788455000000);

-- ----------------------------------------------------------------------
-- 20260903023500_function_api_reconciliation
-- ----------------------------------------------------------------------
-- Function API reconciliation: converge stored functions and triggers on the
-- live Supabase API surface.
--
-- The application calls the current function names (customer_create,
-- claim_publishing_dispatch_gaps, permission_has_platform, ...), but this
-- repository's older migration files still define the previous generation
-- (create_customer, claim_dispatch_gaps, has_platform_permission, ...), so a
-- fresh install would miss functions the runtime needs. This migration
-- re-applies every diverged or renamed function with its live body (plus two
-- live bug fixes: policy singletons address singleton_key, audit entry points
-- use 'dashboard'), drops the retired names, rebinds the three renamed
-- triggers, and mirrors the live EXECUTE grants. Against the live database
-- every statement is a no-op except the documented fixes; tables are empty.

DROP TRIGGER IF EXISTS capture_replay_business_receipt ON public.audit_logs;
DROP TRIGGER IF EXISTS role_permission_scope_guard ON public.role_permissions;
DROP TRIGGER IF EXISTS site_hostname_guard ON public.sites;
DROP TRIGGER IF EXISTS invalidation_tasks_enable_cache_bypass ON public.invalidation_tasks;
DROP TRIGGER IF EXISTS publishing_job_transition_guard ON public.publishing_jobs;
DROP TRIGGER IF EXISTS publishing_target_transition_guard ON public.publishing_job_targets;
DROP FUNCTION IF EXISTS indicate_private.enforce_job_transition();
DROP FUNCTION IF EXISTS indicate_private.enforce_target_transition();
DROP FUNCTION IF EXISTS indicate_private.claim_dispatch_gaps(requested_now timestamptz, requested_limit integer, requested_token uuid, requested_claim_expires_at timestamptz);
DROP FUNCTION IF EXISTS indicate_private.find_expired_leases(requested_now timestamptz, requested_limit integer);
DROP FUNCTION IF EXISTS indicate_private.claim_transition_receipts(requested_now timestamptz, requested_limit integer, requested_token uuid, requested_claim_expires_at timestamptz);
DROP FUNCTION IF EXISTS indicate_private.claim_cleanup_tasks(requested_now timestamptz, requested_limit integer, requested_token uuid, requested_claim_expires_at timestamptz);
DROP FUNCTION IF EXISTS indicate_private.claim_invalidation_tasks(p_now timestamptz, p_limit integer, p_claim_token uuid, p_claim_expires_at timestamptz);
DROP FUNCTION IF EXISTS indicate_private.site_hostname_guard();
DROP FUNCTION IF EXISTS indicate_private.resolve_public_host(p_hostname text);
DROP FUNCTION IF EXISTS indicate_private.is_pending_host(p_hostname text, p_attempt_id uuid);
DROP FUNCTION IF EXISTS indicate_private.is_previous_host_owned(p_organization_id uuid, p_site_id uuid, p_hostname text);
DROP FUNCTION IF EXISTS indicate_private.claim_activation_attempts(p_now timestamptz, p_limit integer, p_claim_token uuid, p_claim_expires_at timestamptz);
DROP FUNCTION IF EXISTS indicate_private.enable_cache_bypass_on_enqueue();
DROP FUNCTION IF EXISTS indicate_private.complete_invalidation(p_organization_id uuid, p_task_id uuid, p_claim_token uuid, p_now timestamptz);
DROP FUNCTION IF EXISTS indicate_private.fail_invalidation(p_organization_id uuid, p_task_id uuid, p_claim_token uuid, p_failure jsonb, p_next_attempt_at timestamptz, p_terminal boolean, p_now timestamptz);
DROP FUNCTION IF EXISTS indicate_private.ensure_org_permissions(p_organization_id uuid);
DROP FUNCTION IF EXISTS indicate_private.claim_replay(p_source text, p_replay_id text, p_organization_id uuid, p_body_digest text, p_received_at timestamptz, p_expires_at timestamptz);
DROP FUNCTION IF EXISTS indicate_private.finish_replay(p_source text, p_replay_id text, p_body_digest text, p_status public.replay_claim_status, p_outcome jsonb, p_now timestamptz);
DROP FUNCTION IF EXISTS indicate_private.has_platform_permission(p_actor_id uuid, p_permission text);
DROP FUNCTION IF EXISTS indicate_private.has_tenant_permission(p_actor_id uuid, p_organization_id uuid, p_permission text);
DROP FUNCTION IF EXISTS indicate_private.list_customers(p_actor_id uuid);
DROP FUNCTION IF EXISTS indicate_private.create_customer(p_actor_id uuid, p_request_id text, p_organization_id uuid, p_name text, p_slug text, p_metadata jsonb, p_subscription jsonb, p_now timestamptz);
DROP FUNCTION IF EXISTS indicate_private.update_customer(p_actor_id uuid, p_request_id text, p_organization_id uuid, p_expected_version integer, p_name text, p_slug text, p_status public.record_status, p_metadata jsonb, p_now timestamptz);
DROP FUNCTION IF EXISTS indicate_private.update_subscription(p_actor_id uuid, p_request_id text, p_organization_id uuid, p_expected_version integer, p_plan text, p_status public.subscription_status, p_period_starts_at timestamptz, p_period_ends_at timestamptz, p_now timestamptz);
DROP FUNCTION IF EXISTS indicate_private.role_permission_scope_guard();
DROP FUNCTION IF EXISTS indicate_private.provision_platform_permission(p_user_id uuid, p_permission text, p_provisioned_by text);
DROP FUNCTION IF EXISTS indicate_private.list_platform_permissions(p_user_id uuid);
DROP FUNCTION IF EXISTS indicate_private.capture_replay_business_receipt();
DROP FUNCTION IF EXISTS indicate_private.discover_active_hosts(p_hostnames text[]);
CREATE OR REPLACE FUNCTION indicate_private.mutate_runtime_config_cache_policy(p_actor_id uuid, p_expected_version integer, p_public_cache_seconds integer, p_cache_version integer)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
DECLARE v_after integer; v_revision bigint;
BEGIN
  IF NOT indicate_private.permission_has_platform(p_actor_id, 'platform.runtime_config.manage') THEN
    RAISE EXCEPTION 'platform runtime config permission denied' USING ERRCODE = '42501';
  END IF;
  UPDATE public.cache_policy AS cp
     SET public_cache_seconds = p_public_cache_seconds, cache_version = p_cache_version,
         version = version + 1, updated_at = now()
   WHERE cp.singleton_key = 'singleton' AND cp.version = p_expected_version
   RETURNING cp.version INTO v_after;
  IF v_after IS NULL THEN RAISE EXCEPTION 'runtime config version conflict' USING ERRCODE = '55000'; END IF;
  v_revision := nextval(pg_get_serial_sequence('public.runtime_config_revisions', 'version'));
  INSERT INTO public.runtime_config_revisions (version, environment, committed_at, mutation_kind)
  VALUES (v_revision, current_setting('app.environment', true), now(), 'cache_policy');
  INSERT INTO public.runtime_config_audit_logs (
    id, organization_id, actor_type, actor_id, environment, action, target_type,
    target_id, expected_version, resulting_version, changed_fields, outcome, request_id
  ) VALUES (
    gen_random_uuid(), NULL, 'user', p_actor_id, current_setting('app.environment', true),
    'update', 'cache_policy', NULL, p_expected_version, v_after,
    ARRAY['public_cache_seconds','cache_version'], 'succeeded', current_setting('app.request_id', true)
  );
  INSERT INTO public.runtime_config_invalidation_intents (
    id, runtime_revision, environment, partition_kind, status, attempts, next_attempt_at
  ) VALUES (gen_random_uuid(), v_revision, current_setting('app.environment', true), 'policy', 'pending', 0, now());
  RETURN v_after;
END
$function$;
CREATE OR REPLACE FUNCTION indicate_private.mutate_runtime_config_media_policy(p_actor_id uuid, p_expected_version integer, p_allowed_mime_types text[], p_max_object_bytes integer, p_upload_authorization_seconds integer, p_read_authorization_seconds integer)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
DECLARE v_after integer; v_revision bigint;
BEGIN
  IF NOT indicate_private.permission_has_platform(p_actor_id, 'platform.runtime_config.manage') THEN
    RAISE EXCEPTION 'platform runtime config permission denied' USING ERRCODE = '42501';
  END IF;
  UPDATE public.media_policy AS m
     SET allowed_mime_types = p_allowed_mime_types, max_object_bytes = p_max_object_bytes,
         upload_authorization_seconds = p_upload_authorization_seconds, read_authorization_seconds = p_read_authorization_seconds,
         version = version + 1, updated_at = now()
   WHERE m.singleton_key = 'singleton' AND m.version = p_expected_version
   RETURNING m.version INTO v_after;
  IF v_after IS NULL THEN RAISE EXCEPTION 'runtime config version conflict' USING ERRCODE = '55000'; END IF;
  v_revision := nextval(pg_get_serial_sequence('public.runtime_config_revisions', 'version'));
  INSERT INTO public.runtime_config_revisions (version, environment, committed_at, mutation_kind)
  VALUES (v_revision, current_setting('app.environment', true), now(), 'media_policy');
  INSERT INTO public.runtime_config_audit_logs (
    id, organization_id, actor_type, actor_id, environment, action, target_type,
    target_id, expected_version, resulting_version, changed_fields, outcome, request_id
  ) VALUES (
    gen_random_uuid(), NULL, 'user', p_actor_id, current_setting('app.environment', true),
    'update', 'media_policy', NULL, p_expected_version, v_after,
    ARRAY['allowed_mime_types','max_object_bytes','upload_authorization_seconds','read_authorization_seconds'],
    'succeeded', current_setting('app.request_id', true)
  );
  INSERT INTO public.runtime_config_invalidation_intents (
    id, runtime_revision, environment, partition_kind, status, attempts, next_attempt_at
  ) VALUES (gen_random_uuid(), v_revision, current_setting('app.environment', true), 'policy', 'pending', 0, now());
  RETURN v_after;
END
$function$;
CREATE OR REPLACE FUNCTION indicate_private.mutate_runtime_config_publication_policy(p_actor_id uuid, p_expected_version integer, p_max_attempts integer, p_retry_delays_seconds integer[], p_lease_seconds integer, p_batch_size integer, p_function_deadline_seconds integer)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
DECLARE v_after integer; v_revision bigint;
BEGIN
  IF NOT indicate_private.permission_has_platform(p_actor_id, 'platform.runtime_config.manage') THEN
    RAISE EXCEPTION 'platform runtime config permission denied' USING ERRCODE = '42501';
  END IF;
  UPDATE public.publication_policy AS pp
     SET max_attempts = p_max_attempts, retry_delays_seconds = p_retry_delays_seconds,
         lease_seconds = p_lease_seconds, batch_size = p_batch_size,
         function_deadline_seconds = p_function_deadline_seconds, version = version + 1, updated_at = now()
   WHERE pp.singleton_key = 'singleton' AND pp.version = p_expected_version
   RETURNING pp.version INTO v_after;
  IF v_after IS NULL THEN RAISE EXCEPTION 'runtime config version conflict' USING ERRCODE = '55000'; END IF;
  v_revision := nextval(pg_get_serial_sequence('public.runtime_config_revisions', 'version'));
  INSERT INTO public.runtime_config_revisions (version, environment, committed_at, mutation_kind)
  VALUES (v_revision, current_setting('app.environment', true), now(), 'publication_policy');
  INSERT INTO public.runtime_config_audit_logs (
    id, organization_id, actor_type, actor_id, environment, action, target_type,
    target_id, expected_version, resulting_version, changed_fields, outcome, request_id
  ) VALUES (
    gen_random_uuid(), NULL, 'user', p_actor_id, current_setting('app.environment', true),
    'update', 'publication_policy', NULL, p_expected_version, v_after,
    ARRAY['max_attempts','retry_delays_seconds','lease_seconds','batch_size','function_deadline_seconds'],
    'succeeded', current_setting('app.request_id', true)
  );
  INSERT INTO public.runtime_config_invalidation_intents (
    id, runtime_revision, environment, partition_kind, status, attempts, next_attempt_at
  ) VALUES (gen_random_uuid(), v_revision, current_setting('app.environment', true), 'policy', 'pending', 0, now());
  RETURN v_after;
END
$function$;
CREATE OR REPLACE FUNCTION indicate_private.mutate_runtime_config_webhook_policy(p_actor_id uuid, p_expected_version integer, p_freshness_seconds integer, p_replay_retention_seconds integer)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
DECLARE v_after integer; v_revision bigint;
BEGIN
  IF NOT indicate_private.permission_has_platform(p_actor_id, 'platform.runtime_config.manage') THEN
    RAISE EXCEPTION 'platform runtime config permission denied' USING ERRCODE = '42501';
  END IF;
  UPDATE public.webhook_policy AS wp
     SET freshness_seconds = p_freshness_seconds, replay_retention_seconds = p_replay_retention_seconds,
         version = version + 1, updated_at = now()
   WHERE wp.singleton_key = 'singleton' AND wp.version = p_expected_version
   RETURNING wp.version INTO v_after;
  IF v_after IS NULL THEN RAISE EXCEPTION 'runtime config version conflict' USING ERRCODE = '55000'; END IF;
  v_revision := nextval(pg_get_serial_sequence('public.runtime_config_revisions', 'version'));
  INSERT INTO public.runtime_config_revisions (version, environment, committed_at, mutation_kind)
  VALUES (v_revision, current_setting('app.environment', true), now(), 'webhook_policy');
  INSERT INTO public.runtime_config_audit_logs (
    id, organization_id, actor_type, actor_id, environment, action, target_type,
    target_id, expected_version, resulting_version, changed_fields, outcome, request_id
  ) VALUES (
    gen_random_uuid(), NULL, 'user', p_actor_id, current_setting('app.environment', true),
    'update', 'webhook_policy', NULL, p_expected_version, v_after,
    ARRAY['freshness_seconds','replay_retention_seconds'], 'succeeded', current_setting('app.request_id', true)
  );
  INSERT INTO public.runtime_config_invalidation_intents (
    id, runtime_revision, environment, partition_kind, status, attempts, next_attempt_at
  ) VALUES (gen_random_uuid(), v_revision, current_setting('app.environment', true), 'policy', 'pending', 0, now());
  RETURN v_after;
END
$function$;
CREATE OR REPLACE FUNCTION indicate_private.claim_runtime_config_invalidations(p_limit integer, p_lease_until timestamp with time zone)
 RETURNS TABLE(intent_id uuid, runtime_revision bigint, partition_kind text, organization_id uuid, domain_id uuid, site_id uuid, claim_token uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
BEGIN
  RETURN QUERY
  UPDATE public.runtime_config_invalidation_intents AS i
     SET status = 'claimed',
         attempts = attempts + 1,
         claim_token = gen_random_uuid(),
         claim_expires_at = p_lease_until,
         updated_at = now()
   WHERE i.id IN (
     SELECT i2.id
     FROM public.runtime_config_invalidation_intents AS i2
     WHERE i2.status = 'pending'
        OR (i2.status = 'failed' AND i2.next_attempt_at <= now())
     LIMIT p_limit
   )
   RETURNING i.id, i.runtime_revision, i.partition_kind::text, i.organization_id,
             i.domain_id, i.site_id, i.claim_token;
END
$function$;
CREATE OR REPLACE FUNCTION indicate_private.enforce_article_site_transition()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
BEGIN
  IF NEW.state = OLD.state THEN RETURN NEW; END IF;
  IF (
    (OLD.state = 'queued' AND NEW.state = 'processing') OR
    (OLD.state = 'processing' AND NEW.state IN ('published', 'retrying', 'failed')) OR
    (OLD.state = 'retrying' AND NEW.state IN ('processing', 'failed'))
  ) THEN RETURN NEW; END IF;
  IF OLD.state IN ('published', 'failed') AND NEW.state = 'queued' AND EXISTS (
    SELECT 1 FROM public.publishing_job_targets AS target
    INNER JOIN public.publishing_jobs AS job
      ON job.organization_id = target.organization_id AND job.id = target.job_id
    WHERE target.organization_id = OLD.organization_id AND target.article_site_id = OLD.id
      AND target.state = 'queued' AND job.state = 'queued'
  ) THEN RETURN NEW; END IF;
  RAISE EXCEPTION 'invalid article site current-projection transition' USING ERRCODE = '23514';
END;
$function$;
CREATE OR REPLACE FUNCTION indicate_private.mutate_domain_provider_mapping(p_actor_id uuid, p_domain_id uuid, p_zone_id text, p_expected_version integer)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
DECLARE v_after integer; v_revision bigint; v_org uuid;
BEGIN
  IF NOT indicate_private.permission_has_platform(p_actor_id, 'platform.runtime_config.manage') THEN
    RAISE EXCEPTION 'platform runtime config permission denied' USING ERRCODE = '42501';
  END IF;
  UPDATE public.domains AS d
     SET cloudflare_zone_id = p_zone_id, version = version + 1, updated_at = now()
   WHERE d.id = p_domain_id AND d.version = p_expected_version
   RETURNING d.version, d.organization_id INTO v_after, v_org;
  IF v_after IS NULL THEN RAISE EXCEPTION 'runtime config version conflict' USING ERRCODE = '55000'; END IF;
  v_revision := nextval(pg_get_serial_sequence('public.runtime_config_revisions', 'version'));
  INSERT INTO public.runtime_config_revisions (version, environment, committed_at, mutation_kind)
  VALUES (v_revision, current_setting('app.environment', true), now(), 'domain_provider_mapping');
  INSERT INTO public.runtime_config_audit_logs (
    id, organization_id, actor_type, actor_id, environment, action, target_type, target_id,
    expected_version, resulting_version, changed_fields, outcome, request_id
  ) VALUES (
    gen_random_uuid(), v_org, 'user', p_actor_id, current_setting('app.environment', true),
    'update', 'domain', p_domain_id, p_expected_version, v_after, ARRAY['cloudflare_zone_id'],
    'succeeded', current_setting('app.request_id', true)
  );
  INSERT INTO public.runtime_config_invalidation_intents (
    id, runtime_revision, environment, partition_kind, organization_id, domain_id, status, attempts, next_attempt_at
  ) VALUES (gen_random_uuid(), v_revision, current_setting('app.environment', true), 'domain', v_org, p_domain_id, 'pending', 0, now());
  RETURN v_after;
END
$function$;
CREATE OR REPLACE FUNCTION indicate_private.mutate_runtime_config_shared(p_actor_id uuid, p_expected_version integer, p_supabase_project_ref text, p_cloudflare_account_id text, p_vercel_project_id text, p_vercel_team_id text, p_vercel_production_target_hostname text, p_r2_account_id text, p_r2_bucket_name text, p_upstash_redis_resource_id text)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
DECLARE v_after integer; v_revision bigint;
BEGIN
  IF NOT indicate_private.permission_has_platform(p_actor_id, 'platform.runtime_config.manage') THEN
    RAISE EXCEPTION 'platform runtime config permission denied' USING ERRCODE = '42501';
  END IF;
  UPDATE public.shared_deployment_config AS s
     SET supabase_project_ref = p_supabase_project_ref, cloudflare_account_id = p_cloudflare_account_id,
         vercel_project_id = p_vercel_project_id, vercel_team_id = p_vercel_team_id,
         vercel_production_target_hostname = p_vercel_production_target_hostname,
         r2_account_id = p_r2_account_id, r2_bucket_name = p_r2_bucket_name,
         upstash_redis_resource_id = p_upstash_redis_resource_id,
         version = version + 1, updated_at = now()
   WHERE s.id = 'singleton' AND s.version = p_expected_version
   RETURNING s.version INTO v_after;
  IF v_after IS NULL THEN RAISE EXCEPTION 'runtime config version conflict' USING ERRCODE = '55000'; END IF;
  v_revision := nextval(pg_get_serial_sequence('public.runtime_config_revisions', 'version'));
  INSERT INTO public.runtime_config_revisions (version, environment, committed_at, mutation_kind)
  VALUES (v_revision, current_setting('app.environment', true), now(), 'shared_deployment_config');
  INSERT INTO public.runtime_config_audit_logs (
    id, organization_id, actor_type, actor_id, environment, action, target_type,
    target_id, expected_version, resulting_version, changed_fields, outcome, request_id
  ) VALUES (
    gen_random_uuid(), NULL, 'user', p_actor_id, current_setting('app.environment', true),
    'update', 'shared_deployment_config', NULL, p_expected_version, v_after,
    ARRAY['supabase_project_ref','cloudflare_account_id','vercel_project_id','vercel_team_id',
          'vercel_production_target_hostname','r2_account_id','r2_bucket_name','upstash_redis_resource_id'],
    'succeeded', current_setting('app.request_id', true)
  );
  INSERT INTO public.runtime_config_invalidation_intents (
    id, runtime_revision, environment, partition_kind, status, attempts, next_attempt_at
  ) VALUES (gen_random_uuid(), v_revision, current_setting('app.environment', true), 'shared', 'pending', 0, now());
  RETURN v_after;
END
$function$;
CREATE OR REPLACE FUNCTION indicate_private.mutate_site_settings(p_actor_id uuid, p_org_id uuid, p_site_id uuid, p_locale text, p_seo_default_title text, p_seo_default_description text, p_seo_robots_directive text, p_seo_open_graph_site_name text, p_seo_schema_version integer, p_fallback_media_id uuid, p_expected_version integer)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
DECLARE v_after integer; v_revision bigint;
BEGIN
  IF NOT indicate_private.permission_has_tenant(p_actor_id, p_org_id, 'site_settings.manage') THEN
    RAISE EXCEPTION 'site settings mutation denied' USING ERRCODE = '42501';
  END IF;
  UPDATE public.site_settings AS ss
     SET locale = p_locale, seo_default_title = p_seo_default_title,
         seo_default_description = p_seo_default_description, seo_robots_directive = p_seo_robots_directive,
         seo_open_graph_site_name = p_seo_open_graph_site_name, seo_schema_version = p_seo_schema_version,
         fallback_media_id = p_fallback_media_id, version = version + 1, updated_at = now()
   WHERE ss.organization_id = p_org_id AND ss.site_id = p_site_id AND ss.version = p_expected_version
   RETURNING ss.version INTO v_after;
  IF v_after IS NULL THEN RAISE EXCEPTION 'runtime config version conflict' USING ERRCODE = '55000'; END IF;
  v_revision := nextval(pg_get_serial_sequence('public.runtime_config_revisions', 'version'));
  INSERT INTO public.runtime_config_revisions (version, environment, committed_at, mutation_kind)
  VALUES (v_revision, current_setting('app.environment', true), now(), 'site_settings');
  INSERT INTO public.runtime_config_audit_logs (
    id, organization_id, actor_type, actor_id, environment, action, target_type, target_id,
    expected_version, resulting_version, changed_fields, outcome, request_id
  ) VALUES (
    gen_random_uuid(), p_org_id, 'user', p_actor_id, current_setting('app.environment', true),
    'update', 'site_settings', p_site_id, p_expected_version, v_after,
    ARRAY['locale','seo_default_title','seo_default_description','seo_robots_directive',
          'seo_open_graph_site_name','seo_schema_version','fallback_media_id'],
    'succeeded', current_setting('app.request_id', true)
  );
  INSERT INTO public.runtime_config_invalidation_intents (
    id, runtime_revision, environment, partition_kind, organization_id, site_id, status, attempts, next_attempt_at
  ) VALUES (gen_random_uuid(), v_revision, current_setting('app.environment', true), 'site', p_org_id, p_site_id, 'pending', 0, now());
  RETURN v_after;
END
$function$;
CREATE OR REPLACE FUNCTION indicate_private.mutate_runtime_config_rate_limit_policy(p_actor_id uuid, p_endpoint_class rate_limit_endpoint_class, p_expected_version integer, p_allowance integer, p_window_seconds integer)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
DECLARE v_after integer; v_revision bigint;
BEGIN
  IF NOT indicate_private.permission_has_platform(p_actor_id, 'platform.runtime_config.manage') THEN
    RAISE EXCEPTION 'platform runtime config permission denied' USING ERRCODE = '42501';
  END IF;
  UPDATE public.rate_limit_policies AS r
     SET allowance = p_allowance, window_seconds = p_window_seconds, version = version + 1, updated_at = now()
   WHERE r.endpoint_class = p_endpoint_class AND r.version = p_expected_version
   RETURNING r.version INTO v_after;
  IF v_after IS NULL THEN RAISE EXCEPTION 'runtime config version conflict' USING ERRCODE = '55000'; END IF;
  v_revision := nextval(pg_get_serial_sequence('public.runtime_config_revisions', 'version'));
  INSERT INTO public.runtime_config_revisions (version, environment, committed_at, mutation_kind)
  VALUES (v_revision, current_setting('app.environment', true), now(), 'rate_limit_policy');
  INSERT INTO public.runtime_config_audit_logs (
    id, organization_id, actor_type, actor_id, environment, action, target_type,
    target_id, expected_version, resulting_version, changed_fields, outcome, request_id
  ) VALUES (
    gen_random_uuid(), NULL, 'user', p_actor_id, current_setting('app.environment', true),
    'update', 'rate_limit_policy', NULL, p_expected_version, v_after,
    ARRAY['allowance','window_seconds'], 'succeeded', current_setting('app.request_id', true)
  );
  INSERT INTO public.runtime_config_invalidation_intents (
    id, runtime_revision, environment, partition_kind, status, attempts, next_attempt_at
  ) VALUES (gen_random_uuid(), v_revision, current_setting('app.environment', true), 'policy', 'pending', 0, now());
  RETURN v_after;
END
$function$;
CREATE OR REPLACE FUNCTION indicate_private.read_runtime_config_active_domains()
 RETURNS TABLE(organization_id uuid, domain_id uuid, normalized_hostname text, cloudflare_zone_id text, routing_version integer, version integer)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
BEGIN
  RETURN QUERY
  SELECT d.organization_id, d.id, d.normalized_hostname, d.cloudflare_zone_id,
         d.routing_version, d.version
  FROM public.domains AS d
  WHERE d.status = 'active'
    AND d.cloudflare_zone_id IS NOT NULL
  ORDER BY d.normalized_hostname;
END
$function$;
CREATE OR REPLACE FUNCTION indicate_private.replay_claim_organization(p_source text, p_replay_id text)
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
  SELECT organization_id FROM public.webhook_replay_claims WHERE source = p_source AND replay_id = p_replay_id
$function$;
CREATE OR REPLACE FUNCTION indicate_private.resolve_api_key_lookup(p_lookup_id text)
 RETURNS TABLE(organization_id uuid, id uuid, lookup_id text, name text, salt text, verification_hash text, scopes text[], status api_key_status, predecessor_id uuid, expires_at timestamp with time zone, last_used_at timestamp with time zone, version integer, created_at timestamp with time zone, updated_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
  SELECT k.organization_id, k.id, k.lookup_id, k.name, k.salt,
         k.verification_hash, k.scopes, k.status, k.predecessor_id,
         k.expires_at, k.last_used_at, k.version, k.created_at, k.updated_at
  FROM public.api_keys k WHERE k.lookup_id = p_lookup_id LIMIT 1
$function$;
CREATE OR REPLACE FUNCTION indicate_private.resolve_telegram_identity(p_user_id text, p_chat_id text)
 RETURNS TABLE(mapping_id uuid, organization_id uuid, user_id uuid, role_id uuid, telegram_user_id text, telegram_chat_id text, permissions text[])
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
  WITH eligible AS (
    SELECT m.id, m.organization_id, m.user_id, m.role_id, m.telegram_user_id, m.telegram_chat_id
    FROM public.telegram_identity_mappings m
    JOIN public.memberships membership
      ON membership.organization_id = m.organization_id AND membership.user_id = m.user_id
     AND membership.role_id = m.role_id AND membership.status = 'active'
    JOIN public.roles r
      ON r.organization_id = membership.organization_id AND r.id = membership.role_id AND r.active
    WHERE m.telegram_user_id = p_user_id AND m.telegram_chat_id = p_chat_id AND m.status = 'active'
  ), single_mapping AS (
    SELECT * FROM eligible WHERE (SELECT count(*) FROM eligible) = 1
  )
  SELECT m.id, m.organization_id, m.user_id, m.role_id, m.telegram_user_id,
         m.telegram_chat_id, coalesce(array_agg(DISTINCT p.name) FILTER (WHERE p.name IS NOT NULL), ARRAY[]::text[])
  FROM single_mapping m
  LEFT JOIN public.role_permissions rp ON rp.organization_id = m.organization_id AND rp.role_id = m.role_id
  LEFT JOIN public.permissions p ON p.id = rp.permission_id
  GROUP BY m.id, m.organization_id, m.user_id, m.role_id, m.telegram_user_id, m.telegram_chat_id
$function$;
CREATE OR REPLACE FUNCTION indicate_private.claim_media_cleanup_tasks(requested_now timestamp with time zone, requested_limit integer, requested_token uuid, requested_claim_expires_at timestamp with time zone)
 RETURNS TABLE(organization_id uuid, task_id uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
BEGIN
  RETURN QUERY
  WITH candidates AS (
    SELECT task.organization_id, task.id FROM public.object_cleanup_tasks AS task
    WHERE task.status IN ('pending', 'processing') AND task.next_attempt_at <= requested_now
      AND (task.reconciliation_claim_expires_at IS NULL OR task.reconciliation_claim_expires_at <= requested_now)
    ORDER BY task.next_attempt_at, task.id FOR UPDATE SKIP LOCKED
    LIMIT LEAST(GREATEST(requested_limit, 1), 100)
  )
  UPDATE public.object_cleanup_tasks AS task
  SET status = 'processing', reconciliation_claim_token = requested_token,
      reconciliation_claim_expires_at = requested_claim_expires_at, updated_at = requested_now
  FROM candidates WHERE task.organization_id = candidates.organization_id AND task.id = candidates.id
  RETURNING task.organization_id, task.id;
END;
$function$;
CREATE OR REPLACE FUNCTION indicate_private.claim_publishing_dispatch_gaps(requested_now timestamp with time zone, requested_limit integer, requested_token uuid, requested_claim_expires_at timestamp with time zone)
 RETURNS TABLE(organization_id uuid, job_id uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
BEGIN
  RETURN QUERY
  WITH candidates AS (
    SELECT job.organization_id, job.id
    FROM public.publishing_jobs AS job
    WHERE job.state IN ('queued', 'retrying') AND job.dispatch_status = 'pending'
      AND job.next_dispatch_at <= requested_now
      AND (job.reconciliation_claim_expires_at IS NULL OR job.reconciliation_claim_expires_at <= requested_now)
    ORDER BY job.next_dispatch_at, job.id FOR UPDATE SKIP LOCKED
    LIMIT LEAST(GREATEST(requested_limit, 1), 100)
  )
  UPDATE public.publishing_jobs AS job
  SET reconciliation_claim_token = requested_token, reconciliation_claim_expires_at = requested_claim_expires_at
  FROM candidates WHERE job.organization_id = candidates.organization_id AND job.id = candidates.id
  RETURNING job.organization_id, job.id;
END;
$function$;
CREATE OR REPLACE FUNCTION indicate_private.claim_publishing_transition_receipts(requested_now timestamp with time zone, requested_limit integer, requested_token uuid, requested_claim_expires_at timestamp with time zone)
 RETURNS TABLE(organization_id uuid, receipt_id uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
BEGIN
  RETURN QUERY
  WITH candidates AS (
    SELECT receipt.organization_id, receipt.id FROM public.publication_transition_receipts AS receipt
    WHERE receipt.acknowledged_at IS NULL
      AND (receipt.reconciliation_claim_expires_at IS NULL OR receipt.reconciliation_claim_expires_at <= requested_now)
    ORDER BY receipt.created_at, receipt.id FOR UPDATE SKIP LOCKED
    LIMIT LEAST(GREATEST(requested_limit, 1), 100)
  )
  UPDATE public.publication_transition_receipts AS receipt
  SET reconciliation_claim_token = requested_token, reconciliation_claim_expires_at = requested_claim_expires_at
  FROM candidates WHERE receipt.organization_id = candidates.organization_id AND receipt.id = candidates.id
  RETURNING receipt.organization_id, receipt.id;
END;
$function$;
CREATE OR REPLACE FUNCTION indicate_private.complete_delivery_invalidation(p_organization_id uuid, p_task_id uuid, p_claim_token uuid, p_now timestamp with time zone)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
DECLARE v_site_id uuid;
BEGIN
  UPDATE public.invalidation_tasks
  SET status = 'completed', reconciliation_claim_token = NULL,
      reconciliation_claim_expires_at = NULL, sanitized_failure = NULL, updated_at = p_now
  WHERE organization_id = p_organization_id AND id = p_task_id
    AND status = 'processing' AND reconciliation_claim_token = p_claim_token
    AND reconciliation_claim_expires_at > p_now
  RETURNING site_id INTO v_site_id;
  IF v_site_id IS NULL THEN RETURN false; END IF;
  PERFORM 1
  FROM public.cache_bypasses
  WHERE organization_id = p_organization_id AND site_id = v_site_id FOR UPDATE;
  IF NOT EXISTS (
    SELECT 1 FROM public.invalidation_tasks
    WHERE organization_id = p_organization_id AND site_id = v_site_id AND status <> 'completed'
  ) THEN
    INSERT INTO public.cache_bypasses(organization_id, site_id, bypass, version, reason, created_at, updated_at)
    VALUES (p_organization_id, v_site_id, false, 1, 'invalidation_completed', p_now, p_now)
    ON CONFLICT (organization_id, site_id) DO UPDATE
      SET bypass = false, version = public.cache_bypasses.version + 1,
          reason = 'invalidation_completed', updated_at = p_now;
  END IF;
  RETURN true;
END;
$function$;
CREATE OR REPLACE FUNCTION indicate_private.customer_create(p_actor_id uuid, p_request_id text, p_organization_id uuid, p_name text, p_slug text, p_metadata jsonb, p_subscription jsonb, p_now timestamp with time zone)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
BEGIN
  IF NOT indicate_private.permission_has_platform(p_actor_id, 'platform.customer.admin') THEN
    RAISE EXCEPTION 'platform permission required' USING ERRCODE = '42501';
  END IF;
  INSERT INTO public.organizations(id, name, slug, status, customer_metadata, version, created_at, updated_at)
  VALUES (p_organization_id, p_name, p_slug, 'active', p_metadata, 1, p_now, p_now);
  PERFORM indicate_private.org_ensure_permissions(p_organization_id);
  IF p_subscription IS NOT NULL THEN
    INSERT INTO public.subscriptions(organization_id, plan, status, period_starts_at, period_ends_at, version, created_at, updated_at)
    VALUES (p_organization_id, p_subscription->>'plan', (p_subscription->>'status')::public.subscription_status,
      (p_subscription->>'periodStartsAt')::timestamptz, (p_subscription->>'periodEndsAt')::timestamptz, 1, p_now, p_now);
  END IF;
  INSERT INTO public.audit_logs(organization_id, id, actor_type, actor_id, entry_point, action, target_type, target_id, outcome, changed_fields, after, request_id, occurred_at)
  VALUES (p_organization_id, gen_random_uuid(), 'user', p_actor_id::text, 'dashboard', 'customer.create', 'organization', p_organization_id::text, 'succeeded', ARRAY['name','slug','status'], jsonb_build_object('name', p_name, 'slug', p_slug, 'status', 'active'), p_request_id, p_now);
END
$function$;
CREATE OR REPLACE FUNCTION indicate_private.customer_list(p_actor_id uuid)
 RETURNS TABLE(id uuid, name text, slug text, status record_status, customer_metadata jsonb, version integer, created_at timestamp with time zone, updated_at timestamp with time zone, subscription_plan text, subscription_status subscription_status, period_starts_at timestamp with time zone, period_ends_at timestamp with time zone, subscription_version integer, subscription_created_at timestamp with time zone, subscription_updated_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
BEGIN
  IF NOT indicate_private.permission_has_platform(p_actor_id, 'platform.customer.admin') THEN
    RAISE EXCEPTION 'platform permission required' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY SELECT o.id, o.name, o.slug, o.status, o.customer_metadata, o.version, o.created_at, o.updated_at,
    s.plan, s.status, s.period_starts_at, s.period_ends_at, s.version, s.created_at, s.updated_at
  FROM public.organizations o LEFT JOIN public.subscriptions s ON s.organization_id = o.id
  ORDER BY o.name, o.id;
END
$function$;
CREATE OR REPLACE FUNCTION indicate_private.customer_update(p_actor_id uuid, p_request_id text, p_organization_id uuid, p_expected_version integer, p_name text, p_slug text, p_status record_status, p_metadata jsonb, p_now timestamp with time zone)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
BEGIN
  IF NOT indicate_private.permission_has_platform(p_actor_id, 'platform.customer.admin') THEN
    RAISE EXCEPTION 'platform permission required' USING ERRCODE = '42501';
  END IF;
  UPDATE public.organizations SET name = p_name, slug = p_slug, status = p_status,
    customer_metadata = p_metadata, version = version + 1, updated_at = p_now
  WHERE id = p_organization_id AND version = p_expected_version;
  IF NOT FOUND THEN RETURN false; END IF;
  INSERT INTO public.audit_logs(organization_id, id, actor_type, actor_id, entry_point, action, target_type, target_id, outcome, changed_fields, after, request_id, occurred_at)
  VALUES (p_organization_id, gen_random_uuid(), 'user', p_actor_id::text, 'dashboard', 'customer.update', 'organization', p_organization_id::text, 'succeeded', ARRAY['name','slug','status','customerMetadata'], jsonb_build_object('name', p_name, 'slug', p_slug, 'status', p_status, 'customerMetadata', p_metadata), p_request_id, p_now);
  RETURN true;
END
$function$;
CREATE OR REPLACE FUNCTION indicate_private.discover_release_active_hosts(p_hostnames text[])
 RETURNS TABLE(hostname text, organization_id uuid, domain_id uuid, site_id uuid, region_id uuid, region_external_key text, region_slug text, coherent boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
  WITH requested(hostname) AS (
    SELECT DISTINCT normalized.hostname
    FROM unnest(
      CASE
        WHEN p_hostnames IS NOT NULL AND cardinality(p_hostnames) BETWEEN 1 AND 100
          AND array_position(p_hostnames, NULL) IS NULL
        THEN p_hostnames
        ELSE ARRAY[]::text[]
      END
    ) AS supplied(hostname)
    CROSS JOIN LATERAL (
      SELECT lower(trim(trailing '.' FROM supplied.hostname)) AS hostname
    ) normalized
    WHERE normalized.hostname = supplied.hostname
      AND octet_length(normalized.hostname) BETWEEN 1 AND 253
  )
  SELECT s.normalized_hostname, s.organization_id, s.domain_id, s.id, s.region_id,
         r.external_key, r.slug, true
  FROM requested requested_host
  JOIN public.sites s ON s.normalized_hostname = requested_host.hostname
  JOIN public.organizations o ON o.id = s.organization_id
  JOIN public.domains d ON d.organization_id = s.organization_id AND d.id = s.domain_id
  LEFT JOIN public.regions r ON r.organization_id = s.organization_id AND r.id = s.region_id
  WHERE o.status = 'active' AND d.status = 'active' AND s.status = 'active' AND s.activation_state = 'active'
    AND (
      (s.region_id IS NULL AND s.normalized_hostname = d.normalized_hostname)
      OR (s.region_id IS NOT NULL AND r.status = 'active' AND s.normalized_hostname = r.slug || '.' || d.normalized_hostname)
    )
  ORDER BY s.normalized_hostname, s.organization_id, s.id
$function$;
CREATE OR REPLACE FUNCTION indicate_private.enable_delivery_cache_bypass_on_enqueue()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
BEGIN
  INSERT INTO public.cache_bypasses(
    organization_id, site_id, bypass, version, reason, created_at, updated_at
  ) VALUES (
    NEW.organization_id, NEW.site_id, true, 1, 'invalidation_pending', NEW.created_at, NEW.updated_at
  )
  ON CONFLICT (organization_id, site_id) DO UPDATE
    SET bypass = true,
        version = public.cache_bypasses.version + 1,
        reason = 'invalidation_pending',
        updated_at = EXCLUDED.updated_at;
  RETURN NEW;
END;
$function$;
CREATE OR REPLACE FUNCTION indicate_private.enforce_publishing_job_transition()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
BEGIN
  IF NEW.state = OLD.state THEN RETURN NEW; END IF;
  IF NOT (
    (OLD.state = 'queued' AND NEW.state IN ('processing', 'retrying', 'failed')) OR
    (OLD.state = 'processing' AND NEW.state IN ('published', 'retrying', 'failed')) OR
    (OLD.state = 'retrying' AND NEW.state IN ('processing', 'failed'))
  ) THEN
    RAISE EXCEPTION 'invalid publishing job state transition' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$function$;
CREATE OR REPLACE FUNCTION indicate_private.enforce_publishing_target_transition()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
BEGIN
  IF NEW.state = OLD.state THEN
    IF OLD.state IN ('published', 'failed') THEN
      NEW.finished_at := OLD.finished_at;
      NEW.published_url := OLD.published_url;
      NEW.published_at := OLD.published_at;
      NEW.sanitized_error := OLD.sanitized_error;
    END IF;
    RETURN NEW;
  END IF;
  IF NOT (
    (OLD.state = 'queued' AND NEW.state IN ('processing', 'failed')) OR
    (OLD.state = 'processing' AND NEW.state IN ('published', 'retrying', 'failed')) OR
    (OLD.state = 'retrying' AND NEW.state IN ('processing', 'failed'))
  ) THEN
    RAISE EXCEPTION 'invalid publishing target state transition' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$function$;
CREATE OR REPLACE FUNCTION indicate_private.fail_delivery_invalidation(p_organization_id uuid, p_task_id uuid, p_claim_token uuid, p_failure jsonb, p_next_attempt_at timestamp with time zone, p_terminal boolean, p_now timestamp with time zone)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
DECLARE v_site_id uuid;
BEGIN
  UPDATE public.invalidation_tasks
  SET status = CASE WHEN p_terminal THEN 'failed'::public.task_status ELSE 'pending'::public.task_status END,
      attempts = attempts + 1, next_attempt_at = p_next_attempt_at,
      reconciliation_claim_token = NULL, reconciliation_claim_expires_at = NULL,
      sanitized_failure = p_failure, updated_at = p_now
  WHERE organization_id = p_organization_id AND id = p_task_id
    AND status = 'processing' AND reconciliation_claim_token = p_claim_token
    AND reconciliation_claim_expires_at > p_now
  RETURNING site_id INTO v_site_id;
  IF v_site_id IS NULL THEN RETURN false; END IF;
  INSERT INTO public.cache_bypasses(organization_id, site_id, bypass, version, reason, created_at, updated_at)
  VALUES (p_organization_id, v_site_id, true, 1, 'invalidation_failed', p_now, p_now)
  ON CONFLICT (organization_id, site_id) DO UPDATE
    SET bypass = true, version = public.cache_bypasses.version + 1,
        reason = 'invalidation_failed', updated_at = p_now;
  RETURN true;
END;
$function$;
CREATE OR REPLACE FUNCTION indicate_private.find_publishing_expired_leases(requested_now timestamp with time zone, requested_limit integer)
 RETURNS TABLE(organization_id uuid, job_id uuid)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
  SELECT job.organization_id, job.id FROM public.publishing_jobs AS job
  WHERE job.state = 'processing' AND job.lease_expires_at <= requested_now
  ORDER BY job.lease_expires_at, job.id LIMIT LEAST(GREATEST(requested_limit, 1), 100)
$function$;
CREATE OR REPLACE FUNCTION indicate_private.org_ensure_permissions(p_organization_id uuid)
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
  INSERT INTO public.permissions(id, organization_id, name, scope, description)
  SELECT gen_random_uuid(), p_organization_id, value.name, 'organization'::public.permission_scope, value.description
  FROM (VALUES
    ('api_key.read', 'Read API key metadata'), ('api_key.manage', 'Issue, rotate, and revoke API keys'),
    ('telegram.manage', 'Manage Telegram identity mappings'), ('subscription.read', 'Read Organization subscription'),
    ('subscription.manage', 'Manage Organization subscription')
  ) AS value(name, description)
  ON CONFLICT DO NOTHING
$function$;
CREATE OR REPLACE FUNCTION indicate_private.permission_has_platform(p_actor_id uuid, p_permission text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
  SELECT COALESCE(
    indicate_private.current_verified_user_id() = p_actor_id
      AND nullif(current_setting('app.actor_id', true), '')::uuid = p_actor_id
      AND EXISTS (
        SELECT 1 FROM public.platform_user_permissions grant_row
        JOIN public.permissions p ON p.id = grant_row.permission_id
        JOIN public.users u ON u.id = grant_row.user_id AND u.status = 'active'
        WHERE grant_row.user_id = p_actor_id
          AND p.scope = 'platform' AND p.organization_id IS NULL AND p.name = p_permission
      ),
    false
  )
$function$;
CREATE OR REPLACE FUNCTION indicate_private.permission_has_tenant(p_actor_id uuid, p_organization_id uuid, p_permission text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.memberships m
    JOIN public.roles r ON r.organization_id = m.organization_id AND r.id = m.role_id AND r.active
    JOIN public.role_permissions rp ON rp.organization_id = r.organization_id AND rp.role_id = r.id
    JOIN public.permissions p ON p.id = rp.permission_id
    JOIN public.users u ON u.id = m.user_id AND u.status = 'active'
    WHERE m.user_id = p_actor_id AND m.organization_id = p_organization_id
      AND m.status = 'active' AND p.name = p_permission
  )
$function$;
CREATE OR REPLACE FUNCTION indicate_private.permission_list_platform(p_user_id uuid)
 RETURNS TABLE(name text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
BEGIN
  IF nullif(current_setting('app.actor_id', true), '')::uuid IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'platform permission lookup denied' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
  SELECT p.name FROM public.platform_user_permissions grant_row
  JOIN public.permissions p ON p.id = grant_row.permission_id
  JOIN public.users u ON u.id = grant_row.user_id AND u.status = 'active'
  WHERE grant_row.user_id = p_user_id AND p.scope = 'platform' AND p.organization_id IS NULL;
END
$function$;
CREATE OR REPLACE FUNCTION indicate_private.permission_provision_platform(p_user_id uuid, p_permission text, p_provisioned_by text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
DECLARE v_permission_id uuid;
BEGIN
  SELECT id INTO v_permission_id FROM public.permissions WHERE scope = 'platform' AND organization_id IS NULL AND name = p_permission;
  IF v_permission_id IS NULL OR length(trim(p_provisioned_by)) < 1 THEN
    RAISE EXCEPTION 'invalid platform permission provisioning request' USING ERRCODE = '42501';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = p_user_id AND status = 'active') THEN
    RAISE EXCEPTION 'active platform user required' USING ERRCODE = '42501';
  END IF;
  INSERT INTO public.platform_user_permissions(user_id, permission_id, provisioned_by)
  VALUES (p_user_id, v_permission_id, p_provisioned_by) ON CONFLICT DO NOTHING;
END
$function$;
CREATE OR REPLACE FUNCTION indicate_private.permission_role_scope_guard()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.permissions p
    WHERE p.id = NEW.permission_id AND p.scope = 'organization' AND p.organization_id = NEW.organization_id
  ) THEN
    RAISE EXCEPTION 'tenant roles may grant only same-organization permissions' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END
$function$;
CREATE OR REPLACE FUNCTION indicate_private.replay_bind_identity(p_source text, p_replay_id text, p_body_digest text, p_claim_token uuid, p_organization_id uuid, p_identity_binding_digest text)
 RETURNS TABLE(source text, replay_id text, organization_id uuid, body_digest text, identity_binding_digest text, claim_token uuid, business_receipt jsonb, status replay_claim_status, pending_status replay_claim_status, outcome jsonb, received_at timestamp with time zone, lease_expires_at timestamp with time zone, attempt_count integer, expires_at timestamp with time zone)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
  WITH changed AS (
    UPDATE public.webhook_replay_claims c
    SET organization_id = p_organization_id, identity_binding_digest = p_identity_binding_digest
    WHERE c.source = p_source AND c.replay_id = p_replay_id AND c.body_digest = p_body_digest
      AND c.claim_token = p_claim_token AND c.status = 'claimed'
      AND (c.organization_id IS NULL OR c.organization_id = p_organization_id)
      AND (c.identity_binding_digest IS NULL OR c.identity_binding_digest = p_identity_binding_digest)
    RETURNING *
  )
  SELECT c.source, c.replay_id, c.organization_id, c.body_digest, c.identity_binding_digest, c.claim_token, c.business_receipt,
    c.status, c.pending_status, c.outcome, c.received_at, c.lease_expires_at, c.attempt_count, c.expires_at
  FROM changed c LIMIT 1
$function$;
CREATE OR REPLACE FUNCTION indicate_private.replay_capture_business_receipt()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
DECLARE
  v_replay_id text; v_body_digest text; v_claim_token uuid;
BEGIN
  IF NEW.request_id NOT LIKE 'telegram-replay:%' THEN RETURN NEW; END IF;
  v_replay_id := split_part(NEW.request_id, ':', 2);
  v_body_digest := split_part(NEW.request_id, ':', 3);
  BEGIN
    v_claim_token := split_part(NEW.request_id, ':', 4)::uuid;
  EXCEPTION WHEN invalid_text_representation THEN
    RAISE EXCEPTION 'invalid replay fence' USING ERRCODE = '42501';
  END;
  IF length(v_body_digest) <> 64 OR split_part(NEW.request_id, ':', 5) <> '' OR NOT EXISTS (
    SELECT 1 FROM public.webhook_replay_claims claim
    WHERE claim.source = 'telegram' AND claim.replay_id = v_replay_id
      AND claim.body_digest = v_body_digest AND claim.claim_token = v_claim_token AND claim.status = 'claimed'
  ) THEN
    RAISE EXCEPTION 'stale replay worker' USING ERRCODE = '42501';
  END IF;
  IF NEW.outcome = 'succeeded' AND NEW.action IN ('article.create', 'article.sites.assign', 'media.activate', 'publication.request') THEN
    UPDATE public.webhook_replay_claims
    SET business_receipt = jsonb_build_object(
      'action', NEW.action, 'targetType', NEW.target_type, 'targetId', NEW.target_id,
      'after', coalesce(NEW.after, '{}'::jsonb), 'occurredAt', NEW.occurred_at
    )
    WHERE source = 'telegram' AND replay_id = v_replay_id
      AND body_digest = v_body_digest AND claim_token = v_claim_token AND status = 'claimed';
  END IF;
  RETURN NEW;
END
$function$;
CREATE OR REPLACE FUNCTION indicate_private.replay_claim(p_source text, p_replay_id text, p_organization_id uuid, p_body_digest text, p_received_at timestamp with time zone, p_expires_at timestamp with time zone)
 RETURNS TABLE(created boolean, source text, replay_id text, organization_id uuid, body_digest text, status replay_claim_status, outcome jsonb, received_at timestamp with time zone, expires_at timestamp with time zone)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
  WITH inserted AS (
    INSERT INTO public.webhook_replay_claims(source, replay_id, organization_id, body_digest, status, received_at, expires_at)
    VALUES (p_source, p_replay_id, p_organization_id, p_body_digest, 'claimed', p_received_at, p_expires_at)
    ON CONFLICT (source, replay_id) DO NOTHING RETURNING *
  )
  SELECT true, i.source, i.replay_id, i.organization_id, i.body_digest, i.status, i.outcome, i.received_at, i.expires_at FROM inserted i
  UNION ALL
  SELECT false, c.source, c.replay_id, c.organization_id, c.body_digest, c.status, c.outcome, c.received_at, c.expires_at
  FROM public.webhook_replay_claims c
  WHERE c.source = p_source AND c.replay_id = p_replay_id AND NOT EXISTS (SELECT 1 FROM inserted)
  LIMIT 1
$function$;
CREATE OR REPLACE FUNCTION indicate_private.replay_claim(p_source text, p_replay_id text, p_organization_id uuid, p_body_digest text, p_received_at timestamp with time zone, p_lease_expires_at timestamp with time zone, p_expires_at timestamp with time zone)
 RETURNS TABLE(claim_kind text, source text, replay_id text, organization_id uuid, body_digest text, identity_binding_digest text, claim_token uuid, business_receipt jsonb, status replay_claim_status, pending_status replay_claim_status, outcome jsonb, received_at timestamp with time zone, lease_expires_at timestamp with time zone, attempt_count integer, expires_at timestamp with time zone)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
  WITH inserted AS (
    INSERT INTO public.webhook_replay_claims(source, replay_id, organization_id, body_digest, status, received_at, lease_expires_at, expires_at)
    VALUES (p_source, p_replay_id, p_organization_id, p_body_digest, 'claimed', p_received_at, p_lease_expires_at, p_expires_at)
    ON CONFLICT (source, replay_id) DO NOTHING RETURNING *
  ), reclaimed AS (
    UPDATE public.webhook_replay_claims c
    SET lease_expires_at = p_lease_expires_at, claim_token = gen_random_uuid(), attempt_count = c.attempt_count + 1
    WHERE c.source = p_source AND c.replay_id = p_replay_id
      AND NOT EXISTS (SELECT 1 FROM inserted)
      AND c.status = 'claimed' AND c.pending_status IS NULL AND c.business_receipt IS NULL
      AND c.lease_expires_at <= p_received_at AND c.expires_at > p_received_at
      AND c.body_digest = p_body_digest
      AND (p_organization_id IS NULL OR c.organization_id IS NULL OR c.organization_id = p_organization_id)
    RETURNING *
  ), selected AS (
    SELECT 'created'::text AS claim_kind, i.* FROM inserted i
    UNION ALL
    SELECT 'reclaimed'::text AS claim_kind, r.* FROM reclaimed r
    UNION ALL
    SELECT 'duplicate'::text AS claim_kind, c.* FROM public.webhook_replay_claims c
    WHERE c.source = p_source AND c.replay_id = p_replay_id
      AND NOT EXISTS (SELECT 1 FROM inserted) AND NOT EXISTS (SELECT 1 FROM reclaimed)
  )
  SELECT s.claim_kind, s.source, s.replay_id, s.organization_id, s.body_digest,
    s.identity_binding_digest, s.claim_token, s.business_receipt, s.status, s.pending_status, s.outcome, s.received_at,
    s.lease_expires_at, s.attempt_count, s.expires_at
  FROM selected s LIMIT 1
$function$;
CREATE OR REPLACE FUNCTION indicate_private.replay_finalize(p_source text, p_replay_id text, p_body_digest text, p_claim_token uuid, p_now timestamp with time zone)
 RETURNS TABLE(source text, replay_id text, organization_id uuid, body_digest text, identity_binding_digest text, claim_token uuid, business_receipt jsonb, status replay_claim_status, pending_status replay_claim_status, outcome jsonb, received_at timestamp with time zone, lease_expires_at timestamp with time zone, attempt_count integer, expires_at timestamp with time zone)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
  WITH changed AS (
    UPDATE public.webhook_replay_claims c
    SET status = c.pending_status, pending_status = NULL, processed_at = p_now
    WHERE c.source = p_source AND c.replay_id = p_replay_id AND c.body_digest = p_body_digest
      AND c.claim_token = p_claim_token AND c.status = 'claimed' AND c.pending_status IN ('processed', 'rejected') AND c.outcome IS NOT NULL
    RETURNING *
  )
  SELECT c.source, c.replay_id, c.organization_id, c.body_digest, c.identity_binding_digest, c.claim_token, c.business_receipt,
    c.status, c.pending_status, c.outcome, c.received_at, c.lease_expires_at, c.attempt_count, c.expires_at
  FROM changed c
  UNION ALL
  SELECT c.source, c.replay_id, c.organization_id, c.body_digest, c.identity_binding_digest, c.claim_token, c.business_receipt,
    c.status, c.pending_status, c.outcome, c.received_at, c.lease_expires_at, c.attempt_count, c.expires_at
  FROM public.webhook_replay_claims c
  WHERE c.source = p_source AND c.replay_id = p_replay_id AND c.body_digest = p_body_digest
    AND c.claim_token = p_claim_token AND c.status IN ('processed', 'rejected') AND NOT EXISTS (SELECT 1 FROM changed)
  LIMIT 1
$function$;
CREATE OR REPLACE FUNCTION indicate_private.replay_finish(p_source text, p_replay_id text, p_body_digest text, p_status replay_claim_status, p_outcome jsonb, p_now timestamp with time zone)
 RETURNS TABLE(source text, replay_id text, organization_id uuid, body_digest text, status replay_claim_status, outcome jsonb, received_at timestamp with time zone, expires_at timestamp with time zone)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
  WITH changed AS (
    UPDATE public.webhook_replay_claims
    SET status = p_status, outcome = p_outcome, processed_at = p_now
    WHERE source = p_source AND replay_id = p_replay_id AND body_digest = p_body_digest AND status = 'claimed'
    RETURNING *
  )
  SELECT c.source, c.replay_id, c.organization_id, c.body_digest, c.status, c.outcome, c.received_at, c.expires_at FROM changed c
  UNION ALL
  SELECT c.source, c.replay_id, c.organization_id, c.body_digest, c.status, c.outcome, c.received_at, c.expires_at
  FROM public.webhook_replay_claims c
  WHERE c.source = p_source AND c.replay_id = p_replay_id AND c.body_digest = p_body_digest AND NOT EXISTS (SELECT 1 FROM changed)
  LIMIT 1
$function$;
CREATE OR REPLACE FUNCTION indicate_private.replay_prepare_outcome(p_source text, p_replay_id text, p_body_digest text, p_claim_token uuid, p_status replay_claim_status, p_outcome jsonb, p_now timestamp with time zone)
 RETURNS TABLE(source text, replay_id text, organization_id uuid, body_digest text, identity_binding_digest text, claim_token uuid, business_receipt jsonb, status replay_claim_status, pending_status replay_claim_status, outcome jsonb, received_at timestamp with time zone, lease_expires_at timestamp with time zone, attempt_count integer, expires_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
BEGIN
  IF p_status NOT IN ('processed', 'rejected') THEN RETURN; END IF;
  RETURN QUERY
  WITH changed AS (
    UPDATE public.webhook_replay_claims c
    SET pending_status = p_status, outcome = p_outcome, outcome_ready_at = p_now
    WHERE c.source = p_source AND c.replay_id = p_replay_id AND c.body_digest = p_body_digest
      AND c.claim_token = p_claim_token AND c.status = 'claimed'
      AND (c.pending_status IS NULL OR (c.pending_status = p_status AND c.outcome = p_outcome))
    RETURNING *
  )
  SELECT c.source, c.replay_id, c.organization_id, c.body_digest, c.identity_binding_digest, c.claim_token, c.business_receipt,
    c.status, c.pending_status, c.outcome, c.received_at, c.lease_expires_at, c.attempt_count, c.expires_at
  FROM changed c
  UNION ALL
  SELECT c.source, c.replay_id, c.organization_id, c.body_digest, c.identity_binding_digest, c.claim_token, c.business_receipt,
    c.status, c.pending_status, c.outcome, c.received_at, c.lease_expires_at, c.attempt_count, c.expires_at
  FROM public.webhook_replay_claims c
  WHERE c.source = p_source AND c.replay_id = p_replay_id AND c.body_digest = p_body_digest
    AND c.claim_token = p_claim_token AND c.status IN ('processed', 'rejected') AND c.outcome = p_outcome
    AND NOT EXISTS (SELECT 1 FROM changed)
  LIMIT 1;
END
$function$;
CREATE OR REPLACE FUNCTION indicate_private.subscription_update(p_actor_id uuid, p_request_id text, p_organization_id uuid, p_expected_version integer, p_plan text, p_status subscription_status, p_period_starts_at timestamp with time zone, p_period_ends_at timestamp with time zone, p_now timestamp with time zone)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
DECLARE v_platform boolean;
BEGIN
  v_platform := indicate_private.permission_has_platform(p_actor_id, 'platform.customer.admin');
  IF NOT v_platform AND (
    indicate_private.current_organization_id() IS DISTINCT FROM p_organization_id
    OR NOT indicate_private.permission_has_tenant(p_actor_id, p_organization_id, 'subscription.manage')
  ) THEN
    RAISE EXCEPTION 'subscription permission required' USING ERRCODE = '42501';
  END IF;
  IF p_expected_version IS NULL THEN
    INSERT INTO public.subscriptions(organization_id, plan, status, period_starts_at, period_ends_at, version, created_at, updated_at)
    VALUES (p_organization_id, p_plan, p_status, p_period_starts_at, p_period_ends_at, 1, p_now, p_now)
    ON CONFLICT (organization_id) DO NOTHING;
    IF NOT FOUND THEN RETURN false; END IF;
  ELSE
    UPDATE public.subscriptions SET plan = p_plan, status = p_status, period_starts_at = p_period_starts_at,
      period_ends_at = p_period_ends_at, version = version + 1, updated_at = p_now
    WHERE organization_id = p_organization_id AND version = p_expected_version;
    IF NOT FOUND THEN RETURN false; END IF;
  END IF;
  INSERT INTO public.audit_logs(organization_id, id, actor_type, actor_id, entry_point, action, target_type, target_id, outcome, changed_fields, after, request_id, occurred_at)
  VALUES (p_organization_id, gen_random_uuid(), 'user', p_actor_id::text, 'dashboard', 'subscription.update', 'subscription', p_organization_id::text, 'succeeded', ARRAY['plan','status','periodStartsAt','periodEndsAt'], jsonb_build_object('plan', p_plan, 'status', p_status, 'periodStartsAt', p_period_starts_at, 'periodEndsAt', p_period_ends_at), p_request_id, p_now);
  RETURN true;
END
$function$;
CREATE TRIGGER invalidation_tasks_enable_cache_bypass AFTER INSERT ON public.invalidation_tasks FOR EACH ROW EXECUTE FUNCTION indicate_private.enable_delivery_cache_bypass_on_enqueue();
CREATE TRIGGER publishing_job_transition_guard BEFORE UPDATE OF state ON public.publishing_jobs FOR EACH ROW EXECUTE FUNCTION indicate_private.enforce_publishing_job_transition();
CREATE TRIGGER publishing_target_transition_guard BEFORE UPDATE OF state ON public.publishing_job_targets FOR EACH ROW EXECUTE FUNCTION indicate_private.enforce_publishing_target_transition();
REVOKE ALL ON FUNCTION indicate_private.claim_media_cleanup_tasks(requested_now timestamp with time zone, requested_limit integer, requested_token uuid, requested_claim_expires_at timestamp with time zone) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.claim_media_cleanup_tasks(requested_now timestamp with time zone, requested_limit integer, requested_token uuid, requested_claim_expires_at timestamp with time zone) TO indicate_runtime;
REVOKE ALL ON FUNCTION indicate_private.claim_publishing_dispatch_gaps(requested_now timestamp with time zone, requested_limit integer, requested_token uuid, requested_claim_expires_at timestamp with time zone) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.claim_publishing_dispatch_gaps(requested_now timestamp with time zone, requested_limit integer, requested_token uuid, requested_claim_expires_at timestamp with time zone) TO indicate_runtime;
REVOKE ALL ON FUNCTION indicate_private.claim_publishing_transition_receipts(requested_now timestamp with time zone, requested_limit integer, requested_token uuid, requested_claim_expires_at timestamp with time zone) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.claim_publishing_transition_receipts(requested_now timestamp with time zone, requested_limit integer, requested_token uuid, requested_claim_expires_at timestamp with time zone) TO indicate_runtime;
REVOKE ALL ON FUNCTION indicate_private.claim_runtime_config_invalidations(p_limit integer, p_lease_until timestamp with time zone) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.claim_runtime_config_invalidations(p_limit integer, p_lease_until timestamp with time zone) TO indicate_runtime;
REVOKE ALL ON FUNCTION indicate_private.complete_delivery_invalidation(p_organization_id uuid, p_task_id uuid, p_claim_token uuid, p_now timestamp with time zone) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.complete_delivery_invalidation(p_organization_id uuid, p_task_id uuid, p_claim_token uuid, p_now timestamp with time zone) TO indicate_runtime;
REVOKE ALL ON FUNCTION indicate_private.customer_create(p_actor_id uuid, p_request_id text, p_organization_id uuid, p_name text, p_slug text, p_metadata jsonb, p_subscription jsonb, p_now timestamp with time zone) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.customer_create(p_actor_id uuid, p_request_id text, p_organization_id uuid, p_name text, p_slug text, p_metadata jsonb, p_subscription jsonb, p_now timestamp with time zone) TO indicate_runtime;
REVOKE ALL ON FUNCTION indicate_private.customer_list(p_actor_id uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.customer_list(p_actor_id uuid) TO indicate_runtime;
REVOKE ALL ON FUNCTION indicate_private.customer_update(p_actor_id uuid, p_request_id text, p_organization_id uuid, p_expected_version integer, p_name text, p_slug text, p_status record_status, p_metadata jsonb, p_now timestamp with time zone) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.customer_update(p_actor_id uuid, p_request_id text, p_organization_id uuid, p_expected_version integer, p_name text, p_slug text, p_status record_status, p_metadata jsonb, p_now timestamp with time zone) TO indicate_runtime;
REVOKE ALL ON FUNCTION indicate_private.discover_release_active_hosts(p_hostnames text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.discover_release_active_hosts(p_hostnames text[]) TO indicate_runtime;
REVOKE ALL ON FUNCTION indicate_private.enable_delivery_cache_bypass_on_enqueue() FROM PUBLIC;
REVOKE ALL ON FUNCTION indicate_private.fail_delivery_invalidation(p_organization_id uuid, p_task_id uuid, p_claim_token uuid, p_failure jsonb, p_next_attempt_at timestamp with time zone, p_terminal boolean, p_now timestamp with time zone) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.fail_delivery_invalidation(p_organization_id uuid, p_task_id uuid, p_claim_token uuid, p_failure jsonb, p_next_attempt_at timestamp with time zone, p_terminal boolean, p_now timestamp with time zone) TO indicate_runtime;
REVOKE ALL ON FUNCTION indicate_private.find_publishing_expired_leases(requested_now timestamp with time zone, requested_limit integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.find_publishing_expired_leases(requested_now timestamp with time zone, requested_limit integer) TO indicate_runtime;
REVOKE ALL ON FUNCTION indicate_private.mutate_domain_provider_mapping(p_actor_id uuid, p_domain_id uuid, p_zone_id text, p_expected_version integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.mutate_domain_provider_mapping(p_actor_id uuid, p_domain_id uuid, p_zone_id text, p_expected_version integer) TO indicate_runtime;
REVOKE ALL ON FUNCTION indicate_private.mutate_runtime_config_cache_policy(p_actor_id uuid, p_expected_version integer, p_public_cache_seconds integer, p_cache_version integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.mutate_runtime_config_cache_policy(p_actor_id uuid, p_expected_version integer, p_public_cache_seconds integer, p_cache_version integer) TO indicate_runtime;
REVOKE ALL ON FUNCTION indicate_private.mutate_runtime_config_media_policy(p_actor_id uuid, p_expected_version integer, p_allowed_mime_types text[], p_max_object_bytes integer, p_upload_authorization_seconds integer, p_read_authorization_seconds integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.mutate_runtime_config_media_policy(p_actor_id uuid, p_expected_version integer, p_allowed_mime_types text[], p_max_object_bytes integer, p_upload_authorization_seconds integer, p_read_authorization_seconds integer) TO indicate_runtime;
REVOKE ALL ON FUNCTION indicate_private.mutate_runtime_config_publication_policy(p_actor_id uuid, p_expected_version integer, p_max_attempts integer, p_retry_delays_seconds integer[], p_lease_seconds integer, p_function_deadline_seconds integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.mutate_runtime_config_publication_policy(p_actor_id uuid, p_expected_version integer, p_max_attempts integer, p_retry_delays_seconds integer[], p_lease_seconds integer, p_function_deadline_seconds integer) TO indicate_runtime;
REVOKE ALL ON FUNCTION indicate_private.mutate_runtime_config_rate_limit_policy(p_actor_id uuid, p_endpoint_class rate_limit_endpoint_class, p_expected_version integer, p_allowance integer, p_window_seconds integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.mutate_runtime_config_rate_limit_policy(p_actor_id uuid, p_endpoint_class rate_limit_endpoint_class, p_expected_version integer, p_allowance integer, p_window_seconds integer) TO indicate_runtime;
REVOKE ALL ON FUNCTION indicate_private.mutate_runtime_config_shared(p_actor_id uuid, p_expected_version integer, p_supabase_project_ref text, p_cloudflare_account_id text, p_vercel_project_id text, p_vercel_team_id text, p_vercel_production_target_hostname text, p_r2_account_id text, p_r2_bucket_name text, p_upstash_redis_resource_id text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.mutate_runtime_config_shared(p_actor_id uuid, p_expected_version integer, p_supabase_project_ref text, p_cloudflare_account_id text, p_vercel_project_id text, p_vercel_team_id text, p_vercel_production_target_hostname text, p_r2_account_id text, p_r2_bucket_name text, p_upstash_redis_resource_id text) TO indicate_runtime;
REVOKE ALL ON FUNCTION indicate_private.mutate_runtime_config_webhook_policy(p_actor_id uuid, p_expected_version integer, p_freshness_seconds integer, p_replay_retention_seconds integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.mutate_runtime_config_webhook_policy(p_actor_id uuid, p_expected_version integer, p_freshness_seconds integer, p_replay_retention_seconds integer) TO indicate_runtime;
REVOKE ALL ON FUNCTION indicate_private.mutate_site_settings(p_actor_id uuid, p_org_id uuid, p_site_id uuid, p_locale text, p_seo_default_title text, p_seo_default_description text, p_seo_robots_directive text, p_seo_open_graph_site_name text, p_seo_schema_version integer, p_fallback_media_id uuid, p_expected_version integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.mutate_site_settings(p_actor_id uuid, p_org_id uuid, p_site_id uuid, p_locale text, p_seo_default_title text, p_seo_default_description text, p_seo_robots_directive text, p_seo_open_graph_site_name text, p_seo_schema_version integer, p_fallback_media_id uuid, p_expected_version integer) TO indicate_runtime;
REVOKE ALL ON FUNCTION indicate_private.org_ensure_permissions(p_organization_id uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION indicate_private.permission_has_platform(p_actor_id uuid, p_permission text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.permission_has_platform(p_actor_id uuid, p_permission text) TO indicate_runtime;
REVOKE ALL ON FUNCTION indicate_private.permission_has_tenant(p_actor_id uuid, p_organization_id uuid, p_permission text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.permission_has_tenant(p_actor_id uuid, p_organization_id uuid, p_permission text) TO indicate_runtime;
REVOKE ALL ON FUNCTION indicate_private.permission_list_platform(p_user_id uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.permission_list_platform(p_user_id uuid) TO indicate_runtime;
REVOKE ALL ON FUNCTION indicate_private.permission_provision_platform(p_user_id uuid, p_permission text, p_provisioned_by text) FROM PUBLIC;
REVOKE ALL ON FUNCTION indicate_private.permission_role_scope_guard() FROM PUBLIC;
REVOKE ALL ON FUNCTION indicate_private.read_runtime_config_active_domains() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.read_runtime_config_active_domains() TO indicate_runtime;
REVOKE ALL ON FUNCTION indicate_private.replay_bind_identity(p_source text, p_replay_id text, p_body_digest text, p_claim_token uuid, p_organization_id uuid, p_identity_binding_digest text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.replay_bind_identity(p_source text, p_replay_id text, p_body_digest text, p_claim_token uuid, p_organization_id uuid, p_identity_binding_digest text) TO indicate_runtime;
REVOKE ALL ON FUNCTION indicate_private.replay_capture_business_receipt() FROM PUBLIC;
REVOKE ALL ON FUNCTION indicate_private.replay_claim(p_source text, p_replay_id text, p_organization_id uuid, p_body_digest text, p_received_at timestamp with time zone, p_lease_expires_at timestamp with time zone, p_expires_at timestamp with time zone) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.replay_claim(p_source text, p_replay_id text, p_organization_id uuid, p_body_digest text, p_received_at timestamp with time zone, p_lease_expires_at timestamp with time zone, p_expires_at timestamp with time zone) TO indicate_runtime;
REVOKE ALL ON FUNCTION indicate_private.replay_claim(p_source text, p_replay_id text, p_organization_id uuid, p_body_digest text, p_received_at timestamp with time zone, p_expires_at timestamp with time zone) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.replay_claim(p_source text, p_replay_id text, p_organization_id uuid, p_body_digest text, p_received_at timestamp with time zone, p_expires_at timestamp with time zone) TO indicate_runtime;
REVOKE ALL ON FUNCTION indicate_private.replay_claim_organization(p_source text, p_replay_id text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.replay_claim_organization(p_source text, p_replay_id text) TO indicate_runtime;
REVOKE ALL ON FUNCTION indicate_private.replay_finalize(p_source text, p_replay_id text, p_body_digest text, p_claim_token uuid, p_now timestamp with time zone) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.replay_finalize(p_source text, p_replay_id text, p_body_digest text, p_claim_token uuid, p_now timestamp with time zone) TO indicate_runtime;
REVOKE ALL ON FUNCTION indicate_private.replay_finish(p_source text, p_replay_id text, p_body_digest text, p_status replay_claim_status, p_outcome jsonb, p_now timestamp with time zone) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.replay_finish(p_source text, p_replay_id text, p_body_digest text, p_status replay_claim_status, p_outcome jsonb, p_now timestamp with time zone) TO indicate_runtime;
REVOKE ALL ON FUNCTION indicate_private.replay_prepare_outcome(p_source text, p_replay_id text, p_body_digest text, p_claim_token uuid, p_status replay_claim_status, p_outcome jsonb, p_now timestamp with time zone) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.replay_prepare_outcome(p_source text, p_replay_id text, p_body_digest text, p_claim_token uuid, p_status replay_claim_status, p_outcome jsonb, p_now timestamp with time zone) TO indicate_runtime;
REVOKE ALL ON FUNCTION indicate_private.resolve_api_key_lookup(p_lookup_id text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.resolve_api_key_lookup(p_lookup_id text) TO indicate_runtime;
REVOKE ALL ON FUNCTION indicate_private.resolve_telegram_identity(p_user_id text, p_chat_id text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.resolve_telegram_identity(p_user_id text, p_chat_id text) TO indicate_runtime;
REVOKE ALL ON FUNCTION indicate_private.subscription_update(p_actor_id uuid, p_request_id text, p_organization_id uuid, p_expected_version integer, p_plan text, p_status subscription_status, p_period_starts_at timestamp with time zone, p_period_ends_at timestamp with time zone, p_now timestamp with time zone) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.subscription_update(p_actor_id uuid, p_request_id text, p_organization_id uuid, p_expected_version integer, p_plan text, p_status subscription_status, p_period_starts_at timestamp with time zone, p_period_ends_at timestamp with time zone, p_now timestamp with time zone) TO indicate_runtime;

INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (33, 'function_api_reconciliation', 'function-api-reconciliation-v1');

INSERT INTO drizzle."__drizzle_migrations" ("hash", "created_at") VALUES ('116bb8a6e08edb8a15b2b134bb4208ee9ce2b562efddfec88a4fed9643615c56', 1788456000000);

-- ----------------------------------------------------------------------
-- 20260903024000_residual_constraint_cleanup
-- ----------------------------------------------------------------------
-- Residual constraint cleanup: drop constraints the live database carries
-- that schema.ts never declared.
--
-- - `*_version_positive` on cache/publication/webhook policies: siblings of a
--   family that schema.ts only declares on some tables; the policy tables
--   here rely on their primary key and version guards in writers.
-- - `runtime_config_invalidation_intents_runtime_revision_fkey`: an inline
--   foreign key with no schema.ts declaration; intents reference revisions
--   loosely by design (leased workers must never block on revision rows).
-- Every touched table was verified empty: metadata-only, no row risk.

ALTER TABLE "cache_policy" DROP CONSTRAINT "cache_policy_version_positive";
ALTER TABLE "publication_policy" DROP CONSTRAINT "publication_policy_version_positive";
ALTER TABLE "webhook_policy" DROP CONSTRAINT "webhook_policy_version_positive";
ALTER TABLE "runtime_config_invalidation_intents" DROP CONSTRAINT "runtime_config_invalidation_intents_runtime_revision_fkey";

INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (34, 'residual_constraint_cleanup', 'residual-constraint-cleanup-v1');

INSERT INTO drizzle."__drizzle_migrations" ("hash", "created_at") VALUES ('726130658b3725bb2c2af1f15e070fe91e0fbff3023b666f19926a4ce4ac743e', 1788457000000);

-- ----------------------------------------------------------------------
-- 20260903024500_column_default_alignment
-- ----------------------------------------------------------------------
-- Column default alignment: enforce writer-supplied values fail-closed and
-- confirm the updated_at defaults schema.ts declares.
--
-- The three SET DEFAULT / SET NOT NULL pairs below are already reflected in
-- the live schema (verified before writing); they are kept verbatim from the
-- `drizzle-kit generate` diff so fresh installs converge, and are safe no-ops
-- when replayed. The two DROP DEFAULTs remove silent placeholder values:
-- writers must supply api_keys.name and webhook_replay_claims.body_digest
-- explicitly instead of inheriting misleading defaults. All touched tables
-- were verified empty.

ALTER TABLE "publication_transition_receipts" ALTER COLUMN "updated_at" SET DEFAULT now();
ALTER TABLE "publication_transition_receipts" ALTER COLUMN "updated_at" SET NOT NULL;
ALTER TABLE "seed_runs" ALTER COLUMN "updated_at" SET DEFAULT now();
ALTER TABLE "seed_runs" ALTER COLUMN "updated_at" SET NOT NULL;
ALTER TABLE "webhook_replay_claims" ALTER COLUMN "updated_at" SET DEFAULT now();
ALTER TABLE "webhook_replay_claims" ALTER COLUMN "updated_at" SET NOT NULL;
ALTER TABLE "api_keys" ALTER COLUMN "name" DROP DEFAULT;
ALTER TABLE "webhook_replay_claims" ALTER COLUMN "body_digest" DROP DEFAULT;

INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (35, 'column_default_alignment', 'column-default-alignment-v1');

INSERT INTO drizzle."__drizzle_migrations" ("hash", "created_at") VALUES ('99026932cf79fb5e161b22b314f3b36328747f9ffb0e83487b46a07836305739', 1788456509551);

-- ----------------------------------------------------------------------
-- 20260903025000_rls_operation_split
-- ----------------------------------------------------------------------
-- RLS operation split: replace every broad FOR ALL tenant policy with
-- per-command SELECT/INSERT/UPDATE/DELETE policies carrying the identical
-- predicate, retargeted from PUBLIC to indicate_runtime, with session-context
-- reads wrapped as scalar subqueries so the planner can cache them per
-- statement. Deny-all and metadata-read policies are retargeted unchanged.
-- Behavior-neutral by construction: no predicate logic changes in this file.

DROP POLICY IF EXISTS tenant_isolation ON public.api_keys;
CREATE POLICY tenant_isolation_select ON public.api_keys FOR SELECT TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()));
CREATE POLICY tenant_isolation_insert ON public.api_keys FOR INSERT TO indicate_runtime WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()));
CREATE POLICY tenant_isolation_update ON public.api_keys FOR UPDATE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id())) WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()));
CREATE POLICY tenant_isolation_delete ON public.api_keys FOR DELETE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()));
DROP POLICY IF EXISTS tenant_isolation ON public.article_sites;
CREATE POLICY tenant_isolation_select ON public.article_sites FOR SELECT TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()));
CREATE POLICY tenant_isolation_insert ON public.article_sites FOR INSERT TO indicate_runtime WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()));
CREATE POLICY tenant_isolation_update ON public.article_sites FOR UPDATE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id())) WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()));
CREATE POLICY tenant_isolation_delete ON public.article_sites FOR DELETE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()));
DROP POLICY IF EXISTS tenant_isolation ON public.articles;
CREATE POLICY tenant_isolation_select ON public.articles FOR SELECT TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()));
CREATE POLICY tenant_isolation_insert ON public.articles FOR INSERT TO indicate_runtime WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()));
CREATE POLICY tenant_isolation_update ON public.articles FOR UPDATE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id())) WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()));
CREATE POLICY tenant_isolation_delete ON public.articles FOR DELETE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()));
DROP POLICY IF EXISTS tenant_isolation ON public.audit_logs;
CREATE POLICY tenant_isolation_select ON public.audit_logs FOR SELECT TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()));
CREATE POLICY tenant_isolation_insert ON public.audit_logs FOR INSERT TO indicate_runtime WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()));
CREATE POLICY tenant_isolation_update ON public.audit_logs FOR UPDATE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id())) WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()));
CREATE POLICY tenant_isolation_delete ON public.audit_logs FOR DELETE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()));
DROP POLICY IF EXISTS tenant_isolation ON public.authors;
CREATE POLICY tenant_isolation_select ON public.authors FOR SELECT TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()));
CREATE POLICY tenant_isolation_insert ON public.authors FOR INSERT TO indicate_runtime WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()));
CREATE POLICY tenant_isolation_update ON public.authors FOR UPDATE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id())) WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()));
CREATE POLICY tenant_isolation_delete ON public.authors FOR DELETE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()));
DROP POLICY IF EXISTS tenant_isolation ON public.cache_bypasses;
CREATE POLICY tenant_isolation_select ON public.cache_bypasses FOR SELECT TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()));
CREATE POLICY tenant_isolation_insert ON public.cache_bypasses FOR INSERT TO indicate_runtime WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()));
CREATE POLICY tenant_isolation_update ON public.cache_bypasses FOR UPDATE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id())) WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()));
CREATE POLICY tenant_isolation_delete ON public.cache_bypasses FOR DELETE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()));
DROP POLICY IF EXISTS tenant_isolation ON public.categories;
CREATE POLICY tenant_isolation_select ON public.categories FOR SELECT TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()));
CREATE POLICY tenant_isolation_insert ON public.categories FOR INSERT TO indicate_runtime WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()));
CREATE POLICY tenant_isolation_update ON public.categories FOR UPDATE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id())) WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()));
CREATE POLICY tenant_isolation_delete ON public.categories FOR DELETE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()));
DROP POLICY IF EXISTS tenant_isolation ON public.domain_activation_attempts;
CREATE POLICY tenant_isolation_select ON public.domain_activation_attempts FOR SELECT TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()));
CREATE POLICY tenant_isolation_insert ON public.domain_activation_attempts FOR INSERT TO indicate_runtime WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()));
CREATE POLICY tenant_isolation_update ON public.domain_activation_attempts FOR UPDATE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id())) WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()));
CREATE POLICY tenant_isolation_delete ON public.domain_activation_attempts FOR DELETE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()));
DROP POLICY IF EXISTS tenant_isolation ON public.domains;
CREATE POLICY tenant_isolation_select ON public.domains FOR SELECT TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()));
CREATE POLICY tenant_isolation_insert ON public.domains FOR INSERT TO indicate_runtime WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()));
CREATE POLICY tenant_isolation_update ON public.domains FOR UPDATE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id())) WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()));
CREATE POLICY tenant_isolation_delete ON public.domains FOR DELETE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()));
DROP POLICY IF EXISTS tenant_isolation ON public.invalidation_tasks;
CREATE POLICY tenant_isolation_select ON public.invalidation_tasks FOR SELECT TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()));
CREATE POLICY tenant_isolation_insert ON public.invalidation_tasks FOR INSERT TO indicate_runtime WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()));
CREATE POLICY tenant_isolation_update ON public.invalidation_tasks FOR UPDATE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id())) WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()));
CREATE POLICY tenant_isolation_delete ON public.invalidation_tasks FOR DELETE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()));
DROP POLICY IF EXISTS tenant_isolation ON public.media;
CREATE POLICY tenant_isolation_select ON public.media FOR SELECT TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()));
CREATE POLICY tenant_isolation_insert ON public.media FOR INSERT TO indicate_runtime WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()));
CREATE POLICY tenant_isolation_update ON public.media FOR UPDATE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id())) WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()));
CREATE POLICY tenant_isolation_delete ON public.media FOR DELETE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()));
DROP POLICY IF EXISTS tenant_isolation ON public.media_key_reservations;
CREATE POLICY tenant_isolation_select ON public.media_key_reservations FOR SELECT TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()));
CREATE POLICY tenant_isolation_insert ON public.media_key_reservations FOR INSERT TO indicate_runtime WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()));
CREATE POLICY tenant_isolation_update ON public.media_key_reservations FOR UPDATE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id())) WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()));
CREATE POLICY tenant_isolation_delete ON public.media_key_reservations FOR DELETE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()));
DROP POLICY IF EXISTS tenant_isolation ON public.memberships;
CREATE POLICY tenant_isolation_select ON public.memberships FOR SELECT TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()));
CREATE POLICY tenant_isolation_insert ON public.memberships FOR INSERT TO indicate_runtime WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()));
CREATE POLICY tenant_isolation_update ON public.memberships FOR UPDATE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id())) WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()));
CREATE POLICY tenant_isolation_delete ON public.memberships FOR DELETE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()));
DROP POLICY IF EXISTS tenant_isolation ON public.object_cleanup_tasks;
CREATE POLICY tenant_isolation_select ON public.object_cleanup_tasks FOR SELECT TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()));
CREATE POLICY tenant_isolation_insert ON public.object_cleanup_tasks FOR INSERT TO indicate_runtime WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()));
CREATE POLICY tenant_isolation_update ON public.object_cleanup_tasks FOR UPDATE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id())) WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()));
CREATE POLICY tenant_isolation_delete ON public.object_cleanup_tasks FOR DELETE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()));
DROP POLICY IF EXISTS tenant_isolation ON public.official_affiliations;
CREATE POLICY tenant_isolation_select ON public.official_affiliations FOR SELECT TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()));
CREATE POLICY tenant_isolation_insert ON public.official_affiliations FOR INSERT TO indicate_runtime WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()));
CREATE POLICY tenant_isolation_update ON public.official_affiliations FOR UPDATE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id())) WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()));
CREATE POLICY tenant_isolation_delete ON public.official_affiliations FOR DELETE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()));
DROP POLICY IF EXISTS tenant_isolation ON public.publishers;
CREATE POLICY tenant_isolation_select ON public.publishers FOR SELECT TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()));
CREATE POLICY tenant_isolation_insert ON public.publishers FOR INSERT TO indicate_runtime WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()));
CREATE POLICY tenant_isolation_update ON public.publishers FOR UPDATE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id())) WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()));
CREATE POLICY tenant_isolation_delete ON public.publishers FOR DELETE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()));
DROP POLICY IF EXISTS tenant_isolation ON public.publishing_job_targets;
CREATE POLICY tenant_isolation_select ON public.publishing_job_targets FOR SELECT TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()));
CREATE POLICY tenant_isolation_insert ON public.publishing_job_targets FOR INSERT TO indicate_runtime WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()));
CREATE POLICY tenant_isolation_update ON public.publishing_job_targets FOR UPDATE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id())) WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()));
CREATE POLICY tenant_isolation_delete ON public.publishing_job_targets FOR DELETE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()));
DROP POLICY IF EXISTS tenant_isolation ON public.publishing_jobs;
CREATE POLICY tenant_isolation_select ON public.publishing_jobs FOR SELECT TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()));
CREATE POLICY tenant_isolation_insert ON public.publishing_jobs FOR INSERT TO indicate_runtime WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()));
CREATE POLICY tenant_isolation_update ON public.publishing_jobs FOR UPDATE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id())) WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()));
CREATE POLICY tenant_isolation_delete ON public.publishing_jobs FOR DELETE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()));
DROP POLICY IF EXISTS tenant_isolation ON public.regions;
CREATE POLICY tenant_isolation_select ON public.regions FOR SELECT TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()));
CREATE POLICY tenant_isolation_insert ON public.regions FOR INSERT TO indicate_runtime WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()));
CREATE POLICY tenant_isolation_update ON public.regions FOR UPDATE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id())) WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()));
CREATE POLICY tenant_isolation_delete ON public.regions FOR DELETE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()));
DROP POLICY IF EXISTS tenant_isolation ON public.role_permissions;
CREATE POLICY tenant_isolation_select ON public.role_permissions FOR SELECT TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()));
CREATE POLICY tenant_isolation_insert ON public.role_permissions FOR INSERT TO indicate_runtime WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()));
CREATE POLICY tenant_isolation_update ON public.role_permissions FOR UPDATE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id())) WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()));
CREATE POLICY tenant_isolation_delete ON public.role_permissions FOR DELETE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()));
DROP POLICY IF EXISTS tenant_isolation ON public.roles;
CREATE POLICY tenant_isolation_select ON public.roles FOR SELECT TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()));
CREATE POLICY tenant_isolation_insert ON public.roles FOR INSERT TO indicate_runtime WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()));
CREATE POLICY tenant_isolation_update ON public.roles FOR UPDATE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id())) WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()));
CREATE POLICY tenant_isolation_delete ON public.roles FOR DELETE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()));
DROP POLICY IF EXISTS tenant_isolation ON public.seed_runs;
CREATE POLICY tenant_isolation_select ON public.seed_runs FOR SELECT TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()));
CREATE POLICY tenant_isolation_insert ON public.seed_runs FOR INSERT TO indicate_runtime WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()));
CREATE POLICY tenant_isolation_update ON public.seed_runs FOR UPDATE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id())) WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()));
CREATE POLICY tenant_isolation_delete ON public.seed_runs FOR DELETE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()));
DROP POLICY IF EXISTS tenant_isolation ON public.site_settings;
CREATE POLICY tenant_isolation_select ON public.site_settings FOR SELECT TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()));
CREATE POLICY tenant_isolation_insert ON public.site_settings FOR INSERT TO indicate_runtime WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()));
CREATE POLICY tenant_isolation_update ON public.site_settings FOR UPDATE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id())) WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()));
CREATE POLICY tenant_isolation_delete ON public.site_settings FOR DELETE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()));
DROP POLICY IF EXISTS tenant_isolation ON public.sites;
CREATE POLICY tenant_isolation_select ON public.sites FOR SELECT TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()));
CREATE POLICY tenant_isolation_insert ON public.sites FOR INSERT TO indicate_runtime WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()));
CREATE POLICY tenant_isolation_update ON public.sites FOR UPDATE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id())) WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()));
CREATE POLICY tenant_isolation_delete ON public.sites FOR DELETE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()));
DROP POLICY IF EXISTS tenant_isolation ON public.subscriptions;
CREATE POLICY tenant_isolation_select ON public.subscriptions FOR SELECT TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()));
CREATE POLICY tenant_isolation_insert ON public.subscriptions FOR INSERT TO indicate_runtime WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()));
CREATE POLICY tenant_isolation_update ON public.subscriptions FOR UPDATE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id())) WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()));
CREATE POLICY tenant_isolation_delete ON public.subscriptions FOR DELETE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()));
DROP POLICY IF EXISTS tenant_isolation ON public.telegram_conversations;
CREATE POLICY tenant_isolation_select ON public.telegram_conversations FOR SELECT TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()));
CREATE POLICY tenant_isolation_insert ON public.telegram_conversations FOR INSERT TO indicate_runtime WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()));
CREATE POLICY tenant_isolation_update ON public.telegram_conversations FOR UPDATE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id())) WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()));
CREATE POLICY tenant_isolation_delete ON public.telegram_conversations FOR DELETE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()));
DROP POLICY IF EXISTS tenant_isolation ON public.telegram_identity_mappings;
CREATE POLICY tenant_isolation_select ON public.telegram_identity_mappings FOR SELECT TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()));
CREATE POLICY tenant_isolation_insert ON public.telegram_identity_mappings FOR INSERT TO indicate_runtime WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()));
CREATE POLICY tenant_isolation_update ON public.telegram_identity_mappings FOR UPDATE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id())) WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()));
CREATE POLICY tenant_isolation_delete ON public.telegram_identity_mappings FOR DELETE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()));
DROP POLICY IF EXISTS tenant_isolation ON public.publication_transition_receipts;
CREATE POLICY tenant_isolation_select ON public.publication_transition_receipts FOR SELECT TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()));
CREATE POLICY tenant_isolation_insert ON public.publication_transition_receipts FOR INSERT TO indicate_runtime WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()));
CREATE POLICY tenant_isolation_update ON public.publication_transition_receipts FOR UPDATE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id())) WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()));
CREATE POLICY tenant_isolation_delete ON public.publication_transition_receipts FOR DELETE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()));
DROP POLICY IF EXISTS tenant_isolation ON public.organizations;
CREATE POLICY organization_isolation_select ON public.organizations FOR SELECT TO indicate_runtime USING (id = (SELECT indicate_private.current_organization_id()));
CREATE POLICY organization_isolation_insert ON public.organizations FOR INSERT TO indicate_runtime WITH CHECK (id = (SELECT indicate_private.current_organization_id()));
CREATE POLICY organization_isolation_update ON public.organizations FOR UPDATE TO indicate_runtime USING (id = (SELECT indicate_private.current_organization_id())) WITH CHECK (id = (SELECT indicate_private.current_organization_id()));
CREATE POLICY organization_isolation_delete ON public.organizations FOR DELETE TO indicate_runtime USING (id = (SELECT indicate_private.current_organization_id()));
DROP POLICY IF EXISTS auth_identity_isolation ON public.users;
CREATE POLICY auth_identity_isolation_select ON public.users FOR SELECT TO indicate_runtime USING (auth_user_id = (SELECT indicate_private.current_auth_user_id()));
CREATE POLICY auth_identity_isolation_insert ON public.users FOR INSERT TO indicate_runtime WITH CHECK (auth_user_id = (SELECT indicate_private.current_auth_user_id()));
CREATE POLICY auth_identity_isolation_update ON public.users FOR UPDATE TO indicate_runtime USING (auth_user_id = (SELECT indicate_private.current_auth_user_id())) WITH CHECK (auth_user_id = (SELECT indicate_private.current_auth_user_id()));
CREATE POLICY auth_identity_isolation_delete ON public.users FOR DELETE TO indicate_runtime USING (auth_user_id = (SELECT indicate_private.current_auth_user_id()));
DROP POLICY IF EXISTS permission_scope_isolation ON public.permissions;
CREATE POLICY permission_scope_isolation_select ON public.permissions FOR SELECT TO indicate_runtime USING ((scope = 'platform'::permission_scope) OR (organization_id = (SELECT indicate_private.current_organization_id())));
CREATE POLICY permission_scope_isolation_insert ON public.permissions FOR INSERT TO indicate_runtime WITH CHECK ((scope = 'platform'::permission_scope) OR (organization_id = (SELECT indicate_private.current_organization_id())));
CREATE POLICY permission_scope_isolation_update ON public.permissions FOR UPDATE TO indicate_runtime USING ((scope = 'platform'::permission_scope) OR (organization_id = (SELECT indicate_private.current_organization_id()))) WITH CHECK ((scope = 'platform'::permission_scope) OR (organization_id = (SELECT indicate_private.current_organization_id())));
CREATE POLICY permission_scope_isolation_delete ON public.permissions FOR DELETE TO indicate_runtime USING ((scope = 'platform'::permission_scope) OR (organization_id = (SELECT indicate_private.current_organization_id())));
DROP POLICY IF EXISTS runtime_config_audit_tenant_isolation ON public.runtime_config_audit_logs;
CREATE POLICY runtime_config_audit_tenant_isolation_select ON public.runtime_config_audit_logs FOR SELECT TO indicate_runtime USING ((organization_id IS NULL) OR (organization_id = (SELECT indicate_private.current_organization_id())));
CREATE POLICY runtime_config_audit_tenant_isolation_insert ON public.runtime_config_audit_logs FOR INSERT TO indicate_runtime WITH CHECK ((organization_id IS NULL) OR (organization_id = (SELECT indicate_private.current_organization_id())));
CREATE POLICY runtime_config_audit_tenant_isolation_update ON public.runtime_config_audit_logs FOR UPDATE TO indicate_runtime USING ((organization_id IS NULL) OR (organization_id = (SELECT indicate_private.current_organization_id()))) WITH CHECK ((organization_id IS NULL) OR (organization_id = (SELECT indicate_private.current_organization_id())));
CREATE POLICY runtime_config_audit_tenant_isolation_delete ON public.runtime_config_audit_logs FOR DELETE TO indicate_runtime USING ((organization_id IS NULL) OR (organization_id = (SELECT indicate_private.current_organization_id())));
DROP POLICY IF EXISTS runtime_config_invalidation_tenant_isolation ON public.runtime_config_invalidation_intents;
CREATE POLICY runtime_config_invalidation_tenant_isolation_select ON public.runtime_config_invalidation_intents FOR SELECT TO indicate_runtime USING ((organization_id IS NULL) OR (organization_id = (SELECT indicate_private.current_organization_id())));
CREATE POLICY runtime_config_invalidation_tenant_isolation_insert ON public.runtime_config_invalidation_intents FOR INSERT TO indicate_runtime WITH CHECK ((organization_id IS NULL) OR (organization_id = (SELECT indicate_private.current_organization_id())));
CREATE POLICY runtime_config_invalidation_tenant_isolation_update ON public.runtime_config_invalidation_intents FOR UPDATE TO indicate_runtime USING ((organization_id IS NULL) OR (organization_id = (SELECT indicate_private.current_organization_id()))) WITH CHECK ((organization_id IS NULL) OR (organization_id = (SELECT indicate_private.current_organization_id())));
CREATE POLICY runtime_config_invalidation_tenant_isolation_delete ON public.runtime_config_invalidation_intents FOR DELETE TO indicate_runtime USING ((organization_id IS NULL) OR (organization_id = (SELECT indicate_private.current_organization_id())));
DROP POLICY IF EXISTS webhook_replay_tenant_isolation ON public.webhook_replay_claims;
CREATE POLICY webhook_replay_tenant_isolation_select ON public.webhook_replay_claims FOR SELECT TO indicate_runtime USING ((organization_id IS NULL) OR (organization_id = (SELECT indicate_private.current_organization_id())));
CREATE POLICY webhook_replay_tenant_isolation_insert ON public.webhook_replay_claims FOR INSERT TO indicate_runtime WITH CHECK ((organization_id IS NULL) OR (organization_id = (SELECT indicate_private.current_organization_id())));
CREATE POLICY webhook_replay_tenant_isolation_update ON public.webhook_replay_claims FOR UPDATE TO indicate_runtime USING ((organization_id IS NULL) OR (organization_id = (SELECT indicate_private.current_organization_id()))) WITH CHECK ((organization_id IS NULL) OR (organization_id = (SELECT indicate_private.current_organization_id())));
CREATE POLICY webhook_replay_tenant_isolation_delete ON public.webhook_replay_claims FOR DELETE TO indicate_runtime USING ((organization_id IS NULL) OR (organization_id = (SELECT indicate_private.current_organization_id())));
DROP POLICY IF EXISTS config_deny_all ON public.cache_policy;
DROP POLICY IF EXISTS config_deny_all ON public.media_policy;
DROP POLICY IF EXISTS config_deny_all ON public.publication_policy;
DROP POLICY IF EXISTS config_deny_all ON public.rate_limit_policies;
DROP POLICY IF EXISTS config_deny_all ON public.webhook_policy;
DROP POLICY IF EXISTS config_deny_all ON public.shared_deployment_config;
DROP POLICY IF EXISTS config_deny_all ON public.runtime_config_backfill_runs;
DROP POLICY IF EXISTS config_deny_all ON public.runtime_config_parity_evidence;
DROP POLICY IF EXISTS config_deny_all ON public.runtime_config_release_domain_zones;
DROP POLICY IF EXISTS config_deny_all ON public.runtime_config_release_manifests;
DROP POLICY IF EXISTS config_deny_all ON public.runtime_config_revisions;
DROP POLICY IF EXISTS config_deny_all ON public.platform_user_permissions;
DROP POLICY IF EXISTS indicate_runtime_read ON public.indicate_schema_migrations;
DROP POLICY IF EXISTS indicate_runtime_read ON public.migration_gate_events;
CREATE POLICY config_deny_all ON public.cache_policy FOR ALL TO indicate_runtime USING (false) WITH CHECK (false);
CREATE POLICY config_deny_all ON public.media_policy FOR ALL TO indicate_runtime USING (false) WITH CHECK (false);
CREATE POLICY config_deny_all ON public.publication_policy FOR ALL TO indicate_runtime USING (false) WITH CHECK (false);
CREATE POLICY config_deny_all ON public.rate_limit_policies FOR ALL TO indicate_runtime USING (false) WITH CHECK (false);
CREATE POLICY config_deny_all ON public.webhook_policy FOR ALL TO indicate_runtime USING (false) WITH CHECK (false);
CREATE POLICY config_deny_all ON public.shared_deployment_config FOR ALL TO indicate_runtime USING (false) WITH CHECK (false);
CREATE POLICY config_deny_all ON public.runtime_config_backfill_runs FOR ALL TO indicate_runtime USING (false) WITH CHECK (false);
CREATE POLICY config_deny_all ON public.runtime_config_parity_evidence FOR ALL TO indicate_runtime USING (false) WITH CHECK (false);
CREATE POLICY config_deny_all ON public.runtime_config_release_domain_zones FOR ALL TO indicate_runtime USING (false) WITH CHECK (false);
CREATE POLICY config_deny_all ON public.runtime_config_release_manifests FOR ALL TO indicate_runtime USING (false) WITH CHECK (false);
CREATE POLICY config_deny_all ON public.runtime_config_revisions FOR ALL TO indicate_runtime USING (false) WITH CHECK (false);
CREATE POLICY config_deny_all ON public.platform_user_permissions FOR ALL TO indicate_runtime USING (false) WITH CHECK (false);
CREATE POLICY indicate_runtime_read ON public.indicate_schema_migrations FOR SELECT TO indicate_runtime USING (true);
CREATE POLICY indicate_runtime_read ON public.migration_gate_events FOR SELECT TO indicate_runtime USING (true);

INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (36, 'rls_operation_split', 'rls-operation-split-v1');

INSERT INTO drizzle."__drizzle_migrations" ("hash", "created_at") VALUES ('db6492db464a4d64b19b52716863a86b420b32561eb80517afa6fbb37b970838', 1788458000000);

-- ----------------------------------------------------------------------
-- 20260903025500_rls_write_hardening
-- ----------------------------------------------------------------------
-- RLS write hardening: gate security-sensitive writes on actor authorization.
--
-- The v36 split isolated per-command policies; this migration tightens the
-- WRITE side where a bare tenant check is insufficient. All predicates mirror
-- the permission strings the application already enforces in code, so no
-- legitimate flow changes behavior (verified against every repository writer):
--
-- 1. actor_has_tenant_permission(): single reviewer for "may actor A mutate
--    authorization data in the current org". Mirrors the application's own
--    authorization branches (user membership grants, api_key scopes incl.
--    expiry, telegram mapping role grants), plus a first-provisioning
--    bootstrap exception (org without memberships yet) and the platform
--    escape hatch. SECURITY INVOKER so its internal reads stay tenant-scoped;
--    callers wrap it in a scalar subquery. No recursion: it only performs
--    SELECTs, and no SELECT policy calls it.
-- 2. memberships / roles / role_permissions / telegram_identity_mappings /
--    api_keys: INSERT/UPDATE/DELETE require tenant AND the matching
--    permission (membership.manage, role.manage, telegram.manage,
--    api_key.manage). SELECT stays tenant-only.
-- 3. users: no DELETE policy (default deny) + REVOKE DELETE; identity columns
--    (id, auth_user_id) made immutable by trigger (RLS WITH CHECK cannot
--    reference OLD rows). INSERT/SELECT/UPDATE keep the self predicate so the
--    signup/ensure flow (authorization-repository) keeps working.
-- 4. organizations: explicit DELETE-deny policy + REVOKE DELETE (no code path
--    deletes organizations; verified by repository audit).
-- 5. runtime_config_audit_logs: REVOKE UPDATE/DELETE (append-only; the
--    *_append_only_guard trigger remains the second lock). audit_logs already
--    INSERT+SELECT-only: drop its UPDATE/DELETE policies.
-- 6. Null-organization rows (audit RC, invalidation intents, replay claims):
--    SELECT keeps the null arm (workers read shared rows); INSERT/UPDATE/
--    DELETE now require a concrete current organization. Every null-org write
--    in the codebase goes through SECURITY DEFINER functions (owner bypass),
--    so no legitimate path breaks.
-- 7. permissions: explicit write-deny policies for indicate_runtime (grants
--    already SELECT-only; this is the second lock).

CREATE OR REPLACE FUNCTION indicate_private.actor_has_tenant_permission(p_permission text)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
  SELECT COALESCE(
    NOT EXISTS (
      SELECT 1 FROM public.memberships AS m
      WHERE m.organization_id = (SELECT indicate_private.current_organization_id())
    )
    OR (SELECT indicate_private.permission_has_platform((SELECT indicate_private.current_verified_user_id()), p_permission))
    OR EXISTS (
      SELECT 1
      FROM public.memberships AS m
      JOIN public.roles AS r ON r.organization_id = m.organization_id AND r.id = m.role_id AND r.active
      JOIN public.role_permissions AS rp ON rp.organization_id = r.organization_id AND rp.role_id = r.id
      JOIN public.permissions AS p ON p.id = rp.permission_id
      WHERE m.organization_id = (SELECT indicate_private.current_organization_id())
        AND m.user_id = (SELECT indicate_private.current_verified_user_id())
        AND m.status = 'active'
        AND p.organization_id = (SELECT indicate_private.current_organization_id())
        AND p.scope = 'organization' AND p.name = p_permission
    )
    OR EXISTS (
      SELECT 1 FROM public.api_keys AS k
      WHERE k.organization_id = (SELECT indicate_private.current_organization_id())
        AND k.id::text = current_setting('app.actor_id', true)
        AND k.status = 'active'
        AND (k.expires_at IS NULL OR k.expires_at > now())
        AND k.scopes @> ARRAY[p_permission]
    )
    OR EXISTS (
      SELECT 1
      FROM public.telegram_identity_mappings AS tim
      JOIN public.memberships AS m ON m.organization_id = tim.organization_id AND m.user_id = tim.user_id AND m.role_id = tim.role_id AND m.status = 'active'
      JOIN public.roles AS r ON r.organization_id = m.organization_id AND r.id = m.role_id AND r.active
      JOIN public.role_permissions AS rp ON rp.organization_id = r.organization_id AND rp.role_id = r.id
      JOIN public.permissions AS p ON p.id = rp.permission_id
      WHERE tim.organization_id = (SELECT indicate_private.current_organization_id())
        AND tim.id::text = current_setting('app.actor_id', true)
        AND tim.status = 'active'
        AND p.organization_id = (SELECT indicate_private.current_organization_id())
        AND p.scope = 'organization' AND p.name = p_permission
    ),
    false)
$function$;
REVOKE ALL ON FUNCTION indicate_private.actor_has_tenant_permission(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.actor_has_tenant_permission(text) TO indicate_runtime;
DROP POLICY IF EXISTS tenant_isolation_insert ON public.memberships;
DROP POLICY IF EXISTS tenant_isolation_update ON public.memberships;
DROP POLICY IF EXISTS tenant_isolation_delete ON public.memberships;
CREATE POLICY memberships_write_insert ON public.memberships FOR INSERT TO indicate_runtime WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()) AND (SELECT indicate_private.actor_has_tenant_permission('membership.manage')));
CREATE POLICY memberships_write_update ON public.memberships FOR UPDATE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()) AND (SELECT indicate_private.actor_has_tenant_permission('membership.manage'))) WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()) AND (SELECT indicate_private.actor_has_tenant_permission('membership.manage')));
CREATE POLICY memberships_write_delete ON public.memberships FOR DELETE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()) AND (SELECT indicate_private.actor_has_tenant_permission('membership.manage')));
DROP POLICY IF EXISTS tenant_isolation_insert ON public.roles;
DROP POLICY IF EXISTS tenant_isolation_update ON public.roles;
DROP POLICY IF EXISTS tenant_isolation_delete ON public.roles;
CREATE POLICY roles_write_insert ON public.roles FOR INSERT TO indicate_runtime WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()) AND (SELECT indicate_private.actor_has_tenant_permission('role.manage')));
CREATE POLICY roles_write_update ON public.roles FOR UPDATE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()) AND (SELECT indicate_private.actor_has_tenant_permission('role.manage'))) WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()) AND (SELECT indicate_private.actor_has_tenant_permission('role.manage')));
CREATE POLICY roles_write_delete ON public.roles FOR DELETE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()) AND (SELECT indicate_private.actor_has_tenant_permission('role.manage')));
DROP POLICY IF EXISTS tenant_isolation_insert ON public.role_permissions;
DROP POLICY IF EXISTS tenant_isolation_update ON public.role_permissions;
DROP POLICY IF EXISTS tenant_isolation_delete ON public.role_permissions;
CREATE POLICY role_permissions_write_insert ON public.role_permissions FOR INSERT TO indicate_runtime WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()) AND (SELECT indicate_private.actor_has_tenant_permission('role.manage')));
CREATE POLICY role_permissions_write_update ON public.role_permissions FOR UPDATE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()) AND (SELECT indicate_private.actor_has_tenant_permission('role.manage'))) WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()) AND (SELECT indicate_private.actor_has_tenant_permission('role.manage')));
CREATE POLICY role_permissions_write_delete ON public.role_permissions FOR DELETE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()) AND (SELECT indicate_private.actor_has_tenant_permission('role.manage')));
DROP POLICY IF EXISTS tenant_isolation_insert ON public.telegram_identity_mappings;
DROP POLICY IF EXISTS tenant_isolation_update ON public.telegram_identity_mappings;
DROP POLICY IF EXISTS tenant_isolation_delete ON public.telegram_identity_mappings;
CREATE POLICY telegram_mappings_write_insert ON public.telegram_identity_mappings FOR INSERT TO indicate_runtime WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()) AND (SELECT indicate_private.actor_has_tenant_permission('telegram.manage')));
CREATE POLICY telegram_mappings_write_update ON public.telegram_identity_mappings FOR UPDATE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()) AND (SELECT indicate_private.actor_has_tenant_permission('telegram.manage'))) WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()) AND (SELECT indicate_private.actor_has_tenant_permission('telegram.manage')));
CREATE POLICY telegram_mappings_write_delete ON public.telegram_identity_mappings FOR DELETE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()) AND (SELECT indicate_private.actor_has_tenant_permission('telegram.manage')));
DROP POLICY IF EXISTS tenant_isolation_insert ON public.api_keys;
DROP POLICY IF EXISTS tenant_isolation_update ON public.api_keys;
DROP POLICY IF EXISTS tenant_isolation_delete ON public.api_keys;
CREATE POLICY api_keys_write_insert ON public.api_keys FOR INSERT TO indicate_runtime WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()) AND (SELECT indicate_private.actor_has_tenant_permission('api_key.manage')));
CREATE POLICY api_keys_write_update ON public.api_keys FOR UPDATE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()) AND (SELECT indicate_private.actor_has_tenant_permission('api_key.manage'))) WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()) AND (SELECT indicate_private.actor_has_tenant_permission('api_key.manage')));
CREATE POLICY api_keys_write_delete ON public.api_keys FOR DELETE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()) AND (SELECT indicate_private.actor_has_tenant_permission('api_key.manage')));
CREATE OR REPLACE FUNCTION indicate_private.enforce_user_identity_immutable()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
BEGIN
  IF NEW.id IS DISTINCT FROM OLD.id OR NEW.auth_user_id IS DISTINCT FROM OLD.auth_user_id THEN
    RAISE EXCEPTION 'user identity is immutable' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END
$function$;
REVOKE ALL ON FUNCTION indicate_private.enforce_user_identity_immutable() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.enforce_user_identity_immutable() TO indicate_runtime;
DROP TRIGGER IF EXISTS users_identity_immutable_guard ON public.users;
CREATE TRIGGER users_identity_immutable_guard BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION indicate_private.enforce_user_identity_immutable();
DROP POLICY IF EXISTS auth_identity_isolation_delete ON public.users;
REVOKE DELETE ON public.users FROM indicate_runtime;
DROP POLICY IF EXISTS organization_isolation_delete ON public.organizations;
CREATE POLICY organization_delete_deny ON public.organizations FOR DELETE TO indicate_runtime USING (false);
REVOKE DELETE ON public.organizations FROM indicate_runtime;
REVOKE UPDATE, DELETE ON public.runtime_config_audit_logs FROM indicate_runtime;
DROP POLICY IF EXISTS tenant_isolation_update ON public.audit_logs;
DROP POLICY IF EXISTS tenant_isolation_delete ON public.audit_logs;
DROP POLICY IF EXISTS runtime_config_audit_tenant_isolation_update ON public.runtime_config_audit_logs;
DROP POLICY IF EXISTS runtime_config_audit_tenant_isolation_delete ON public.runtime_config_audit_logs;
DROP POLICY IF EXISTS permission_scope_isolation_insert ON public.permissions;
DROP POLICY IF EXISTS permission_scope_isolation_update ON public.permissions;
DROP POLICY IF EXISTS permission_scope_isolation_delete ON public.permissions;
CREATE POLICY permission_write_deny_insert ON public.permissions FOR INSERT TO indicate_runtime WITH CHECK (false);
CREATE POLICY permission_write_deny_delete ON public.permissions FOR DELETE TO indicate_runtime USING (false);
CREATE POLICY permission_write_deny_update ON public.permissions FOR UPDATE TO indicate_runtime USING (false) WITH CHECK (false);
DROP POLICY IF EXISTS runtime_config_audit_tenant_isolation_insert ON public.runtime_config_audit_logs;
CREATE POLICY runtime_config_audit_tenant_insert ON public.runtime_config_audit_logs FOR INSERT TO indicate_runtime WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()));
DROP POLICY IF EXISTS runtime_config_invalidation_tenant_isolation_insert ON public.runtime_config_invalidation_intents;
CREATE POLICY runtime_config_invalidation_tenant_insert ON public.runtime_config_invalidation_intents FOR INSERT TO indicate_runtime WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()));
DROP POLICY IF EXISTS runtime_config_invalidation_tenant_isolation_update ON public.runtime_config_invalidation_intents;
CREATE POLICY runtime_config_invalidation_tenant_update ON public.runtime_config_invalidation_intents FOR UPDATE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id())) WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()));
DROP POLICY IF EXISTS runtime_config_invalidation_tenant_isolation_delete ON public.runtime_config_invalidation_intents;
CREATE POLICY runtime_config_invalidation_tenant_delete ON public.runtime_config_invalidation_intents FOR DELETE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()));
DROP POLICY IF EXISTS webhook_replay_tenant_isolation_insert ON public.webhook_replay_claims;
CREATE POLICY webhook_replay_tenant_insert ON public.webhook_replay_claims FOR INSERT TO indicate_runtime WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()));
DROP POLICY IF EXISTS webhook_replay_tenant_isolation_update ON public.webhook_replay_claims;
CREATE POLICY webhook_replay_tenant_update ON public.webhook_replay_claims FOR UPDATE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id())) WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()));
DROP POLICY IF EXISTS webhook_replay_tenant_isolation_delete ON public.webhook_replay_claims;
CREATE POLICY webhook_replay_tenant_delete ON public.webhook_replay_claims FOR DELETE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()));

INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (37, 'rls_write_hardening', 'rls-write-hardening-v1');

INSERT INTO drizzle."__drizzle_migrations" ("hash", "created_at") VALUES ('93aeb0997e4f98316b7e0e2e5f229562da32e25b34a2bfdeed1e0b858f3701d0', 1788459000000);

-- ----------------------------------------------------------------------
-- 20260903030000_user_profile
-- ----------------------------------------------------------------------
-- User profile columns: avatar reference, bio, and locale preferences.
--
-- Curated from the `drizzle-kit generate` diff (kept verbatim): four nullable
-- columns with no defaults, so existing rows are untouched. avatar_url holds
-- either an https:// URL (OAuth provider avatar or user-supplied link) or an
-- `r2:`-prefixed private-bucket key resolved to a short-lived signed URL at
-- render time; writers validate the shape in application code. The existing
-- self-predicate RLS policies and the identity-immutability trigger already
-- cover these columns (no policy change required).

ALTER TABLE "users" ADD COLUMN "avatar_url" text;
ALTER TABLE "users" ADD COLUMN "bio" text;
ALTER TABLE "users" ADD COLUMN "locale" text;
ALTER TABLE "users" ADD COLUMN "timezone" text;

INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (38, 'user_profile', 'user-profile-v1');

INSERT INTO drizzle."__drizzle_migrations" ("hash", "created_at") VALUES ('b0a2f2516827b4a87d07a8864d51f30a9556802a6c73062e10e39ea253163018', 1788460469605);

-- ----------------------------------------------------------------------
-- 20260903030500_delivery_helpers
-- ----------------------------------------------------------------------
-- Delivery helper reconciliation: provide the two helpers the delivery
-- repository calls that were never recorded in a migration, and widen the
-- member display lookup with the stored avatar.
--
-- 1. is_delivery_pending_host(hostname, attempt_id): whether a domain
--    activation attempt is still in flight. Mirrors the in-memory delivery
--    fixture contract (activate operation, pending/processing status, early
--    activation states). SECURITY DEFINER so the pending-domain route can call
--    it before any tenant is resolved; STABLE, read-only.
-- 2. lookup_user_profile(user_id): display_name plus avatar_url under the
--    same caller guards as the retired lookup_user_display_name (verified
--    caller with an active membership in the current organization). Replaces
--    it; the two repository call sites move over in application code.

CREATE OR REPLACE FUNCTION indicate_private.is_delivery_pending_host(p_hostname text, p_attempt_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.domain_activation_attempts AS attempt
    WHERE attempt.id = p_attempt_id
      AND attempt.hostname = p_hostname
      AND attempt.operation = 'activate'
      AND attempt.status IN ('pending', 'processing')
      AND attempt.activation_state IN ('pending', 'cloudflare_verified', 'vercel_associated')
  )
$function$;
REVOKE ALL ON FUNCTION indicate_private.is_delivery_pending_host(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.is_delivery_pending_host(text, uuid) TO indicate_runtime;
CREATE OR REPLACE FUNCTION indicate_private.lookup_user_profile(requested_user_id uuid)
RETURNS TABLE(display_name text, avatar_url text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
  SELECT target_user.display_name, target_user.avatar_url
  FROM public.users AS target_user
  WHERE target_user.id = requested_user_id
    AND indicate_private.current_verified_user_id() IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.memberships AS caller_membership
      WHERE caller_membership.organization_id = indicate_private.current_organization_id()
        AND caller_membership.user_id = indicate_private.current_verified_user_id()
        AND caller_membership.status = 'active'
    )
  LIMIT 1
$function$;
REVOKE ALL ON FUNCTION indicate_private.lookup_user_profile(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.lookup_user_profile(uuid) TO indicate_runtime;
DROP FUNCTION IF EXISTS indicate_private.lookup_user_display_name(uuid);

CREATE OR REPLACE FUNCTION indicate_private.claim_delivery_invalidation_tasks(
  p_now timestamptz,
  p_limit integer,
  p_claim_token uuid,
  p_claim_expires_at timestamptz
) RETURNS SETOF public.invalidation_tasks
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public, indicate_private
AS $function$
BEGIN
  RETURN QUERY
  WITH candidates AS (
    SELECT organization_id, id
    FROM public.invalidation_tasks
    WHERE status IN ('pending', 'processing')
      AND next_attempt_at <= p_now
      AND (reconciliation_claim_expires_at IS NULL OR reconciliation_claim_expires_at <= p_now)
    ORDER BY next_attempt_at, id
    FOR UPDATE SKIP LOCKED
    LIMIT greatest(1, least(p_limit, 100))
  )
  UPDATE public.invalidation_tasks task
  SET status = 'processing', reconciliation_claim_token = p_claim_token,
      reconciliation_claim_expires_at = p_claim_expires_at, updated_at = p_now
  FROM candidates
  WHERE task.organization_id = candidates.organization_id AND task.id = candidates.id
  RETURNING task.*;
END;
$function$;
REVOKE ALL ON FUNCTION indicate_private.claim_delivery_invalidation_tasks(timestamptz, integer, uuid, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.claim_delivery_invalidation_tasks(timestamptz, integer, uuid, timestamptz) TO indicate_runtime;

INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (39, 'delivery_helpers', 'delivery-helpers-v1');

INSERT INTO drizzle."__drizzle_migrations" ("hash", "created_at") VALUES ('0e075f7ef930dc4571d5341b931dbbea2a5b047781e6c7485884890f576a0231', 1788461000000);

-- ----------------------------------------------------------------------
-- 20260903031000_subscription_tiers
-- ----------------------------------------------------------------------
-- Subscription tiers: closed plan set plus per-plan quotas.
--
-- Curated from the `drizzle-kit generate` diff (kept verbatim at the top):
-- the plan enum, the plan_quotas table, and the column conversion. The
-- subscriptions table is empty in every environment this has reached, so the
-- text-to-enum rewrite is metadata-only; the legacy free-form value 'mvp'
-- used by old fixtures is retired in favor of 'starter'.
--
-- Hand-appended below the generated diff:
-- 1. Quota seeds matching the published tiers (NULL = unlimited).
-- 2. RLS on plan_quotas: tenant reads go through each organization's own
--    subscription row in application code; the table itself is global
--    reference data readable by the runtime role, writable only by the
--    migration credential.
-- 3. subscription_update keeps its (text) signature for caller compatibility
--    and casts to the enum at the two use sites (row write; audit payload
--    keeps the text form).

CREATE TYPE "public"."subscription_plan" AS ENUM('starter', 'growth', 'enterprise');
CREATE TABLE "plan_quotas" (
	"plan" "public"."subscription_plan" PRIMARY KEY NOT NULL,
	"max_domains" integer,
	"max_sites" integer,
	"max_members" integer,
	"max_api_keys" integer,
	CONSTRAINT "plan_quotas_nonnegative" CHECK (("plan_quotas"."max_domains" IS NULL OR "plan_quotas"."max_domains" > 0) AND ("plan_quotas"."max_sites" IS NULL OR "plan_quotas"."max_sites" > 0) AND ("plan_quotas"."max_members" IS NULL OR "plan_quotas"."max_members" > 0) AND ("plan_quotas"."max_api_keys" IS NULL OR "plan_quotas"."max_api_keys" > 0))
);

ALTER TABLE "subscriptions" ALTER COLUMN "plan" SET DATA TYPE "public"."subscription_plan" USING "plan"::"public"."subscription_plan";
INSERT INTO public.plan_quotas (plan, max_domains, max_sites, max_members, max_api_keys) VALUES
  ('starter', 10, 10, NULL, NULL),
  ('growth', 50, 50, NULL, NULL),
  ('enterprise', NULL, NULL, NULL, NULL);
ALTER TABLE public.plan_quotas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_quotas FORCE ROW LEVEL SECURITY;
CREATE POLICY plan_quotas_runtime_read ON public.plan_quotas FOR SELECT TO indicate_runtime USING (true);
GRANT SELECT ON public.plan_quotas TO indicate_runtime;
CREATE OR REPLACE FUNCTION indicate_private.subscription_update(p_actor_id uuid, p_request_id text, p_organization_id uuid, p_expected_version integer, p_plan text, p_status subscription_status, p_period_starts_at timestamp with time zone, p_period_ends_at timestamp with time zone, p_now timestamp with time zone)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
DECLARE v_platform boolean;
BEGIN
  v_platform := indicate_private.permission_has_platform(p_actor_id, 'platform.customer.admin');
  IF NOT v_platform AND (
    indicate_private.current_organization_id() IS DISTINCT FROM p_organization_id
    OR NOT indicate_private.permission_has_tenant(p_actor_id, p_organization_id, 'subscription.manage')
  ) THEN
    RAISE EXCEPTION 'subscription permission required' USING ERRCODE = '42501';
  END IF;
  IF p_expected_version IS NULL THEN
    INSERT INTO public.subscriptions(organization_id, plan, status, period_starts_at, period_ends_at, version, created_at, updated_at)
    VALUES (p_organization_id, p_plan::public.subscription_plan, p_status, p_period_starts_at, p_period_ends_at, 1, p_now, p_now)
    ON CONFLICT (organization_id) DO NOTHING;
    IF NOT FOUND THEN RETURN false; END IF;
  ELSE
    UPDATE public.subscriptions SET plan = p_plan::public.subscription_plan, status = p_status, period_starts_at = p_period_starts_at,
      period_ends_at = p_period_ends_at, version = version + 1, updated_at = p_now
    WHERE organization_id = p_organization_id AND version = p_expected_version;
    IF NOT FOUND THEN RETURN false; END IF;
  END IF;
  INSERT INTO public.audit_logs(organization_id, id, actor_type, actor_id, entry_point, action, target_type, target_id, outcome, changed_fields, after, request_id, occurred_at)
  VALUES (p_organization_id, gen_random_uuid(), 'user', p_actor_id::text, 'dashboard', 'subscription.update', 'subscription', p_organization_id::text, 'succeeded', ARRAY['plan','status','periodStartsAt','periodEndsAt'], jsonb_build_object('plan', p_plan, 'status', p_status, 'periodStartsAt', p_period_starts_at, 'periodEndsAt', p_period_ends_at), p_request_id, p_now);
  RETURN true;
END
$function$;
REVOKE ALL ON FUNCTION indicate_private.subscription_update(uuid, text, uuid, integer, text, subscription_status, timestamptz, timestamptz, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.subscription_update(uuid, text, uuid, integer, text, subscription_status, timestamptz, timestamptz, timestamptz) TO indicate_runtime;

INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (40, 'subscription_tiers', 'subscription-tiers-v1');

INSERT INTO drizzle."__drizzle_migrations" ("hash", "created_at") VALUES ('0d782559f1b08512714755fcce900a8bc33ebf7f1e5bb13c53f2d5e4b62b3c29', 1788462791337);

-- ----------------------------------------------------------------------
-- 20260903031500_dynamic_content
-- ----------------------------------------------------------------------
-- Dynamic content catalog: marketing tiers, testimonials, FAQs, media
-- showcase, contact channels, theme presets, and the permission catalog.
--
-- Everything this file adds is empty-table-safe reference content managed by
-- platform admins instead of code deploys. RLS exposes read access to the
-- runtime role; writes require the platform.content.manage grant, mirroring
-- the customer-admin surface. The organization permission seeder now reads
-- permission_definitions instead of a hardcoded list, and a verified-user
-- email lookup supports first-admin assignment for brand-new organizations.

CREATE TABLE "service_tiers" (
	"slug" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"target" text NOT NULL,
	"summary" text NOT NULL,
	"price" text NOT NULL,
	"period" text NOT NULL,
	"features" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"highlighted" boolean DEFAULT false NOT NULL,
	"cta" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE "testimonials" (
	"id" uuid PRIMARY KEY NOT NULL,
	"quote" text NOT NULL,
	"author" text NOT NULL,
	"role" text NOT NULL,
	"media" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE "faqs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"question" text NOT NULL,
	"answer" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE "media_showcase" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE "contact_channels" (
	"key" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"href" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE "permission_definitions" (
	"scope" "permission_scope" NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "permission_definitions_pk" PRIMARY KEY("scope","name")
);
CREATE TABLE "color_presets" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"primary" text NOT NULL,
	"accent" text NOT NULL,
	"header_bg" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE "template_presets" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"category" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
INSERT INTO public.service_tiers (slug, name, target, summary, price, period, features, highlighted, cta, sort_order) VALUES
  ('starter', 'Network Starter', 'Untuk 5–10 portal dalam satu grup media', 'Untuk satu grup media yang baru mulai.', 'Rp 1.500.000', '/bulan', '["Hingga 10 Domain & Subdomain Situs", "1 Master Database PostgreSQL Supabase", "Integrasi Telegram Bot Redaksi", "Cloudflare CDN & R2 Media Storage", "Koleksi Master Template Layout", "Dasbor redaksi penuh", "Dukungan lewat surel"]', false, 'Pilih Paket Starter', 1),
  ('growth', 'Network Growth', 'Untuk 25–50 portal lintas unit usaha', 'Untuk jaringan portal daerah yang sedang tumbuh.', 'Rp 3.800.000', '/bulan', '["Hingga 50 Domain & Subdomain Situs", "Multi-Site Syndication Pipeline Graph", "Upstash Redis Queue & Leases", "REST API dan bot Telegram", "Klaster Warna Branding Semantik", "Dukungan Custom Domain Nameserver", "Prioritas Cloudflare Cache Purge API"]', true, 'Mulai Pengujian Gratis', 2),
  ('enterprise', 'Enterprise Scale', 'Untuk 100+ portal multi-organisasi', 'Untuk penerbit dengan kebutuhan tata kelola khusus.', 'Kustom', '', '["Kapasitas 100+ Domain & Subdomain Unlimited", "Isolasi Data PostgreSQL RLS Khusus", "SLA Uptime 99.99% Tergaransi", "Dukungan Migrasi Data Berita Massal", "Custom Webhook & API Key Unlimited", "Peran dan izin terperinci", "Pendampingan migrasi"]', false, 'Hubungi Tim Arsitek', 3);
INSERT INTO public.testimonials (id, quote, author, role, media, sort_order) VALUES
  ('00000000-0000-4000-8000-000000007001', 'Dengan Indicate, tim redaksi kami menerbitkan satu artikel utama ke belasan portal dalam jaringan secara bersamaan, tanpa perlu masuk ke setiap dasbor satu per satu.', 'Bambang Suryono', 'Pemimpin Redaksi Grup Media', 'Media Nusantara Group', 1),
  ('00000000-0000-4000-8000-000000007002', 'Kecepatan pembersihan cache Cloudflare dan antrean Upstash Redis-nya sangat cepat. Artikel yang baru dirilis via Telegram Bot langsung tayang di portal publik dalam <1 detik.', 'Dian Sastrowardoyo', 'Head of Digital Infrastructure', 'Pers Daerah Bersatu', 2);
INSERT INTO public.faqs (id, question, answer, sort_order) VALUES
  ('00000000-0000-4000-8000-000000007011', 'Apakah saya membutuhkan server terpisah untuk setiap domain berita?', 'Tidak. Seluruh domain berita (apex maupun subdomain) berjalan di atas 1 infrastruktur terpusat yang sama. Pemisahan data dan tema dilakukan secara otomatis berdasarkan nama host (exact-host isolation).', 1),
  ('00000000-0000-4000-8000-000000007012', 'Bagaimana cara wartawan menerbitkan berita dari luar kantor?', 'Redaksi dapat menerbitkan berita langsung via Dashboard Web, API integration, atau menggunakan Telegram Bot terverifikasi tanpa harus membuka laptop.', 2),
  ('00000000-0000-4000-8000-000000007013', 'Apakah satu artikel bisa tayang di lebih dari satu situs berita sekaligus?', 'Ya. Fitur multi-site syndication memungkinkan 1 artikel utama (canonical article) dipublikasikan ke multiple situs berita milik organisasi Anda tanpa menduplikasi data.', 3),
  ('00000000-0000-4000-8000-000000007014', 'Bagaimana dengan keamanan data dan performa saat lalu lintas tinggi?', 'Sistem menggunakan Cloudflare Enterprise-grade DNS & CDN, R2 Object Storage untuk media, Upstash Redis untuk antrean, dan PostgreSQL dengan Row Level Security (RLS) terisolasi per-organisasi.', 4);
INSERT INTO public.media_showcase (id, name, sort_order) VALUES
  ('00000000-0000-4000-8000-000000007021', 'Nusantara Post', 1),
  ('00000000-0000-4000-8000-000000007022', 'Meridian News', 2),
  ('00000000-0000-4000-8000-000000007023', 'Cakrawala Times', 3),
  ('00000000-0000-4000-8000-000000007024', 'Lentera Daily', 4),
  ('00000000-0000-4000-8000-000000007025', 'Samudra Press', 5),
  ('00000000-0000-4000-8000-000000007026', 'Warta Persada', 6),
  ('00000000-0000-4000-8000-000000007027', 'Arcadia News', 7),
  ('00000000-0000-4000-8000-000000007028', 'Kencana Post', 8);
INSERT INTO public.contact_channels (key, title, description, href, sort_order) VALUES
  ('email', 'Surel', 'officialelsa21@gmail.com — kirim kebutuhan Anda beserta jumlah domain dan wilayah yang direncanakan.', 'mailto:officialelsa21@gmail.com', 1),
  ('whatsapp', 'WhatsApp', '0856-4115-9405 — jalur tercepat untuk paket Enterprise, pindahan sistem, atau pertanyaan harga.', 'https://wa.me/6285641159405?text=Halo%20Indicate%2C%20saya%20ingin%20bertanya.', 2),
  ('telegram', 'Telegram', '@eliyantosarage — tanya jawab singkat mengenai alur redaksi dan integrasi bot.', 'https://t.me/eliyantosarage', 3),
  ('visit', 'Peninjauan bersama', 'Sesi daring untuk menelusuri dasbor dan alur penerbitan — jadwalkan lewat WhatsApp atau surel.', NULL, 4);
INSERT INTO public.permission_definitions (scope, name, description, sort_order) VALUES
  ('organization', 'api_key.read', 'Read API key metadata', 1),
  ('organization', 'api_key.manage', 'Issue, rotate, and revoke API keys', 2),
  ('organization', 'telegram.manage', 'Manage Telegram identity mappings', 3),
  ('organization', 'subscription.read', 'Read Organization subscription', 4),
  ('organization', 'subscription.manage', 'Manage Organization subscription', 5);
INSERT INTO public.color_presets (id, name, description, "primary", accent, header_bg) VALUES
  ('emerald-forest', 'Emerald Forest', 'Warna hijau zamrud & emas kuningan. Cocok untuk portal daerah pertanian & pertumbuhan ekonomi.', '#0b5d4b', '#e9a23b', '#0e1320'),
  ('royal-sapphire', 'Royal Sapphire', 'Warna biru safir & biru terang. Cocok untuk media metropolitan, bisnis, & kebijakan publik.', '#1e3a8a', '#3b82f6', '#0f172a'),
  ('crimson-torch', 'Crimson Torch', 'Warna merah marun & oranye hangat. Cocok untuk headline breaking news & olahraga.', '#991b1b', '#f97316', '#18181b'),
  ('oceanic-cyan', 'Oceanic Cyan', 'Warna teal samudra & sian menyala. Cocok untuk media wilayah pesisir & pariwisata.', '#0f766e', '#06b6d4', '#091e25'),
  ('obsidian-gold', 'Obsidian Gold', 'Warna hitam obsidian & emas klasik. Cocok untuk jurnalistik investigasi & opini publik.', '#18181b', '#cc9a44', '#0e1320'),
  ('deep-violet', 'Deep Violet', 'Warna ungu pekat & lavender. Cocok untuk media kebudayaan, keenam seni, & gaya hidup.', '#581c87', '#c084fc', '#1a102f'),
  ('sunset-amber', 'Sunset Amber', 'Warna cokelat tembaga & amber terbenam. Cocok untuk berita daerah pegunungan & UMKM.', '#7c2d12', '#fb923c', '#1c1917'),
  ('slate-monochrome', 'Slate Monochrome', 'Warna abu-abu baja & perak murni. Cocok untuk pers resmi humas & pemerintah daerah.', '#334155', '#94a3b8', '#0f172a'),
  ('terracotta-earth', 'Terracotta Earth', 'Warna terakota tanah & jingga hangat. Cocok untuk media komunitas daerah & kearifan lokal.', '#9a3412', '#fdba74', '#1c1917'),
  ('pine-forest', 'Pine Forest', 'Warna hijau pinus & mint segar. Cocok untuk media lingkungan hidup & komunitas lokal.', '#14532d', '#4ade80', '#062012');
INSERT INTO public.template_presets (id, name, description, category) VALUES
  ('portal-news', 'Portal News Standard', 'Layout surat kabar digital 2-kolom klasik dengan breaking news ticker & widget terpopuler.', 'news'),
  ('editorial-magazine', 'Editorial Magazine', 'Layout majalah berwibawa dengan tipografi judul besar & kolom opini redaksi.', 'editorial'),
  ('modern-tech', 'Modern Tech Grid', 'Layout majalah teknologi dengan grid asimetris, badge menyala, & header melayang.', 'tech'),
  ('minimal-press', 'Minimal Official Press', 'Layout bersih & resmi untuk pengumuman instansi pemerintah & siaran pers humas.', 'official'),
  ('multimedia-visual', 'Multimedia Visual', 'Layout berfokus pada galeri foto resolusi tinggi & berita video dokumenter.', 'visual'),
  ('tabloid-express', 'Tabloid Express', 'Layout berita kilat dengan banner headline besar & kartu berita cepat.', 'news'),
  ('columnist-opinion', 'Columnist & Opinion', 'Layout esai & opini wartawan dengan fokus keterbacaan artikel panjang.', 'editorial'),
  ('geo-radar', 'Geo Radar', 'Layout berita berbasis peta & navigasi kewilayahan.', 'news'),
  ('compact-stream', 'Compact Live Stream', 'Layout timeline berita cepat real-time dengan update detik per detik.', 'live'),
  ('broadsheet-classic', 'Broadsheet Classic', 'Layout koran cetak korporat dengan pembatas garis vertikal lurus.', 'news');
INSERT INTO public.permissions (id, organization_id, name, scope, description)
VALUES (gen_random_uuid(), NULL, 'platform.content.manage', 'platform', 'Manage dynamic marketing content and theme presets')
ON CONFLICT DO NOTHING;
ALTER TABLE public.service_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_tiers FORCE ROW LEVEL SECURITY;
ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.testimonials FORCE ROW LEVEL SECURITY;
ALTER TABLE public.faqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faqs FORCE ROW LEVEL SECURITY;
ALTER TABLE public.media_showcase ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_showcase FORCE ROW LEVEL SECURITY;
ALTER TABLE public.contact_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_channels FORCE ROW LEVEL SECURITY;
ALTER TABLE public.permission_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permission_definitions FORCE ROW LEVEL SECURITY;
ALTER TABLE public.color_presets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.color_presets FORCE ROW LEVEL SECURITY;
ALTER TABLE public.template_presets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_presets FORCE ROW LEVEL SECURITY;
CREATE POLICY content_runtime_read ON public.service_tiers FOR SELECT TO indicate_runtime USING (true);
CREATE POLICY content_write_platform ON public.service_tiers FOR ALL TO indicate_runtime USING ((SELECT indicate_private.permission_has_platform((SELECT indicate_private.current_verified_user_id()), 'platform.content.manage'))) WITH CHECK ((SELECT indicate_private.permission_has_platform((SELECT indicate_private.current_verified_user_id()), 'platform.content.manage')));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.service_tiers TO indicate_runtime;
CREATE POLICY content_runtime_read ON public.testimonials FOR SELECT TO indicate_runtime USING (true);
CREATE POLICY content_write_platform ON public.testimonials FOR ALL TO indicate_runtime USING ((SELECT indicate_private.permission_has_platform((SELECT indicate_private.current_verified_user_id()), 'platform.content.manage'))) WITH CHECK ((SELECT indicate_private.permission_has_platform((SELECT indicate_private.current_verified_user_id()), 'platform.content.manage')));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.testimonials TO indicate_runtime;
CREATE POLICY content_runtime_read ON public.faqs FOR SELECT TO indicate_runtime USING (true);
CREATE POLICY content_write_platform ON public.faqs FOR ALL TO indicate_runtime USING ((SELECT indicate_private.permission_has_platform((SELECT indicate_private.current_verified_user_id()), 'platform.content.manage'))) WITH CHECK ((SELECT indicate_private.permission_has_platform((SELECT indicate_private.current_verified_user_id()), 'platform.content.manage')));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.faqs TO indicate_runtime;
CREATE POLICY content_runtime_read ON public.media_showcase FOR SELECT TO indicate_runtime USING (true);
CREATE POLICY content_write_platform ON public.media_showcase FOR ALL TO indicate_runtime USING ((SELECT indicate_private.permission_has_platform((SELECT indicate_private.current_verified_user_id()), 'platform.content.manage'))) WITH CHECK ((SELECT indicate_private.permission_has_platform((SELECT indicate_private.current_verified_user_id()), 'platform.content.manage')));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.media_showcase TO indicate_runtime;
CREATE POLICY content_runtime_read ON public.contact_channels FOR SELECT TO indicate_runtime USING (true);
CREATE POLICY content_write_platform ON public.contact_channels FOR ALL TO indicate_runtime USING ((SELECT indicate_private.permission_has_platform((SELECT indicate_private.current_verified_user_id()), 'platform.content.manage'))) WITH CHECK ((SELECT indicate_private.permission_has_platform((SELECT indicate_private.current_verified_user_id()), 'platform.content.manage')));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contact_channels TO indicate_runtime;
CREATE POLICY content_runtime_read ON public.permission_definitions FOR SELECT TO indicate_runtime USING (true);
CREATE POLICY content_write_platform ON public.permission_definitions FOR ALL TO indicate_runtime USING ((SELECT indicate_private.permission_has_platform((SELECT indicate_private.current_verified_user_id()), 'platform.content.manage'))) WITH CHECK ((SELECT indicate_private.permission_has_platform((SELECT indicate_private.current_verified_user_id()), 'platform.content.manage')));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.permission_definitions TO indicate_runtime;
CREATE POLICY content_runtime_read ON public.color_presets FOR SELECT TO indicate_runtime USING (true);
CREATE POLICY content_write_platform ON public.color_presets FOR ALL TO indicate_runtime USING ((SELECT indicate_private.permission_has_platform((SELECT indicate_private.current_verified_user_id()), 'platform.content.manage'))) WITH CHECK ((SELECT indicate_private.permission_has_platform((SELECT indicate_private.current_verified_user_id()), 'platform.content.manage')));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.color_presets TO indicate_runtime;
CREATE POLICY content_runtime_read ON public.template_presets FOR SELECT TO indicate_runtime USING (true);
CREATE POLICY content_write_platform ON public.template_presets FOR ALL TO indicate_runtime USING ((SELECT indicate_private.permission_has_platform((SELECT indicate_private.current_verified_user_id()), 'platform.content.manage'))) WITH CHECK ((SELECT indicate_private.permission_has_platform((SELECT indicate_private.current_verified_user_id()), 'platform.content.manage')));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.template_presets TO indicate_runtime;
CREATE OR REPLACE FUNCTION indicate_private.org_ensure_permissions(p_organization_id uuid)
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
  INSERT INTO public.permissions(id, organization_id, name, scope, description)
  SELECT gen_random_uuid(), p_organization_id, def.name, def.scope, def.description
  FROM public.permission_definitions AS def
  WHERE def.scope = 'organization'
  ON CONFLICT DO NOTHING
$function$;
REVOKE ALL ON FUNCTION indicate_private.org_ensure_permissions(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.org_ensure_permissions(uuid) TO indicate_runtime;
CREATE OR REPLACE FUNCTION indicate_private.resolve_user_by_email(p_email text)
 RETURNS TABLE(id uuid, auth_user_id uuid, display_name text, status record_status)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
  SELECT u.id, u.auth_user_id, u.display_name, u.status
  FROM public.users AS u
  WHERE u.email = p_email
    AND indicate_private.permission_has_platform(indicate_private.current_verified_user_id(), 'platform.customer.admin')
  LIMIT 1
$function$;
REVOKE ALL ON FUNCTION indicate_private.resolve_user_by_email(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.resolve_user_by_email(text) TO indicate_runtime;
CREATE OR REPLACE FUNCTION indicate_private.actor_has_tenant_permission(p_permission text)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
  SELECT COALESCE(
    NOT EXISTS (
      SELECT 1 FROM public.memberships AS m
      WHERE m.organization_id = (SELECT indicate_private.current_organization_id())
    )
    OR (SELECT indicate_private.permission_has_platform((SELECT indicate_private.current_verified_user_id()), 'platform.customer.admin'))
    OR (SELECT indicate_private.permission_has_platform((SELECT indicate_private.current_verified_user_id()), p_permission))
    OR EXISTS (
      SELECT 1
      FROM public.memberships AS m
      JOIN public.roles AS r ON r.organization_id = m.organization_id AND r.id = m.role_id AND r.active
      JOIN public.role_permissions AS rp ON rp.organization_id = r.organization_id AND rp.role_id = r.id
      JOIN public.permissions AS p ON p.id = rp.permission_id
      WHERE m.organization_id = (SELECT indicate_private.current_organization_id())
        AND m.user_id = (SELECT indicate_private.current_verified_user_id())
        AND m.status = 'active'
        AND p.organization_id = (SELECT indicate_private.current_organization_id())
        AND p.scope = 'organization' AND p.name = p_permission
    )
    OR EXISTS (
      SELECT 1 FROM public.api_keys AS k
      WHERE k.organization_id = (SELECT indicate_private.current_organization_id())
        AND k.id::text = current_setting('app.actor_id', true)
        AND k.status = 'active'
        AND (k.expires_at IS NULL OR k.expires_at > now())
        AND k.scopes @> ARRAY[p_permission]
    )
    OR EXISTS (
      SELECT 1
      FROM public.telegram_identity_mappings AS tim
      JOIN public.memberships AS m ON m.organization_id = tim.organization_id AND m.user_id = tim.user_id AND m.role_id = tim.role_id AND m.status = 'active'
      JOIN public.roles AS r ON r.organization_id = m.organization_id AND r.id = m.role_id AND r.active
      JOIN public.role_permissions AS rp ON rp.organization_id = r.organization_id AND rp.role_id = r.id
      JOIN public.permissions AS p ON p.id = rp.permission_id
      WHERE tim.organization_id = (SELECT indicate_private.current_organization_id())
        AND tim.id::text = current_setting('app.actor_id', true)
        AND tim.status = 'active'
        AND p.organization_id = (SELECT indicate_private.current_organization_id())
        AND p.scope = 'organization' AND p.name = p_permission
    ),
    false)
$function$;

INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (41, 'dynamic_content', 'dynamic-content-v1');

INSERT INTO drizzle."__drizzle_migrations" ("hash", "created_at") VALUES ('4a973a9327843ce673e23f44af30287ecf7d803c925f88bbaa2bc23cb01fde7c', 1788463000000);
COMMIT;
