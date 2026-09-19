-- Kanonik tag artikel ke kebab-case: cermin aturan tulis aplikasi
-- (lowercase, buang non `[a-z0-9 _-]', spasi/underscore jadi `-`, kolap strip,
-- maks 60 char, buang kosong, dedupe dengan urutan kemunculan pertama).
-- Idempoten: hanya baris yang hasil normalisasinya berbeda yang ditulis.
WITH normalized AS (
  SELECT
    a.organization_id,
    a.id,
    COALESCE((
      SELECT array_agg(norm.tag ORDER BY norm.first_ord)
      FROM (
        SELECT canon.tag, min(u.ord) AS first_ord
        FROM unnest(a.tags) WITH ORDINALITY AS u(elem, ord)
        CROSS JOIN LATERAL (
          SELECT rtrim(left(trim(both '-' from regexp_replace(regexp_replace(regexp_replace(lower(trim(u.elem)), '[^a-z0-9\s_-]', '', 'g'), '[\s_]+', '-', 'g'), '-+', '-', 'g')), 60), '-') AS tag
        ) AS canon
        WHERE u.elem ~ '[a-zA-Z0-9]' AND canon.tag <> ''
        GROUP BY canon.tag
      ) AS norm
    ), ARRAY[]::text[]) AS tags
  FROM public.articles AS a
)
UPDATE public.articles AS target
SET tags = normalized.tags
FROM normalized
WHERE target.organization_id = normalized.organization_id
  AND target.id = normalized.id
  AND target.tags IS DISTINCT FROM normalized.tags;--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (141, 'article_tags_canonical', 'sha256:caff95bc251c87b804fbce84eba79e2d4c5d3360faa86d4abbe55fb9b4a6ee1f');
