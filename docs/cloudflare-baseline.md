# Cloudflare baseline operasional

> **Status:** Living document.
> **Owner:** Platform team.
> **Last verified:** 2026-09-25 via API and HTTP.
> **Related:** [domains](domains.md) · [active domains](active-domains.md) · [production readiness runbook](production-readiness-runbook.md)

Acuan kanonis per zona + checklist zona baru + ritme tinjauan.

## Baseline zona Indicate (106 zona: 104 + utama sudah termasuk)

| Area | Nilai kanonis | Keterangan |
|---|---|---|
| Status zona | `active` | Via `GET /zones` |
| SSL | `strict` + `ssl_automatic_mode=auto` | Full strict ke origin Vercel |
| TLS | `min_tls_version=1.2`, `tls_1_3=zrt`, `always_use_https=on`, `automatic_https_rewrites=on` | — |
| Bot | `enable_js=true`, `fight_mode=true`, `ai_bots_protection=disabled`, `crawler_protection=enabled` | AI-block dimatikan sadar 2026-09-23 (tendang crawler sosial campuran, kasus facebookexternalhit 403; proteksi konten via hak cipta/ToS) |
| Page Shield | `enabled=true` | — |
| WAF kustom | `tenant probes` (skip crawler sosial #1, managed_challenge WP/env/git #2) | Maks 5 rule di Free; terpakai 2 (rollout 36/36 zona tenant 2026-09-24) |
| Rate limit | `tenant api guard` (20/10 dtk per IP, blokir 429) | Maks 1 rule di Free; sudah penuh |
| Edge cache | `Indicate edge cache` (bypass privat/auth, termasuk header `Authorization`, halaman 60 dtk, feed 600 dtk, brand bytes 1 thn) | Tidak dipasang di `safenca.id` (path app berbeda) |
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
3. Bot Fight Mode + crawler enabled, AI block OFF (keputusan sadar 2026-09-23); Page Shield on.
4. Ruleset `tenant probes` (2-rule: skip crawler sosial #1 + challenge #2) + `tenant api guard` (cek sisa kuota Free).
5. Ruleset `Indicate edge cache` (kecuali app non-Indicate).
6. `browser_cache_ttl=0`; apex + wildcard proxied; CAA 4 record.
7. Email: hardening non-kirim default; aktifkan Routing/Resend hanya bila ditunjuk.
8. DNSSEC: enable di Cloudflare, catat DS untuk input registrar.
9. Baca-balik setiap item via API sebelum serah terima.

## Ritme tinjauan

- Mingguan: laporan agregat DMARC (dashboard Cloudflare), audit log lintas tenant.
- Per perilisan: `GET /api/health`, asosiasi exact-domain Vercel tiap hostname aktif.
- Per batch tenant: jalankan checklist di atas + saga aktivasi (`DomainProvisioningService`).

## Status DS registrar (tunggakan)

- `indicate.web.id` (IDWebHost): panel tanpa menu DS mandiri — via live chat/CS.
- 9 tenant (Exabytes): butuh pengecekan panel.
- 94 bank + `safenca.id`: `pending`, diurus bertahap per batch.
