-- Phase 6 external entry points: credential metadata, durable Telegram conversations,
-- replay outcomes, and narrow platform-administration functions.
ALTER TABLE public.api_keys
  ADD COLUMN name text NOT NULL DEFAULT 'API key',
  ADD COLUMN version integer NOT NULL DEFAULT 1,
  ADD CONSTRAINT api_keys_version_positive CHECK (version > 0),
  ADD CONSTRAINT api_keys_bounded_identity CHECK (length(lookup_id) BETWEEN 16 AND 128 AND length(name) BETWEEN 1 AND 120);--> statement-breakpoint

ALTER TABLE public.telegram_identity_mappings
  ADD COLUMN version integer NOT NULL DEFAULT 1,
  ADD CONSTRAINT telegram_identity_mappings_version_positive CHECK (version > 0);--> statement-breakpoint

ALTER TABLE public.webhook_replay_claims
  ADD COLUMN body_digest text NOT NULL DEFAULT repeat('0', 64),
  ADD COLUMN outcome jsonb,
  ADD COLUMN processed_at timestamptz,
  ADD CONSTRAINT webhook_replay_claims_body_digest_check CHECK (length(body_digest) = 64);--> statement-breakpoint

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
);--> statement-breakpoint
CREATE INDEX telegram_conversations_expiry_idx ON public.telegram_conversations(expires_at);--> statement-breakpoint
ALTER TABLE public.telegram_conversations ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE public.telegram_conversations FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY tenant_isolation ON public.telegram_conversations
  USING (organization_id = indicate_private.current_organization_id())
  WITH CHECK (organization_id = indicate_private.current_organization_id());--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON public.telegram_conversations TO indicate_runtime;--> statement-breakpoint

INSERT INTO public.permissions(id, organization_id, name, scope, description)
VALUES ('00000000-0000-4000-8000-000000006001', NULL, 'platform.customer.admin', 'platform', 'Administer customer Organizations and subscriptions')
ON CONFLICT DO NOTHING;--> statement-breakpoint

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
$$;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.ensure_org_permissions(uuid) FROM PUBLIC;--> statement-breakpoint
SELECT indicate_private.ensure_org_permissions(id) FROM public.organizations;--> statement-breakpoint

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
$$;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.resolve_api_key_lookup(text) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.resolve_api_key_lookup(text) TO indicate_runtime;--> statement-breakpoint

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
$$;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.resolve_telegram_identity(text, text) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.resolve_telegram_identity(text, text) TO indicate_runtime;--> statement-breakpoint

CREATE OR REPLACE FUNCTION indicate_private.replay_claim_organization(p_source text, p_replay_id text)
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog, public, indicate_private
AS $$
  SELECT organization_id FROM public.webhook_replay_claims
  WHERE source = p_source AND replay_id = p_replay_id
$$;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.replay_claim_organization(text, text) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.replay_claim_organization(text, text) TO indicate_runtime;--> statement-breakpoint

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
$$;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.claim_replay(text, text, uuid, text, timestamptz, timestamptz) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.claim_replay(text, text, uuid, text, timestamptz, timestamptz) TO indicate_runtime;--> statement-breakpoint

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
$$;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.finish_replay(text, text, text, public.replay_claim_status, jsonb, timestamptz) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.finish_replay(text, text, text, public.replay_claim_status, jsonb, timestamptz) TO indicate_runtime;--> statement-breakpoint

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
$$;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.has_platform_permission(uuid, text) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.has_platform_permission(uuid, text) TO indicate_runtime;--> statement-breakpoint

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
$$;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.has_tenant_permission(uuid, uuid, text) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.has_tenant_permission(uuid, uuid, text) TO indicate_runtime;--> statement-breakpoint

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
$$;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.list_customers(uuid) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.list_customers(uuid) TO indicate_runtime;--> statement-breakpoint

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
$$;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.create_customer(uuid, text, uuid, text, text, jsonb, jsonb, timestamptz) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.create_customer(uuid, text, uuid, text, text, jsonb, jsonb, timestamptz) TO indicate_runtime;--> statement-breakpoint

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
$$;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.update_customer(uuid, text, uuid, integer, text, text, public.record_status, jsonb, timestamptz) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.update_customer(uuid, text, uuid, integer, text, text, public.record_status, jsonb, timestamptz) TO indicate_runtime;--> statement-breakpoint

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
$$;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.update_subscription(uuid, text, uuid, integer, text, public.subscription_status, timestamptz, timestamptz, timestamptz) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.update_subscription(uuid, text, uuid, integer, text, public.subscription_status, timestamptz, timestamptz, timestamptz) TO indicate_runtime;--> statement-breakpoint

INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (10, 'external_entrypoints', 'external-entrypoints-v1');
