-- Stage 2 defense-in-depth security, coherence, grants, and migration gate metadata.
CREATE SCHEMA IF NOT EXISTS indicate_private;--> statement-breakpoint

CREATE OR REPLACE FUNCTION indicate_private.current_organization_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(current_setting('app.organization_id', true), '')::uuid
$$;--> statement-breakpoint

CREATE OR REPLACE FUNCTION indicate_private.current_auth_user_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(current_setting('app.auth_user_id', true), '')::uuid
$$;--> statement-breakpoint

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
$$;--> statement-breakpoint

ALTER TABLE "articles"
  ADD CONSTRAINT "articles_lead_media_fk"
  FOREIGN KEY ("organization_id", "lead_media_id")
  REFERENCES "media" ("organization_id", "id")
  ON DELETE RESTRICT;--> statement-breakpoint

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
$$;--> statement-breakpoint

CREATE TRIGGER role_permissions_scope_guard
BEFORE INSERT OR UPDATE ON role_permissions
FOR EACH ROW EXECUTE FUNCTION indicate_private.enforce_role_permission_scope();--> statement-breakpoint

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
$$;--> statement-breakpoint

CREATE TRIGGER telegram_mapping_membership_role_guard
BEFORE INSERT OR UPDATE ON telegram_identity_mappings
FOR EACH ROW EXECUTE FUNCTION indicate_private.enforce_telegram_membership_role();--> statement-breakpoint

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
$$;--> statement-breakpoint

CREATE TRIGGER sites_hostname_shape_guard
BEFORE INSERT OR UPDATE OF organization_id, domain_id, region_id, normalized_hostname ON sites
FOR EACH ROW EXECUTE FUNCTION indicate_private.enforce_site_hostname_shape();--> statement-breakpoint

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
$$;--> statement-breakpoint

CREATE TRIGGER publishing_job_targets_article_guard
BEFORE INSERT OR UPDATE ON publishing_job_targets
FOR EACH ROW EXECUTE FUNCTION indicate_private.enforce_job_target_article();--> statement-breakpoint

CREATE OR REPLACE FUNCTION indicate_private.reject_audit_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'audit logs are append-only' USING ERRCODE = '42501';
END;
$$;--> statement-breakpoint

CREATE TRIGGER audit_logs_append_only_guard
BEFORE UPDATE OR DELETE ON audit_logs
FOR EACH ROW EXECUTE FUNCTION indicate_private.reject_audit_mutation();--> statement-breakpoint

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
$$;--> statement-breakpoint

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE organizations FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY tenant_isolation ON organizations
  USING (id = indicate_private.current_organization_id())
  WITH CHECK (id = indicate_private.current_organization_id());--> statement-breakpoint

ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE permissions FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY permission_scope_isolation ON permissions
  USING (scope = 'platform' OR organization_id = indicate_private.current_organization_id())
  WITH CHECK (scope = 'platform' OR organization_id = indicate_private.current_organization_id());--> statement-breakpoint

ALTER TABLE webhook_replay_claims ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE webhook_replay_claims FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY webhook_replay_tenant_isolation ON webhook_replay_claims
  USING (organization_id IS NULL OR organization_id = indicate_private.current_organization_id())
  WITH CHECK (organization_id IS NULL OR organization_id = indicate_private.current_organization_id());--> statement-breakpoint

ALTER TABLE users ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE users FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY auth_identity_isolation ON users
  USING (auth_user_id = indicate_private.current_auth_user_id())
  WITH CHECK (auth_user_id = indicate_private.current_auth_user_id());--> statement-breakpoint

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'indicate_runtime') THEN
    CREATE ROLE indicate_runtime LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
  END IF;
END
$$;--> statement-breakpoint

REVOKE ALL ON SCHEMA public FROM PUBLIC;--> statement-breakpoint
GRANT USAGE ON SCHEMA public, indicate_private TO indicate_runtime;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO indicate_runtime;--> statement-breakpoint
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON permissions FROM indicate_runtime;--> statement-breakpoint
GRANT SELECT ON permissions TO indicate_runtime;--> statement-breakpoint
REVOKE UPDATE, DELETE, TRUNCATE ON audit_logs FROM indicate_runtime;--> statement-breakpoint
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON indicate_schema_migrations, migration_gate_events FROM indicate_runtime;--> statement-breakpoint
GRANT SELECT ON indicate_schema_migrations TO indicate_runtime;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.set_tenant_context(uuid, text, text) TO indicate_runtime;--> statement-breakpoint
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO indicate_runtime;--> statement-breakpoint

INSERT INTO indicate_schema_migrations (version, name, checksum)
VALUES
  (1, 'stage2_core_schema', 'drizzle-0000'),
  (2, 'stage2_security', 'drizzle-0001')
ON CONFLICT (version) DO NOTHING;
