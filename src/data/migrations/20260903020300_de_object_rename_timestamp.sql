-- Delivery-object rename timestamp accounting.
--
-- Marker migration: the production database recorded version 26 as
-- `de_object_rename_timestamp` (applied 2026-09-02, checksum
-- `de-object-rename-timestamp-v1`) before this repository tracked the change
-- as a reviewed file. No schema object in the current database state requires
-- a replayable DDL body — every statement this version ever carried is already
-- reflected in the live schema — so this file only carries the ledger
-- registration that keeps the journal, the reviewed manifest, and
-- `indicate_schema_migrations` in exact agreement. Do not add DDL here; any
-- new schema change belongs in a new forward migration.

INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (26, 'de_object_rename_timestamp', 'de-object-rename-timestamp-v1');
