ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS cover_image_url text;--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (108, 'articles_cover_image_url', 'sha256:00dcad3c254637e41f1a0482311232cdfaa857ba039be2dae8f8afa91d1fcff6');
