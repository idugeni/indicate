# Audit Skema: Kolom yang Dipakai dan yang Tidak

Audit tingkat kolom terhadap database produksi, dibandingkan dengan kode di repo
ini. Diregenerasi 2026-09-26 setelah migrasi 191, lalu dikoreksi setelah
migrasi 195.

## Cara kerja

Lima sinyal digabung per kolom, tidak ada yang ditebak dari nama kolom saja:

| Sinyal | Arti | Contoh |
|---|---|---|
| `app` | Referensi terqualifikasi di kode aplikasi | `sites.parentSiteId`, `mediaKeyReservations.objectKey` |
| `app-write` | Ditulis lewat kunci objek pada `values()` / `set:` | `organizationId: state.organizationId` |
| `app-raw` | Disebut di SQL mentah di dalam `.ts` | `runtime-context.ts` membaca `required_version` |
| `db-only` | Dipakai hanya oleh trigger/function/view di database | `content_reports.decided_by` ditulis `indicate_private.content_report_decide` |
| `migration-only` | Ada di skema Drizzle dan di database, tapi tidak disinggung kode aplikasi maupun kode database | lihat bagian bawah |

Dua jebakan sempat menuduh kolom yang sebenarnya hidup. Pertama, gate skema
dan policy singleton dibaca lewat SQL mentah, bukan lewat Drizzle. Kedua, dan
yang lebih besar: **10 kolom yang semula saya laporkan "fitur belum di-wire"
justru ditulis oleh function SQL** — `decided_by`, `decision_note`,
`requester_user_id`, dan `processed_at`/`outcome_ready_at` semuanya disentuh
`indicate_private.privacy_request_decide`, `content_report_decide`, dan friends.
Sinyal `db-only` kini hanya cocok bila function itu **sekaligus** menyebut
nama tabelnya, supaya `status` atau `version` tidak lagi cocok di seluruh
definisi function.

## Hasil

**58 tabel, 615 kolom, 0 kolom yang tak dikenal kode.** Tidak ada satu pun kolom
yang benar-benar tidak tersentuh: setiap kolom muncul di kode aplikasi, di kode
database, atau di migrasi.

Sebaran verdict: 313 `app`, 276 `app-write`, 7 `app-raw`, 16 `db-only`,
3 `migration-only`.

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

## Tiga kolom yang benar-benar belum tersentuh

Setelah koreksi di atas, hanya tiga kolom yang tidak disinggung kode aplikasi
maupun routine database. Ketiganya sudah ditangani, bukan dibiarkan:

| Kolom | Seatnya | Tindakan |
|---|---|---|
| `indicate_schema_migrations.applied_at` | Ada isinya, tidak pernah dibaca | Gate skema kini membaca `applied_at` dari baris ledger terbaru dan menyebutkannya di pesan penolakan, jadi "migrasi mana yang hilang dan kapan kita berhenti menerapkannya" bisa dijawab dari log |
| `migration_gate_events.actual_version` | Gate menolak tanpa mencatat apa pun | Gate mencatat penolakan ke `migration_gate_events` (best-effort, tidak boleh menutupi penolakan itu sendiri) sehingga jejaknya bisa diaudit |
| `webhook_replay_claims.outcome_reference` | Sisa desain lama; hasil replay sudah ada di `outcome`, `processed_at`, `outcome_ready_at` | Dihapus (migrasi 195), setelah dijamin nol baris memegangnya |

Kolom yang sempat saya laporkan "fitur belum di-wire" ternyata hidup: tenth
`decided_by`, `decision_note`, `requester_user_id`, `processed_at`, dan
`outcome_ready_at` ditulis oleh function `indicate_private` yang dipanggil
`ModerationService` dan `WebhookService`. `platform_user_permissions.provisioned_by`
juga dibaca lewat function provisioning platform.

**Tabel yang hidup, tapi sebagian kolomnya belum terisi — 5 kolom.**
`runtime_config_revisions` (8 baris, `committed_at`, `mutation_kind`),
`runtime_config_audit_logs` (1 baris, `resulting_version`),
`runtime_config_invalidation_intents` (2 baris, `partition_kind`,
`failure_category`). Tabelnya dipakai runtime-config, jadi kolomnya tidak
dilempar.

**Milik rantai audit — 1 kolom.** `audit_logs.prev_hash` dipakai function
`audit_verify_and_report`, bukan aplikasi.

## Temuan yang terbukti bukan kebocoran

Tiga hal yang terlihat seperti sisa data, tapi memang benar begitu:

- **`Drill Expire` tidak bisa dihapus, dan itu oleh desain.** Tenant parked itu
  punya 4 baris `audit_logs`, dan `audit_logs.organization_id` memakai
  `ON DELETE RESTRICT`. Menghapusnya berarti merusak rantai audit append-only.
  Yang bisa dilakukan adalah membiarkannya parked (0 member, 0 role, 0 domain,
  1 subscription) dan tidak mengklaim ia bisa di administers.
- **60 aset organisasi belum punya konsumen.** Semuanya `organization_asset`,
  byte-nya identik satu checksum untuk 60 file, dan tidak ada template portal
  publik yang merender logo institusi: blok afiliasi di portal menampilkan
  atribusi teks. Data afiliasi (6136 baris) sudah tampil di dashboard, jadi
  yang belum ada adalah consumer publiknya — itu pekerjaan tahap berikutnya,
  bukan sesuatu yang bisa dibersihkan.
- **Setiap institusi punya dua record publisher, itu memang desain.** Yang satu
  di operator org sebagai record klaim (dengan 6136 afiliasi), yang satu lagi di
  org tenant sebagai profil. Keduanya hidup: yang operator dipakai logika
  atribusi publik, yang tenant dipakai dashboard tenant.

## Mengapa banyak tabel kosong

Tabel kosong bukan tanda kolom hilang: jaringan belum punya konten tayang.
`articles`, `article_sites`, `article_categories`, `article_revisions`,
`publishing_jobs`, `publishing_job_targets`, `publication_transition_receipts`,
`article_site_view_days`, `object_cleanup_tasks`, `api_keys`, `invoices` kosong
karena belum ada artikel yang dipublikasikan. `content_reports`,
`privacy_requests`, `migration_gate_events`, `org_invitations`,
`org_erasure_requests` kosong karena fiturnya belum dijalankan.

## Koreksi setelah audit

Tiga koreksi yang berasal dari pemeriksaan lanjutan, bukan dari tebakan:

- **Publisher tidak memiliki domain.** Laporan sebelumnya menyebut "9 publisher
  diarsipkan memiliki 104 domain aktif"; itu keliru. `domains` dan `sites`
  dimiliki oleh `organization_id`, bukan publisher, jadi 9 record `archived` di
  operator org tidak memiliki domain dan tidak memblokir apa pun: aset
  organisasinya tetap terotorisasi lewat 59 publisher institusinya yang `active`.
  Status `archived` pada record `verified` adalah terminal state yang sah,
  bukan residu, jadi ketiganya tetap seperti adanya.
- **Hold litigasi sudah dibuang** (migrasi 193). Satu-satunya baris di
  `litigation_holds` adalah uji coba terhadap tenant `Drill Expire`, dibuat
  dan dilepas dalam rentang 20 detik.
- **Reservasi upload yang usang sudah bersih** (migrasi 194). 54 baris
  `used` tanpa `media` — semuanya milik operator, 27 target apex yang
  sudah punya logo dan favicon — dihapus, dan grace sweep diturunkan dari
  7 hari ke 3 hari karena otorisasi upload hanya berlaku hitungan menit.
