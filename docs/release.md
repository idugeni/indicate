# Rilis production, kesiapan, dan rollback

> **Status:** Advisory (longgar sejak 2026-09-14 — checklist yang direkomendasikan, bukan gate keras).
> **Owner:** Platform team.
> **Trigger:** setiap rilis dan setiap keputusan rollback.
> **Related:** [migrations](migrations.md) · [cloudflare baseline](cloudflare-baseline.md) · [active domains](active-domains.md) · [architecture](architecture.md)
> **Menggantikan:** `production-readiness-runbook.md` dan `release-checklist.md`, dihapus 2026-09-29.

Gabungan dua dokumen yang sebelumnya terpisah: runbook readiness/rollback
(`production-readiness-runbook.md`) dan checklist urutan rilis
(`release-checklist.md`). Keduanya mengurusi satu peristiwa, jadi satu file
menggantikan dua file yang mengulang langkah yang sama.

Topologi tidak berubah saat rilis: satu project Vercel `indicate` (`sin1`),
satu database Supabase, dua bucket R2 media (privat + publik) + bucket audit
WORM opsional, satu resource Upstash Redis. Cloudflare tetap otoritatif untuk
nameserver, DNS, wildcard, proxy TLS, dan CDN; Vercel hanya hosting dengan
asosiasi exact Site-domain. Tidak ada rilis yang boleh membuat project,
database, bucket, Redis, atau template kedua.

---

## Bagian A — Kesiapan (readiness)

### A1. Prakondisi

1. `npm run typecheck` dan `npm run lint` — warning harus nol, tapi output
   non-nol memberi peringatan, tidak memblokir dalam mode longgar.
2. Terapkan seluruh migrasi forward yang sudah ditinjau memakai kredensial
   migrasi langsung, sesuai urutan `src/data/migrations/meta/_journal.json`.
   Gate skema membandingkan skema terpasang dengan
   `migration_gate_events.required_version` saat inisialisasi
   `registerServerRuntime`; selisih memberi peringatan, bukan blokir.
3. Konfigurasikan kredensial production hak akses minimum lewat env
   server-only. Sertakan kredensial management-plane Cloudflare (untuk
   memeriksa privasi R2) dan kredensial S3 R2 access-key/secret (untuk data
   plane media dan probe `HeadBucket` read-only). Jangan pernah meletakkan
   kredensial di argumen perintah, log, fixture, laporan, atau file repo.
4. Pastikan setiap hostname Site exact sudah terkonfigurasi. Rentang
   pemeriksaan bersifat read-only.

### A2. Item yang hanya bisa dikerjakan owner

- **Audit WORM Cloudflare R2:** bucket `indicate-audit-worm` + lock
  `worm-indefinite` + `R2_AUDIT_BUCKET_NAME` (env production). Kredensial
  audit opsional: `runtime-context.ts` jatuh ke
  `R2_ACCESS_KEY_ID`/`R2_SECRET_ACCESS_KEY` bila `R2_AUDIT_ACCESS_KEY_ID`
  kosong, dan kredensial media itu sudah mencakup bucket WORM. Cron harian
  `30 5 * * *` UTC menulis hari sebelumnya. Konfirmasi cakupan lewat prefiks
  `worm/<YYYY-MM-DD>/` di bucket — **bukan** dari `retention_runs` (baris bukti
  memakai waktu jalan, bukan hari yang diekspor) dan **bukan** dari keberadaan
  objek saja, karena sebuah manifest bisa ada untuk hari yang tidak menarsipkan
  apa pun. Yang diperiksa adalah `audit_logs.jsonl` di manifest: `bytes > 0`
  dan `sha256` bukan `e3b0c442…` (hash string kosong).
- **Verifikasi wajib setelah mengubah env atau redeploy**, karena variabel
  env baru tidak masuk ke deployment yang sudah berjalan: panggil
  `GET /api/internal/maintenance/worm-export?date=<hari-lama>` pada host
  aplikasi (`indicate.website`, bukan host tenant) dengan
  `Authorization: Bearer $CRON_SECRET`. `404` = token ditolak, `503` =
  `R2_AUDIT_BUCKET_NAME` belum aktif di deployment itu, `200` = aktif.
  Kesalahan sebelumnya: "hanya `.env` lokal yang kosong, jadi pasti produksi
  aman" — keduanya kosong, dan ekspor berhenti 2026-09-13 tanpa ada yang
  melihat karena 503 terjadi di dalam cron.
- **Per enterprise deal:** tandatangani SOW
  ([templates/sow-template.md](templates/sow-template.md)) + DPA
  ([dpa.md](dpa.md)); pastikan kapasitas plan Vercel cukup untuk domain baru.

### A3. Pemeriksaan produksi

Tidak ada otomatisasi readiness yang dikirim di tree ini; jalankan setiap
pemeriksaan berikut manual di environment production dengan
`NODE_ENV=production`. Pemeriksaan memvalidasi Runtime Configuration lengkap,
lalu mengecek:

- urutan migrasi terpasang terhadap `meta/_journal.json`, gate
  `migration_gate_events.required_version`, dan versi snapshot konfigurasi
  (muncul via `GET /api/health` sebagai `configurationVersion`);
- kesehatan Supabase Auth dan konektivitas PostgreSQL;
- kesehatan data plane S3 `HeadBucket` pada bucket terkonfigurasi memakai
  kredensial media production, tidak adanya custom domain publik, dan
  managed public domain yang dinonaktifkan;
- konektivitas Upstash;
- cron secret production-bounded tanpa mencetak nilainya;
- kontrak topologi satu-berbasis-divided-resource;
- nameserver yang ditugaskan Cloudflare dan.nameserver yang ter-delegasi publik
  untuk setiap root domain (dihitung live, **tidak pernah** dari angka tetap);
- route CNAME apex dan wildcard yang ter-proxy serta mode Full (strict);
- HTTPS sukses melalui Cloudflare untuk setiap apex/regional Site
  (dihitung live dari Site aktif, **tidak pernah** dari angka tetap);
- asosiasi exact-domain terverifikasi dengan satu project Vercel untuk setiap
  Site terkonfigurasi;
- pemetaan database exact, aktif, dan koheren per organisasi untuk setiap
  Site terkonfigurasi;
- efikasi dan isolasi Cache Components: publish/unpublish pada satu Site
  menyelesaikan `invalidation_tasks`-nya (dispatcher: Next tags + paths +
  purge Cloudflare + Redis bump) dan perubahannya terlihat di portal Site itu
  dalam batas `cacheLife` `minutes`, sementara portal Site lain tidak
  menunjukkan perubahan dan tidak ada konten lintas host;
- kesehatan delivery tertunda: balasan latar selesai setelah respons 200;
  hanya baris kegagalan tertunda tingkat `warn` — bukan kegagalan respons —
  yang sah sebagai bukti downstream lambat;
- smoke navigasi instan: transisi klien antar halaman control-plane dan
  listing/detail portal selesai tanpa full reload atau layout shift; titik
  pending di header hanya muncul pada transisi yang benar-benar lambat;
- structured data: JSON-LD NewsArticle/Breadcrumb/Organization/WebSite per
  template portal lolos Rich Results/Schema tanpa canonical atau URL lintas
  tenant;
- currency platform: Node.js project Vercel = 24 (repo pin 24 lewat `.nvmrc`);
  env `CRON_SECRET` sama dengan cron secret terkonfigurasi (Vercel Cron
  mengirimnya otomatis sebagai Bearer) dan kedua route cron internal
  (`/api/internal/publishing` GET, `/api/internal/delivery/reconcile`
  GET/POST) hanya merespons terautentikasi; cron keep-alive harian
  `/api/health` dari `vercel.json` terdaftar (mencegah auto-pause Supabase
  Free — jangan dihapus selama masih di plan Free);
- postur proteksi edge: tepat satu lapisan memiliki tiap aturan — Vercel Bot
  Protection/WAF ruleset untuk penyalahgunaan portal dan Cloudflare Cache
  Rules (halaman/feed portal, Tiered Cache; jangan pernah 307 media
  bertanda tangan) — dengan kuota purge Cloudflare diverifikasi terhadap
  volume fan-out publish.

Laporan sukses hanya berisi nama pemeriksaan, `passed`, dan kategori `ready`.
Laporan gagal hanya berisi kategori sanitized yang stabil. Body provider, token,
signed URL, database URL, identifier root, dan error internal tidak pernah
dieksekusi. Respons provider yang tidak tersedia, ambigu, tidak lengkap,
publik, tidak cocok, atau tak terduga memberi peringatan (advisory), bukan
kegalan keras, dalam mode longgar.

Tidak ada pemeriksaan yang menulis ke PostgreSQL, R2, Redis, Cloudflare,
Vercel, atau Telegram production. Perilaku tulis di luar cakupan pemeriksaan
read-only ini.

### A4. Batasan provider dan perilaku advisory

- Kesehatan provider membuktikan keterjangkauan dan kontrak yang diperiksa pada
  saat pemeriksaan; itu tidak menjamin ketersediaan di masa depan.
- API DNS Cloudflare dan domain Vercel bisa eventually consistent. Retry
  setelah workflow aktivasi/rekonsiliasi yang dipersistensi konvergen;
  melewati kegagalan butuh persetujuan owner.
- Validasi privasi R2 butuh izin API Cloudflare untuk membaca state bucket
  domain terkelola dan kustom. Probe data plane S3 `HeadBucket` read-only
  memakai kredensial R2 access-key/secret yang sama dengan operasi media
  production; kredensial yang hilang, invalid, atau tidak cocok memberi
  peringatan (bukan kegagalan keras) dalam mode longgar.
- Telegram mengekspos webhook URL tetapi bukan secret token yang
  dikonfigurasi. Setiap pemeriksaan memvalidasi kontrak secret sisi server dan
  URL yang tepat.
- Pemeriksaan HTTPS butuh marker respons Cloudflare dan respons `robots.txt`
  Site yang sukses. Pembatasan jaringan atau marker Cloudflare yang hilang
  memberi peringatan dalam mode longgar.

---

## Bagian B — Urutan rilis

### B1. Pra-rilis

- [ ] Quality gate hijau pada commit yang akan dirilis
      (`.github/workflows/quality-gate.yml`): `static`
      (`db:bootstrap:check`, `typecheck`, `audit:production`), `lint`,
      `test` (4 shard), `perf` (`npm run perf`), `docs`
      (`npm run lint:md`, `npm run lint:md:citations`, link check), `build`.
      Cek manual setara: `npm run typecheck`, `npm run lint`,
      `npm test`, `npm run perf`, `npm run lint:docs`.
- [ ] Migrasi database (bila ada file baru di `src/data/migrations/`):
      backup Supabase dulu, terapkan tiap file SQL sesuai urutan
      `src/data/migrations/meta/_journal.json` dengan kredensial direct
      (`DATABASE_DIRECT_URL`), lalu verifikasi `GET /api/health`
      melaporkan snapshot version yang diharapkan. Rujukan:
      [migrations](migrations.md). Tanpa migrasi baru: konfirmasi tidak ada
      drift (`npm run db:bootstrap:check` sudah mencakup di gate).
- [ ] Kompatibilitas rollback: rilis ini tidak menghapus kolom/tabel yang
      masih dibaca deployment sebelumnya (aturan expand → backfill →
      verify → contract). Bila ada perubahan destruktif, siapkan migrasi
      forward perbaikan, bukan revert metadata.
- [ ] Domain Vercel: hitung **live** dari `list_project_domains`
      (`teamId team_HvgOzoFV92X1vjzqQkczC8kK`, project `indicate`, paginasikan
      sampai habis) dan pastikan `verified: false` = 0. Jangan pakai angka
      yang tertulis di dokumen mana pun — angkanya basi dalam hitungan
      minggu, dan tiga dokumen pernah berbeda: 50, 213, dan 222 untuk
      keadaan yang sama. Acuan: 273 asosiasi (2026-09-29) = 134 apex exact +
      135 wildcard + 3 control-plane + 1 `vercel.app`. Plan Pro tidak
      membatasi jumlah custom domain, jadi yang dicek adalah verifikasi,
      bukan kuota.
- [ ] Secret/env production lengkap via server-only environment; tidak ada
      kredensial di argumen perintah, log, atau file repo.
- [ ] Cron `vercel.json` tidak terhapus (reconciler publishing/delivery,
      maintenance, ekspor audit WORM harian).

### B2. Promosi

- [ ] Promosikan artifact yang sudah di-build ke project Vercel yang sama.
      Dilarang membuat project, database, bucket, atau Redis kedua.
- [ ] Tunggu deployment `Ready`; catat deployment ID + commit sebagai
      identitas rilis dan kandidat rollback sebelumnya (deployment
      schema-compatible terakhir).
- [ ] Simpan diagnostik gate dan laporan readiness tersanitasi sebagai bukti
      rilis.
- [ ] Verifikasi skenario matriks regional untuk publishing, seleksi publik,
      media, SEO, partisi cache, penolakan yang tidak membocorkan, analytics,
      status/link Telegram, dan scoping audit bila praktis.
- [ ] Jalankan ulang pemeriksaan kesiapan (§A3) pasca-promosi dan lakukan
      smoke test terbatas pada route control-plane dan host publik
      terkonfigurasi.

### B3. Smoke test pasca-deployment (production)

Pakai `scripts/qa/preview-headers.mjs` dengan URL production
(Cloudflare mem-proxy-kan tenant; skrip hanya butuh HTTPS):

```powershell
$env:TENANT_URL="https://wonosobo.fakta01.my.id"
$env:DASHBOARD_URL="https://indicate.website"
node scripts/qa/preview-headers.mjs
```

- [ ] Exit 0: tenant `/` 200 + edge-cacheable, `/dashboard/billing`
      dan `/sign-in` `private, no-store, max-age=0`, seal anonim
      fail-closed 404.
- [ ] Ulangi untuk minimal 1 apex + 1 regional kedua
      (contoh daftar hidup di [active domains](active-domains.md)) — cache dan
      isolasi bersifat per-host.
- [ ] `GET /api/health` valid (configuration + snapshot version).
- [ ] Bila rilis menyentuh billing: ulangi skrip dengan
      `PREVIEW_SESSION_COOKIE`, `PREVIEW_INVOICE_ID`,
      `PREVIEW_ORGANIZATION_ID` menunjuk data production yang valid;
      `sign` 200 image tanpa `s-maxage`, `stamp` 200 PNG berbeda byte.

### B4. Pemantauan bertahap (Vercel Dashboard → project `indicate`)

| Waktu | Titik pantau | Sinyal sehat |
|---|---|---|
| T+15 mnt | Runtime Logs (error), Speed Insights | Nol error baru; tidak ada lonjakan 4xx/5xx per host |
| T+15 mnt | Fluid Compute → Active CPU | Sejalan baseline deploy sebelumnya; waspadai fungsi seal `stamp` bila rilis menyentuh watermark |
| T+1 jam | Edge Requests volume per domain | Distribusi antar-tenant wajar; tidak ada 1 host menyedot traffic abnormal |
| T+1 jam | Fast Origin Transfer + cache hit ratio tenant `/` | Hit ratio kembali ke baseline (publish pertama pasca-rilis wajar MISS lalu HIT) |
| T+24 jam | Cron runs `vercel.json` | Semua jadwal `Succeeded`; `invalidation_tasks` dan antrean publishing drain normal |
| T+24 jam | Billing/usage vs baseline | Tidak ada lonjakan Function Invocations atau Bandwidth di luar pola traffic |

### B5. Triase anomali per-tenant

1. Identifikasi tenant dari hostname pada log/metric — jangan blokir
   lintas tenant; isolasi bersifat per-host (`src/proxy.ts`).
2. Tentukan lapisannya: 5xx + Active CPU naik = origin (aplikasi/DB);
   hit ratio jatuh + origin transfer naik = lapis cache (cek
   `invalidation_tasks` macet); 404 massal 1 host = mapping
   Site/hostname atau asosiasi domain Vercel
   ([active domains](active-domains.md)).
3. Bila 1 tenant terpengaruh dan tenant lain sehat, tangani sebagai
   insiden mapping/konten tenant tersebut (reconciler, revalidasi,
   purge selektif tag/path) sebelum mempertimbangkan rollback global.

---

## Bagian C — Rollback

Rollback berarti memilih deployment aplikasi terakhir yang schema-compatible di
project Vercel yang sama. Sebelum rollback, verifikasi:

- target aplikasi mendukung skema yang sedang terpasang;
- otoritas Cloudflare (NS/DNS/wildcard/proxy/TLS/CDN) tetap tidak berubah;
- tidak akan dibuat aplikasi, project, database, bucket, Redis, atau template
  kedua;
- job publication, percobaan aktivasi, task invalidation, task cleanup, resi
  transisi, dan hasil webhook tetap durable dan resumable;
- rollback tidak menjalankan operasi schema destruktif.

### C1. Cepat

- [ ] Target: deployment schema-compatible terakhir di project yang sama.
      Otoritas Cloudflare (NS/DNS/wildcard/TLS/CDN) tidak disentuh.
- [ ] Pastikan rollback tidak menjalankan operasi schema destruktif;
      antrean (publication, activation, invalidation, cleanup) tetap
      durable dan resumable.

### C2. Setelah rollback

1. Jalankan ulang pemeriksaan kesiapan (§A3).
2. Lanjutkan reconciler bounded untuk kerja antrean durable, lease, aktivasi,
   invalidasi, dan cleanup.
3. Konfirmasi pemetaan host publik, isolasi Site, otorisasi media, dan
   perilaku noindex pada error.
4. Ulangi smoke test §B3.
5. Catat kategori kegagalan tersanitasi, identifier rilis, dan keputusan
   operasional di sistem insiden/change yang disetujui. Jangan pernah menyalin
   secret atau respons mentah provider.

---

## Catatan akhir

Dokumen ini advisory. Checkbox di Bagian B adalah rekomendasi, bukan blokir;
kegagalan memberi peringatan dan promosi boleh lanjut dengan persetujuan
owner serta catatan risiko yang tercatat. Yang tidak bisa ditawar tetap tiga
hal: satu project, satu database, dan Cloudflare di depan.
