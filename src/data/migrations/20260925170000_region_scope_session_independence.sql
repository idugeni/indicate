-- Make region_scope_covers independent of the request session.
--
-- The helper filtered its subtree lookup on
-- `indicate_private.current_organization_id()`, which made the predicate
-- unusable outside a request context (a direct call returned false for a child
-- city) and coupled a pure geography question to session state. The filter was
-- also redundant: `regions_parent_fk` is a composite foreign key on
-- `(organization_id, parent_region_id)`, so a city and its parent province are
-- always in the same organization. A match on `parent_region_id` is therefore
-- already same-organization, and every policy keeps its own
-- `organization_id = current_organization_id()` conjunct next to the helper.
--
-- Body digest (reproducible): LF-normalize this file, substitute the 64-hex
-- checksum literal below with 64 zeros, SHA-256 the complete UTF-8 bytes.
CREATE OR REPLACE FUNCTION indicate_private.region_scope_covers(p_scope uuid, p_candidate uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = pg_catalog, public, indicate_private
AS $$
  SELECT p_scope IS NULL
      OR p_candidate IS NULL
      OR p_candidate = p_scope
      OR EXISTS (
        SELECT 1
          FROM public.regions AS region
         WHERE region.id = p_candidate
           AND region.parent_region_id = p_scope
      );
$$;--> statement-breakpoint
DO $$
DECLARE
  province uuid;
  city uuid;
  sibling_city uuid;
BEGIN
  SELECT id INTO province FROM public.regions WHERE slug = 'jawa-tengah' AND kind = 'region';
  SELECT id INTO city FROM public.regions WHERE slug = 'wonosobo' AND kind = 'city';
  SELECT id INTO sibling_city FROM public.regions WHERE slug = 'semarang' AND kind = 'city';

  IF NOT indicate_private.region_scope_covers(NULL, city) THEN
    RAISE EXCEPTION 'region_scope_regression: an unrestricted scope must cover any geography';
  END IF;
  IF NOT indicate_private.region_scope_covers(province, NULL) THEN
    RAISE EXCEPTION 'region_scope_regression: an apex portal must stay visible to a scoped actor';
  END IF;
  IF NOT indicate_private.region_scope_covers(province, province) THEN
    RAISE EXCEPTION 'region_scope_regression: a scope must cover itself';
  END IF;
  IF NOT indicate_private.region_scope_covers(province, city) OR NOT indicate_private.region_scope_covers(province, sibling_city) THEN
    RAISE EXCEPTION 'region_scope_regression: every city under the scope must be covered';
  END IF;
  IF indicate_private.region_scope_covers(city, sibling_city) THEN
    RAISE EXCEPTION 'region_scope_regression: a city scope must not reach a sibling city';
  END IF;
  IF indicate_private.region_scope_covers(city, province) THEN
    RAISE EXCEPTION 'region_scope_regression: a city scope must not reach its parent province';
  END IF;
END;
$$;--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (185, 'region_scope_session_independence', 'sha256:81675ec391c43324fc3880a3f6753c3175db9548a4c502c1989f5bc8eafc8f9b');
