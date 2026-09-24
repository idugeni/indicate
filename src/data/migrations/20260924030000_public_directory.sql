-- Public directory readers: fixed-shape, safe-field-only listings for the
-- control-plane `/network` (portal jaringan) and `/partners` (organisasi
-- pelanggan aktif) pages. SECURITY DEFINER so the tenant-scoped
-- `indicate_runtime` role can enumerate exactly the public fields without
-- direct table access; no PII, no credential-bearing columns, no IDs.
-- Body digest (reproducible): LF-normalize this file, substitute the 64-hex
-- checksum literal below with 64 zeros, SHA-256 the complete UTF-8 bytes.
CREATE OR REPLACE FUNCTION indicate_private.list_public_network_sites()
RETURNS TABLE (
  hostname text,
  site_name text,
  description text,
  tagline text,
  is_regional boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, indicate_private
AS $$
  SELECT s.normalized_hostname,
         ss.name,
         ss.description,
         ss.tagline,
         (s.region_id IS NOT NULL OR s.normalized_hostname LIKE '%.%.%.%')
    FROM public.sites AS s
    JOIN public.site_settings AS ss
      ON ss.organization_id = s.organization_id AND ss.site_id = s.id
   WHERE s.status = 'active'
     AND s.activation_state = 'active'
   ORDER BY s.normalized_hostname;
$$;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.list_public_network_sites() FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.list_public_network_sites() TO indicate_runtime;--> statement-breakpoint
CREATE OR REPLACE FUNCTION indicate_private.list_public_partners()
RETURNS TABLE (
  name text,
  slug text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, indicate_private
AS $$
  SELECT o.name, o.slug
    FROM public.organizations AS o
    JOIN public.subscriptions AS sub ON sub.organization_id = o.id
   WHERE o.status = 'active'
     AND o.kind = 'customer'
     AND sub.status = 'active'
   ORDER BY o.name;
$$;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.list_public_partners() FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.list_public_partners() TO indicate_runtime;--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (166, 'public_directory', 'sha256:8f9ca870588b15409d5dabb648ccef3f982dac6c5ce7fb454f024b108e01c220');
