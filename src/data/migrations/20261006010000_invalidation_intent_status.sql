-- Enum status intent invalidasi runtime-config: daur pending → claimed →
-- completed/failed, diverifikasi dari fungsi claim/complete/fail.
--
-- Body digest (reproducible): LF-normalize this file, substitute the 64-hex
-- checksum literal below with 64 zeros, SHA-256 the complete UTF-8 bytes.
DO $invalidation_intent_status$
BEGIN
  BEGIN
    EXECUTE 'CREATE TYPE public.invalidation_intent_status AS ENUM (''pending'', ''claimed'', ''completed'', ''failed'')';
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END
$invalidation_intent_status$;--> statement-breakpoint
ALTER TABLE public.runtime_config_invalidation_intents ALTER COLUMN status DROP DEFAULT;--> statement-breakpoint
ALTER TABLE public.runtime_config_invalidation_intents ALTER COLUMN status TYPE public.invalidation_intent_status USING status::public.invalidation_intent_status;--> statement-breakpoint
ALTER TABLE public.runtime_config_invalidation_intents ALTER COLUMN status SET DEFAULT 'pending';--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (266, 'invalidation_intent_status', 'sha256:d3d5b85d5fb908ea9e9b15dab6680e72df374cb3b5edeb9c913af3a6d6070a97');
