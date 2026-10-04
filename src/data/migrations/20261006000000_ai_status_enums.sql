-- Enum status tertutup: ganti text+CHECK dengan pgEnum agar nilai
-- liar ditolak di level tipe, bukan validasi aplikasi.
--
-- Kolom yang dikonversi hanya berisi nilai di dalam enum baru
-- (diverifikasi dari data live sebelum migrasi ini ditulis):
-- chain_strategy, cost_mode, request_logs.status, insights.status,
-- incidents.status, checks.health, erasure.status (pakai ulang
-- task_status), organizations.kind, article_sites.assignment_source.
-- Check redundant domain_activation_attempts_operation_check dihapus
-- (kolomnya sudah activation_operation sejak awal).
--
-- Body digest (reproducible): LF-normalize this file, substitute the 64-hex
-- checksum literal below with 64 zeros, SHA-256 the complete UTF-8 bytes.
DO $ai_status_enums$
BEGIN
  BEGIN
    EXECUTE 'CREATE TYPE public.ai_chain_strategy AS ENUM (''fallback'', ''round_robin'')';
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    EXECUTE 'CREATE TYPE public.ai_cost_mode AS ENUM (''throughput'', ''price'')';
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    EXECUTE 'CREATE TYPE public.ai_request_status AS ENUM (''success'', ''failed'', ''blocked'')';
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    EXECUTE 'CREATE TYPE public.ai_insight_status AS ENUM (''open'', ''resolved'')';
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    EXECUTE 'CREATE TYPE public.incident_status AS ENUM (''open'', ''resolved'')';
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    EXECUTE 'CREATE TYPE public.probe_health AS ENUM (''ok'', ''degraded'', ''down'')';
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    EXECUTE 'CREATE TYPE public.organization_kind AS ENUM (''operator'', ''customer'')';
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    EXECUTE 'CREATE TYPE public.article_assignment_source AS ENUM (''manual'', ''auto'')';
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END
$ai_status_enums$;--> statement-breakpoint
ALTER TABLE public.ai_routing_policies DROP CONSTRAINT IF EXISTS ai_routing_policies_chain_known;--> statement-breakpoint
ALTER TABLE public.ai_routing_policies DROP CONSTRAINT IF EXISTS ai_routing_policies_cost_known;--> statement-breakpoint
ALTER TABLE public.ai_request_logs DROP CONSTRAINT IF EXISTS ai_request_logs_status_known;--> statement-breakpoint
ALTER TABLE public.organizations DROP CONSTRAINT IF EXISTS organizations_kind_check;--> statement-breakpoint
ALTER TABLE public.article_sites DROP CONSTRAINT IF EXISTS article_sites_assignment_source_values;--> statement-breakpoint
ALTER TABLE public.article_sites DROP CONSTRAINT IF EXISTS article_sites_expanded_from_consistent;--> statement-breakpoint
ALTER TABLE public.domain_activation_attempts DROP CONSTRAINT IF EXISTS domain_activation_attempts_operation_check;--> statement-breakpoint
ALTER TABLE public.ai_routing_policies ALTER COLUMN chain_strategy DROP DEFAULT;--> statement-breakpoint
ALTER TABLE public.ai_routing_policies ALTER COLUMN chain_strategy TYPE public.ai_chain_strategy USING chain_strategy::public.ai_chain_strategy;--> statement-breakpoint
ALTER TABLE public.ai_routing_policies ALTER COLUMN chain_strategy SET DEFAULT 'fallback';--> statement-breakpoint
ALTER TABLE public.ai_routing_policies ALTER COLUMN cost_mode DROP DEFAULT;--> statement-breakpoint
ALTER TABLE public.ai_routing_policies ALTER COLUMN cost_mode TYPE public.ai_cost_mode USING cost_mode::public.ai_cost_mode;--> statement-breakpoint
ALTER TABLE public.ai_routing_policies ALTER COLUMN cost_mode SET DEFAULT 'throughput';--> statement-breakpoint
ALTER TABLE public.ai_request_logs ALTER COLUMN status TYPE public.ai_request_status USING status::public.ai_request_status;--> statement-breakpoint
ALTER TABLE public.ai_query_insights ALTER COLUMN status DROP DEFAULT;--> statement-breakpoint
ALTER TABLE public.ai_query_insights ALTER COLUMN status TYPE public.ai_insight_status USING status::public.ai_insight_status;--> statement-breakpoint
ALTER TABLE public.ai_query_insights ALTER COLUMN status SET DEFAULT 'open';--> statement-breakpoint
ALTER TABLE public.status_incidents ALTER COLUMN status DROP DEFAULT;--> statement-breakpoint
ALTER TABLE public.status_incidents ALTER COLUMN status TYPE public.incident_status USING status::public.incident_status;--> statement-breakpoint
ALTER TABLE public.status_incidents ALTER COLUMN status SET DEFAULT 'open';--> statement-breakpoint
ALTER TABLE public.status_checks ALTER COLUMN health TYPE public.probe_health USING health::public.probe_health;--> statement-breakpoint
ALTER TABLE public.org_erasure_requests DROP CONSTRAINT IF EXISTS org_erasure_requests_status_check;--> statement-breakpoint
ALTER TABLE public.org_erasure_requests ALTER COLUMN status DROP DEFAULT;--> statement-breakpoint
ALTER TABLE public.org_erasure_requests ALTER COLUMN status TYPE public.task_status USING status::public.task_status;--> statement-breakpoint
ALTER TABLE public.org_erasure_requests ALTER COLUMN status SET DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE public.organizations ALTER COLUMN kind DROP DEFAULT;--> statement-breakpoint
ALTER TABLE public.organizations ALTER COLUMN kind TYPE public.organization_kind USING kind::public.organization_kind;--> statement-breakpoint
ALTER TABLE public.organizations ALTER COLUMN kind SET DEFAULT 'customer';--> statement-breakpoint
ALTER TABLE public.article_sites ALTER COLUMN assignment_source DROP DEFAULT;--> statement-breakpoint
ALTER TABLE public.article_sites ALTER COLUMN assignment_source TYPE public.article_assignment_source USING assignment_source::public.article_assignment_source;--> statement-breakpoint
ALTER TABLE public.article_sites ALTER COLUMN assignment_source SET DEFAULT 'manual';--> statement-breakpoint
DO $expanded_consistent$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'article_sites_expanded_from_consistent') THEN
    ALTER TABLE public.article_sites
      ADD CONSTRAINT article_sites_expanded_from_consistent CHECK ((assignment_source = 'auto') = (expanded_from_site_id IS NOT NULL));
  END IF;
END
$expanded_consistent$;--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (265, 'ai_status_enums', 'sha256:21c81ea70da04386fb7c59f9f86ade6c54017ef07a16a5dc3813eef862cdafdf');
