-- Policy singleton key alignment: the four policy tables and their mutation
-- functions were created with an `id` column, while schema.ts (and therefore
-- every Drizzle-ORM query path) addresses `singleton_key`. Rename the columns
-- so the ORM and the stored functions agree. The retired `*_id_singleton`
-- checks were already removed by 20260903022500; nothing else references the
-- old name. Also adds the two parity-evidence timestamps and the publisher
-- verification timestamp that schema.ts declares but the live schema lacks.
-- Every touched table was verified empty: metadata-only, no row risk.

ALTER TABLE "cache_policy" RENAME COLUMN "id" TO "singleton_key";--> statement-breakpoint
ALTER TABLE "media_policy" RENAME COLUMN "id" TO "singleton_key";--> statement-breakpoint
ALTER TABLE "publication_policy" RENAME COLUMN "id" TO "singleton_key";--> statement-breakpoint
ALTER TABLE "webhook_policy" RENAME COLUMN "id" TO "singleton_key";--> statement-breakpoint
ALTER TABLE "runtime_config_parity_evidence" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "runtime_config_parity_evidence" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "publishers" ADD COLUMN "verified_at" timestamp with time zone;

INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (32, 'policy_singleton_key', 'policy-singleton-key-v1');
