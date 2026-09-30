-- Status page tables: probe results, daily rollups, auto incidents.
--
-- Global singleton telemetry (no organization column); reads and writes run
-- server-side only. Least-privilege scope mirrors the AI control-plane
-- convention: full access for the runtime role, nothing for anon or
-- authenticated, row isolation unnecessary without tenant rows.
CREATE TABLE public.status_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  component text NOT NULL,
  health text NOT NULL,
  latency_ms integer,
  detail text,
  checked_at timestamptz DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE INDEX status_checks_component_checked_idx ON public.status_checks (component, checked_at);--> statement-breakpoint
CREATE TABLE public.status_daily (
  component text NOT NULL,
  day text NOT NULL,
  uptime_pct real NOT NULL,
  checks integer DEFAULT 0 NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT status_daily_pk PRIMARY KEY (component, day)
);--> statement-breakpoint
CREATE TABLE public.status_incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  component text,
  title text NOT NULL,
  detail text,
  status text DEFAULT 'open' NOT NULL,
  started_at timestamptz DEFAULT now() NOT NULL,
  resolved_at timestamptz,
  updates jsonb DEFAULT '[]'::jsonb NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE INDEX status_incidents_status_started_idx ON public.status_incidents (status, started_at);--> statement-breakpoint
ALTER TABLE public.status_checks ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE public.status_daily ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE public.status_incidents ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON public.status_checks TO indicate_runtime;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON public.status_daily TO indicate_runtime;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON public.status_incidents TO indicate_runtime;--> statement-breakpoint
CREATE POLICY runtime_accessor ON public.status_checks FOR ALL TO indicate_runtime USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY runtime_accessor ON public.status_daily FOR ALL TO indicate_runtime USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY runtime_accessor ON public.status_incidents FOR ALL TO indicate_runtime USING (true) WITH CHECK (true);--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (236, 'status_tables', 'sha256:98a588a39f8645c8e75d4b21ead0db9c4dfb5ec8b8e8fb81bb63fadae8948370');
