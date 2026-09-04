-- Phase 7 production-readiness boundary: bounded exact-host discovery for the
-- NOBYPASSRLS runtime role without granting direct cross-tenant table access.
CREATE OR REPLACE FUNCTION indicate_private.discover_active_hosts(p_hostnames text[])
RETURNS TABLE (
  hostname text,
  organization_id uuid,
  domain_id uuid,
  site_id uuid,
  region_id uuid,
  region_external_key text,
  region_slug text,
  coherent boolean
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog, public, indicate_private
AS $$
  WITH requested(hostname) AS (
    SELECT DISTINCT normalized.hostname
    FROM unnest(
      CASE
        WHEN p_hostnames IS NOT NULL
          AND cardinality(p_hostnames) BETWEEN 1 AND 100
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
  SELECT s.normalized_hostname,
         s.organization_id,
         s.domain_id,
         s.id,
         s.region_id,
         r.external_key,
         r.slug,
         true
  FROM requested requested_host
  JOIN public.sites s
    ON s.normalized_hostname = requested_host.hostname
  JOIN public.organizations o
    ON o.id = s.organization_id
  JOIN public.domains d
    ON d.organization_id = s.organization_id
   AND d.id = s.domain_id
  LEFT JOIN public.regions r
    ON r.organization_id = s.organization_id
   AND r.id = s.region_id
  WHERE o.status = 'active'
    AND d.status = 'active'
    AND s.status = 'active'
    AND s.activation_state = 'active'
    AND (
      (s.region_id IS NULL AND s.normalized_hostname = d.normalized_hostname)
      OR
      (s.region_id IS NOT NULL
       AND r.status = 'active'
       AND s.normalized_hostname = r.slug || '.' || d.normalized_hostname)
    )
  ORDER BY s.normalized_hostname, s.organization_id, s.id
$$;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.discover_active_hosts(text[]) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.discover_active_hosts(text[]) TO indicate_runtime;--> statement-breakpoint

INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (13, 'readiness_discovery', 'readiness-discovery-v1');
