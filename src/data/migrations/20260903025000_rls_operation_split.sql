-- RLS operation split: replace every broad FOR ALL tenant policy with
-- per-command SELECT/INSERT/UPDATE/DELETE policies carrying the identical
-- predicate, retargeted from PUBLIC to indicate_runtime, with session-context
-- reads wrapped as scalar subqueries so the planner can cache them per
-- statement. Deny-all and metadata-read policies are retargeted unchanged.
-- Behavior-neutral by construction: no predicate logic changes in this file.

DROP POLICY IF EXISTS tenant_isolation ON public.api_keys;--> statement-breakpoint
CREATE POLICY tenant_isolation_select ON public.api_keys FOR SELECT TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()));--> statement-breakpoint
CREATE POLICY tenant_isolation_insert ON public.api_keys FOR INSERT TO indicate_runtime WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()));--> statement-breakpoint
CREATE POLICY tenant_isolation_update ON public.api_keys FOR UPDATE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id())) WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()));--> statement-breakpoint
CREATE POLICY tenant_isolation_delete ON public.api_keys FOR DELETE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()));--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON public.article_sites;--> statement-breakpoint
CREATE POLICY tenant_isolation_select ON public.article_sites FOR SELECT TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()));--> statement-breakpoint
CREATE POLICY tenant_isolation_insert ON public.article_sites FOR INSERT TO indicate_runtime WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()));--> statement-breakpoint
CREATE POLICY tenant_isolation_update ON public.article_sites FOR UPDATE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id())) WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()));--> statement-breakpoint
CREATE POLICY tenant_isolation_delete ON public.article_sites FOR DELETE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()));--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON public.articles;--> statement-breakpoint
CREATE POLICY tenant_isolation_select ON public.articles FOR SELECT TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()));--> statement-breakpoint
CREATE POLICY tenant_isolation_insert ON public.articles FOR INSERT TO indicate_runtime WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()));--> statement-breakpoint
CREATE POLICY tenant_isolation_update ON public.articles FOR UPDATE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id())) WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()));--> statement-breakpoint
CREATE POLICY tenant_isolation_delete ON public.articles FOR DELETE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()));--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON public.audit_logs;--> statement-breakpoint
CREATE POLICY tenant_isolation_select ON public.audit_logs FOR SELECT TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()));--> statement-breakpoint
CREATE POLICY tenant_isolation_insert ON public.audit_logs FOR INSERT TO indicate_runtime WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()));--> statement-breakpoint
CREATE POLICY tenant_isolation_update ON public.audit_logs FOR UPDATE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id())) WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()));--> statement-breakpoint
CREATE POLICY tenant_isolation_delete ON public.audit_logs FOR DELETE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()));--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON public.authors;--> statement-breakpoint
CREATE POLICY tenant_isolation_select ON public.authors FOR SELECT TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()));--> statement-breakpoint
CREATE POLICY tenant_isolation_insert ON public.authors FOR INSERT TO indicate_runtime WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()));--> statement-breakpoint
CREATE POLICY tenant_isolation_update ON public.authors FOR UPDATE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id())) WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()));--> statement-breakpoint
CREATE POLICY tenant_isolation_delete ON public.authors FOR DELETE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()));--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON public.cache_bypasses;--> statement-breakpoint
CREATE POLICY tenant_isolation_select ON public.cache_bypasses FOR SELECT TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()));--> statement-breakpoint
CREATE POLICY tenant_isolation_insert ON public.cache_bypasses FOR INSERT TO indicate_runtime WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()));--> statement-breakpoint
CREATE POLICY tenant_isolation_update ON public.cache_bypasses FOR UPDATE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id())) WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()));--> statement-breakpoint
CREATE POLICY tenant_isolation_delete ON public.cache_bypasses FOR DELETE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()));--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON public.categories;--> statement-breakpoint
CREATE POLICY tenant_isolation_select ON public.categories FOR SELECT TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()));--> statement-breakpoint
CREATE POLICY tenant_isolation_insert ON public.categories FOR INSERT TO indicate_runtime WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()));--> statement-breakpoint
CREATE POLICY tenant_isolation_update ON public.categories FOR UPDATE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id())) WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()));--> statement-breakpoint
CREATE POLICY tenant_isolation_delete ON public.categories FOR DELETE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()));--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON public.domain_activation_attempts;--> statement-breakpoint
CREATE POLICY tenant_isolation_select ON public.domain_activation_attempts FOR SELECT TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()));--> statement-breakpoint
CREATE POLICY tenant_isolation_insert ON public.domain_activation_attempts FOR INSERT TO indicate_runtime WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()));--> statement-breakpoint
CREATE POLICY tenant_isolation_update ON public.domain_activation_attempts FOR UPDATE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id())) WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()));--> statement-breakpoint
CREATE POLICY tenant_isolation_delete ON public.domain_activation_attempts FOR DELETE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()));--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON public.domains;--> statement-breakpoint
CREATE POLICY tenant_isolation_select ON public.domains FOR SELECT TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()));--> statement-breakpoint
CREATE POLICY tenant_isolation_insert ON public.domains FOR INSERT TO indicate_runtime WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()));--> statement-breakpoint
CREATE POLICY tenant_isolation_update ON public.domains FOR UPDATE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id())) WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()));--> statement-breakpoint
CREATE POLICY tenant_isolation_delete ON public.domains FOR DELETE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()));--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON public.invalidation_tasks;--> statement-breakpoint
CREATE POLICY tenant_isolation_select ON public.invalidation_tasks FOR SELECT TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()));--> statement-breakpoint
CREATE POLICY tenant_isolation_insert ON public.invalidation_tasks FOR INSERT TO indicate_runtime WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()));--> statement-breakpoint
CREATE POLICY tenant_isolation_update ON public.invalidation_tasks FOR UPDATE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id())) WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()));--> statement-breakpoint
CREATE POLICY tenant_isolation_delete ON public.invalidation_tasks FOR DELETE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()));--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON public.media;--> statement-breakpoint
CREATE POLICY tenant_isolation_select ON public.media FOR SELECT TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()));--> statement-breakpoint
CREATE POLICY tenant_isolation_insert ON public.media FOR INSERT TO indicate_runtime WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()));--> statement-breakpoint
CREATE POLICY tenant_isolation_update ON public.media FOR UPDATE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id())) WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()));--> statement-breakpoint
CREATE POLICY tenant_isolation_delete ON public.media FOR DELETE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()));--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON public.media_key_reservations;--> statement-breakpoint
CREATE POLICY tenant_isolation_select ON public.media_key_reservations FOR SELECT TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()));--> statement-breakpoint
CREATE POLICY tenant_isolation_insert ON public.media_key_reservations FOR INSERT TO indicate_runtime WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()));--> statement-breakpoint
CREATE POLICY tenant_isolation_update ON public.media_key_reservations FOR UPDATE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id())) WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()));--> statement-breakpoint
CREATE POLICY tenant_isolation_delete ON public.media_key_reservations FOR DELETE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()));--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON public.memberships;--> statement-breakpoint
CREATE POLICY tenant_isolation_select ON public.memberships FOR SELECT TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()));--> statement-breakpoint
CREATE POLICY tenant_isolation_insert ON public.memberships FOR INSERT TO indicate_runtime WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()));--> statement-breakpoint
CREATE POLICY tenant_isolation_update ON public.memberships FOR UPDATE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id())) WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()));--> statement-breakpoint
CREATE POLICY tenant_isolation_delete ON public.memberships FOR DELETE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()));--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON public.object_cleanup_tasks;--> statement-breakpoint
CREATE POLICY tenant_isolation_select ON public.object_cleanup_tasks FOR SELECT TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()));--> statement-breakpoint
CREATE POLICY tenant_isolation_insert ON public.object_cleanup_tasks FOR INSERT TO indicate_runtime WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()));--> statement-breakpoint
CREATE POLICY tenant_isolation_update ON public.object_cleanup_tasks FOR UPDATE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id())) WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()));--> statement-breakpoint
CREATE POLICY tenant_isolation_delete ON public.object_cleanup_tasks FOR DELETE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()));--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON public.official_affiliations;--> statement-breakpoint
CREATE POLICY tenant_isolation_select ON public.official_affiliations FOR SELECT TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()));--> statement-breakpoint
CREATE POLICY tenant_isolation_insert ON public.official_affiliations FOR INSERT TO indicate_runtime WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()));--> statement-breakpoint
CREATE POLICY tenant_isolation_update ON public.official_affiliations FOR UPDATE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id())) WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()));--> statement-breakpoint
CREATE POLICY tenant_isolation_delete ON public.official_affiliations FOR DELETE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()));--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON public.publishers;--> statement-breakpoint
CREATE POLICY tenant_isolation_select ON public.publishers FOR SELECT TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()));--> statement-breakpoint
CREATE POLICY tenant_isolation_insert ON public.publishers FOR INSERT TO indicate_runtime WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()));--> statement-breakpoint
CREATE POLICY tenant_isolation_update ON public.publishers FOR UPDATE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id())) WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()));--> statement-breakpoint
CREATE POLICY tenant_isolation_delete ON public.publishers FOR DELETE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()));--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON public.publishing_job_targets;--> statement-breakpoint
CREATE POLICY tenant_isolation_select ON public.publishing_job_targets FOR SELECT TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()));--> statement-breakpoint
CREATE POLICY tenant_isolation_insert ON public.publishing_job_targets FOR INSERT TO indicate_runtime WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()));--> statement-breakpoint
CREATE POLICY tenant_isolation_update ON public.publishing_job_targets FOR UPDATE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id())) WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()));--> statement-breakpoint
CREATE POLICY tenant_isolation_delete ON public.publishing_job_targets FOR DELETE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()));--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON public.publishing_jobs;--> statement-breakpoint
CREATE POLICY tenant_isolation_select ON public.publishing_jobs FOR SELECT TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()));--> statement-breakpoint
CREATE POLICY tenant_isolation_insert ON public.publishing_jobs FOR INSERT TO indicate_runtime WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()));--> statement-breakpoint
CREATE POLICY tenant_isolation_update ON public.publishing_jobs FOR UPDATE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id())) WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()));--> statement-breakpoint
CREATE POLICY tenant_isolation_delete ON public.publishing_jobs FOR DELETE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()));--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON public.regions;--> statement-breakpoint
CREATE POLICY tenant_isolation_select ON public.regions FOR SELECT TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()));--> statement-breakpoint
CREATE POLICY tenant_isolation_insert ON public.regions FOR INSERT TO indicate_runtime WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()));--> statement-breakpoint
CREATE POLICY tenant_isolation_update ON public.regions FOR UPDATE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id())) WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()));--> statement-breakpoint
CREATE POLICY tenant_isolation_delete ON public.regions FOR DELETE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()));--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON public.role_permissions;--> statement-breakpoint
CREATE POLICY tenant_isolation_select ON public.role_permissions FOR SELECT TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()));--> statement-breakpoint
CREATE POLICY tenant_isolation_insert ON public.role_permissions FOR INSERT TO indicate_runtime WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()));--> statement-breakpoint
CREATE POLICY tenant_isolation_update ON public.role_permissions FOR UPDATE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id())) WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()));--> statement-breakpoint
CREATE POLICY tenant_isolation_delete ON public.role_permissions FOR DELETE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()));--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON public.roles;--> statement-breakpoint
CREATE POLICY tenant_isolation_select ON public.roles FOR SELECT TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()));--> statement-breakpoint
CREATE POLICY tenant_isolation_insert ON public.roles FOR INSERT TO indicate_runtime WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()));--> statement-breakpoint
CREATE POLICY tenant_isolation_update ON public.roles FOR UPDATE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id())) WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()));--> statement-breakpoint
CREATE POLICY tenant_isolation_delete ON public.roles FOR DELETE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()));--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON public.seed_runs;--> statement-breakpoint
CREATE POLICY tenant_isolation_select ON public.seed_runs FOR SELECT TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()));--> statement-breakpoint
CREATE POLICY tenant_isolation_insert ON public.seed_runs FOR INSERT TO indicate_runtime WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()));--> statement-breakpoint
CREATE POLICY tenant_isolation_update ON public.seed_runs FOR UPDATE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id())) WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()));--> statement-breakpoint
CREATE POLICY tenant_isolation_delete ON public.seed_runs FOR DELETE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()));--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON public.site_settings;--> statement-breakpoint
CREATE POLICY tenant_isolation_select ON public.site_settings FOR SELECT TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()));--> statement-breakpoint
CREATE POLICY tenant_isolation_insert ON public.site_settings FOR INSERT TO indicate_runtime WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()));--> statement-breakpoint
CREATE POLICY tenant_isolation_update ON public.site_settings FOR UPDATE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id())) WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()));--> statement-breakpoint
CREATE POLICY tenant_isolation_delete ON public.site_settings FOR DELETE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()));--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON public.sites;--> statement-breakpoint
CREATE POLICY tenant_isolation_select ON public.sites FOR SELECT TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()));--> statement-breakpoint
CREATE POLICY tenant_isolation_insert ON public.sites FOR INSERT TO indicate_runtime WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()));--> statement-breakpoint
CREATE POLICY tenant_isolation_update ON public.sites FOR UPDATE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id())) WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()));--> statement-breakpoint
CREATE POLICY tenant_isolation_delete ON public.sites FOR DELETE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()));--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON public.subscriptions;--> statement-breakpoint
CREATE POLICY tenant_isolation_select ON public.subscriptions FOR SELECT TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()));--> statement-breakpoint
CREATE POLICY tenant_isolation_insert ON public.subscriptions FOR INSERT TO indicate_runtime WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()));--> statement-breakpoint
CREATE POLICY tenant_isolation_update ON public.subscriptions FOR UPDATE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id())) WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()));--> statement-breakpoint
CREATE POLICY tenant_isolation_delete ON public.subscriptions FOR DELETE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()));--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON public.telegram_conversations;--> statement-breakpoint
CREATE POLICY tenant_isolation_select ON public.telegram_conversations FOR SELECT TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()));--> statement-breakpoint
CREATE POLICY tenant_isolation_insert ON public.telegram_conversations FOR INSERT TO indicate_runtime WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()));--> statement-breakpoint
CREATE POLICY tenant_isolation_update ON public.telegram_conversations FOR UPDATE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id())) WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()));--> statement-breakpoint
CREATE POLICY tenant_isolation_delete ON public.telegram_conversations FOR DELETE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()));--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON public.telegram_identity_mappings;--> statement-breakpoint
CREATE POLICY tenant_isolation_select ON public.telegram_identity_mappings FOR SELECT TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()));--> statement-breakpoint
CREATE POLICY tenant_isolation_insert ON public.telegram_identity_mappings FOR INSERT TO indicate_runtime WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()));--> statement-breakpoint
CREATE POLICY tenant_isolation_update ON public.telegram_identity_mappings FOR UPDATE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id())) WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()));--> statement-breakpoint
CREATE POLICY tenant_isolation_delete ON public.telegram_identity_mappings FOR DELETE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()));--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON public.publication_transition_receipts;--> statement-breakpoint
CREATE POLICY tenant_isolation_select ON public.publication_transition_receipts FOR SELECT TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()));--> statement-breakpoint
CREATE POLICY tenant_isolation_insert ON public.publication_transition_receipts FOR INSERT TO indicate_runtime WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()));--> statement-breakpoint
CREATE POLICY tenant_isolation_update ON public.publication_transition_receipts FOR UPDATE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id())) WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()));--> statement-breakpoint
CREATE POLICY tenant_isolation_delete ON public.publication_transition_receipts FOR DELETE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()));--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON public.organizations;--> statement-breakpoint
CREATE POLICY organization_isolation_select ON public.organizations FOR SELECT TO indicate_runtime USING (id = (SELECT indicate_private.current_organization_id()));--> statement-breakpoint
CREATE POLICY organization_isolation_insert ON public.organizations FOR INSERT TO indicate_runtime WITH CHECK (id = (SELECT indicate_private.current_organization_id()));--> statement-breakpoint
CREATE POLICY organization_isolation_update ON public.organizations FOR UPDATE TO indicate_runtime USING (id = (SELECT indicate_private.current_organization_id())) WITH CHECK (id = (SELECT indicate_private.current_organization_id()));--> statement-breakpoint
CREATE POLICY organization_isolation_delete ON public.organizations FOR DELETE TO indicate_runtime USING (id = (SELECT indicate_private.current_organization_id()));--> statement-breakpoint
DROP POLICY IF EXISTS auth_identity_isolation ON public.users;--> statement-breakpoint
CREATE POLICY auth_identity_isolation_select ON public.users FOR SELECT TO indicate_runtime USING (auth_user_id = (SELECT indicate_private.current_auth_user_id()));--> statement-breakpoint
CREATE POLICY auth_identity_isolation_insert ON public.users FOR INSERT TO indicate_runtime WITH CHECK (auth_user_id = (SELECT indicate_private.current_auth_user_id()));--> statement-breakpoint
CREATE POLICY auth_identity_isolation_update ON public.users FOR UPDATE TO indicate_runtime USING (auth_user_id = (SELECT indicate_private.current_auth_user_id())) WITH CHECK (auth_user_id = (SELECT indicate_private.current_auth_user_id()));--> statement-breakpoint
CREATE POLICY auth_identity_isolation_delete ON public.users FOR DELETE TO indicate_runtime USING (auth_user_id = (SELECT indicate_private.current_auth_user_id()));--> statement-breakpoint
DROP POLICY IF EXISTS permission_scope_isolation ON public.permissions;--> statement-breakpoint
CREATE POLICY permission_scope_isolation_select ON public.permissions FOR SELECT TO indicate_runtime USING ((scope = 'platform'::permission_scope) OR (organization_id = (SELECT indicate_private.current_organization_id())));--> statement-breakpoint
CREATE POLICY permission_scope_isolation_insert ON public.permissions FOR INSERT TO indicate_runtime WITH CHECK ((scope = 'platform'::permission_scope) OR (organization_id = (SELECT indicate_private.current_organization_id())));--> statement-breakpoint
CREATE POLICY permission_scope_isolation_update ON public.permissions FOR UPDATE TO indicate_runtime USING ((scope = 'platform'::permission_scope) OR (organization_id = (SELECT indicate_private.current_organization_id()))) WITH CHECK ((scope = 'platform'::permission_scope) OR (organization_id = (SELECT indicate_private.current_organization_id())));--> statement-breakpoint
CREATE POLICY permission_scope_isolation_delete ON public.permissions FOR DELETE TO indicate_runtime USING ((scope = 'platform'::permission_scope) OR (organization_id = (SELECT indicate_private.current_organization_id())));--> statement-breakpoint
DROP POLICY IF EXISTS runtime_config_audit_tenant_isolation ON public.runtime_config_audit_logs;--> statement-breakpoint
CREATE POLICY runtime_config_audit_tenant_isolation_select ON public.runtime_config_audit_logs FOR SELECT TO indicate_runtime USING ((organization_id IS NULL) OR (organization_id = (SELECT indicate_private.current_organization_id())));--> statement-breakpoint
CREATE POLICY runtime_config_audit_tenant_isolation_insert ON public.runtime_config_audit_logs FOR INSERT TO indicate_runtime WITH CHECK ((organization_id IS NULL) OR (organization_id = (SELECT indicate_private.current_organization_id())));--> statement-breakpoint
CREATE POLICY runtime_config_audit_tenant_isolation_update ON public.runtime_config_audit_logs FOR UPDATE TO indicate_runtime USING ((organization_id IS NULL) OR (organization_id = (SELECT indicate_private.current_organization_id()))) WITH CHECK ((organization_id IS NULL) OR (organization_id = (SELECT indicate_private.current_organization_id())));--> statement-breakpoint
CREATE POLICY runtime_config_audit_tenant_isolation_delete ON public.runtime_config_audit_logs FOR DELETE TO indicate_runtime USING ((organization_id IS NULL) OR (organization_id = (SELECT indicate_private.current_organization_id())));--> statement-breakpoint
DROP POLICY IF EXISTS runtime_config_invalidation_tenant_isolation ON public.runtime_config_invalidation_intents;--> statement-breakpoint
CREATE POLICY runtime_config_invalidation_tenant_isolation_select ON public.runtime_config_invalidation_intents FOR SELECT TO indicate_runtime USING ((organization_id IS NULL) OR (organization_id = (SELECT indicate_private.current_organization_id())));--> statement-breakpoint
CREATE POLICY runtime_config_invalidation_tenant_isolation_insert ON public.runtime_config_invalidation_intents FOR INSERT TO indicate_runtime WITH CHECK ((organization_id IS NULL) OR (organization_id = (SELECT indicate_private.current_organization_id())));--> statement-breakpoint
CREATE POLICY runtime_config_invalidation_tenant_isolation_update ON public.runtime_config_invalidation_intents FOR UPDATE TO indicate_runtime USING ((organization_id IS NULL) OR (organization_id = (SELECT indicate_private.current_organization_id()))) WITH CHECK ((organization_id IS NULL) OR (organization_id = (SELECT indicate_private.current_organization_id())));--> statement-breakpoint
CREATE POLICY runtime_config_invalidation_tenant_isolation_delete ON public.runtime_config_invalidation_intents FOR DELETE TO indicate_runtime USING ((organization_id IS NULL) OR (organization_id = (SELECT indicate_private.current_organization_id())));--> statement-breakpoint
DROP POLICY IF EXISTS webhook_replay_tenant_isolation ON public.webhook_replay_claims;--> statement-breakpoint
CREATE POLICY webhook_replay_tenant_isolation_select ON public.webhook_replay_claims FOR SELECT TO indicate_runtime USING ((organization_id IS NULL) OR (organization_id = (SELECT indicate_private.current_organization_id())));--> statement-breakpoint
CREATE POLICY webhook_replay_tenant_isolation_insert ON public.webhook_replay_claims FOR INSERT TO indicate_runtime WITH CHECK ((organization_id IS NULL) OR (organization_id = (SELECT indicate_private.current_organization_id())));--> statement-breakpoint
CREATE POLICY webhook_replay_tenant_isolation_update ON public.webhook_replay_claims FOR UPDATE TO indicate_runtime USING ((organization_id IS NULL) OR (organization_id = (SELECT indicate_private.current_organization_id()))) WITH CHECK ((organization_id IS NULL) OR (organization_id = (SELECT indicate_private.current_organization_id())));--> statement-breakpoint
CREATE POLICY webhook_replay_tenant_isolation_delete ON public.webhook_replay_claims FOR DELETE TO indicate_runtime USING ((organization_id IS NULL) OR (organization_id = (SELECT indicate_private.current_organization_id())));--> statement-breakpoint
DROP POLICY IF EXISTS config_deny_all ON public.cache_policy;--> statement-breakpoint
DROP POLICY IF EXISTS config_deny_all ON public.media_policy;--> statement-breakpoint
DROP POLICY IF EXISTS config_deny_all ON public.publication_policy;--> statement-breakpoint
DROP POLICY IF EXISTS config_deny_all ON public.rate_limit_policies;--> statement-breakpoint
DROP POLICY IF EXISTS config_deny_all ON public.webhook_policy;--> statement-breakpoint
DROP POLICY IF EXISTS config_deny_all ON public.shared_deployment_config;--> statement-breakpoint
DROP POLICY IF EXISTS config_deny_all ON public.runtime_config_backfill_runs;--> statement-breakpoint
DROP POLICY IF EXISTS config_deny_all ON public.runtime_config_parity_evidence;--> statement-breakpoint
DROP POLICY IF EXISTS config_deny_all ON public.runtime_config_release_domain_zones;--> statement-breakpoint
DROP POLICY IF EXISTS config_deny_all ON public.runtime_config_release_manifests;--> statement-breakpoint
DROP POLICY IF EXISTS config_deny_all ON public.runtime_config_revisions;--> statement-breakpoint
DROP POLICY IF EXISTS config_deny_all ON public.platform_user_permissions;--> statement-breakpoint
DROP POLICY IF EXISTS indicate_runtime_read ON public.indicate_schema_migrations;--> statement-breakpoint
DROP POLICY IF EXISTS indicate_runtime_read ON public.migration_gate_events;--> statement-breakpoint
CREATE POLICY config_deny_all ON public.cache_policy FOR ALL TO indicate_runtime USING (false) WITH CHECK (false);--> statement-breakpoint
CREATE POLICY config_deny_all ON public.media_policy FOR ALL TO indicate_runtime USING (false) WITH CHECK (false);--> statement-breakpoint
CREATE POLICY config_deny_all ON public.publication_policy FOR ALL TO indicate_runtime USING (false) WITH CHECK (false);--> statement-breakpoint
CREATE POLICY config_deny_all ON public.rate_limit_policies FOR ALL TO indicate_runtime USING (false) WITH CHECK (false);--> statement-breakpoint
CREATE POLICY config_deny_all ON public.webhook_policy FOR ALL TO indicate_runtime USING (false) WITH CHECK (false);--> statement-breakpoint
CREATE POLICY config_deny_all ON public.shared_deployment_config FOR ALL TO indicate_runtime USING (false) WITH CHECK (false);--> statement-breakpoint
CREATE POLICY config_deny_all ON public.runtime_config_backfill_runs FOR ALL TO indicate_runtime USING (false) WITH CHECK (false);--> statement-breakpoint
CREATE POLICY config_deny_all ON public.runtime_config_parity_evidence FOR ALL TO indicate_runtime USING (false) WITH CHECK (false);--> statement-breakpoint
CREATE POLICY config_deny_all ON public.runtime_config_release_domain_zones FOR ALL TO indicate_runtime USING (false) WITH CHECK (false);--> statement-breakpoint
CREATE POLICY config_deny_all ON public.runtime_config_release_manifests FOR ALL TO indicate_runtime USING (false) WITH CHECK (false);--> statement-breakpoint
CREATE POLICY config_deny_all ON public.runtime_config_revisions FOR ALL TO indicate_runtime USING (false) WITH CHECK (false);--> statement-breakpoint
CREATE POLICY config_deny_all ON public.platform_user_permissions FOR ALL TO indicate_runtime USING (false) WITH CHECK (false);--> statement-breakpoint
CREATE POLICY indicate_runtime_read ON public.indicate_schema_migrations FOR SELECT TO indicate_runtime USING (true);--> statement-breakpoint
CREATE POLICY indicate_runtime_read ON public.migration_gate_events FOR SELECT TO indicate_runtime USING (true);--> statement-breakpoint

INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (36, 'rls_operation_split', 'rls-operation-split-v1');

