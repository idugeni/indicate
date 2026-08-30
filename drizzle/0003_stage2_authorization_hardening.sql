-- Stage 2 reciprocal Telegram coherence and authorization hardening.
CREATE OR REPLACE FUNCTION indicate_private.enforce_telegram_membership_role()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status <> 'active' THEN
    RETURN NEW;
  END IF;
  PERFORM 1
  FROM memberships
  WHERE organization_id = NEW.organization_id
    AND user_id = NEW.user_id
    AND role_id = NEW.role_id
    AND status = 'active'
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'telegram mapping membership mismatch' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;--> statement-breakpoint

CREATE OR REPLACE FUNCTION indicate_private.enforce_membership_telegram_coherence()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM telegram_identity_mappings
    WHERE organization_id = NEW.organization_id
      AND user_id = NEW.user_id
      AND status = 'active'
      AND (NEW.status <> 'active' OR role_id <> NEW.role_id)
  ) THEN
    RAISE EXCEPTION 'membership telegram mapping mismatch' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;--> statement-breakpoint

CREATE TRIGGER membership_telegram_mapping_guard
BEFORE UPDATE OF role_id, status ON memberships
FOR EACH ROW EXECUTE FUNCTION indicate_private.enforce_membership_telegram_coherence();--> statement-breakpoint

INSERT INTO indicate_schema_migrations (version, name, checksum)
VALUES (4, 'stage2_authorization_hardening', 'drizzle-0003')
ON CONFLICT (version) DO NOTHING;
