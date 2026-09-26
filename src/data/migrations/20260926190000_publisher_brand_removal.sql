-- Remove the network's portal brands from `publishers`.
--
-- `publishers` mixed two different subjects. The 118 `correctional_institution`
-- rows are the newsrooms the network actually syndicates: each one owns its own
-- Organization and appears both in the platform organization and in its tenant
-- organization, which is what the affiliation model resolves against. The nine
-- `independent_publisher` rows were something else entirely — Kabar360,
-- Liputan99, Fakta01, Jurnalism, WawasanNusa, and four more. Each of those
-- names is a portal brand, not a newsroom: every one of them is the apex label
-- of 33 rows in `sites` (the bare apex plus 32 city subdomains such as
-- `banjarnegara.kabar360.biz.id`), and each carried the brand logo through
-- `contacts.logoUrl` pointing at the same `media` row that `site_settings`
-- already references as `logo_media_id` for that apex site.
--
-- Reading the dashboard publisher list therefore mixed institutions with the
-- network's own properties, which is why the roster showed archived brand rows
-- interleaved with active institutions and read as one list of publishers.
-- These rows carry no publishing history at all: zero `articles` and zero
-- `official_affiliations` reference them, and `audit_logs` records them only as
-- the `publisher.archive` transition that retired them on 2026-09-22. A brand
-- belongs to `sites` and `site_settings`, which already hold it, so deleting
-- the duplicate publisher row loses no brand information and orphans no media:
-- the `media` rows stay referenced by `site_settings.logo_media_id` and stay
-- reachable through the public brand route.
--
-- The delete is restricted to that exact shape rather than to a name list, so a
-- genuine independent newsroom is never removed by name collision, and the
-- guard block below refuses to run unless every remaining archived
-- `independent_publisher` row without publishing history is a portal brand. If
-- a future independent publisher with articles behind it appears, the predicate
-- stops matching and the guard fails loudly instead of deleting a newsroom.
--
-- `audit_logs` rows are never touched: insert-only by design with daily WORM
-- export (see docs/migrations.md). One `publisher.delete` row is appended per
-- removed brand so the erasure itself is on the record.
--
-- Body digest (reproducible): LF-normalize this file, substitute the 64-hex
-- checksum literal below with 64 zeros, SHA-256 the complete UTF-8 bytes.
DO $$
DECLARE
  pending integer;
  unexplained integer;
BEGIN
  SELECT count(*) INTO pending
    FROM public.publishers AS p
   WHERE p.type = 'independent_publisher'
     AND p.status = 'archived'
     AND NOT EXISTS (SELECT 1 FROM public.articles AS a WHERE a.publisher_id = p.id)
     AND NOT EXISTS (SELECT 1 FROM public.official_affiliations AS o WHERE o.publisher_id = p.id)
     AND EXISTS (
       SELECT 1 FROM public.sites AS s
        WHERE s.organization_id = p.organization_id
          AND s.normalized_hostname ILIKE '%' || lower(p.name) || '%'
     );

  IF pending = 0 THEN
    RAISE EXCEPTION 'publisher_brand_removal_nothing_to_do: no unreferenced archived brand rows remain';
  END IF;

  SELECT count(*) INTO unexplained
    FROM public.publishers AS p
   WHERE p.type = 'independent_publisher'
     AND p.status = 'archived'
     AND NOT EXISTS (SELECT 1 FROM public.articles AS a WHERE a.publisher_id = p.id)
     AND NOT EXISTS (SELECT 1 FROM public.official_affiliations AS o WHERE o.publisher_id = p.id)
     AND NOT EXISTS (
       SELECT 1 FROM public.sites AS s
        WHERE s.organization_id = p.organization_id
          AND s.normalized_hostname ILIKE '%' || lower(p.name) || '%'
     );

  IF unexplained > 0 THEN
    RAISE EXCEPTION 'publisher_brand_removal_ambiguous: % archived rows without publishing history are not portal brands', unexplained;
  END IF;
END;
$$;--> statement-breakpoint
WITH removed AS (
  DELETE FROM public.publishers AS p
   WHERE p.type = 'independent_publisher'
     AND p.status = 'archived'
     AND NOT EXISTS (SELECT 1 FROM public.articles AS a WHERE a.publisher_id = p.id)
     AND NOT EXISTS (SELECT 1 FROM public.official_affiliations AS o WHERE o.publisher_id = p.id)
     AND EXISTS (
       SELECT 1 FROM public.sites AS s
        WHERE s.organization_id = p.organization_id
          AND s.normalized_hostname ILIKE '%' || lower(p.name) || '%'
     )
  RETURNING p.organization_id, p.id, p.name, p.attribution_label, p.type
), audited AS (
  INSERT INTO public.audit_logs (
    organization_id, id, actor_type, actor_id, entry_point, action, target_type,
    target_id, outcome, changed_fields, before, request_id
  )
  SELECT organization_id,
         gen_random_uuid(),
         'system'::public.audit_actor_type,
         'migration:publisher_brand_removal',
         'worker'::public.audit_entry_point,
         'publisher.delete',
         'publisher',
         id::text,
         'succeeded'::public.audit_outcome,
         ARRAY['status'],
         jsonb_build_object(
           'id', id,
           'name', name,
           'type', type,
           'attributionLabel', attribution_label,
           'status', 'archived'
         ),
         'migration:205'
    FROM removed
  RETURNING organization_id
)
SELECT count(*) FROM audited;--> statement-breakpoint
DO $$
DECLARE
  remaining integer;
  orphaned_media integer;
BEGIN
  SELECT count(*) INTO remaining
    FROM public.publishers AS p
   WHERE p.type = 'independent_publisher'
     AND p.status = 'archived'
     AND NOT EXISTS (SELECT 1 FROM public.articles AS a WHERE a.publisher_id = p.id)
     AND NOT EXISTS (SELECT 1 FROM public.official_affiliations AS o WHERE o.publisher_id = p.id)
     AND EXISTS (
       SELECT 1 FROM public.sites AS s
        WHERE s.organization_id = p.organization_id
          AND s.normalized_hostname ILIKE '%' || lower(p.name) || '%'
     );

  IF remaining <> 0 THEN
    RAISE EXCEPTION 'publisher_brand_removal_incomplete: % mirrored brand rows still present', remaining;
  END IF;

  SELECT count(*) INTO orphaned_media
    FROM public.media AS m
   WHERE NOT EXISTS (SELECT 1 FROM public.site_settings AS s WHERE s.logo_media_id = m.id)
     AND NOT EXISTS (SELECT 1 FROM public.site_settings AS s WHERE s.favicon_media_id = m.id)
     AND NOT EXISTS (SELECT 1 FROM public.site_settings AS s WHERE s.default_media_id = m.id);

  RAISE NOTICE 'publisher_brand_removal_done: unreferenced media rows now %', orphaned_media;
END;
$$;--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (205, 'publisher_brand_removal', 'sha256:bf26f268c32325f2ca192df55f3d09a7f17a53d3296a980b8a1e286cd7261461');
