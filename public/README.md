# Aset statis `public/`

Kontrak direktori ini. File di sini disajikan apa adanya dari setiap host.

- `brand/` — master merek control-plane (`indicate-*`, `safenca-*`) dan
  lencana generik (`stack/`, `app-store.svg`, `google-play.svg`).
- `assets/` — fallback generik tanpa merek (`default.png`,
  `article-fallback.webp`).
- Ikon control-plane disajikan dari `public/favicon.ico` dan
  `public/apple-icon.png` (URL `/favicon.ico`, `/apple-icon.png`); jangan
  tambah file ikon di `src/app/` karena konvensi file di sana ikut
  ter-inject ke semua host termasuk tenant.
- Merek tenant tinggal di R2, bukan di sini. Logo publisher (`publishers.contacts.logoUrl`) memakai `/api/network/media/{id}` per-org.
- Dilarang menambah screenshot/referensi PNG ke git; simpan di luar repo.
- Penamaan: kebab-case, tanpa spasi.
