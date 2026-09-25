# Cloudflare baseline operasional

> **Status:** Living document.
> **Owner:** Platform team.
> **Last verified:** 2026-09-26 via API and HTTP (audit 134 tenant zones).
> **Related:** [domains](domains.md) · [active domains](active-domains.md) · [production readiness runbook](production-readiness-runbook.md)

Acuan kanonis per zona + checklist zona baru + ritme tinjauan.

## Baseline zona Indicate (106 zona: 104 + utama sudah termasuk)

| Area | Nilai kanonis | Keterangan |
|---|---|---|
| Status zona | `active` | Via `GET /zones` |
| SSL | `strict` + `ssl_automatic_mode=auto` | Full strict ke origin Vercel |
| TLS | `min_tls_version=1.2`, `tls_1_3=zrt`, `always_use_https=on`, `automatic_https_rewrites=on` | — |
| HSTS | `strict_transport_security` enabled, `max_age=15552000`, `include_subdomains=true`, `nosniff=true` | Wajib di checklist zona baru. Absen di zona lama 2026-09-26 (ditemukan saat onboarding batch Exabytes); sudah dipasang ulang dan terverifikasi aktif di 134/134 zona tenant |
| Performa | `early_hints=on` | Wajib di checklist zona baru; default Free `off` |
| Bot | `enable_js=true`, `fight_mode=true`, `ai_bots_protection=disabled`, `ai_training=disabled`, `ai_search=disabled`, `ai_user=disabled`, `content_bots_protection=disabled`, `crawler_protection=enabled` | AI-block dimatikan sadar 2026-09-23 (tendang crawler sosial campuran, kasus facebookexternalhit 403; proteksi konten via hak cipta/ToS) |
| Bot robots | `is_robots_txt_managed=false`, `bot_preference_sync_enabled=false`, `cf_robots_variant=policy_only` | Cloudflare managing robots.txt risks menyuntik aturan AI-crawler ke `robots.txt` milik app; dibiarkan false/policy_only agar file app yang melayani sendiri |
| Page Shield | `enabled=true` | — |
| WAF kustom | `tenant probes` (skip crawler sosial #1, managed_challenge WP/env/git #2) | Maks 5 rule di Free; terpakai 2 (rollout 36/36 zona tenant 2026-09-24) |
| Rate limit | `tenant api guard` (20/10 dtk per IP, blokir 429) | Maks 1 rule di Free; sudah penuh |
| Edge cache | `Indicate edge cache`, **tepat 4 rule**: (1) bypass privat/auth/mutasi/query tanpa batas, (2) halaman publik 60 dtk, (3) feed `sitemap.xml`/`news-sitemap.xml`/`rss.xml`/`robots.txt` 600 dtk, (4) brand bytes `/logo.png` `/icon.png` `/apple-touch-icon.png` `/manifest.webmanifest` 1 thn | Tidak dipasang di `safenca.id` (path app berbeda) |
| Browser cache TTL | `0` (hormati origin) | — |
| DNS inti | Apex + wildcard CNAME proxied ke target Vercel; CAA issue/issuewild × pki.goog/letsencrypt.org | — |
| Email non-kirim | SPF `v=spf1 -all`, DMARC reject + rua, DKIM-null `*._domainkey` | 94 bank; pengecualian di bawah |
| Email kirim+terima | Email Routing + Resend sending domain + DMARC Management | `indicate.website` (migrasi dari `indicate.web.id` 2026-09-24), `safenca.id` |
| DNSSEC | `pending` → `active` setelah DS di registrar | Di luar API; lihat tabel DS di bawah |

## Pengecualian tercatat

- `indicate.website` (zona 2026-09-24, ID `1a10a4c1…`, status `active`): apex dan wildcard
  sudah tervalidasi di Vercel; sertifikat wildcard sudah terbit. Terpasang: 16 DNS (apex+wildcard+www
  CNAME proxied ke target Vercel yang sama, A `pv`, CNAME `media`/`rsend`, CAA ×4, SPF `-all`, DMARC,
  DKIM-null, DKIM Resend, MX+SPF `send`), TLS strict/1.2/always-https/rewrite/cache-TTL-0, 5 ruleset
  (WAF 2-rule termasuk skip crawler sosial sebagai #1, rate guard, edge cache dengan bypass
  header `Authorization`, origin proof untuk API + webhook, www-ke-apex 301), Bot Fight Mode. Menyusul:
  Page Shield, Email Routing + MX, Worker route `pv`, custom domain R2 `media`, verifikasi Resend.
- `indicate.web.id`: + record `www`, `pv` (Worker pageview), Email Routing + Resend aktif. Redirect Rule `www_to_apex_301` (fase `http_request_dynamic_redirect`, ruleset `www to apex redirect`): `www.indicate.web.id` ke `https://indicate.web.id` + path, 301, preserve query — pengganti redirect domain Vercel `www` yang dilepas 2026-09-20 untuk slot kuota project. Setelah cutover: tambah Redirect Rule `apex_to_website_308` (`http.host eq "indicate.web.id"` ke `concat("https://indicate.website", http.request.uri.path)`, 308, preserve query); `api`/`webhook`/`media`/`pv` lama dual-serve sampai traffic lama habis.
- 9 tenant: DMARC + SPF + DKIM-null; tanpa Email Routing/Resend.
- `safenca.id`: tanpa `Indicate edge cache`, tanpa wildcard; Email Routing + Resend aktif.
- 94 bank: tanpa TXT kirim/terima selain hardening; tanpa record `www`/`pv`.

## Checklist zona baru (wajib sebelum dianggap selesai)

1. Zona `active`, nameserver Cloudflare terdelegasi.
2. `ssl=strict`, `ssl_automatic_mode=auto`, `always_use_https=on`, TLS 1.2+.
2b. HSTS enabled (`max_age=15552000`, `include_subdomains`, `nosniff`) + `early_hints=on`.
3. Bot Fight Mode + crawler enabled, AI block OFF (keputusan sadar 2026-09-23); Page Shield on.
4. Ruleset `tenant probes` (2-rule: skip crawler sosial #1 + challenge #2) + `tenant api guard` (cek sisa kuota Free).
5. Ruleset `Indicate edge cache` (kecuali app non-Indicate).
6. `browser_cache_ttl=0`; apex + wildcard proxied; CAA 4 record.
7. Email: hardening non-kirim default; aktifkan Routing/Resend hanya bila ditunjuk.
8. DNSSEC: enable di Cloudflare, catat DS untuk input registrar.
9. Baca-balik setiap item via API sebelum serah terima.
10. Setelah media terpasang, task invalidasi wajib memuat **base paths +
   media route twins** per hostname: `/`, `/robots.txt`, `/sitemap.xml`,
   `/rss.xml` **plus** `/logo.png`, `/icon.png`, `/apple-touch-icon.png`,
   `/manifest.webmanifest`. Kalau hanya base paths yang dipurge, route
   media menyimpan 404 basi di cache ISR dan `/logo.png` tetap `404`
   walau `logo_media_id` sudah `active` di DB — gejalanya `manifest`
   `200` tapi ketiganya `404`. Terverifikasi pada batch Exabytes #2
   (2026-09-26): DB identik dengan batch yang sehat, hanya selisih URL
   invalidasi.
11. `media.object_key` **wajib di-HEAD-kan terhadap R2 sebelum commit**.
   Jangan rekonstruksi key di SQL: script upload memakai `ymd` dari
   `new Date()` dan menyertakan slug hostname
   (`2026-09-25-site-logo-{slug}-{token}.png`), sedangkan SQL yang
   ditulis tangan mudah salah tanggal atau lupa slug. Gejalanya subtle:
   `site_settings` terisi `active`, DB lookup jalan, tapi
   `getExact()` di R2 `null` → route media `404` sementara beranda
   tetap `200`. Terverifikasi pada batch Exabytes #2: 60 key tertulis
   `2026-09-26-...` tanpa slug, sedangkan objek R2 ada sebagai
   `2026-09-25-...-{slug}-{token}.png`. Perbaikan: baca key asli dari
   R2 (`ListObjectsV2` per prefix site) lalu `HeadObject` tiap key,
   baru tulis ke DB.
12. **Audit seluruh tenant, bukan hanya batch baru.** Drift tidak pernah
   self-report: zona yang sudah `active` bisa diam-diam tertinggal. Contoh
   terverifikasi 2026-09-26 — 77 dari 134 zona tenant menyimpang pada dua
   layer yang tidak tertangkap `GET /zones`:
   `ai_bots_protection=block` + `ai_training=disallow` (68 zona, rentang
   `jejakwacana`–`wartaria`) dan Cloudflare robots management aktif pada
   9 tenant awal (`is_robots_txt_managed=true`,
   `bot_preference_sync_enabled=true`, `cf_robots_variant=off`); plus
   ruleset edge cache 3 rule tanpa brand-bytes. Semuanya diperbaiki ke kanon
   dan dibaca-balik 134/134 bersih. Dua jebakan: `using_latest_model`
   read-only sehingga `PUT` body bot management ditolak 10400 kalau ikut
   dikirim (kirim 12 field yang bisa tulis saja); dan nilai harus
   dibandingkan lewat `JSON.stringify` di kedua sisi — membandingkan string
   mentah dengan primitive melaporkan 134 zona beda padahal identik.
13. **Record `_acme-challenge` harus nol saat tangan.** TXT ACME bersifat
   transien: hanya ada selama penerbitan wildcard via
   `vercel certs issue --challenge-only`, lalu harus dihapus. End state
   yang benar adalah **tidak ada record sama sekali**, bukan "ada satu".
   Record sisa berbahaya karena klien ACME cukup banyak yang membaca satu
   nilai TXT secara naif — nilai basi terbaca dan renewal gagal; dua nilai
   di nama yang sama juga ambigu. Terverifikasi 2026-09-26: 104 dari 134
   zona menyimpan 124 record sisa, 20 di antaranya dobel. Semua dihapus,
   dibaca-balik 134/134 nol, dan invariant DNS tetap utuh (apex +
   wildcard CNAME, CAA x4, SPF, DMARC, DKIM-null) dengan 134/134 HTTPS
   `200` dan rantai TLS valid. Setelah penerbitan selesai, hapus TXT-nya di
   langkah yang sama — jangan ditunda ke tiket terpisah.

## Normalisasi 2026-09-26

Seluruh 134 zona tenant disetel ulang ke baseline di atas dan diverifikasi
dibaca-balik: 56 field `GET /zones/settings` identik di 134/134, bot
management 134/134, page shield 134/134, tiga ruleset (WAF 2 rule, rate limit
1 rule, edge cache 4 rule) 134/134, DNS 134/134 (apex + wildcard CNAME
proxied, CAA ×4, SPF, DMARC `p=reject`, DKIM-null).

Untuk preview sosial, 134 apex dan 134 `jawa-tengah` diperiksa dengan
user-agent crawler sosial: status `200`, sepuluh meta OG/Twitter lengkap,
`twitter:card=summary_large_image`, tanpa `noindex`, `og:image` `200`, serta
`/logo.png` `/icon.png` `/apple-touch-icon.png` `200` — semuanya
`cf-cache-status: HIT` setelah rule brand-bytes aktif. 220 portal kota
tersampling juga bersih.

Sisa `_acme-challenge` TXT dibersihkan di layer yang sama: 124 record di
104 zona dihapus, dibaca-balik 134/134 zona tanpa record `_acme-challenge`,
invariant DNS tetap utuh, dan 134/134 tetap HTTPS `200` dengan rantai TLS
valid.

## Ritme tinjauan

- Mingguan: laporan agregat DMARC (dashboard Cloudflare), audit log lintas tenant.
- Per perilisan: `GET /api/health`, asosiasi exact-domain Vercel tiap hostname aktif.
- Per batch tenant: jalankan checklist di atas + saga aktivasi (`DomainProvisioningService`).

## Status DS registrar (tunggakan)

- `indicate.web.id` (IDWebHost): panel tanpa menu DS mandiri — via live chat/CS.
- 9 tenant (Exabytes): butuh pengecekan panel.
- 94 bank + `safenca.id`: `pending`, diurus bertahap per batch.
