# Status Domain Aktif

> **Status:** Living ledger — perbarui setiap ada aktivasi/penonaktifan domain.
> **Owner:** Platform team.
> **Last verified:** 2026-09-24 (mulai migrasi `indicate.web.id` → `indicate.website`, dual-serve; kode + config + test + docs dialihkan ke host baru; zona CF baru + asosiasi Vercel + alih env menyusul).

## Migrasi domain utama (2026-09-24, dual-serve)

Baru: `indicate.website` (+ `api.`, `webhook.`, `media.`, `pv.`, `www.`). Lama
(`indicate.web.id` + sub) tetap hidup sampai cutover: redirect 308 Cloudflare untuk
apex/`www` lama (preserve path+query); `api`/`webhook`/`media`/`pv` lama dual-serve.
Zona baru `active` 2026-09-24 (NS terdelegasi via API Vercel): 16 DNS, TLS strict,
5 ruleset, Email Routing ready (catch-all drop, mirror zona lama), Worker route `pv`,
R2 `media` (ownership active, SSL pending), Resend verify berjalan.
HTTP: apex baru 200 halaman unknown-host bermerek + `noindex` (status pra-cutover yang benar;
env+deploy baru belum dialihkan); `api.` 404 dan `pv.` SSL pending — normal pra-cutover.
Cutover selesai 2026-09-24: deploy `ab3a9c2` READY (kode+env baru), apex baru 200 dashboard
asli, `api.` 200, redirect 308 lama-ke-baru terverifikasi (`/tentang?x=1` utuh).
Supabase redirect baru ditambahkan manual; Site URL lama diganti saat pensiun.
Pensiun 2026-09-25: DB nol referensi host lama (articles cover/body/canonical +
publishing targets 0); `.env` lokal pengirim baru; asosiasi Vercel `api.`/`webhook.` lama
dilepas (51 domain; apex lama dipertahankan untuk redirect); DNS/route lama tetap dual-serve.
Template email Auth live disinkron via `supabase config push` (13 konten + admin_email baru).
Terblokir saat ini: kuota Vercel 50/50 (tambah domain baru menunggu Pro riil/limit naik)
dan zona Cloudflare baru belum dibuat (tanpa tool create-zone di MCP; via dashboard),
lalu NS registrar. Email ikut pindah (Resend sending domain + Supabase Auth + 13 template).
Resend domain `indicate.website` sudah dibuat 2026-09-24
(ID `f2cd59b7-faa2-47ab-a696-34bb1bafe514`, us-east-1, sending enabled / receiving disabled,
tracking off; status `not_started`). Record DNS pending (pasang setelah zona CF aktif):
`resend._domainkey` TXT DKIM, `send` MX `feedback-smtp.us-east-1.amazonses.com` (10),
`send` TXT `v=spf1 include:amazonses.com ~all`, `rsend` CNAME `send.forge.rmta.net`.
> **Related:** [domains](domains.md) · [cloudflare baseline](cloudflare-baseline.md) · [release checklist](release-checklist.md)

## Kuota Vercel

Project `indicate`: **53 domain — CAP HILANG sejak Pro riil 2026-09-24**
(`indicate.website`, `api.indicate.website`, `webhook.indicate.website` tertambah via API,
semua langsung `verified:true`; riwayat 50/50 saat trial ada di bawah).
`api.`/`webhook.` baru tercakup wildcard CNAME zona baru, tanpa DNS tambahan.
`docs.indicate.web.id` dilepas via `DELETE /v9/projects/:id/domains` karena
surface docs dihapus penuh dari codebase (config, proxy, route `(docs)`,
modul `src/modules/docs`, `openapi.json`, `docs-opengraph-image`, guard,
test, tautan README/SUPPORT). DNS Cloudflare tidak punya record khusus
`docs` (tercakup wildcard), jadi tidak ada yang dihapus di sana.
`www.indicate.web.id` (dulu redirect 301 Vercel → apex) dipindah ke
Cloudflare Redirect Rule `www_to_apex_301`
(`http.host eq "www.indicate.web.id"` → `concat("https://indicate.web.id",
http.request.uri.path)`, 301, preserve query; ruleset
`www to apex redirect`, fase `http_request_dynamic_redirect`,
terverifikasi live `/` dan `/tentang?x=1`), lalu domain dilepas dari Vercel.
Sisa 0 slot; penambahan berikutnya tetap butuh penaikan limit
(`project_domain_limit_reached`, "maximum allowed number of domains
(50) ... contact sales").

## Fokus Wonosobo

Region `wonosobo` (org Pengelola Platform) — 10/10 subdomain aktif, template mengikuti apex masing-masing. Tidak ditemukan domain nonaktif di DB, Vercel, maupun HTTP: tidak ada yang perlu diaktivasi.

| Hostname | Site | Template | DB | Vercel | HTTP |
|---|---|---|---|---|---|
| wonosobo.fakta01.my.id | Fakta01 Wonosobo | dark-navy | active/active | verified | 200 |
| wonosobo.jurnalism.web.id | Jurnalism Wonosobo | red-editorial | active/active | verified | 200 |
| wonosobo.kabar360.biz.id | Kabar360 Wonosobo | soft-blue | active/active | verified | 200 |
| wonosobo.liputan99.web.id | Liputan99 Wonosobo | glassy-blue | active/active | verified | 200 |
| wonosobo.nusantara24.web.id | Nusantara24 Wonosobo | orange-modern | active/active | verified | 200 |
| wonosobo.pantaunusantara.web.id | PantauNusantara Wonosobo | warm-editorial | active/active | verified | 200 |
| wonosobo.penamerdeka.my.id | PenaMerdeka Wonosobo | purple-editorial | active/active | verified | 200 |
| wonosobo.suarafakta24.biz.id | SuaraFakta24 Wonosobo | clean-blue | active/active | verified | 200 |
| wonosobo.wartakini7.web.id | WartaKini7 Wonosobo | green-minimal | active/active | verified | 200 |
| wonosobo.wawasannusa.biz.id | WawasanNusa Wonosobo | black-lime | active/active | verified | 200 |

## Apex (induk, 10/10 aktif)

| Hostname | Site | Template | DB | Vercel | HTTP |
|---|---|---|---|---|---|
| fakta01.my.id | Fakta01 | dark-navy | active/active | verified | 200 |
| jurnalism.web.id | Jurnalism | red-editorial | active/active | verified | 200 |
| kabar360.biz.id | Kabar360 | soft-blue | active/active | verified | 200 |
| liputan99.web.id | Liputan99 | glassy-blue | active/active | verified | 200 |
| nusantara24.web.id | Nusantara24 | orange-modern | active/active | verified | 200 |
| pantaunusantara.web.id | PantauNusantara | warm-editorial | active/active | verified | 200 |
| penamerdeka.my.id | PenaMerdeka | purple-editorial | active/active | verified | 200 |
| suarafakta24.biz.id | SuaraFakta24 | clean-blue | active/active | verified | 200 |
| wartakini7.web.id | WartaKini7 | green-minimal | active/active | verified | 200 |
| wawasannusa.biz.id | WawasanNusa | black-lime | active/active | verified | 200 |

## Rekonsiliasi Wonosobo

`wonosobo.fakta01.my.id` tercatat 1 jejak aktivasi `failed` terminal (5x percobaan, 13 Sep 2026, `dependency_unavailable`) — tetapi hostname ini **live di tiga lapis**: site DB `active/active`, domain Vercel `verified: true`, HTTP `200` + merender penuh. Artinya aktivasi terjadi di luar saga setelah kegagalan itu. Baris jejak dibiarkan sebagai riwayat (tidak ditulis ulang); saga TIDAK dijalankan ulang karena kegagalan terminal akan menonaktifkan site yang sedang live (`failActivation` terminal → `status inactive`). Tidak ada tindakan pendaftaran tersisa di scope Wonosobo.

## Stok terdaftar 2026-09-20 (parkir, belum jadi tenant)

26 domain stok masuk Vercel (semua `verified: true`, DNS CNAME
apex+wildcard ke target project sudah ada sejak 2026-09-16 kecuali
`bahariraya.biz.id`, `berandainvestigasi.biz.id`, `bidikan.my.id`, dan
`faktura.web.id` yang dibuatkan saat itu juga; `jejakkebenaran.my.id`
masuk 2026-09-20 langsung `verified: true` lewat slot bekas `www`,
tapi record CNAME apex+wildcard-nya belum ada sehingga HTTP gagal —
dibuatkan saat itu juga mengikuti pola baseline, sempat 525 (sertifikat
edge baru, sembuh sendiri) lalu 200 landing generik). Tanpa site/tenant,
hostname ini menyajikan halaman landing generik (terverifikasi
`bacazaman.web.id` → 200 judul "Indicate - Publishing infrastructure";
tanpa kebocoran konten tenant).

Terdaftar: arsip24publik.biz.id, bacazaman.web.id, bahariraya.biz.id,
bentangkata.biz.id, bentara9.web.id, berandafakta.biz.id,
berandafakta.my.id, berandainvestigasi.biz.id, bidik24perkara.biz.id,
bidikan.my.id, bilik7wacana.web.id, cakrawalakata.web.id,
cermin24berita.web.id, denyutpublik.my.id, faktura.web.id,
garisfakta.web.id, gatrapublik.web.id, gerbanginvestigasi.my.id,
gerbangkata.web.id, guratfakta.biz.id, guratfakta.my.id,
independensi.my.id, jajakperkara.my.id, jalurperkara.web.id,
jaring9perkara.web.id, jejakkebenaran.my.id.

## Onboarding 25/25 menjadi portal (2026-09-19) — SELESAI

## Verifikasi render 25 portal baru (2026-09-19)

22/25 langsung merender judul portal masing-masing (HTTP 200). Sisanya:
`cakrawalakata.web.id` + `guratfakta.my.id` masih landing lama (cache edge,
sembuh sendiri), **Update pantau:** `cakrawalakata.web.id` + `guratfakta.my.id` kini
merender portal (24/25). `gerbanginvestigasi.my.id` + `independensi.my.id`
sempat 525 (DNS baru), kini **200 dengan judul portal benar — 25/25
lengkap**. Pola DNS hilang yang sama sebelumnya: bahariraya,
berandainvestigasi, bidikan, faktura (sudah diperbaiki, terverifikasi
200).

25 apex di atas kini punya baris `domains` + `sites` + `site_settings`
aktif di org Pengelola Platform (total org: 35 domain, 45 site, 45
settings; 45/45 nama dan deskripsi unik), masing-masing dengan nama,
tagline, deskripsi, SEO, dan template: Arsip24Publik (black-lime),
BacaZaman (clean-blue), BahariRaya (dark-navy), BentangKata
(glassy-blue), Bentara9 (green-minimal), BerandaFakta (orange-modern),
BerandaNusa untuk berandafakta.my.id (purple-editorial),
BerandaNusa untuk berandafakta.my.id (purple-editorial),
BerandaInvestigasi (red-editorial), Bidik24Perkara (soft-blue), Bidikan
(warm-editorial), Bilik7Wacana (black-lime), CakrawalaKata (clean-blue),
Cermin24Berita (dark-navy), DenyutPublik (glassy-blue), Faktura
(green-minimal), GarisFakta (orange-modern), GatraPublik
(purple-editorial), GerbangInvestigasi (red-editorial), GerbangKata
(soft-blue), GuratFakta (warm-editorial), GuratNusa untuk guratfakta.my.id
(black-lime), Independensi (clean-blue), JajakPerkara (dark-navy),
JalurPerkara (glassy-blue), Jaring9Perkara (green-minimal). Media default
berbagi aset operator yang aktif.

Logo 25/25 selesai (2026-09-19): tiap portal punya logo + favicon dari
master gradient huruf awal namanya (A–J, tabrakan berbagi bytes dengan
upload terpisah per site, pola terverifikasi checksum lawan master
milik 10 apex lama) — 50 objek R2 terverifikasi HEAD, 50 baris media
aktif, reservasi `used`, invalidasi `media.activated`, audit
(50 reserve + 50 activate + 25 settings-update, request
`ops:brand-25apex`), 2 objek yatim pilot dihapus. Tidak ada lagi
fallback logo Kemenimipas di 25 portal baru. Guard DB (`zone`, settings lengkap, hostname shape) lolos
semua; resolver DB mengembalikan site baru.

Catatan cache: HTTP masih menyajikan landing lama karena cache edge
(`Age` ~16 menit, TTL data ~30 menit); fungsi resolver DB sudah
mengembalikan site baru. Verifikasi render ulang setelah TTL lewat.

Antre selesai — tidak ada sisa.

Gagal masuk (limit tercapai): jejakwacana.my.id,
jendelapublik.my.id, jurnalpas.web.id, keberimbangan.biz.id,
kelanaberita.web.id. Belum dicoba: 62 domain stok sisanya.

## Onboarding jejakkebenaran.my.id menjadi portal (2026-09-20) — DB + BRAND SELESAI, HTTP MENYUSUL

Portal ke-36 di org Pengelola Platform (template `red-editorial`, kelompok
hitungan 4 terundi agar distribusi merata): `domains` + `sites` +
`site_settings` aktif (`active/active`, settings v2, SEO unik bernada
nasional tanpa sebut region), logo + favicon dari master gradient huruf J
(26810 byte, checksum ganda cocok lawan master, 2 objek R2 terverifikasi
HEAD, tanpa yatim), reservasi `used`, invalidasi `media.activated`
`pending`, audit lengkap (2 reserve + 2 activate + 1 settings-update,
request `ops:onboard-jejakkebenaran`). `sitemap.xml`, `robots.txt`,
`llms.txt`, dan `GET /api/network/media/{logo}` (307 ke R2) sudah
melayani sebagai tenant; halaman `/` sempat landing lama karena cache edge
(pola yang sama dengan 25 portal sebelumnya) — setelah 3x pemicu
reconciler `scope=invalidation` (20+6 completed, 0 failed, antre habis),
`/` merender portal: judul `JejakKebenaran - Kebenaran Punya Jejak.`,
meta description SEO, tagline, logo (`alt="JejakKebenaran"`), favicon
(307) — lengkap seperti tenant lain.

## Backfill logo gatrapublik.web.id (2026-09-24) — SELESAI

`gatrapublik.web.id` lolos dari batch logo 25/25 (settings `logo_media_id`
`NULL`, halaman + `/logo.png` + manifest tenant 404/Indicate). Diperbaiki
via protokol penuh: master gradient G 512x512 (9187 byte) → PUT R2
tenant-scoped terverifikasi HEAD → 1 transaksi DB (reservasi → media
`active` 512x512 → reservasi `used` → settings v4→v5 → task
`media.activated` → 3 audit `ops:brand-gatrapublik-logo`, chain utuh).
Stale edge-404 dibersihkan via purge exact-URL (task reconciler menyusul,
idempoten). Verifikasi: `/logo.png` 200, manifest tenant, `/` 200.

## Backlog (belum punya site)

59 org customer (UPT Jateng): langganan active, member active, 0 site. Estimasi kebutuhan: 59 slot bila 1 hostname/org → total ±85/250, aman.
