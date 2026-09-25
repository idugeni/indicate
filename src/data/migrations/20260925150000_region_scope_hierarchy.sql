-- Make a region scope cover the cities underneath it.
--
-- A scoped actor was matched with `region_id = current_region_id()`, so a
-- membership scoped to Jawa Tengah could reach the province portal and every
-- apex portal, but none of the 31 city portals below it. With 3224 city
-- portals live that made regional scopes useless for city editorial work, and
-- the same exact comparison was copy-pasted into every tenant isolation policy.
--
-- `region_scope_covers` becomes the single authority for the question: an
-- unrestricted actor sees everything, an apex portal (no geography) is always
-- visible, the scoped geography itself is visible, and a child geography of the
-- scope is visible. Everything else stays denied, so this widens a regional
-- scope to its own subtree and no further - never across organizations, never
-- into a sibling region, and never upward into a parent portal.
--
-- The policies are then rewritten mechanically rather than by hand: every
-- expression that compared `X.region_id` to `current_region_id()` is rewritten
-- to call the helper, so no policy can keep the old exact comparison by
-- omission. The block fails if it rewrites nothing, and fails again if any
-- exact comparison survives, so the migration cannot half-apply.
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
         WHERE region.organization_id = indicate_private.current_organization_id()
           AND region.id = p_candidate
           AND region.parent_region_id = p_scope
      );
$$;--> statement-breakpoint
DO $$
DECLARE
  policy_row record;
  rewritten integer := 0;
  exact_pattern constant text := '[a-z_]+\.region_id = \( SELECT indicate_private\.current_region_id\(\)';
BEGIN
  FOR policy_row IN
    SELECT c.relname AS table_name,
           p.polname AS policy_name,
           p.polcmd AS policy_command,
           pg_get_expr(p.polqual, p.polrelid) AS using_expr,
           pg_get_expr(p.polwithcheck, p.polrelid) AS check_expr
      FROM pg_policy AS p
      JOIN pg_class AS c ON c.oid = p.polrelid
      JOIN pg_namespace AS n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public'
       AND (coalesce(pg_get_expr(p.polqual, p.polrelid), '') || coalesce(pg_get_expr(p.polwithcheck, p.polrelid), ''))
           LIKE '%indicate_private.current_region_id%'
  LOOP
    DECLARE
      new_using text;
      new_check text;
    BEGIN
      new_using := CASE
        WHEN policy_row.using_expr IS NULL THEN NULL
        ELSE regexp_replace(
          policy_row.using_expr,
          '([a-z_]+)\.region_id = \( SELECT indicate_private\.current_region_id\(\) AS current_region_id\)',
          'indicate_private.region_scope_covers(( SELECT indicate_private.current_region_id() AS current_region_id), \1.region_id)',
          'g')
      END;
      new_check := CASE
        WHEN policy_row.check_expr IS NULL THEN NULL
        ELSE regexp_replace(
          policy_row.check_expr,
          '([a-z_]+)\.region_id = \( SELECT indicate_private\.current_region_id\(\) AS current_region_id\)',
          'indicate_private.region_scope_covers(( SELECT indicate_private.current_region_id() AS current_region_id), \1.region_id)',
          'g')
      END;

      IF new_using IS NOT DISTINCT FROM policy_row.using_expr
         AND new_check IS NOT DISTINCT FROM policy_row.check_expr THEN
        CONTINUE;
      END IF;

      IF policy_row.policy_command IN ('*', 'w') THEN
        EXECUTE format('ALTER POLICY %I ON public.%I USING (%s) WITH CHECK (%s)',
          policy_row.policy_name, policy_row.table_name, new_using, new_check);
      ELSIF policy_row.policy_command = 'a' THEN
        EXECUTE format('ALTER POLICY %I ON public.%I WITH CHECK (%s)',
          policy_row.policy_name, policy_row.table_name, new_check);
      ELSE
        EXECUTE format('ALTER POLICY %I ON public.%I USING (%s)',
          policy_row.policy_name, policy_row.table_name, new_using);
      END IF;
      rewritten := rewritten + 1;
    END;
  END LOOP;

  IF rewritten = 0 THEN
    RAISE EXCEPTION 'region_scope_rewrite_found_no_policies';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM pg_policy AS p
      JOIN pg_class AS c ON c.oid = p.polrelid
      JOIN pg_namespace AS n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public'
       AND (coalesce(pg_get_expr(p.polqual, p.polrelid), '') || coalesce(pg_get_expr(p.polwithcheck, p.polrelid), ''))
           ~ exact_pattern
  ) THEN
    RAISE EXCEPTION 'region_scope_rewrite_incomplete: an exact region comparison survived';
  END IF;
END;
$$;--> statement-breakpoint
DO $$
DECLARE
  covering integer;
BEGIN
  SELECT count(*) INTO covering
    FROM pg_policy AS p
    JOIN pg_class AS c ON c.oid = p.polrelid
    JOIN pg_namespace AS n ON n.oid = c.relnamespace
   WHERE n.nspname = 'public'
     AND (coalesce(pg_get_expr(p.polqual, p.polrelid), '') || coalesce(pg_get_expr(p.polwithcheck, p.polrelid), ''))
         LIKE '%region_scope_covers%';
  IF covering = 0 THEN
    RAISE EXCEPTION 'region_scope_rewrite_missing: no policy calls the scope helper';
  END IF;
END;
$$;--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (183, 'region_scope_hierarchy', 'sha256:39b9b22e0614b7e26d56495962d1caa1849e264300a66620dccb7dad9c5383d2');
