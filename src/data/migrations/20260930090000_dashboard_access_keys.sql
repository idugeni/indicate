-- Kunci akses dashboard sekali-klik (login tanpa kata sandi, reusable + revoke).
--
-- Terikat ke (organisasi, pembuat): hak yang berlaku saat dipakai selalu
-- di-resolve ulang dari membership aktif pembuat, sehingga pencabutan
-- membership otomatis mencabut akses. Secret tidak pernah disimpan plain;
-- kolom verification_hash memakai scrypt seperti api_keys.
CREATE TABLE IF NOT EXISTS "dashboard_access_keys" (
  "organization_id" uuid NOT NULL REFERENCES "public"."organizations"("id") ON DELETE cascade,
  "id" uuid NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "public"."users"("id") ON DELETE cascade,
  "lookup_id" text NOT NULL,
  "name" text NOT NULL,
  "salt" text NOT NULL,
  "verification_hash" text NOT NULL,
  "status" "api_key_status" DEFAULT 'active' NOT NULL,
  "expires_at" timestamp with time zone,
  "last_used_at" timestamp with time zone,
  "version" integer DEFAULT 1 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "dashboard_access_keys_pk" PRIMARY KEY("organization_id","id"),
  CONSTRAINT "dashboard_access_keys_lookup_id_unique" UNIQUE("lookup_id"),
  CONSTRAINT "dashboard_access_keys_version_positive" CHECK ("version" > 0),
  CONSTRAINT "dashboard_access_keys_bounded_identity" CHECK (length("lookup_id") BETWEEN 16 AND 128 AND length("name") BETWEEN 1 AND 120)
);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "dashboard_access_keys_lookup_id_unique" ON "dashboard_access_keys" USING btree ("lookup_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "dashboard_access_keys_organization_status_idx" ON "dashboard_access_keys" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "dashboard_access_keys_organization_user_idx" ON "dashboard_access_keys" USING btree ("organization_id","user_id");--> statement-breakpoint
ALTER TABLE "dashboard_access_keys" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "dashboard_access_keys" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "dashboard_access_keys";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "dashboard_access_keys"
  USING (organization_id = indicate_private.current_organization_id())
  WITH CHECK (organization_id = indicate_private.current_organization_id());--> statement-breakpoint
CREATE OR REPLACE FUNCTION indicate_private.resolve_dashboard_access_key_lookup(p_lookup_id text)
  RETURNS TABLE(organization_id uuid, id uuid, user_id uuid, lookup_id text, name text, salt text, verification_hash text, status api_key_status, expires_at timestamp with time zone, last_used_at timestamp with time zone, version integer, created_at timestamp with time zone, updated_at timestamp with time zone)
  LANGUAGE sql
  STABLE SECURITY DEFINER
  SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
  SELECT k.organization_id, k.id, k.user_id, k.lookup_id, k.name, k.salt,
         k.verification_hash, k.status, k.expires_at, k.last_used_at,
         k.version, k.created_at, k.updated_at
  FROM public.dashboard_access_keys k WHERE k.lookup_id = p_lookup_id LIMIT 1
$function$;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.resolve_dashboard_access_key_lookup(p_lookup_id text) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.resolve_dashboard_access_key_lookup(p_lookup_id text) TO indicate_runtime;--> statement-breakpoint
CREATE OR REPLACE FUNCTION indicate_private.resolve_dashboard_access_key_identity(p_lookup_id text)
  RETURNS TABLE(organization_id uuid, key_id uuid, user_id uuid, auth_user_id uuid, display_name text, avatar_url text, user_status record_status, key_status api_key_status, expires_at timestamp with time zone, last_used_at timestamp with time zone, salt text, verification_hash text, membership_status record_status, role_id uuid, role_tier role_tier, role_active boolean)
  LANGUAGE sql
  STABLE SECURITY DEFINER
  SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
  SELECT k.organization_id, k.id, u.id, u.auth_user_id, u.display_name, u.avatar_url, u.status,
         k.status, k.expires_at, k.last_used_at, k.salt, k.verification_hash, m.status, m.role_id, r.tier, r.active
  FROM public.dashboard_access_keys k
  JOIN public.users u ON u.id = k.user_id
  LEFT JOIN public.memberships m ON m.organization_id = k.organization_id AND m.user_id = k.user_id
  LEFT JOIN public.roles r ON r.organization_id = m.organization_id AND r.id = m.role_id
  WHERE k.lookup_id = p_lookup_id LIMIT 1
$function$;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.resolve_dashboard_access_key_identity(p_lookup_id text) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.resolve_dashboard_access_key_identity(p_lookup_id text) TO indicate_runtime;--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (228, 'dashboard_access_keys', 'sha256:940ee06512c184fe1b934f7c2825772e9a11d28e60695ab50a75962c5d7e4cdb');
