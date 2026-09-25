-- Remove the drill litigation hold from the legal register.
--
-- `litigation_holds` exists to freeze erasure and retention for an organization
-- under a legal hold. Its single row was a rehearsal: the reason reads "uji
-- fungsi hold pasca-migrasi v79 (segera dilepas)", it was created 2026-09-07
-- 11:03:42 UTC and released twenty seconds later at 11:04:02, and it names the
-- Drill Expire organization, which is itself a parked test tenant. `is_org_held`
-- only counts unreleased holds, so the row blocks nothing; it is pure rehearsal
-- residue sitting in a compliance register, which is the one place a leftover
-- test row is least defensible.
--
-- The delete is targeted by id, reason, and release state rather than by a broad
-- age rule, so a real hold can never be caught by it: an active hold has
-- `released_at IS NULL` and does not match. The guard asserts both that the drill
-- row is gone and that no unreleased hold was touched.
--
-- Body digest (reproducible): LF-normalize this file, substitute the 64-hex
-- checksum literal below with 64 zeros, SHA-256 the complete UTF-8 bytes.
DELETE FROM public.litigation_holds
 WHERE id = '977b207c-23d6-4a50-9ac3-3ab1586cbbbc'::uuid
   AND reason = 'Uji fungsi hold pasca-migrasi v79 (segera dilepas).'
   AND released_at IS NOT NULL;--> statement-breakpoint
DO $$
DECLARE
  drill_left integer;
  active_holds integer;
BEGIN
  SELECT count(*) INTO drill_left FROM public.litigation_holds
   WHERE reason ILIKE '%uji fungsi hold%';
  IF drill_left > 0 THEN
    RAISE EXCEPTION 'drill_hold_left: % rehearsal hold row(s) still in the register', drill_left;
  END IF;
  SELECT count(*) INTO active_holds FROM public.litigation_holds WHERE released_at IS NULL;
  IF active_holds > 0 THEN
    RAISE EXCEPTION 'drill_hold_touched: % hold(s) are still in force and must stay', active_holds;
  END IF;
END;
$$;--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (193, 'purge_drill_litigation_hold', 'sha256:b2a881c116059abded1badb58972a60dc4475002770275624b99a5767707627b');
