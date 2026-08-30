CREATE TYPE "public"."article_status" AS ENUM('draft', 'active', 'archived');--> statement-breakpoint
CREATE TYPE "public"."audit_actor_type" AS ENUM('user', 'api_key', 'telegram', 'system');--> statement-breakpoint
CREATE TYPE "public"."audit_entry_point" AS ENUM('cms', 'api', 'telegram', 'worker', 'reconciler');--> statement-breakpoint
CREATE TYPE "public"."audit_outcome" AS ENUM('succeeded', 'denied', 'failed');--> statement-breakpoint
CREATE TYPE "public"."media_state" AS ENUM('reserved', 'active', 'rejected', 'archived');--> statement-breakpoint
CREATE TYPE "public"."publisher_type" AS ENUM('government_institution', 'rutan_lapas', 'public_relations_office', 'company', 'organization', 'community', 'independent_publisher');--> statement-breakpoint
CREATE TYPE "public"."publisher_verification_status" AS ENUM('unverified', 'pending', 'verified', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."publishing_state" AS ENUM('queued', 'processing', 'published', 'failed', 'retrying');--> statement-breakpoint
CREATE TYPE "public"."reservation_status" AS ENUM('reserved', 'used', 'occupied', 'expired');--> statement-breakpoint
CREATE TYPE "public"."task_status" AS ENUM('pending', 'processing', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."api_key_status" AS ENUM('active', 'revoked', 'expired');--> statement-breakpoint
CREATE TYPE "public"."permission_scope" AS ENUM('organization', 'platform');--> statement-breakpoint
CREATE TYPE "public"."record_status" AS ENUM('active', 'inactive', 'archived');--> statement-breakpoint
CREATE TYPE "public"."site_activation_state" AS ENUM('inactive', 'pending', 'active', 'failed');--> statement-breakpoint
CREATE TYPE "public"."subscription_status" AS ENUM('trialing', 'active', 'past_due', 'suspended', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."dispatch_status" AS ENUM('pending', 'scheduled', 'leased', 'acknowledged', 'failed');--> statement-breakpoint
CREATE TYPE "public"."replay_claim_status" AS ENUM('claimed', 'processed', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."seed_run_status" AS ENUM('running', 'completed', 'failed');--> statement-breakpoint
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
--> statement-breakpoint
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
--> statement-breakpoint
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
--> statement-breakpoint
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
--> statement-breakpoint
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
--> statement-breakpoint
CREATE TABLE "domain_activation_attempts" (
	"organization_id" uuid NOT NULL,
	"id" uuid NOT NULL,
	"site_id" uuid NOT NULL,
	"hostname" text NOT NULL,
	"phase" text NOT NULL,
	"status" "task_status" DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"next_attempt_at" timestamp with time zone DEFAULT now() NOT NULL,
	"external_status" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "domain_activation_attempts_pk" PRIMARY KEY("organization_id","id"),
	CONSTRAINT "domain_activation_attempts_nonnegative" CHECK ("domain_activation_attempts"."attempts" >= 0)
);
--> statement-breakpoint
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
--> statement-breakpoint
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
--> statement-breakpoint
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
--> statement-breakpoint
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
--> statement-breakpoint
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
--> statement-breakpoint
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
--> statement-breakpoint
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
--> statement-breakpoint
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
--> statement-breakpoint
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
--> statement-breakpoint
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
--> statement-breakpoint
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
--> statement-breakpoint
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
--> statement-breakpoint
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
--> statement-breakpoint
CREATE TABLE "role_permissions" (
	"organization_id" uuid NOT NULL,
	"role_id" uuid NOT NULL,
	"permission_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "role_permissions_pk" PRIMARY KEY("organization_id","role_id","permission_id")
);
--> statement-breakpoint
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
--> statement-breakpoint
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
--> statement-breakpoint
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
--> statement-breakpoint
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
--> statement-breakpoint
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
--> statement-breakpoint
CREATE TABLE "migration_gate_events" (
	"id" uuid PRIMARY KEY NOT NULL,
	"required_version" integer NOT NULL,
	"actual_version" integer,
	"status" "task_status" NOT NULL,
	"checked_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "migration_gate_required_version_positive" CHECK ("migration_gate_events"."required_version" > 0)
);
--> statement-breakpoint
CREATE TABLE "indicate_schema_migrations" (
	"version" integer PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"checksum" text NOT NULL,
	"applied_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
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
--> statement-breakpoint
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
--> statement-breakpoint
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
--> statement-breakpoint
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
--> statement-breakpoint
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
--> statement-breakpoint
ALTER TABLE "article_sites" ADD CONSTRAINT "article_sites_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "article_sites" ADD CONSTRAINT "article_sites_article_fk" FOREIGN KEY ("organization_id","article_id") REFERENCES "public"."articles"("organization_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "article_sites" ADD CONSTRAINT "article_sites_site_fk" FOREIGN KEY ("organization_id","site_id") REFERENCES "public"."sites"("organization_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "articles" ADD CONSTRAINT "articles_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "articles" ADD CONSTRAINT "articles_region_fk" FOREIGN KEY ("organization_id","region_id") REFERENCES "public"."regions"("organization_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "articles" ADD CONSTRAINT "articles_publisher_fk" FOREIGN KEY ("organization_id","publisher_id") REFERENCES "public"."publishers"("organization_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "articles" ADD CONSTRAINT "articles_category_fk" FOREIGN KEY ("organization_id","category_id") REFERENCES "public"."categories"("organization_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "articles" ADD CONSTRAINT "articles_author_fk" FOREIGN KEY ("organization_id","author_id") REFERENCES "public"."authors"("organization_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "authors" ADD CONSTRAINT "authors_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "domain_activation_attempts" ADD CONSTRAINT "domain_activation_attempts_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "domain_activation_attempts" ADD CONSTRAINT "domain_activation_attempts_site_fk" FOREIGN KEY ("organization_id","site_id") REFERENCES "public"."sites"("organization_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invalidation_tasks" ADD CONSTRAINT "invalidation_tasks_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invalidation_tasks" ADD CONSTRAINT "invalidation_tasks_site_fk" FOREIGN KEY ("organization_id","site_id") REFERENCES "public"."sites"("organization_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media" ADD CONSTRAINT "media_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media" ADD CONSTRAINT "media_article_fk" FOREIGN KEY ("organization_id","article_id") REFERENCES "public"."articles"("organization_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media" ADD CONSTRAINT "media_site_fk" FOREIGN KEY ("organization_id","site_id") REFERENCES "public"."sites"("organization_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_key_reservations" ADD CONSTRAINT "media_key_reservations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_key_reservations" ADD CONSTRAINT "media_key_reservations_article_fk" FOREIGN KEY ("organization_id","article_id") REFERENCES "public"."articles"("organization_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_key_reservations" ADD CONSTRAINT "media_key_reservations_site_fk" FOREIGN KEY ("organization_id","site_id") REFERENCES "public"."sites"("organization_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "object_cleanup_tasks" ADD CONSTRAINT "object_cleanup_tasks_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "official_affiliations" ADD CONSTRAINT "official_affiliations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "official_affiliations" ADD CONSTRAINT "official_affiliations_publisher_fk" FOREIGN KEY ("organization_id","publisher_id") REFERENCES "public"."publishers"("organization_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "official_affiliations" ADD CONSTRAINT "official_affiliations_site_fk" FOREIGN KEY ("organization_id","site_id") REFERENCES "public"."sites"("organization_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publishers" ADD CONSTRAINT "publishers_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_site_fk" FOREIGN KEY ("organization_id","site_id") REFERENCES "public"."sites"("organization_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_logo_media_fk" FOREIGN KEY ("organization_id","logo_media_id") REFERENCES "public"."media"("organization_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_favicon_media_fk" FOREIGN KEY ("organization_id","favicon_media_id") REFERENCES "public"."media"("organization_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_fallback_media_fk" FOREIGN KEY ("organization_id","fallback_media_id") REFERENCES "public"."media"("organization_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_predecessor_fk" FOREIGN KEY ("organization_id","predecessor_id") REFERENCES "public"."api_keys"("organization_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "domains" ADD CONSTRAINT "domains_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_role_fk" FOREIGN KEY ("organization_id","role_id") REFERENCES "public"."roles"("organization_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "permissions" ADD CONSTRAINT "permissions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "regions" ADD CONSTRAINT "regions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_permissions_id_fk" FOREIGN KEY ("permission_id") REFERENCES "public"."permissions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_fk" FOREIGN KEY ("organization_id","role_id") REFERENCES "public"."roles"("organization_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roles" ADD CONSTRAINT "roles_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sites" ADD CONSTRAINT "sites_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sites" ADD CONSTRAINT "sites_domain_fk" FOREIGN KEY ("organization_id","domain_id") REFERENCES "public"."domains"("organization_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sites" ADD CONSTRAINT "sites_region_fk" FOREIGN KEY ("organization_id","region_id") REFERENCES "public"."regions"("organization_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "telegram_identity_mappings" ADD CONSTRAINT "telegram_identity_mappings_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "telegram_identity_mappings" ADD CONSTRAINT "telegram_identity_membership_fk" FOREIGN KEY ("organization_id","user_id") REFERENCES "public"."memberships"("organization_id","user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "telegram_identity_mappings" ADD CONSTRAINT "telegram_identity_role_fk" FOREIGN KEY ("organization_id","role_id") REFERENCES "public"."roles"("organization_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publication_transition_receipts" ADD CONSTRAINT "publication_transition_receipts_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publication_transition_receipts" ADD CONSTRAINT "publication_transition_receipts_job_fk" FOREIGN KEY ("organization_id","job_id") REFERENCES "public"."publishing_jobs"("organization_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publication_transition_receipts" ADD CONSTRAINT "publication_transition_receipts_target_fk" FOREIGN KEY ("organization_id","target_id") REFERENCES "public"."publishing_job_targets"("organization_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publishing_job_targets" ADD CONSTRAINT "publishing_job_targets_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publishing_job_targets" ADD CONSTRAINT "publishing_job_targets_job_fk" FOREIGN KEY ("organization_id","job_id") REFERENCES "public"."publishing_jobs"("organization_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publishing_job_targets" ADD CONSTRAINT "publishing_job_targets_article_site_fk" FOREIGN KEY ("organization_id","article_site_id") REFERENCES "public"."article_sites"("organization_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publishing_jobs" ADD CONSTRAINT "publishing_jobs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publishing_jobs" ADD CONSTRAINT "publishing_jobs_article_fk" FOREIGN KEY ("organization_id","article_id") REFERENCES "public"."articles"("organization_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seed_runs" ADD CONSTRAINT "seed_runs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_replay_claims" ADD CONSTRAINT "webhook_replay_claims_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "article_sites_site_state_date_idx" ON "article_sites" USING btree ("organization_id","site_id","state","published_at");--> statement-breakpoint
CREATE INDEX "articles_organization_status_date_idx" ON "articles" USING btree ("organization_id","status","published_at");--> statement-breakpoint
CREATE INDEX "articles_organization_region_idx" ON "articles" USING btree ("organization_id","region_id");--> statement-breakpoint
CREATE INDEX "articles_organization_category_idx" ON "articles" USING btree ("organization_id","category_id");--> statement-breakpoint
CREATE INDEX "audit_logs_organization_date_idx" ON "audit_logs" USING btree ("organization_id","occurred_at");--> statement-breakpoint
CREATE INDEX "audit_logs_organization_action_target_idx" ON "audit_logs" USING btree ("organization_id","action","target_type");--> statement-breakpoint
CREATE INDEX "audit_logs_organization_actor_outcome_idx" ON "audit_logs" USING btree ("organization_id","actor_id","outcome");--> statement-breakpoint
CREATE INDEX "authors_organization_status_name_idx" ON "authors" USING btree ("organization_id","status","display_name");--> statement-breakpoint
CREATE INDEX "categories_organization_status_idx" ON "categories" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "domain_activation_attempts_due_idx" ON "domain_activation_attempts" USING btree ("status","next_attempt_at");--> statement-breakpoint
CREATE INDEX "invalidation_tasks_due_idx" ON "invalidation_tasks" USING btree ("status","next_attempt_at");--> statement-breakpoint
CREATE INDEX "media_organization_state_idx" ON "media" USING btree ("organization_id","state");--> statement-breakpoint
CREATE INDEX "media_key_reservations_expiry_status_idx" ON "media_key_reservations" USING btree ("status","expires_at");--> statement-breakpoint
CREATE INDEX "object_cleanup_tasks_due_idx" ON "object_cleanup_tasks" USING btree ("status","next_attempt_at");--> statement-breakpoint
CREATE INDEX "official_affiliations_active_idx" ON "official_affiliations" USING btree ("organization_id","publisher_id","site_id","active");--> statement-breakpoint
CREATE INDEX "publishers_organization_status_type_idx" ON "publishers" USING btree ("organization_id","status","type");--> statement-breakpoint
CREATE INDEX "api_keys_organization_status_idx" ON "api_keys" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "domains_organization_status_idx" ON "domains" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "memberships_user_status_idx" ON "memberships" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "memberships_organization_role_idx" ON "memberships" USING btree ("organization_id","role_id","status");--> statement-breakpoint
CREATE INDEX "organizations_status_idx" ON "organizations" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "permissions_platform_name_unique" ON "permissions" USING btree ("name") WHERE "permissions"."scope" = 'platform';--> statement-breakpoint
CREATE UNIQUE INDEX "permissions_organization_name_unique" ON "permissions" USING btree ("organization_id","name") WHERE "permissions"."scope" = 'organization';--> statement-breakpoint
CREATE INDEX "regions_organization_status_idx" ON "regions" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "roles_organization_active_idx" ON "roles" USING btree ("organization_id","active");--> statement-breakpoint
CREATE INDEX "sites_exact_active_hostname_idx" ON "sites" USING btree ("normalized_hostname","status","activation_state");--> statement-breakpoint
CREATE INDEX "sites_organization_domain_idx" ON "sites" USING btree ("organization_id","domain_id");--> statement-breakpoint
CREATE INDEX "telegram_identity_status_idx" ON "telegram_identity_mappings" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "users_status_idx" ON "users" USING btree ("status");--> statement-breakpoint
CREATE INDEX "publication_transition_receipts_unacknowledged_idx" ON "publication_transition_receipts" USING btree ("acknowledged_at");--> statement-breakpoint
CREATE UNIQUE INDEX "publishing_job_targets_active_article_site_unique" ON "publishing_job_targets" USING btree ("organization_id","article_site_id") WHERE "publishing_job_targets"."state" IN ('queued', 'processing', 'retrying');--> statement-breakpoint
CREATE INDEX "publishing_job_targets_job_state_idx" ON "publishing_job_targets" USING btree ("organization_id","job_id","state");--> statement-breakpoint
CREATE INDEX "publishing_job_targets_retry_due_idx" ON "publishing_job_targets" USING btree ("state","next_attempt_at");--> statement-breakpoint
CREATE INDEX "publishing_jobs_dispatch_due_idx" ON "publishing_jobs" USING btree ("dispatch_status","next_dispatch_at");--> statement-breakpoint
CREATE INDEX "publishing_jobs_state_lease_idx" ON "publishing_jobs" USING btree ("state","lease_expires_at");--> statement-breakpoint
CREATE INDEX "publishing_jobs_organization_date_idx" ON "publishing_jobs" USING btree ("organization_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "seed_runs_successful_fingerprint_unique" ON "seed_runs" USING btree ("organization_id","config_fingerprint") WHERE "seed_runs"."status" = 'completed';--> statement-breakpoint
CREATE INDEX "webhook_replay_claims_expiry_idx" ON "webhook_replay_claims" USING btree ("expires_at");