-- Cast the robots directive in `mutate_site_settings`.
--
-- The function takes `p_seo_robots_directive` as text and assigns it straight to
-- `site_settings.seo_robots_directive`, which is the `seo_robots_directive` enum.
-- Every call therefore failed with 42804 on the UPDATE, after its permission
-- check had already passed, so the function could never commit a change. This is
-- the same missing-cast defect that migration 198 repaired in the runtime-config
-- functions, on a different column.
--
-- The other columns the function writes match their parameter types, and the
-- revision bookkeeping it shares with the runtime-config functions was repaired
-- by migration 201.
--
-- Body digest (reproducible): LF-normalize this file, substitute the 64-hex
-- checksum literal below with 64 zeros, SHA-256 the complete UTF-8 bytes.
DO $$
DECLARE
  target regprocedure := 'indicate_private.mutate_site_settings(uuid,uuid,uuid,text,text,text,text,text,integer,uuid,integer)'::regprocedure;
  definition text;
  patched integer;
BEGIN
  IF (SELECT prosrc FROM pg_proc WHERE oid = target) NOT LIKE '%seo_robots_directive = p_seo_robots_directive,%' THEN
    RAISE EXCEPTION 'site_settings_robots_cast_missing: uncast assignment not found';
  END IF;
  definition := replace(
    pg_get_functiondef(target),
    'seo_robots_directive = p_seo_robots_directive,',
    'seo_robots_directive = p_seo_robots_directive::public.seo_robots_directive,'
  );
  EXECUTE definition;
  SELECT count(*) INTO patched
    FROM pg_proc
   WHERE oid = target
     AND prosrc LIKE '%seo_robots_directive = p_seo_robots_directive::public.seo_robots_directive,%';
  IF patched <> 1 THEN
    RAISE EXCEPTION 'site_settings_robots_cast_not_applied';
  END IF;
END;
$$;--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (203, 'site_settings_robots_directive_cast', 'sha256:9fd351d5ca580214ae541de39d8f5acc3274ecf942d43761dc7e2f337594beb1');
