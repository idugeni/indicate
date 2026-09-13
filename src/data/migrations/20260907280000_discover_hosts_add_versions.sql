-- discover_release_active_hosts tidak mengembalikan routing_version /
-- content_version yang dibutuhkan DrizzleDeliveryRepository
-- (findActiveSitesByExactHostname memetakan row.routing_version dan
-- row.content_version; tanpa keduanya konteks berisi string kosong dan semua
-- query network gagal parse integer). Tambahkan dua kolom versi; kolom lama
-- dipertahankan agar kompatibel.
-- Checksum di bawah adalah sha256 heks dari isi berkas ini sebelum baris INSERT.
DROP FUNCTION IF EXISTS indicate_private.discover_release_active_hosts(text[]);--> statement-breakpoint
CREATE FUNCTION indicate_private.discover_release_active_hosts(p_hostnames text[])
 RETURNS TABLE(hostname text, organization_id uuid, domain_id uuid, site_id uuid, region_id uuid, region_external_key text, region_slug text, coherent boolean, routing_version integer, content_version integer)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
  WITH requested(hostname) AS (
    SELECT DISTINCT normalized.hostname
    FROM unnest(
      CASE
        WHEN p_hostnames IS NOT NULL AND cardinality(p_hostnames) BETWEEN 1 AND 100
          AND array_position(p_hostnames, NULL) IS NULL
        THEN p_hostnames
        ELSE ARRAY[]::text[]
      END
    ) AS supplied(hostname)
    CROSS JOIN LATERAL (
      SELECT lower(trim(trailing '.' FROM supplied.hostname)) AS hostname
    ) normalized
    WHERE normalized.hostname = supplied.hostname
      AND octet_length(normalized.hostname) BETWEEN 1 AND 253
  )
  SELECT s.normalized_hostname, s.organization_id, s.domain_id, s.id, s.region_id,
         r.external_key, r.slug, true, s.routing_version, s.content_version
  FROM requested requested_host
  JOIN public.sites s ON s.normalized_hostname = requested_host.hostname
  JOIN public.organizations o ON o.id = s.organization_id
  JOIN public.domains d ON d.organization_id = s.organization_id AND d.id = s.domain_id
  LEFT JOIN public.regions r ON r.organization_id = s.organization_id AND r.id = s.region_id
  WHERE o.status = 'active' AND d.status = 'active' AND s.status = 'active' AND s.activation_state = 'active'
    AND (
      (s.region_id IS NULL AND s.normalized_hostname = d.normalized_hostname)
      OR (s.region_id IS NOT NULL AND r.status = 'active' AND s.normalized_hostname = r.slug || '.' || d.normalized_hostname)
    )
  ORDER BY s.normalized_hostname, s.organization_id, s.id
$function$;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.discover_release_active_hosts(text[]) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.discover_release_active_hosts(text[]) TO indicate_runtime;--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (105, 'discover_hosts_add_versions', 'sha256:27ef80fdb997568a9fd81c958db76259384c1cace6d5e7970c1e2b08ac010927');
