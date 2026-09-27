-- Rebuild derived portal titles from the intact apex title.
--
-- Migration 20260925120000 built each regional and city portal title by
-- concatenating its area label onto the apex seo_default_title, then truncating
-- the result to 60 characters. The apex title it concatenated was itself already
-- cut at a hard character boundary, so the derived titles compounded the cut and
-- ended mid-phrase: "Boyolali - NawalaPerkara - Liputan yang memberi gambaran".
-- The missing tail is unrecoverable from the stored value, so this rebuilds the
-- string from the apex title as it stands today and cuts only on a word boundary.

with apex_titles as (
  select distinct
    s.organization_id,
    s.domain_id,
    coalesce(nullif(btrim(apex_settings.seo_default_title), ''), apex_settings.name) as apex_title
  from public.sites s
  join public.sites apex
    on apex.organization_id = s.organization_id
   and apex.domain_id = s.domain_id
   and apex.site_level = 'apex'
  join public.site_settings apex_settings on apex_settings.site_id = apex.id
  where s.site_level in ('region', 'city')
),
rebuilt as (
  select
    ss.site_id,
    case
      when length(coalesce(r.name, '') || ' - ' || a.apex_title) <= 60
        then coalesce(r.name, '') || ' - ' || a.apex_title
      else btrim(regexp_replace(left(coalesce(r.name, '') || ' - ' || a.apex_title, 60), '\s+\S*$', ''))
    end as title
  from public.site_settings ss
  join public.sites s on s.id = ss.site_id
  join apex_titles a on a.organization_id = s.organization_id and a.domain_id = s.domain_id
  join public.regions r on r.id = s.region_id
  where s.site_level in ('region', 'city')
)
update public.site_settings ss
set
  seo_default_title = rebuilt.title,
  version = ss.version + 1,
  updated_at = now()
from rebuilt
where ss.site_id = rebuilt.site_id
  and ss.seo_default_title is distinct from rebuilt.title;
