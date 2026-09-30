-- Document embeddings untuk pencarian semantik arsip (rancangan bertahap dasbor AI).
-- ai_request_logs sudah milik control plane (src/data/schema/ai.ts) dan tidak dibuat ulang di sini.
-- Embedding disimpan jsonb agar tidak bergantung ekstensi pgvector; migrasi ke vector
-- menyusul bersama transport embedding bila control plane menyediakannya.
-- Diterapkan manual sesuai docs/migrations.md; entri _journal menyusul.

CREATE TABLE IF NOT EXISTS document_embeddings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations (id) ON DELETE RESTRICT,
  article_id uuid NULL,
  chunk text NOT NULL,
  embedding jsonb NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT document_embeddings_chunk_nonempty CHECK (char_length(chunk) BETWEEN 1 AND 2000)
);

CREATE INDEX IF NOT EXISTS document_embeddings_org_article_idx
  ON document_embeddings (organization_id, article_id);
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (224, 'document_embeddings', 'sha256:5f4dc7adb91e016cb04d47b937021670531b21d262a8245902d268640ee51033');
