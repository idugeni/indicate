-- Give the unnamed articles a byline so `NewsArticle.author` is emitted.
--
-- `seo.ts` only emits `author` when an article resolves a display name, and
-- Google lists `author` among the recommended `Article` properties: it drives
-- the byline shown in search results. Fourteen active articles had
-- `author_id IS NULL`, so their structured data silently omitted the field
-- while the thirty that name "Indicate" carried it. The corpus had two
-- bylines only because those fourteen were left unset, not because they
-- belong to a different desk.
--
-- Scoped to the operator organization so a tenant's own articles are never
-- reassigned, and to `status = 'active'` so drafts stay editable. The guard is
-- `author_id IS NULL`, so re-running matches nothing and a row an editor has
-- since attributed is left alone. Version churn is intentional: `author_id` is
-- a real editorial change, and the optimistic-concurrency token must move with
-- it.
UPDATE public.articles AS article
   SET author_id = (
         SELECT author.id
           FROM public.authors AS author
          WHERE author.display_name = 'Indicate'
            AND author.organization_id = article.organization_id
       ),
       version = article.version + 1,
       updated_at = now()
  FROM public.organizations AS organization
 WHERE article.organization_id = organization.id
   AND organization.kind = 'operator'
   AND article.status = 'active'
   AND article.author_id IS NULL
   AND EXISTS (
         SELECT 1
           FROM public.authors AS candidate
          WHERE candidate.display_name = 'Indicate'
            AND candidate.organization_id = article.organization_id
       );