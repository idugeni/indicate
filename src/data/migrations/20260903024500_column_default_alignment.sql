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

ALTER TABLE "publication_transition_receipts" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "publication_transition_receipts" ALTER COLUMN "updated_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "seed_runs" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "seed_runs" ALTER COLUMN "updated_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "webhook_replay_claims" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "webhook_replay_claims" ALTER COLUMN "updated_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "api_keys" ALTER COLUMN "name" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "webhook_replay_claims" ALTER COLUMN "body_digest" DROP DEFAULT;

INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (35, 'column_default_alignment', 'column-default-alignment-v1');
