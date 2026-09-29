-- Drop the out-of-band SEO backup table that the `no_primary_key` linter flags.
--
-- `ops_backup_site_settings_seo_20260926` was created by a direct SQL session on
-- 2026-09-26, not by a migration: it has no row in `indicate_schema_migrations`
-- and no file in this directory. It captured five `site_settings` columns —
-- organization_id, site_id, seo_default_title, seo_default_description,
-- version — for the 1375 sites whose titles that session rewrote.
--
-- The advisor is right that the table carries no primary key, and the key it
-- points at is not addable. Five (organization_id, site_id) pairs appear twice,
-- because the capturing SELECT had no DISTINCT and those sites were rewritten
-- more than once, so `PRIMARY KEY (organization_id, site_id)` fails on a unique
-- violation. A surrogate key would instead buy index maintenance for a table
-- nothing reads, and would leave the linter satisfied rather than the schema
-- correct.
--
-- The retained copy is also the wrong copy to roll back to. Two migrations
-- superseded it, and both moved the live value away from what this table holds:
--
--   * Migration 20260925120000 concatenated the area label onto the apex title
--     and cut the result at a hard 60 characters. The apex title it concatenated
--     was itself already cut mid-word, so the derived titles compounded the cut.
--     Every title in this table still carries that defect: 1295 of the 1375 end
--     mid-word, for example "Demak - Objektivitas - Wacana publik yang inklusif
--     dan jerni".
--
--   * Migration 208 (`derived_portal_title_rebuild`, 2026-09-27) rebuilt those
--     titles from the apex title and cut only on a word boundary. All 1375 live
--     values are now a strict prefix of the value stored here, and every one ends
--     at a space rather than mid-word.
--
-- The brand casing in this table is stale as well: it holds `Podiumpublik`,
-- `Suarabentara`, and `Kepulauanraya`, where both `site_settings.name` and the live
-- `seo_default_title` now read `PodiumPublik`, `SuaraBentara`, and
-- `KepulauanRaya`. Restoring from this table would reintroduce the mid-word cut and
-- undo the casing correction in one step.
--
-- So the table has no rollback value. It is a snapshot of two defects that were
-- afterwards fixed in-band, where those fixes are recorded in the ledger and this
-- table is not. Dropping it clears the lint permanently and returns 432 kB.
--
-- The guard refuses to run unless the table still has the audited shape, so a
-- table recreated under the same name is reported rather than silently dropped.

DO $migration$
DECLARE
  backup_rows integer;
  distinct_sites integer;
  duplicate_pairs integer;
BEGIN
  IF to_regclass('public.ops_backup_site_settings_seo_20260926') IS NULL THEN
    RETURN;
  END IF;

  SELECT count(*), count(DISTINCT site_id)
    INTO backup_rows, distinct_sites
    FROM public.ops_backup_site_settings_seo_20260926;

  SELECT count(*)
    INTO duplicate_pairs
    FROM (
      SELECT organization_id, site_id
        FROM public.ops_backup_site_settings_seo_20260926
       GROUP BY organization_id, site_id
      HAVING count(*) > 1
    ) AS duplicated;

  IF backup_rows <> 1380 OR distinct_sites <> 1375 OR duplicate_pairs <> 5 THEN
    RAISE EXCEPTION
      'drop_ops_backup_site_settings_seo_unexpected_shape: rows=% sites=% duplicate_pairs=%',
      backup_rows, distinct_sites, duplicate_pairs;
  END IF;
END
$migration$;
--> statement-breakpoint
DROP TABLE public.ops_backup_site_settings_seo_20260926;
--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (220, 'drop_ops_backup_site_settings_seo', 'sha256:970af1391f997fabc528a7580be57539878aba61eb147ac53e669d246f3cd4b3');
