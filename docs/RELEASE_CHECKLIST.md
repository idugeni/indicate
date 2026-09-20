# Checklist Rilis Production + Runbook Pemantauan (advisory)

Pelengkap `docs/PRODUCTION_READINESS_RUNBOOK.md` (readiness + rollback) dan
`docs/MIGRATIONS.md` (prosedur migrasi). Dokumen ini mengatur urutan kerja
rilis: pra-rilis → promosi → smoke test → pemantauan bertahap → rollback.

Topologi tidak berubah saat rilis: satu project Vercel `indicate` (`sin1`),
satu database Supabase, satu bucket R2 privat, satu resource Upstash Redis.

## 1. Pra-rilis

- [ ] Quality gate hijau di commit yang akan dirilis
      (`.github/workflows/quality-gate.yml`): `static`
      (`db:bootstrap:check`, `typecheck`, `npm audit`), `lint`,
      `test` (4 shard), `perf` (`npm run perf`), `build`.
      Cek manual setara: `npm run typecheck`, `npm run lint`,
      `npm test`, `npm run perf`.
- [ ] Migrasi database (bila ada file baru di `src/data/migrations/`):
      backup Supabase dulu, terapkan tiap file SQL sesuai urutan
      `src/data/migrations/meta/_journal.json` dengan kredensial direct
      (`DATABASE_DIRECT_URL`), lalu verifikasi `GET /api/health`
      melaporkan snapshot version yang diharapkan. Rujukan:
      `docs/MIGRATIONS.md`. Tanpa migrasi baru: konfirmasi tidak ada
      drift (`npm run db:bootstrap:check` sudah mencakup di gate).
- [ ] Kompatibilitas rollback: rilis ini tidak menghapus kolom/tabel yang
      masih dibaca deployment sebelumnya (aturan expand → backfill →
      verify → contract). Bila ada perubahan destruktif, siapkan migrasi
      forward perbaikan, bukan revert metadata.
- [ ] Kuota domain Vercel: project di 50/50 (`docs/active-domains.md`).
      Rilis yang menambah domain butuh penaikan limit dulu — rilis kode
      tidak membuka slot.
- [ ] Secret/env production lengkap via server-only environment; tidak ada
      kredensial di argumen perintah, log, atau file repo.
- [ ] Cron `vercel.json` tidak terhapus (keep-alive `/api/health`,
      reconciler publishing/delivery, maintenance).

## 2. Promosi

- [ ] Promosikan artifact yang sudah di-build ke project Vercel yang sama.
      Dilarang membuat project, database, bucket, atau Redis kedua.
- [ ] Tunggu deployment `Ready`; catat deployment ID + commit sebagai
      identitas rilis dan kandidat rollback sebelumnya (deployment
      schema-compatible terakhir).

## 3. Smoke test pasca-deployment (production)

Pakai `scripts/qa/preview-headers.mjs` dengan URL production
(Cloudflare mem-proxy-kan tenant; skrip hanya butuh HTTPS):

```powershell
$env:TENANT_URL="https://wonosobo.fakta01.my.id"
$env:DASHBOARD_URL="https://indicate.web.id"
node scripts/qa/preview-headers.mjs
```

- [ ] Exit 0: tenant `/` 200 + edge-cacheable, `/dashboard/billing`
      dan `/sign-in` `private, no-store, max-age=0`, seal anonim
      fail-closed 404.
- [ ] Ulangi untuk minimal 1 apex + 1 regional kedua
      (contoh daftar hidup di `docs/active-domains.md`) — cache dan
      isolasi bersifat per-host.
- [ ] `GET /api/health` valid (configuration + snapshot version).
- [ ] Bila rilis menyentuh billing: ulangi skrip dengan
      `PREVIEW_SESSION_COOKIE`, `PREVIEW_INVOICE_ID`,
      `PREVIEW_ORGANIZATION_ID` menunjuk data production yang valid;
      `sign` 200 image tanpa `s-maxage`, `stamp` 200 PNG berbeda byte.

## 4. Pemantauan bertahap (Vercel Dashboard → project `indicate`)

| Waktu | Titik pantau | Sinyal sehat |
|---|---|---|
| T+15 mnt | Runtime Logs (error), Speed Insights | Nol error baru; tidak ada lonjakan 4xx/5xx per host |
| T+15 mnt | Fluid Compute → Active CPU | Sejalan baseline deploy sebelumnya; waspadai fungsi seal `stamp` bila rilis menyentuh watermark |
| T+1 jam | Edge Requests volume per domain | Distribusi antar-tenant wajar; tidak ada 1 host menyedot traffic abnormal |
| T+1 jam | Fast Origin Transfer + cache hit ratio tenant `/` | Hit ratio kembali ke baseline (publish pertama pasca-rilis wajar MISS lalu HIT) |
| T+24 jam | Cron runs `vercel.json` | Semua jadwal `Succeeded`; `invalidation_tasks` dan antrean publishing drain normal |
| T+24 jam | Billing/usage vs baseline | Tidak ada lonjakan Function Invocations atau Bandwidth di luar pola traffic |

## 5. Triase anomali per-tenant

1. Identifikasi tenant dari hostname pada log/metric — jangan blokir
   lintas tenant; isolasi bersifat per-host (`src/proxy.ts`).
2. Tentukan lapisannya: 5xx + Active CPU naik = origin (aplikasi/DB);
   hit ratio jatuh + origin transfer naik = lapis cache (cek
   `invalidation_tasks` macet); 404 massal 1 host = mapping
   Site/hostname atau asosiasi domain Vercel (`docs/active-domains.md`).
3. Bila 1 tenant terpengaruh dan tenant lain sehat, tangani sebagai
   insiden mapping/konten tenant tersebut (reconciler, revalidasi,
   purge selektif tag/path) sebelum mempertimbangkan rollback global.

## 6. Rollback cepat

- [ ] Target: deployment schema-compatible terakhir di project yang sama.
      Otoritas Cloudflare (NS/DNS/wildcard/TLS/CDN) tidak disentuh.
- [ ] Pastikan rollback tidak menjalankan operasi schema destruktif;
      antrean (publication, activation, invalidation, cleanup) tetap
      durable dan resumable.
- [ ] Setelah rollback: ulangi smoke test §3 + readiness check
      `PRODUCTION_READINESS_RUNBOOK.md`, lanjutkan reconciler yang
      bounded, catat kategori kegagalan + ID rilis di sistem insiden.
