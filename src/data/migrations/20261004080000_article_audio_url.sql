-- Audio URL and playback duration for `video`/`audio` article modes.
--
-- `articles.audio_url` carries the canonical external listen/file URL for
-- `audio` mode (uploaded audio bytes keep living on `media` under purpose
-- `article-audio`); it stays nullable because every other mode leaves it
-- empty. `articles.duration_seconds` carries the playback length in whole
-- seconds for `video`/`audio` modes and stays nullable elsewhere. Both are
-- additive and nullable, so no backfill is required and existing reads never
-- see a new NOT NULL contract. Checks mirror `articles_video_url_shape`.
-- Ledger version 253 follows the live `max(version)`, which is 252.
--
-- Body digest (reproducible): LF-normalize this file, substitute the 64-hex
-- checksum literal below with 64 zeros, SHA-256 the complete UTF-8 bytes.
ALTER TABLE public.articles ADD COLUMN audio_url text;--> statement-breakpoint
ALTER TABLE public.articles ADD COLUMN duration_seconds integer;--> statement-breakpoint
ALTER TABLE public.articles ADD CONSTRAINT articles_audio_url_shape CHECK (audio_url IS NULL OR (char_length(audio_url) BETWEEN 1 AND 2000 AND (audio_url LIKE 'http://%' OR audio_url LIKE 'https://%')));--> statement-breakpoint
ALTER TABLE public.articles ADD CONSTRAINT articles_duration_shape CHECK (duration_seconds IS NULL OR (duration_seconds >= 1 AND duration_seconds <= 86400));--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (253, 'article_audio_url', 'sha256:5e63ac2f7adddd48aa40c2604f3ce708544a7d03ec3fd88590f8003d97402f4e');
