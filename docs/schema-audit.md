# Audit Skema: Kolom yang Dipakai dan yang Tidak

Audit tingkat kolom terhadap database produksi, dibandingkan dengan kode di repo
ini. Diregenerasi 2026-09-26 setelah migrasi 191.

## Cara kerja

Empat sinyal digabung per kolom, tidak ada yang ditebak dari nama kolom saja:

| Sinyal | Arti | Contoh |
|---|---|---|
| `app` | Referensi terqualifikasi di kode aplikasi | `sites.parentSiteId`, `mediaKeyReservations.objectKey` |
| `app-write` | Ditulis lewat kunci objek pada `values()` / `set:` | `organizationId: state.organizationId` |
| `app-raw` | Disebut di SQL mentah di dalam `.ts` | `runtime-context.ts` membaca `required_version` |
| `db-only` | Dipakai hanya oleh trigger/function/view di database | `audit_logs.prev_hash` pada rantai hash |
| `migration-only` | Ada di skema Drizzle dan di database, tapi tidak disinggung kode aplikasi maupun kode database | lihat tabel di bawah |

Sinyal `app-raw` penting: gate skema dan policy singleton dibaca lewat SQL
mentah, bukan lewat Drizzle, jadi audit yang hanya melihat query Drizzle akan
menuduh kolom itu mati.

## Hasil

**58 tabel, 615 kolom, 0 kolom yang tak dikenal kode.** Tidak ada satu pun kolom
yang benar-benar tidak tersentuh: setiap kolom muncul di kode aplikasi, di kode
database, atau di migrasi.

Sebaran verdict: 313 `app`, 276 `app-write`, 7 `app-raw`, 1 `db-only`,
18 `migration-only`.

Skema dan database sinkron dua arah: 0 kolom yang dideklarasikan Drizzle tapi
tidak ada di database, dan 0 kolom database yang tidak dideklarasikan (empat
`singleton_key` dideklarasikan lewat helper bersama sebagai properti `id`).

## Yang sengaja dibuang (migrasi 191)

Lima tabel yang tidak disinggung kode mana pun — bukan query Drizzle, bukan SQL
mentah, bukan trigger, view, atau function — dan semuanya berisi nol baris:
satu klaster mechanism release-manifest yang digantikan `shared_deployment_config`
plus `runtime_config_revisions`.

| Tabel | Kolom | Baris |
|---|---|---|
| `runtime_config_release_manifests` | 13 | 0 |
| `runtime_config_backfill_runs` | 12 | 0 |
| `runtime_config_parity_evidence` | 10 | 0 |
| `runtime_config_release_domain_zones` | 3 | 0 |
| `seed_runs` (+ tipe `seed_run_status`) | 12 | 0 |

Definisinya tetap ada di `20260903000000_core_schema.sql`, jadi mechanism-nya
bisa dibangun ulang dari histori bila suatu saat dibutuhkan.

## Yang sengaja disimpan (18 kolom)

**Fitur yang belum wired — 13 kolom.** Tabelnya ada dan kosong karena
fiturnya belum ada, bukan karena kolomnya salah:

| Kolom | Kenapa disimpan |
|---|---|
| `content_reports.decided_by/decided_at/decision_note` | Jejak keputusan moderasi; modul moderasi belum menulis laporan |
| `privacy_requests.requester_user_id/decided_by/decided_at/decision_note` | Tidak ada modul privasi di repo |
| `webhook_replay_claims.outcome_reference/processed_at/outcome_ready_at` | Hasil pemrosesan replay belum pernah ditulis |
| `platform_user_permissions.provisioned_by` | Atribusi provisioning belum diisi |
| `indicate_schema_migrations.applied_at` | Punya default, belum dibaca siapa pun |
| `migration_gate_events.actual_version` | Gate membaca `required_version` + `checked_at`; nilai aktual dicatat manual |

**Tabel yang hidup, tapi sebagian kolomnya belum terisi — 5 kolom.**
`runtime_config_revisions` (8 baris, `committed_at`, `mutation_kind`),
`runtime_config_audit_logs` (1 baris, `resulting_version`),
`runtime_config_invalidation_intents` (2 baris, `partition_kind`,
`failure_category`). Tabelnya dipakai runtime-config, jadi kolomnya tidak
dilempar.

**Milik rantai audit — 1 kolom.** `audit_logs.prev_hash` dipakai function
`audit_verify_and_report`, bukan aplikasi.

## Mengapa banyak tabel kosong

Tabel kosong bukan tanda kolom hilang: jaringan belum punya konten tayang.
`articles`, `article_sites`, `article_categories`, `article_revisions`,
`publishing_jobs`, `publishing_job_targets`, `publication_transition_receipts`,
`article_site_view_days`, `object_cleanup_tasks`, `api_keys`, `invoices` kosong
karena belum ada artikel yang dipublikasikan. `content_reports`,
`privacy_requests`, `migration_gate_events`, `org_invitations`,
`org_erasure_requests` kosong karena fiturnya belum dijalankan.
