-- Catat titik masuk pemanggil pada audit subscription_update.
--
-- Kolom entry_point selama ini diisi hardcoded 'dashboard', sehingga tulis
-- langganan dari Telegram Mini App tersalahatribusi di audit_logs. Parameter
-- baru p_entry_point (default 'dashboard') meneruskan entry_point aktor;
-- pemanggil lama enam argumen tetap valid tanpa perubahan.
-- Checksum di bawah adalah sha256 heks dari isi berkas ini sebelum baris INSERT.
DROP FUNCTION IF EXISTS indicate_private.subscription_update(uuid, text, uuid, integer, subscription_status, timestamptz);--> statement-breakpoint
CREATE FUNCTION indicate_private.subscription_update(p_actor_id uuid, p_request_id text, p_organization_id uuid, p_expected_version integer, p_status subscription_status, p_now timestamp with time zone, p_entry_point text DEFAULT 'dashboard')
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
BEGIN
  IF NOT indicate_private.permission_has_platform_admin(p_actor_id) THEN
    RAISE EXCEPTION 'platform permission required' USING ERRCODE = '42501';
  END IF;
  IF p_expected_version IS NULL THEN
    INSERT INTO public.subscriptions(organization_id, status, version, created_at, updated_at)
    VALUES (p_organization_id, p_status, 1, p_now, p_now)
    ON CONFLICT (organization_id) DO NOTHING;
    IF NOT FOUND THEN RETURN false; END IF;
  ELSE
    UPDATE public.subscriptions SET status = p_status, version = version + 1, updated_at = p_now
    WHERE organization_id = p_organization_id AND version = p_expected_version;
    IF NOT FOUND THEN RETURN false; END IF;
  END IF;
  INSERT INTO public.audit_logs(organization_id, id, actor_type, actor_id, entry_point, action, target_type, target_id, outcome, changed_fields, after, request_id, occurred_at)
  VALUES (p_organization_id, gen_random_uuid(), 'user', p_actor_id::text, p_entry_point, 'subscription.update', 'subscription', p_organization_id::text, 'succeeded', ARRAY['status'], jsonb_build_object('status', p_status), p_request_id, p_now);
  RETURN true;
END
$function$;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.subscription_update(uuid, text, uuid, integer, subscription_status, timestamptz, text) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.subscription_update(uuid, text, uuid, integer, subscription_status, timestamptz, text) TO indicate_runtime;--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (136, 'subscription_update_entry_point', 'sha256:5afd115d9c049e8d8248ce63afad86ec78b70d9c20fc796cd5e356e89e44094d');
