-- Opsi identitas Telegram per akun (pemilih organisasi) + langkah site_pick.
-- Idempoten. Checksum di bawah adalah sha256 heks dari isi berkas ini
-- sebelum baris INSERT.
ALTER TYPE "public"."telegram_conversation_step" ADD VALUE IF NOT EXISTS 'site_pick';--> statement-breakpoint
CREATE OR REPLACE FUNCTION indicate_private.list_telegram_identities(p_user_id text, p_chat_id text)
 RETURNS TABLE(mapping_id uuid, organization_id uuid, organization_name text, user_id uuid, role_id uuid, telegram_user_id text, telegram_chat_id text, region_id uuid, permissions text[])
 LANGUAGE sql STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
  SELECT m.id, m.organization_id, o.name, m.user_id, m.role_id, m.telegram_user_id,
         m.telegram_chat_id, membership.region_id, coalesce(array_agg(DISTINCT p.name) FILTER (WHERE p.name IS NOT NULL), ARRAY[]::text[])
  FROM public.telegram_identity_mappings m
  JOIN public.memberships membership
    ON membership.organization_id = m.organization_id AND membership.user_id = m.user_id
   AND membership.role_id = m.role_id AND membership.status = 'active'
  JOIN public.roles r
    ON r.organization_id = membership.organization_id AND r.id = membership.role_id AND r.active
  JOIN public.organizations o ON o.id = m.organization_id
  LEFT JOIN public.role_permissions rp ON rp.organization_id = m.organization_id AND rp.role_id = m.role_id
  LEFT JOIN public.permissions p ON p.id = rp.permission_id
  WHERE m.telegram_user_id = p_user_id AND m.telegram_chat_id = p_chat_id AND m.status = 'active'
  GROUP BY m.id, m.organization_id, o.name, m.user_id, m.role_id, m.telegram_user_id, m.telegram_chat_id, membership.region_id
$function$;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.list_telegram_identities(text, text) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.list_telegram_identities(text, text) TO indicate_runtime;--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (133, 'telegram_identity_options', 'sha256:39fd5403801ce886b3f469c08bdd960fccc4bfcb1b19e41253625e1d6ae66a14');
