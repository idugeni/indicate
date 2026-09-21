-- Pin internal configuration tables to the runtime role with default-deny for
-- every other role. These tables hold deployment-wide policy (rate limits,
-- media/publication/webhook/cache policy, release manifests), not tenant rows,
-- so a tenant USING predicate does not apply. A literal USING (false) policy
-- is intentionally NOT used: the dashboard admin reads these tables directly
-- as indicate_runtime (see Drizzle runtime-config admin), so denying the
-- runtime role would break boot and admin reads. Instead FORCE ROW LEVEL
-- SECURITY plus a sole-accessor policy means indicate_runtime keeps working
-- while any other role — present or granted in the future — is denied by
-- default (no policy row matches), and PUBLIC holds no privileges at all.
ALTER TABLE public.rate_limit_policies ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE public.rate_limit_policies FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY runtime_accessor ON public.rate_limit_policies FOR ALL TO indicate_runtime USING (true) WITH CHECK (true);--> statement-breakpoint
REVOKE ALL ON public.rate_limit_policies FROM PUBLIC;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rate_limit_policies TO indicate_runtime;--> statement-breakpoint
ALTER TABLE public.shared_deployment_config ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE public.shared_deployment_config FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY runtime_accessor ON public.shared_deployment_config FOR ALL TO indicate_runtime USING (true) WITH CHECK (true);--> statement-breakpoint
REVOKE ALL ON public.shared_deployment_config FROM PUBLIC;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shared_deployment_config TO indicate_runtime;--> statement-breakpoint
ALTER TABLE public.media_policy ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE public.media_policy FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY runtime_accessor ON public.media_policy FOR ALL TO indicate_runtime USING (true) WITH CHECK (true);--> statement-breakpoint
REVOKE ALL ON public.media_policy FROM PUBLIC;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON public.media_policy TO indicate_runtime;--> statement-breakpoint
ALTER TABLE public.publication_policy ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE public.publication_policy FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY runtime_accessor ON public.publication_policy FOR ALL TO indicate_runtime USING (true) WITH CHECK (true);--> statement-breakpoint
REVOKE ALL ON public.publication_policy FROM PUBLIC;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON public.publication_policy TO indicate_runtime;--> statement-breakpoint
ALTER TABLE public.webhook_policy ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE public.webhook_policy FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY runtime_accessor ON public.webhook_policy FOR ALL TO indicate_runtime USING (true) WITH CHECK (true);--> statement-breakpoint
REVOKE ALL ON public.webhook_policy FROM PUBLIC;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON public.webhook_policy TO indicate_runtime;--> statement-breakpoint
ALTER TABLE public.cache_policy ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE public.cache_policy FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY runtime_accessor ON public.cache_policy FOR ALL TO indicate_runtime USING (true) WITH CHECK (true);--> statement-breakpoint
REVOKE ALL ON public.cache_policy FROM PUBLIC;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cache_policy TO indicate_runtime;--> statement-breakpoint
ALTER TABLE public.runtime_config_revisions ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE public.runtime_config_revisions FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY runtime_accessor ON public.runtime_config_revisions FOR ALL TO indicate_runtime USING (true) WITH CHECK (true);--> statement-breakpoint
REVOKE ALL ON public.runtime_config_revisions FROM PUBLIC;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON public.runtime_config_revisions TO indicate_runtime;--> statement-breakpoint
ALTER TABLE public.runtime_config_release_manifests ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE public.runtime_config_release_manifests FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY runtime_accessor ON public.runtime_config_release_manifests FOR ALL TO indicate_runtime USING (true) WITH CHECK (true);--> statement-breakpoint
REVOKE ALL ON public.runtime_config_release_manifests FROM PUBLIC;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON public.runtime_config_release_manifests TO indicate_runtime;--> statement-breakpoint
ALTER TABLE public.runtime_config_release_domain_zones ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE public.runtime_config_release_domain_zones FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY runtime_accessor ON public.runtime_config_release_domain_zones FOR ALL TO indicate_runtime USING (true) WITH CHECK (true);--> statement-breakpoint
REVOKE ALL ON public.runtime_config_release_domain_zones FROM PUBLIC;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON public.runtime_config_release_domain_zones TO indicate_runtime;--> statement-breakpoint
ALTER TABLE public.runtime_config_backfill_runs ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE public.runtime_config_backfill_runs FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY runtime_accessor ON public.runtime_config_backfill_runs FOR ALL TO indicate_runtime USING (true) WITH CHECK (true);--> statement-breakpoint
REVOKE ALL ON public.runtime_config_backfill_runs FROM PUBLIC;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON public.runtime_config_backfill_runs TO indicate_runtime;--> statement-breakpoint
ALTER TABLE public.runtime_config_parity_evidence ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE public.runtime_config_parity_evidence FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY runtime_accessor ON public.runtime_config_parity_evidence FOR ALL TO indicate_runtime USING (true) WITH CHECK (true);--> statement-breakpoint
REVOKE ALL ON public.runtime_config_parity_evidence FROM PUBLIC;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON public.runtime_config_parity_evidence TO indicate_runtime;--> statement-breakpoint
