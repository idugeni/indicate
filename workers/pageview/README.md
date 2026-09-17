# Pageview Worker (terversioning)

Penerima beacon `POST https://pv.indicate.web.id/v`, pengganti worker tak
berversi yang berjalan saat ini. Satu-satunya sumber kontrak adalah
`src/modules/site/pageview-contract.ts` — worker, beacon, dan flush
membacanya bersama; jangan duplikasi skema di sini.

## Paritas perilaku (wajib dipertahankan)

| Perilaku worker lama (terobservasi) | Implementasi |
|---|---|
| `POST /v` body `{o,s,a}` → `INCR pv:{env}:{o}:{s}:{a}` | `fetch` handler + `buildPageviewKey` |
| Body tak valid (`{}`, non-JSON, >1 KB) → `204` tanpa tulis | `safeParse` gagal → `204` |
| Method/path lain → `404` | guard method + pathname |
| `content-type` bebas (`sendBeacon` kirim `text/plain`) | tidak ada gate content-type |
| Upstash mati → tetap `204` | `try/catch` menelan kegagalan |

## Status deploy (2026-09-17)

- Script `indicate-pageview` live di
  `https://indicate-pageview.officialelsa21516.workers.dev` (staging, tanpa route).
- Route `pv.indicate.web.id/*` (id `5d29d0e9a264458abce0b0090a55d356`)
  dipindah atomik dari `pv-beacon` ke `indicate-pageview`; paritas
  production terverifikasi (GET `/` → 404, POST `/v` valid → 204 + counter
  Redis `1`, key uji dibersihkan).
- Worker lama `pv-beacon` DIHAPUS pada 2026-09-17 atas instruksi owner, setelah
  paritas production terverifikasi. Arsip kode terakhirnya (1389 bytes,
  sha256 `9471A29C6387D40AA6071FD58A2790EF288695EC5950ADECCC6947EB9946DA83`)
  tersimpan di luar repo (`$TEMP/opencode/pv-beacon-legacy.js`) untuk audit;
  rollback kini berarti re-upload arsip tersebut bila diperlukan.

## Deploy awal (staging, tanpa ganggu production)

```sh
cd workers/pageview
npx -y wrangler secret put UPSTASH_REDIS_REST_URL
npx -y wrangler secret put UPSTASH_REDIS_REST_TOKEN
npx -y wrangler deploy
```

Uji ke `*.workers.dev` sebelum memindahkan domain:

```sh
curl -X POST https://indicate-pageview.<subdomain>.workers.dev/v \
  -d '{"o":"<org-uuid>","s":"<site-uuid>","a":"<artikel-uuid-uji>"}' -i
# harap 204; cek key pv:production:... muncul di Redis; DEL setelah uji
```

## Takeover `pv.indicate.web.id` (butuh kredensial Cloudflare owner)

1. Pastikan uji staging hijau dan key production terbaca cron `view-flush`.
2. Dashboard Cloudflare → Workers → `indicate-pageview` → Settings →
   Domains & Routes → tambah Custom Domain `pv.indicate.web.id`.
   Ini memindahkan domain dari worker lama — **jangan hapus worker lama**
   sebelum 1× siklus flush harian terverifikasi.
3. Rollback: kembalikan Custom Domain ke worker lama dari halaman yang sama.

## Anti-spam (tanpa kode tambahan)

Beacon anonim tidak bisa membawa secret, jadi penguatan di edge, bukan
tanda tangan: validasi UUID + batas 1 KB sudah di kode. Tambahkan di
dashboard zona `indicate.web.id` → Security → Rate Limiting satu rule
untuk hostname `pv.indicate.web.id` (mis. batas wajar per IP per menit).
