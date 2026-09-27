ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS cover_image_url text;--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (108, 'articles_cover_image_url', 'sha256:3ac9767fb219c6d05bbb982a7c3e02d6cd18aa13c35a36df2baebd8492aeb61b');
