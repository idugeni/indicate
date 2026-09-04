-- Phase 6 security hardening: isolate platform authority from tenant roles and make
-- replay outcomes recoverable through leased claims plus a durable prepared outcome.
CREATE TABLE public.platform_user_permissions (
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  permission_id uuid NOT NULL REFERENCES public.permissions(id) ON DELETE RESTRICT,
  provisioned_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT platform_user_permissions_pk PRIMARY KEY (user_id, permission_id)
);--> statement-breakpoint
CREATE INDEX platform_user_permissions_user_idx ON public.platform_user_permissions(user_id);--> statement-breakpoint
REVOKE ALL ON public.platform_user_permissions FROM PUBLIC, indicate_runtime;--> statement-breakpoint

CREATE OR REPLACE FUNCTION indicate_private.role_permission_scope_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, indicate_private
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.permissions p
    WHERE p.id = NEW.permission_id
      AND p.scope = 'organization'
      AND p.organization_id = NEW.organization_id
  ) THEN
    RAISE EXCEPTION 'tenant roles may grant only same-organization permissions' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END
$$;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.role_permission_scope_guard() FROM PUBLIC;--> statement-breakpoint
DROP TRIGGER IF EXISTS role_permission_scope_guard ON public.role_permissions;--> statement-breakpoint
CREATE TRIGGER role_permission_scope_guard
BEFORE INSERT OR UPDATE ON public.role_permissions
FOR EACH ROW EXECUTE FUNCTION indicate_private.role_permission_scope_guard();--> statement-breakpoint
DELETE FROM public.role_permissions rp
USING public.permissions p
WHERE p.id = rp.permission_id AND (p.scope <> 'organization' OR p.organization_id IS DISTINCT FROM rp.organization_id);--> statement-breakpoint

CREATE OR REPLACE FUNCTION indicate_private.provision_platform_permission(
  p_user_id uuid, p_permission text, p_provisioned_by text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, indicate_private
AS $$
DECLARE v_permission_id uuid;
BEGIN
  SELECT id INTO v_permission_id FROM public.permissions
  WHERE scope = 'platform' AND organization_id IS NULL AND name = p_permission;
  IF v_permission_id IS NULL OR length(trim(p_provisioned_by)) < 1 THEN
    RAISE EXCEPTION 'invalid platform permission provisioning request' USING ERRCODE = '42501';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = p_user_id AND status = 'active') THEN
    RAISE EXCEPTION 'active platform user required' USING ERRCODE = '42501';
  END IF;
  INSERT INTO public.platform_user_permissions(user_id, permission_id, provisioned_by)
  VALUES (p_user_id, v_permission_id, p_provisioned_by)
  ON CONFLICT DO NOTHING;
END
$$;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.provision_platform_permission(uuid, text, text) FROM PUBLIC, indicate_runtime;--> statement-breakpoint

CREATE OR REPLACE FUNCTION indicate_private.list_platform_permissions(p_user_id uuid)
RETURNS TABLE (name text)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = pg_catalog, public, indicate_private
AS $$
BEGIN
  IF nullif(current_setting('app.actor_id', true), '')::uuid IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'platform permission lookup denied' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
  SELECT p.name
  FROM public.platform_user_permissions grant_row
  JOIN public.permissions p ON p.id = grant_row.permission_id
  JOIN public.users u ON u.id = grant_row.user_id AND u.status = 'active'
  WHERE grant_row.user_id = p_user_id AND p.scope = 'platform' AND p.organization_id IS NULL;
END
$$;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.list_platform_permissions(uuid) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.list_platform_permissions(uuid) TO indicate_runtime;--> statement-breakpoint

CREATE OR REPLACE FUNCTION indicate_private.has_platform_permission(p_actor_id uuid, p_permission text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog, public, indicate_private
AS $$
  SELECT indicate_private.current_verified_user_id() = p_actor_id
    AND nullif(current_setting('app.actor_id', true), '')::uuid = p_actor_id
    AND EXISTS (
      SELECT 1
      FROM public.platform_user_permissions grant_row
      JOIN public.permissions p ON p.id = grant_row.permission_id
      JOIN public.users u ON u.id = grant_row.user_id AND u.status = 'active'
      WHERE grant_row.user_id = p_actor_id
        AND p.scope = 'platform' AND p.organization_id IS NULL AND p.name = p_permission
    )
$$;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.has_platform_permission(uuid, text) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.has_platform_permission(uuid, text) TO indicate_runtime;--> statement-breakpoint

ALTER TABLE public.webhook_replay_claims
  ADD COLUMN identity_binding_digest text,
  ADD COLUMN claim_token uuid NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN business_receipt jsonb,
  ADD COLUMN pending_status public.replay_claim_status,
  ADD COLUMN lease_expires_at timestamptz,
  ADD COLUMN attempt_count integer NOT NULL DEFAULT 1,
  ADD COLUMN outcome_ready_at timestamptz;--> statement-breakpoint
UPDATE public.webhook_replay_claims
SET lease_expires_at = received_at,
    pending_status = CASE WHEN status IN ('processed', 'rejected') THEN status ELSE NULL END
WHERE lease_expires_at IS NULL;--> statement-breakpoint
ALTER TABLE public.webhook_replay_claims
  ALTER COLUMN lease_expires_at SET NOT NULL,
  ADD CONSTRAINT webhook_replay_claims_identity_binding_check CHECK (identity_binding_digest IS NULL OR length(identity_binding_digest) = 64),
  ADD CONSTRAINT webhook_replay_claims_attempt_count_check CHECK (attempt_count > 0),
  ADD CONSTRAINT webhook_replay_claims_pending_terminal_check CHECK (pending_status IS NULL OR pending_status IN ('processed', 'rejected'));--> statement-breakpoint
CREATE INDEX webhook_replay_claims_reconciliation_idx ON public.webhook_replay_claims(status, pending_status, lease_expires_at);--> statement-breakpoint

DROP FUNCTION IF EXISTS indicate_private.claim_replay(text, text, uuid, text, timestamptz, timestamptz);--> statement-breakpoint
DROP FUNCTION IF EXISTS indicate_private.finish_replay(text, text, text, public.replay_claim_status, jsonb, timestamptz);--> statement-breakpoint

CREATE FUNCTION indicate_private.claim_replay(
  p_source text, p_replay_id text, p_organization_id uuid, p_body_digest text,
  p_received_at timestamptz, p_lease_expires_at timestamptz, p_expires_at timestamptz
) RETURNS TABLE (
  claim_kind text, source text, replay_id text, organization_id uuid, body_digest text,
  identity_binding_digest text, claim_token uuid, business_receipt jsonb, status public.replay_claim_status, pending_status public.replay_claim_status,
  outcome jsonb, received_at timestamptz, lease_expires_at timestamptz, attempt_count integer, expires_at timestamptz
)
LANGUAGE sql SECURITY DEFINER
SET search_path = pg_catalog, public, indicate_private
AS $$
  WITH inserted AS (
    INSERT INTO public.webhook_replay_claims(
      source, replay_id, organization_id, body_digest, status, received_at, lease_expires_at, expires_at
    ) VALUES (
      p_source, p_replay_id, p_organization_id, p_body_digest, 'claimed', p_received_at, p_lease_expires_at, p_expires_at
    ) ON CONFLICT (source, replay_id) DO NOTHING
    RETURNING *
  ), reclaimed AS (
    UPDATE public.webhook_replay_claims c
    SET lease_expires_at = p_lease_expires_at, claim_token = gen_random_uuid(), attempt_count = c.attempt_count + 1
    WHERE c.source = p_source AND c.replay_id = p_replay_id
      AND NOT EXISTS (SELECT 1 FROM inserted)
      AND c.status = 'claimed' AND c.pending_status IS NULL AND c.business_receipt IS NULL
      AND c.lease_expires_at <= p_received_at AND c.expires_at > p_received_at
      AND c.body_digest = p_body_digest
      AND (p_organization_id IS NULL OR c.organization_id IS NULL OR c.organization_id = p_organization_id)
    RETURNING *
  ), selected AS (
    SELECT 'created'::text AS claim_kind, i.* FROM inserted i
    UNION ALL
    SELECT 'reclaimed'::text AS claim_kind, r.* FROM reclaimed r
    UNION ALL
    SELECT 'duplicate'::text AS claim_kind, c.* FROM public.webhook_replay_claims c
    WHERE c.source = p_source AND c.replay_id = p_replay_id
      AND NOT EXISTS (SELECT 1 FROM inserted) AND NOT EXISTS (SELECT 1 FROM reclaimed)
  )
  SELECT s.claim_kind, s.source, s.replay_id, s.organization_id, s.body_digest,
    s.identity_binding_digest, s.claim_token, s.business_receipt, s.status, s.pending_status, s.outcome, s.received_at,
    s.lease_expires_at, s.attempt_count, s.expires_at
  FROM selected s LIMIT 1
$$;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.claim_replay(text, text, uuid, text, timestamptz, timestamptz, timestamptz) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.claim_replay(text, text, uuid, text, timestamptz, timestamptz, timestamptz) TO indicate_runtime;--> statement-breakpoint

CREATE FUNCTION indicate_private.bind_replay_identity(
  p_source text, p_replay_id text, p_body_digest text, p_claim_token uuid, p_organization_id uuid, p_identity_binding_digest text
) RETURNS TABLE (
  source text, replay_id text, organization_id uuid, body_digest text,
  identity_binding_digest text, claim_token uuid, business_receipt jsonb, status public.replay_claim_status, pending_status public.replay_claim_status,
  outcome jsonb, received_at timestamptz, lease_expires_at timestamptz, attempt_count integer, expires_at timestamptz
)
LANGUAGE sql SECURITY DEFINER
SET search_path = pg_catalog, public, indicate_private
AS $$
  WITH changed AS (
    UPDATE public.webhook_replay_claims c
    SET organization_id = p_organization_id, identity_binding_digest = p_identity_binding_digest
    WHERE c.source = p_source AND c.replay_id = p_replay_id AND c.body_digest = p_body_digest
      AND c.claim_token = p_claim_token
      AND c.status = 'claimed'
      AND (c.organization_id IS NULL OR c.organization_id = p_organization_id)
      AND (c.identity_binding_digest IS NULL OR c.identity_binding_digest = p_identity_binding_digest)
    RETURNING *
  )
  SELECT c.source, c.replay_id, c.organization_id, c.body_digest, c.identity_binding_digest, c.claim_token, c.business_receipt,
    c.status, c.pending_status, c.outcome, c.received_at, c.lease_expires_at, c.attempt_count, c.expires_at
  FROM changed c LIMIT 1
$$;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.bind_replay_identity(text, text, text, uuid, uuid, text) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.bind_replay_identity(text, text, text, uuid, uuid, text) TO indicate_runtime;--> statement-breakpoint

CREATE FUNCTION indicate_private.prepare_replay_outcome(
  p_source text, p_replay_id text, p_body_digest text, p_claim_token uuid, p_status public.replay_claim_status,
  p_outcome jsonb, p_now timestamptz
) RETURNS TABLE (
  source text, replay_id text, organization_id uuid, body_digest text,
  identity_binding_digest text, claim_token uuid, business_receipt jsonb, status public.replay_claim_status, pending_status public.replay_claim_status,
  outcome jsonb, received_at timestamptz, lease_expires_at timestamptz, attempt_count integer, expires_at timestamptz
)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public, indicate_private
AS $$
BEGIN
  IF p_status NOT IN ('processed', 'rejected') THEN RETURN; END IF;
  RETURN QUERY
  WITH changed AS (
    UPDATE public.webhook_replay_claims c
    SET pending_status = p_status, outcome = p_outcome, outcome_ready_at = p_now
    WHERE c.source = p_source AND c.replay_id = p_replay_id AND c.body_digest = p_body_digest
      AND c.claim_token = p_claim_token
      AND c.status = 'claimed'
      AND (c.pending_status IS NULL OR (c.pending_status = p_status AND c.outcome = p_outcome))
    RETURNING *
  )
  SELECT c.source, c.replay_id, c.organization_id, c.body_digest, c.identity_binding_digest, c.claim_token, c.business_receipt,
    c.status, c.pending_status, c.outcome, c.received_at, c.lease_expires_at, c.attempt_count, c.expires_at
  FROM changed c
  UNION ALL
  SELECT c.source, c.replay_id, c.organization_id, c.body_digest, c.identity_binding_digest, c.claim_token, c.business_receipt,
    c.status, c.pending_status, c.outcome, c.received_at, c.lease_expires_at, c.attempt_count, c.expires_at
  FROM public.webhook_replay_claims c
  WHERE c.source = p_source AND c.replay_id = p_replay_id AND c.body_digest = p_body_digest
    AND c.claim_token = p_claim_token
    AND c.status IN ('processed', 'rejected') AND c.outcome = p_outcome
    AND NOT EXISTS (SELECT 1 FROM changed)
  LIMIT 1;
END
$$;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.prepare_replay_outcome(text, text, text, uuid, public.replay_claim_status, jsonb, timestamptz) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.prepare_replay_outcome(text, text, text, uuid, public.replay_claim_status, jsonb, timestamptz) TO indicate_runtime;--> statement-breakpoint

CREATE FUNCTION indicate_private.finalize_replay(
  p_source text, p_replay_id text, p_body_digest text, p_claim_token uuid, p_now timestamptz
) RETURNS TABLE (
  source text, replay_id text, organization_id uuid, body_digest text,
  identity_binding_digest text, claim_token uuid, business_receipt jsonb, status public.replay_claim_status, pending_status public.replay_claim_status,
  outcome jsonb, received_at timestamptz, lease_expires_at timestamptz, attempt_count integer, expires_at timestamptz
)
LANGUAGE sql SECURITY DEFINER
SET search_path = pg_catalog, public, indicate_private
AS $$
  WITH changed AS (
    UPDATE public.webhook_replay_claims c
    SET status = c.pending_status, pending_status = NULL, processed_at = p_now
    WHERE c.source = p_source AND c.replay_id = p_replay_id AND c.body_digest = p_body_digest
      AND c.claim_token = p_claim_token
      AND c.status = 'claimed' AND c.pending_status IN ('processed', 'rejected') AND c.outcome IS NOT NULL
    RETURNING *
  )
  SELECT c.source, c.replay_id, c.organization_id, c.body_digest, c.identity_binding_digest, c.claim_token, c.business_receipt,
    c.status, c.pending_status, c.outcome, c.received_at, c.lease_expires_at, c.attempt_count, c.expires_at
  FROM changed c
  UNION ALL
  SELECT c.source, c.replay_id, c.organization_id, c.body_digest, c.identity_binding_digest, c.claim_token, c.business_receipt,
    c.status, c.pending_status, c.outcome, c.received_at, c.lease_expires_at, c.attempt_count, c.expires_at
  FROM public.webhook_replay_claims c
  WHERE c.source = p_source AND c.replay_id = p_replay_id AND c.body_digest = p_body_digest
    AND c.claim_token = p_claim_token
    AND c.status IN ('processed', 'rejected') AND NOT EXISTS (SELECT 1 FROM changed)
  LIMIT 1
$$;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.finalize_replay(text, text, text, uuid, timestamptz) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.finalize_replay(text, text, text, uuid, timestamptz) TO indicate_runtime;--> statement-breakpoint

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
  LEFT JOIN public.permissions p
    ON p.id = rp.permission_id AND p.scope = 'organization' AND p.organization_id = m.organization_id
  GROUP BY m.id, m.organization_id, m.user_id, m.role_id, m.telegram_user_id, m.telegram_chat_id
$$;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.resolve_telegram_identity(text, text) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.resolve_telegram_identity(text, text) TO indicate_runtime;--> statement-breakpoint

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
      AND p.scope = 'organization' AND p.organization_id = m.organization_id
    JOIN public.users u ON u.id = m.user_id AND u.status = 'active'
    WHERE m.user_id = p_actor_id AND m.organization_id = p_organization_id
      AND m.status = 'active' AND p.name = p_permission
  )
$$;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.has_tenant_permission(uuid, uuid, text) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.has_tenant_permission(uuid, uuid, text) TO indicate_runtime;--> statement-breakpoint

CREATE OR REPLACE FUNCTION indicate_private.capture_replay_business_receipt()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public, indicate_private
AS $$
DECLARE
  v_replay_id text;
  v_body_digest text;
  v_claim_token uuid;
BEGIN
  IF NEW.request_id NOT LIKE 'telegram-replay:%' THEN RETURN NEW; END IF;
  v_replay_id := split_part(NEW.request_id, ':', 2);
  v_body_digest := split_part(NEW.request_id, ':', 3);
  BEGIN
    v_claim_token := split_part(NEW.request_id, ':', 4)::uuid;
  EXCEPTION WHEN invalid_text_representation THEN
    RAISE EXCEPTION 'invalid replay fence' USING ERRCODE = '42501';
  END;
  IF length(v_body_digest) <> 64 OR split_part(NEW.request_id, ':', 5) <> '' OR NOT EXISTS (
    SELECT 1 FROM public.webhook_replay_claims claim
    WHERE claim.source = 'telegram' AND claim.replay_id = v_replay_id
      AND claim.body_digest = v_body_digest AND claim.claim_token = v_claim_token
      AND claim.status = 'claimed'
  ) THEN
    RAISE EXCEPTION 'stale replay worker' USING ERRCODE = '42501';
  END IF;
  IF NEW.outcome = 'succeeded' AND NEW.action IN ('article.create', 'article.sites.assign', 'media.activate', 'publication.request') THEN
    UPDATE public.webhook_replay_claims
    SET business_receipt = jsonb_build_object(
      'action', NEW.action, 'targetType', NEW.target_type, 'targetId', NEW.target_id,
      'after', coalesce(NEW.after, '{}'::jsonb), 'occurredAt', NEW.occurred_at
    )
    WHERE source = 'telegram' AND replay_id = v_replay_id
      AND body_digest = v_body_digest AND claim_token = v_claim_token AND status = 'claimed';
  END IF;
  RETURN NEW;
END
$$;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.capture_replay_business_receipt() FROM PUBLIC;--> statement-breakpoint
DROP TRIGGER IF EXISTS capture_replay_business_receipt ON public.audit_logs;--> statement-breakpoint
CREATE TRIGGER capture_replay_business_receipt
AFTER INSERT ON public.audit_logs
FOR EACH ROW EXECUTE FUNCTION indicate_private.capture_replay_business_receipt();--> statement-breakpoint

INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (11, 'security_hardening', 'security-hardening-v1');
