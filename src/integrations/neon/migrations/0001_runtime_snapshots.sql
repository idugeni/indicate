-- Optional Neon-side read-model for runtime-config snapshots.
--
-- Authority: Supabase stays the writer; this table is a derived, revision-keyed
-- copy. Rows are written best-effort by the app's write-through path and read
-- through the SnapshotSharedStore port. Any failure falls back to Supabase.
-- Old revisions are deleted explicitly by the writer (Neon has no key TTL).
-- Apply only to a separately provisioned Neon read-model database; the app's primary database remains authoritative.

CREATE TABLE IF NOT EXISTS neon_runtime_snapshots (
  environment text NOT NULL,
  revision integer NOT NULL,
  blob text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (environment, revision)
);

CREATE INDEX IF NOT EXISTS neon_runtime_snapshots_updated_at_idx
  ON neon_runtime_snapshots (updated_at);
