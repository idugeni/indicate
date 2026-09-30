-- Grant runtime delete on article revisions for permanent article removal.
--
-- `article.delete` removes an article's revision snapshots before removing the
-- article row itself. The blanket grant from the security migration predates
-- this table's current privilege set, so the runtime role holds SELECT/INSERT
-- but no DELETE here (same pattern as the dashboard access-key grants).
-- Least-privilege scope: delete only; row isolation stays with the
-- tenant_isolation RLS policy (cmd ALL).
GRANT DELETE ON public.article_revisions TO indicate_runtime;--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (232, 'article_revisions_delete_grant', 'sha256:25a127ccc20ddb07144e347251e80c4de5edfd0b2f8e0922838bba7834879d4f');
