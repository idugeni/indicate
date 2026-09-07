# INDICATE — Design System

**Satu Sinyal, Ratusan Kanal.**

Dokumen ini adalah *visual contract* untuk seluruh produk INDICATE — dashboard, situs pemasaran, laporan klien, dan permukaan produk masa depan. Setiap keputusan visual, baik oleh manusia maupun AI agent, harus bisa dirujuk balik ke dokumen ini. Kalau sebuah pattern baru dibutuhkan dan belum ada di sini, dokumen ini yang harus diperluas dulu — bukan diselewengkan di kode.

---

## Daftar Isi

1. [Design DNA](#1-design-dna)
2. [Concept & Principles](#2-concept--principles)
3. [Color](#3-color)
4. [Typography](#4-typography)
5. [Spacing](#5-spacing)
6. [Layout & Grid](#6-layout--grid)
7. [Responsive](#7-responsive)
8. [Components](#8-components)
9. [Interaction & States](#9-interaction--states)
10. [Motion](#10-motion)
11. [Visual Language](#11-visual-language)
12. [Data Visualization](#12-data-visualization)
13. [Accessibility](#13-accessibility)
14. [Implementation Rules (shadcn/ui)](#14-implementation-rules-shadcnui)
15. [Anti-Slop Rules](#15-anti-slop-rules)
16. [Extensibility / Future Development](#16-extensibility--future-development)

---

## 1. Design DNA

### 1.1 Karakter INDICATE

INDICATE terasa seperti **ruang kendali penyiaran di malam hari** — bukan aplikasi konsumen, bukan situs berita biasa. Ia adalah infrastruktur editorial: tempat satu keputusan (kirim berita) menghasilkan seratus konsekuensi yang terlacak.

Tiga kata yang mendefinisikan karakter ini: **tenang, presisi, editorial.**

- **Tenang** — latar gelap, kontras terkendali, tidak ada elemen yang berteriak minta perhatian.
- **Presisi** — data ditampilkan eksak (angka, timestamp, status), bukan dibulatkan atau didramatisasi.
- **Editorial** — tipografi dan nada tulisan terasa seperti ruang redaksi/wire service, bukan brosur produk.

### 1.2 Visual Personality

Jika INDICATE adalah orang: seorang **operator siaran senior** — tahu persis apa yang sedang terjadi di 100 titik sekaligus, tidak panik, tidak berlebihan menjelaskan, tapi selalu bisa menunjukkan bukti dengan tepat.

### 1.3 Design Principles

1. **Sinyal, bukan dekorasi.** Setiap warna, gerakan, dan bentuk merepresentasikan proses nyata (kirim, distribusi, status). Elemen yang tidak membawa makna dihapus.
2. **Satu momen berani, sisanya disiplin.** Hanya visual jaringan sinyal (hero) yang boleh jadi titik animasi utama. Elemen lain diam dan rapi.
3. **Data adalah konten, bukan hiasan.** Angka dan status ditulis presisi (`100/100`, bukan "hampir semua"), memakai tipografi teknis.
4. **Kontras informasi, bukan kontras dekoratif.** Hierarki visual dibangun untuk membedakan mana yang penting, bukan untuk membuat halaman "ramai".
5. **Transparansi sebagai nilai.** INDICATE memposisikan diri sebagai jaringan distribusi yang bisa dipertanggungjawabkan — desain harus terasa bisa diaudit (bukti tayang, log, status jelas), bukan menyembunyikan proses di balik animasi flashy.

### 1.4 Hierarchy of Importance

Urutan yang selalu menang saat ada konflik desain:

1. **Kejelasan status/data** (apa yang terjadi, kapan, di mana) — tidak boleh dikorbankan demi estetika.
2. **Konsistensi token** (warna, tipografi, spacing dari sistem ini) — tidak boleh dikorbankan demi "kelihatan lebih menarik" di satu halaman.
3. **Kesan editorial-teknis** (Fraunces untuk momen penting, Plex Mono untuk data) — dipertahankan di semua permukaan produk.
4. **Ekspresi visual bebas** (ilustrasi, komposisi hero, dsb.) — ruang paling fleksibel, tapi tetap tunduk ke tiga poin di atas.

### 1.5 Apa yang Membuat INDICATE Berbeda dari Generic SaaS

| Generic SaaS | INDICATE |
|---|---|
| Card putih/abu dengan shadow lembut di mana-mana | Flat surface, dibedakan dengan warna latar dan hairline border |
| Gradient biru-ungu sebagai identitas | Solid brass sebagai satu-satunya aksen berani |
| Animasi hover di setiap elemen | Interaksi subtle; hanya hero yang punya momen animasi |
| Font sans generik (Inter/Roboto) untuk semua teks | Fraunces (editorial) dipasangkan sengaja dengan Plex Sans (interface) |
| Angka dibulatkan/didramatisasi ("99%+ delivery!") | Angka eksak, dilaporkan apa adanya |
| Rounded-full button & badge di mana-mana | Radius kecil (3–4px) konsisten, tidak ada pill shape |

### 1.6 Bagaimana Desain Harus Terasa

Tenang, terkendali, bisa dipercaya, teknis tapi tetap manusiawi (karena kontennya berita — hasil kerja jurnalistik/editorial nyata).

### 1.7 Bagaimana Desain TIDAK BOLEH Terasa

Ramai, playful, "AI-startup generik", seperti dashboard trading kripto, atau seperti brosur pemasaran yang mendramatisasi angka. Lihat [Anti-Slop Rules](#15-anti-slop-rules) untuk daftar konkret.

---

## 2. Concept & Principles

### 2.1 Metafora Inti

**Source → Transmission → Distribution**

Satu naskah (source) dikirim melalui sistem (transmission) ke banyak titik terbit (distribution). Metafora ini bukan cuma untuk hero visual — ia adalah kerangka berpikir untuk *seluruh* produk. Lihat [Visual Language](#11-visual-language) untuk penerapan lintas permukaan.

### 2.2 Prinsip yang Dipertahankan (Tidak Berubah)

Bagian ini adalah fondasi yang sudah terbukti tepat dan **tidak boleh diubah** tanpa alasan strategis yang sangat kuat:

- Konsep **Satu Sinyal, Ratusan Kanal**
- Metafora source → transmission → distribution
- Nuansa *editorial infrastructure* (bukan media consumer, bukan SaaS generik)
- Atmosfer dark indigo
- Brass sebagai aksen primer, dipakai hemat dan sengaja
- Teal (`--signal`) **hanya** untuk status teknis/semantik — tidak pernah dekoratif
- Fraunces untuk editorial/display
- IBM Plex Sans untuk interface/body
- IBM Plex Mono untuk data teknis
- Flat surface (tanpa shadow berat)
- Border tipis dan terkendali (hairline)
- Radius kecil
- Motion yang terkontrol dan bermakna
- Karakter: tenang, presisi, teknis, editorial

---

## 3. Color

### 3.1 Base Palette

| Token | Hex | Peran |
|---|---|---|
| `--bg` | `#0E1320` | Latar utama aplikasi (malam/indigo gelap) |
| `--bg-raised` | `#161D2E` | Permukaan level 1 (card, panel, sidebar) |
| `--bg-raised-2` | `#1C2436` | Permukaan level 2 (nested panel, tier highlight, modal) |
| `--bg-raised-3` | `#232C42` | Permukaan level 3 (dipakai jarang — dropdown/popover di atas modal) |
| `--hairline` | `#2A3348` | Border default, pembatas section |
| `--hairline-strong` | `#3A4560` | Border yang perlu lebih terlihat (mis. input focus ring dasar, divider penting) |
| `--brass` | `#CC9A44` | Aksen primer — CTA, sumber sinyal, elemen aktif utama |
| `--brass-soft` | `#E4B96A` | Aksen sekunder — hover state dari brass, penekanan teks |
| `--brass-dim` | `#8A6B33` | Brass versi redup — dipakai di atas latar terang atau untuk elemen non-interaktif bertema brass |
| `--signal` | `#5FCBB0` | Status teknis "aktif/live/berhasil" — **khusus data**, bukan dekorasi |
| `--paper` | `#edeadd` | Teks utama (putih hangat) |
| `--paper-dim` | `#9FA6B8` | Teks sekunder / body copy |
| `--paper-faint` | `#8b93a7` | Teks tersier / metadata / label kecil — diubah dari `#6B7284` karena nilai lama gagal WCAG 2.2 AA (±3.9:1), lihat komentar di `src/app/globals.css` |

### 3.2 Surface Hierarchy

Kedalaman dibangun murni dari **lapisan warna**, bukan shadow. Urutan dari paling dalam ke paling atas:

```
--bg            (level 0 — kanvas halaman)
--bg-raised     (level 1 — card, panel utama, sidebar)
--bg-raised-2   (level 2 — panel di dalam panel, modal, tier yang ditonjolkan)
--bg-raised-3   (level 3 — popover, dropdown, tooltip — elemen mengambang sementara)
```

**Aturan:** setiap naik satu level, latar jadi sedikit lebih terang. Tidak pernah melompat level (mis. `--bg` langsung ke `--bg-raised-3`). Border (`--hairline`) dipakai untuk menegaskan batas antar level saat kontras warna saja tidak cukup jelas.

### 3.3 Semantic Colors

Warna semantik **tidak boleh** dipakai untuk dekorasi. Setiap warna berikut hanya muncul saat merepresentasikan state yang sesungguhnya.

| Semantic | Token | Hex | Penggunaan |
|---|---|---|---|
| Success | `--success` | `#5FCBB0` (=`--signal`) | Terbit berhasil, aksi selesai, status positif |
| Warning | `--warning` | `#D8A94E` | Kuota hampir habis, penjadwalan bentrok, butuh perhatian tapi belum error |
| Error | `--error` | `#D9705F` | Gagal terbit, validasi gagal, koneksi putus |
| Info | `--info` | `#6C93C9` | Notifikasi netral, tips, status "menunggu" |
| Focus ring | `--focus` | `#E4B96A` (=`--brass-soft`) | Outline fokus keyboard di semua elemen interaktif |

**Catatan penting:** `--success` sengaja sama dengan `--signal` — di INDICATE, "sinyal aktif" dan "berhasil" adalah konsep yang sama secara visual. Jangan menambahkan warna hijau terpisah untuk "success" generik.

### 3.4 State Colors (di atas komponen interaktif)

Dipakai untuk memodulasi warna dasar komponen (brass untuk primary, netral untuk secondary):

| State | Aturan |
|---|---|
| Default | Warna dasar token (mis. `--brass` untuk tombol primary) |
| Hover | Naik satu tingkat kecerahan (`--brass` → `--brass-soft`) |
| Focus-visible | Outline 2px `--focus`, offset 2px, tidak menghilangkan hover state |
| Active/Pressed | Turun sedikit dari hover (opacity 0.92 atau `--brass-dim` untuk elemen brass) |
| Disabled | Opacity 0.4, tanpa perubahan warna dasar, cursor `not-allowed`, tidak ada hover/focus effect |
| Loading | Warna dasar dipertahankan, tambahkan indikator loading (lihat [9.2](#92-loading-states)) — jangan mengubah warna elemen jadi abu-abu |

### 3.5 Contrast Rules

- Teks `--paper` di atas `--bg`/`--bg-raised`/`--bg-raised-2` wajib memenuhi **WCAG AA (4.5:1)** untuk body text.
- Teks `--paper-dim` hanya untuk body sekunder — tetap wajib AA di atas latar yang dipakai.
- Teks `--paper-faint` **hanya** untuk metadata/label non-esensial (bukan body copy penting) — boleh mendekati batas bawah AA karena bukan konten primer, tapi tidak boleh di bawah rasio 3:1.
- `--brass` di atas `--bg` untuk teks besar (≥18px) memenuhi AA; untuk teks kecil, gunakan `--brass-soft` agar kontras cukup.
- Semantic colors (`--success`, `--warning`, `--error`, `--info`) selalu disertai ikon/label teks — **tidak pernah warna saja** yang menyampaikan makna (lihat [13. Accessibility](#13-accessibility)).

---

## 4. Typography

### 4.1 Font Roles

| Font | Role | Kapan dipakai |
|---|---|---|
| **Fraunces** | Editorial / Display | Judul halaman, headline hero, momen yang perlu terasa seperti "judul berita" |
| **IBM Plex Sans** | Interface / Body | Paragraf, navigasi, tombol, form, seluruh teks fungsional |
| **IBM Plex Mono** | Technical / Data | Timestamp, status, angka, kode, ID, label eyebrow bernuansa teknis |

**Aturan dasar:** Fraunces tidak pernah dipakai untuk body copy panjang atau UI label. Plex Mono tidak pernah dipakai untuk kalimat naratif panjang — hanya data pendek/diskrit.

### 4.2 Type Scale

| Level | Ukuran (desktop) | Ukuran (mobile) | Font | Weight | Line-height |
|---|---|---|---|---|---|
| Display / H1 | `clamp(2.4rem, 5vw, 3.6rem)` | ~2rem | Fraunces | 500 | 1.08 |
| H2 | `clamp(1.7rem, 3vw, 2.3rem)` | ~1.5rem | Fraunces | 500 | 1.15 |
| H3 | `1.15–1.3rem` | 1.1rem | Fraunces | 500 | 1.3 |
| H4 (component title) | `1.05rem` | 1rem | Fraunces | 500 | 1.35 |
| Body | `1rem` | `0.95rem` | Plex Sans | 400 | 1.6 |
| Body small | `0.92rem` | `0.88rem` | Plex Sans | 400 | 1.55 |
| Label / UI | `0.86–0.92rem` | sama | Plex Sans | 500 | 1.4 |
| Metadata / caption | `0.8–0.86rem` | sama | Plex Sans atau Plex Mono | 400 | 1.4 |
| Technical data | `0.78–0.95rem` | sama | Plex Mono | 400–500 | 1.4 |

> **Status implementasi:** aturan global `h1, h2, h3, h4, .font-display` di `src/app/globals.css` saat ini me-render Plex Sans 700 — belum mengikuti skala Fraunces 500 di atas. Fraunces baru dipakai di momen display terpilih (mis. `.network-card h2`, `.public-sidebar h2`). Skala di tabel ini tetap menjadi target kontrak; selaraskan CSS atau revisi aturan ini sebelum menambah heading baru.

### 4.3 Heading Hierarchy

- **H1** hanya muncul sekali per halaman — judul utama.
- **H2** menandai section besar.
- **H3** menandai sub-section atau judul kartu/panel.
- **H4** menandai judul komponen kecil (item dalam list, judul modal kecil).
- Jangan melompati level (H1 langsung ke H3) kecuali struktur komponen memang membutuhkannya (mis. judul kartu di dalam grid selalu H4 apa pun level section-nya).

### 4.4 Body Hierarchy

1. **Body utama** (`--paper` di atas latar, `1rem`) — konten inti, deskripsi, penjelasan.
2. **Body sekunder** (`--paper-dim`, `0.92rem`) — penjelasan tambahan, sub-teks di bawah heading.
3. **Metadata** (`--paper-faint`, `0.8–0.86rem`) — timestamp, label kategori, informasi pendukung yang boleh diabaikan tanpa kehilangan makna utama.

### 4.5 Labels & Technical Data

- Label UI (nama tombol, nama field) memakai Plex Sans 500, **sentence case** — bukan uppercase.
- Label eyebrow section (`01 — Nama Section`) memakai Plex Mono, tetap lowercase/sentence case pada bagian teksnya, angka sebagai penanda urutan hanya dipakai jika kontennya memang berurutan.
- Data teknis (status, timestamp, ID) selalu Plex Mono, format eksak: `status: published · 100/100 nodes · 08:42:11 WIB`.
- **Uppercase** hanya dipakai untuk singkatan resmi (WIB, API, URL) — tidak pernah untuk seluruh label/kalimat sebagai gaya dekoratif.

### 4.6 Responsive Typography

- Semua heading memakai `clamp()` agar menyusut proporsional, bukan breakpoint tunggal yang patah.
- Body text tidak menyusut drastis di mobile (maksimal turun 1 step, mis. `1rem` → `0.95rem`) — keterbacaan diutamakan atas kepadatan.
- Line-height body **naik sedikit** di mobile jika lebar kolom menyempit jauh (opsional +0.05–0.1) untuk menjaga keterbacaan pada baris yang lebih pendek.

### 4.7 Maximum Readable Line Length

- Body copy: maksimum **68–72 karakter** per baris (`max-width` dalam `ch` unit, mis. `max-width: 60ch` untuk paragraf, `56ch` untuk deskripsi section).
- Heading besar (H1/H2): tidak dibatasi ketat dengan `ch`, tapi tetap dijaga agar tidak melebihi lebar container section (`max-width: 640px` untuk section-head sudah sesuai — pertahankan).
- Data teknis/tabel: tidak berlaku batas `ch` karena formatnya kolumnar, bukan naratif.

---

## 5. Spacing

### 5.1 Spacing Scale

> **Status implementasi:** token `--space-*` belum diimplementasikan sebagai CSS variable — kode saat ini memakai nilai literal. Skala di bawah adalah target kontrak; implementasikan tokennya atau pakai nilai literal yang ekuivalen sampai token tersedia.

Skala berbasis `4px`, dengan penamaan token semantik agar konsisten dipakai lintas komponen:

| Token | Nilai | Peran |
|---|---|---|
| `--space-1` | 4px | Jarak micro (antara ikon dan label kecil) |
| `--space-2` | 8px | Jarak dalam komponen kecil (padding badge, gap ikon-teks) |
| `--space-3` | 12px | Padding komponen kecil-menengah, gap list item |
| `--space-4` | 16px | Padding default komponen (button, input) |
| `--space-5` | 20px | Gap antar elemen dalam card |
| `--space-6` | 24px | Padding card/panel |
| `--space-8` | 32px | Gap antar kartu dalam grid, padding container mobile |
| `--space-10` | 40px | Gap antar kolom besar |
| `--space-12` | 48px | Jarak antar sub-section dalam satu section |
| `--space-16` | 64px | Jarak vertikal komponen besar (mis. antara hero content dan visual) |
| `--space-20` | 80px | Padding vertikal section (mobile) |
| `--space-24` | 96px | Padding vertikal section (desktop) |

### 5.2 Kapan Memakai Ukuran Kecil/Sedang/Besar

- **Kecil (`--space-1`–`--space-3`)**: di dalam satu komponen — antara ikon dan teks, antara label dan value, padding badge/tag.
- **Sedang (`--space-4`–`--space-8`)**: antar komponen yang berkaitan langsung — gap dalam grid fitur, padding card, jarak antara heading section dan body-nya.
- **Besar (`--space-10`–`--space-24`)**: antar section atau antar blok konten yang berdiri sendiri — padding vertikal section, jarak hero ke section berikutnya.

**Prinsip:** jarak besar dipakai untuk memisahkan *konteks*, jarak kecil dipakai untuk mengelompokkan *hubungan*. Dua elemen yang berhubungan erat (label + value) selalu lebih dekat daripada dua elemen yang tidak berhubungan (akhir satu section + awal section berikutnya).

### 5.3 Container & Page Padding

> **Status implementasi:** token `--container-max` dan `--page-padding-*` belum diimplementasikan sebagai CSS variable. Nilai di bawah adalah target kontrak.

| Token | Nilai |
|---|---|
| `--container-max` | 1120px |
| `--page-padding-desktop` | 32px |
| `--page-padding-tablet` | 28px |
| `--page-padding-mobile` | 20px |

### 5.4 Density

INDICATE memakai **density sedang** secara default — cukup lapang untuk terasa tenang (bukan dashboard analitik yang padat), tapi tidak selonggar landing page konsumen. Untuk permukaan data-berat (tabel status, log distribusi), density boleh diperketat (`--space-2`–`--space-3` sebagai padding baris) — lihat [12. Data Visualization](#12-data-visualization).

---

## 6. Layout & Grid

### 6.1 Prinsip Umum

- **Alignment:** rata kiri (left-aligned) di seluruh halaman site/editorial. Tidak ada centering untuk section besar — ini menegaskan nada "wire dispatch", bukan landing page konsumen yang biasanya center-aligned.
- Dashboard/aplikasi internal boleh memakai grid simetris (sidebar + main content) karena kebutuhan fungsionalnya berbeda dari halaman editorial — tapi tetap rata kiri di dalam tiap panel.
- **Pemisah section:** hairline horizontal (`border-bottom: 1px solid var(--hairline)`), bukan whitespace besar kosong tanpa penanda — menegaskan struktur seperti kolom surat kabar/wire service.

### 6.2 Grid Rules

- Grid fitur/tier memakai gap `1px` diisi warna `--hairline` sebagai "grid line" — bukan gap kosong dengan border ganda di tiap item. Ini mencegah duplikasi border dan menjaga garis grid tetap presisi 1px.
- Grid kolom maksimum di desktop: **4 kolom** untuk step/flow, **3 kolom** untuk tier/pricing, **2 kolom** untuk deskripsi/kartu besar, **6 kolom** untuk swatch/token kecil.
- Setiap grid runtuh (collapse) ke lebih sedikit kolom sebelum jadi terlalu sempit — lihat breakpoint di [7. Responsive](#7-responsive).

### 6.3 Column Behavior

- Grid dengan kolom lebar tetap (mis. `280px 1fr` pada feature row) dipakai saat salah satu kolom adalah label/judul pendek dan kolom lain adalah deskripsi — ini menjaga scan-ability (judul selalu sejajar).
- Grid dengan kolom rasio sama (`1fr 1fr`) dipakai saat dua kolom setara pentingnya (mis. deskripsi singkat vs. panjang).

---

## 7. Responsive

**Prinsip utama: mobile bukan desktop yang diperkecil.** Setiap breakpoint mengubah *bagaimana informasi disusun*, bukan sekadar menyusutkan ukuran.

### 7.1 Breakpoints

> **Status implementasi:** token `--bp-*` belum diimplementasikan sebagai CSS variable — kode memakai media query literal (`820px`, `560px` di `src/app/globals.css`). Tabel di bawah adalah target kontrak perilaku per breakpoint.

| Nama | Lebar | Dipakai untuk |
|---|---|---|
| `--bp-sm` | 700px | Feature row, tabel sederhana |
| `--bp-md` | 800px | Grid 2 kolom (deskripsi, swatch besar) |
| `--bp-lg` | 820px | Flow 4 kolom, tier pricing |
| `--bp-xl` | 900px | Hero grid (2 kolom → 1) |

### 7.2 Perilaku per Breakpoint

**Desktop (>900px)**
- Grid multi-kolom penuh (hero 2 kolom, flow 4 kolom, tier 3 kolom).
- Navigasi horizontal penuh di navbar.
- Hover state aktif sepenuhnya (device dengan mouse).
- Visual jaringan sinyal ditampilkan penuh (±28 node).

**Tablet (480–900px)**
- Hero berubah jadi 1 kolom, visual jaringan sinyal tetap tampil tapi diposisikan setelah teks (bukan disembunyikan).
- Grid 3–4 kolom runtuh ke 2 kolom di titik yang membuat teks tidak terlalu sempit (ikuti breakpoint per komponen di atas).
- Navigasi horizontal masih memungkinkan jika muat; jika tidak, gunakan menu ringkas (bukan hamburger penuh kecuali benar-benar sempit).
- Padding section berkurang sedang (`--space-20` alih-alih `--space-24`).

**Mobile (<480–700px tergantung komponen)**
- Semua grid runtuh ke **1 kolom**, urutan vertikal mengikuti prioritas informasi (bukan urutan DOM asal).
- Navigasi utama disembunyikan di balik menu (nav `<ul>` disembunyikan, CTA utama tetap terlihat di navbar).
- Card/panel kehilangan padding besar, memakai `--space-4`–`--space-6`.
- Tabel data (jika ada) **tidak** di-scroll horizontal sebagai default pertama — prioritaskan reflow jadi list vertikal per baris (label: value), scroll horizontal hanya untuk tabel yang benar-benar tabular dan tidak bisa direstrukturisasi (lihat [8.13 Tables](#813-tables)).
- Visual jaringan sinyal disederhanakan: kurangi jumlah node yang dirender (misal dari 28 ke 16) agar tetap legible pada layar kecil, bukan sekadar diskalakan mengecil.
- Form: satu kolom penuh, label selalu di atas input (bukan di samping).
- Density diperlonggar sedikit dibanding desktop untuk mengakomodasi target sentuh (lihat [13.7 Touch Target](#137-touch-target)).

### 7.3 Konten yang Boleh Disembunyikan vs. Wajib Ada

- **Boleh disederhanakan:** jumlah node visual, kolom metadata sekunder di tabel, dekorasi non-esensial.
- **Tidak boleh dihilangkan:** status inti, CTA utama, informasi bukti tayang, pesan error/validasi.

---

## 8. Components

Setiap komponen didokumentasikan singkat: purpose, hierarchy, appearance, states, usage, misuse.

### 8.1 Buttons

- **Purpose:** memicu aksi.
- **Hierarchy:** Primary (brass, satu per section/area) → Ghost (border, aksi sekunder) → Text-link (aksi tersier/navigasi).
- **Appearance:** radius `3px`, padding `13px 26px` (default), tanpa shadow.
- **States:** default / hover (`--brass-soft`, translateY(-1px)) / focus-visible (outline `--focus`) / active (opacity 0.92) / disabled (opacity 0.4, no hover) / loading (spinner kecil menggantikan ikon, label tetap terbaca atau berubah jadi "Mengirim…").
- **Usage:** satu primary button per area keputusan. Label memakai kata kerja aktif ("Kirim Berita", bukan "Submit").
- **Misuse:** jangan memakai lebih dari satu primary button bersebelahan; jangan memakai brass untuk aksi destruktif (pakai `--error`).

### 8.2 Links

- **Purpose:** navigasi inline atau antar halaman.
- **Appearance:** warna `--paper-dim` default, `--paper` atau `--brass-soft` saat hover, underline opsional hanya untuk link di dalam paragraf body (bukan di navigasi/kartu).
- **States:** hover mengubah warna + underline muncul (jika dalam teks); focus-visible outline `--focus`.
- **Misuse:** jangan menambahkan panah "→" di akhir setiap link sebagai default — hanya jika link tersebut benar-benar mengarah ke aksi "lanjut/berikutnya" yang punya makna urutan.

### 8.3 Cards / Panels

- **Purpose:** mengelompokkan konten yang berhubungan.
- **Appearance:** latar `--bg-raised` (atau `--bg-raised-2` jika nested), border `1px solid var(--hairline)`, radius `4px`, **tanpa box-shadow**.
- **States:** hover opsional hanya jika card itu sendiri adalah target klik (border berubah ke `--hairline-strong`, bukan shadow muncul).
- **Misuse:** jangan menambahkan shadow untuk "kedalaman" — pakai surface hierarchy ([3.2](#32-surface-hierarchy)).

### 8.4 Inputs (Text Field)

- **Purpose:** menerima input teks singkat.
- **Appearance:** latar `--bg-raised`, border `1px solid var(--hairline)`, radius `3px`, padding `10px 14px`, teks `--paper`, placeholder `--paper-faint`.
- **States:** focus (border `--brass-soft` + outline tipis `--focus`) / error (border `--error`, pesan error di bawah memakai `--error`) / disabled (opacity 0.5, latar tetap sama).
- **Misuse:** jangan menghilangkan border saat default lalu memunculkannya hanya saat hover — border harus selalu terlihat agar bentuk field jelas sebelum interaksi.

### 8.5 Select

- Mengikuti appearance Input. Ikon chevron memakai `--paper-dim`, berubah `--paper` saat dropdown terbuka. Dropdown list memakai `--bg-raised-3` (lihat [3.2](#32-surface-hierarchy)).

### 8.6 Textarea

- Mengikuti appearance Input, tinggi minimum menampung 3 baris, resize vertikal diperbolehkan, resize horizontal dimatikan.

### 8.7 Checkbox / Radio

- **Appearance:** kotak/lingkaran kecil dengan border `--hairline`, terisi `--brass` saat checked (bukan gradient, bukan animasi bounce).
- **States:** focus-visible outline `--focus`; disabled opacity 0.4.
- **Usage:** selalu disertai label teks yang bisa diklik (memperbesar target sentuh).

### 8.8 Tabs

- **Purpose:** berpindah antar view yang setara levelnya.
- **Appearance:** garis bawah tipis (`2px`) memakai `--brass` untuk tab aktif; tab non-aktif memakai `--paper-dim` tanpa border.
- **Misuse:** jangan memakai tab untuk lebih dari 5–6 opsi — pakai navigasi sekunder atau select jika lebih banyak.

### 8.9 Navigation

- Navbar sticky dengan blur latar tipis (`backdrop-filter: blur(10px)`) di atas `rgba(bg, 0.88)` — dipertahankan dari desain awal. Item nav memakai Plex Sans, `--paper-dim` default, `--paper` saat hover/aktif.

### 8.10 Badges

- **Purpose:** menandai kategori atau status singkat (bukan dekorasi).
- **Appearance:** padding kecil (`--space-1 --space-2`), radius `3px`, border tipis atau latar `--bg-raised-2`, teks Plex Mono kecil untuk status teknis atau Plex Sans kecil untuk kategori non-teknis.
- **Misuse:** jangan menumpuk lebih dari 2–3 badge berdampingan tanpa alasan informasional yang jelas.

### 8.11 Status Indicators

- **Purpose:** menunjukkan state proses (published, pending, failed) secara ringkas dan bisa dipindai cepat.
- **Appearance:** titik kecil (`6px`) berwarna semantik + label teks Plex Mono di sampingnya. Warna **tidak pernah berdiri sendiri** — selalu didampingi label.
- Contoh: `● published` (titik `--success`), `● pending` (titik `--info`), `● failed` (titik `--error`).

### 8.12 Dialogs (Modal)

- **Appearance:** latar `--bg-raised-2`, border `--hairline`, radius `4px`, overlay latar belakang `rgba(14,19,32,0.7)` tanpa blur berlebihan.
- **Usage:** untuk konfirmasi aksi penting (mis. "Kirim ke 100 situs sekarang?") — bukan untuk menampilkan konten panjang yang seharusnya jadi halaman sendiri.
- **Misuse:** jangan menumpuk modal di atas modal.

### 8.13 Tables

- **Purpose:** menampilkan data tabular presisi (log distribusi, daftar situs).
- **Appearance:** header row memakai Plex Mono kecil `--paper-faint` (uppercase diperbolehkan **khusus** header tabel karena berfungsi sebagai label kolom teknis), baris data memakai Plex Sans/Mono sesuai isi kolom, hairline horizontal antar baris, tanpa zebra-stripe warna-warni.
- **Responsive:** di mobile, reflow jadi kartu per-baris (label: value) — lihat [7.2](#72-perilaku-per-breakpoint).

### 8.14 Tooltips

- **Appearance:** latar `--bg-raised-3`, border `--hairline`, teks kecil `--paper`, radius `3px`, muncul dengan fade cepat (`120ms`), tanpa arrow besar/dekoratif.

### 8.15 Alerts / Inline Notifications

- **Appearance:** border-left `2px solid` sesuai warna semantik (`--success`/`--warning`/`--error`/`--info`), latar `--bg-raised`, radius `0 4px 4px 0` (pola yang sama seperti `.note-box` di draf awal — dipertahankan dan dijadikan standar untuk semua alert).
- **Usage:** untuk pesan yang butuh perhatian tapi tidak memblokir alur (beda dengan dialog konfirmasi).

### 8.16 Empty States

- **Purpose:** memandu aksi saat belum ada data, bukan sekadar "kosong".
- **Appearance:** ikon/mark garis sederhana (bukan ilustrasi besar berwarna-warni), judul singkat (Fraunces H4), satu kalimat penjelasan (Plex Sans), satu CTA jika relevan.
- **Nada tulisan:** "Belum ada berita yang dikirim ke jaringan ini." + CTA "Kirim Berita Pertama" — bukan pesan generik "No data available".

### 8.17 Loading States

Lihat [9.2](#92-loading-states) untuk detail lengkap.

### 8.18 Success / Error States (Full Page/Section)

- **Success:** ikon centang sederhana bergaris (bukan ilustrasi confetti), judul singkat, data konkret jika ada ("Terbit ke 100/100 situs").
- **Error:** ikon peringatan sederhana, judul jelas menyatakan apa yang gagal, langkah berikutnya yang bisa diambil pengguna.

### 8.19 Pagination

- **Appearance:** angka halaman memakai Plex Mono, halaman aktif memakai `--brass` sebagai teks (bukan latar penuh berwarna), tanda `‹ ›` sederhana untuk prev/next.
- **Usage:** dipakai untuk log distribusi/daftar situs yang panjang; pertimbangkan infinite scroll hanya untuk feed yang memang kronologis (log real-time).

---

## 9. Interaction & States

### 9.1 State Matrix (berlaku untuk semua komponen interaktif)

| State | Prinsip |
|---|---|
| Default | Bentuk dasar selalu terlihat jelas tanpa interaksi (border/latar tidak "muncul" hanya saat hover) |
| Hover | Perubahan subtle — naik satu tingkat kecerahan warna atau translateY(-1px) kecil. Tidak ada scale-up besar. |
| Focus-visible | Outline `2px solid var(--focus)`, offset `2px`. Selalu terlihat untuk navigasi keyboard, **tidak pernah dihapus** dengan `outline: none` tanpa pengganti setara. |
| Active/Pressed | Sedikit lebih redup dari hover, memberi feedback tekan yang jelas. |
| Disabled | Opacity 0.4, tidak ada state lain yang aktif di atasnya, cursor `not-allowed`. |
| Loading | Lihat [9.2](#92-loading-states). |
| Success/Error (inline, mis. form field) | Border + ikon kecil + pesan teks — tidak pernah warna saja. |

### 9.2 Loading States

- **Skeleton** untuk konten yang bentuknya sudah diketahui (list, card) — blok abu-abu (`--bg-raised-2`) dengan shimmer halus **satu arah, pelan**, bukan berkedip cepat.
- **Spinner** kecil hanya untuk aksi singkat dalam tombol/inline (mis. saat submit form).
- **Progress bar** presisi (menunjukkan angka `%` atau `x/100`) untuk proses distribusi yang punya progres terukur — ini sejalan dengan karakter "presisi" INDICATE, lebih baik daripada spinner tak tentu untuk proses seperti "mengirim ke 100 situs".

### 9.3 Prinsip Interaksi

1. **Interaction harus subtle.** Perubahan visual saat hover/active kecil dan cepat — bukan animasi besar yang menarik perhatian dari konten.
2. **Feedback harus jelas.** Setiap aksi (klik, submit, error) selalu punya respons visual dalam <150ms, sekecil apa pun perubahannya.
3. **Motion harus punya fungsi.** Jika animasi dihapus dan tidak ada informasi yang hilang, animasi itu dekoratif dan harus dipertimbangkan ulang.
4. **Tidak ada animasi untuk dekorasi murni.** Lihat [10. Motion](#10-motion) dan [15. Anti-Slop Rules](#15-anti-slop-rules).

---

## 10. Motion

### 10.1 Duration & Easing

| Token | Nilai | Dipakai untuk |
|---|---|---|
| `--motion-instant` | 100ms | Perubahan warna hover, opacity toggle kecil |
| `--motion-fast` | 150–200ms | Tombol, input focus, tooltip muncul |
| `--motion-base` | 250–300ms | Dropdown, modal muncul/hilang, transisi tab |
| `--motion-slow` | 400–600ms | Perubahan layout besar (jarang dipakai) |
| `--motion-hero` | 2.4s | Momen animasi hero (signal pulse) — satu-satunya animasi berdurasi panjang yang diizinkan |
| `--easing-standard` | `cubic-bezier(0.4, 0, 0.2, 1)` | Default untuk hampir semua transisi UI |
| `--easing-out` | `ease-out` | Pulse ring, elemen yang "keluar/memancar" |

### 10.2 Micro-interaction

- Hover tombol: translateY(-1px) + perubahan warna, `--motion-fast`.
- Focus input: transisi border-color, `--motion-instant`.
- Dropdown/tooltip: fade + translateY kecil (4px), `--motion-fast`.

### 10.3 Hero Animation — Signal Network

**Signal Network adalah primary visual motion moment di seluruh produk INDICATE.** Prinsipnya:

- Terjadi **satu kali** saat elemen pertama kali masuk viewport (bukan loop, bukan berulang saat scroll).
- Urutan: source memancarkan pulse ring (2–3 gelombang bertahap) → sebagian node "menyala" (`--paper-faint` → `--brass-soft`) sebagai efek dari pulse yang tiba.
- Durasi total `--motion-hero` (~2.4s), delay awal 0.6s agar tidak langsung "meledak" saat halaman termuat.
- Pola ini (source memancar → node menyala) adalah animasi referensi yang boleh dipakai ulang di permukaan lain **selama benar-benar merepresentasikan proses "kirim → distribusi"** (mis. saat pengguna benar-benar menekan "Kirim Berita" di dashboard) — bukan dipakai sebagai animasi hero dekoratif di halaman yang tidak relevan.

### 10.4 State Transition

- Perubahan status (pending → published) di UI ditandai transisi warna titik status (`--motion-base`) + kemunculan timestamp, bukan animasi besar.
- Progress bar bergerak halus mengikuti nilai aktual (tidak "melompat" tanpa transisi, tidak dianimasikan lebih cepat dari data sebenarnya).

### 10.5 Larangan Motion

- **Tidak ada infinite decorative animation** (tidak ada elemen yang terus bergerak/berkedip tanpa henti tanpa alasan status).
- **Tidak ada excessive motion** — maksimal satu momen animasi terkoordinasi per section/halaman.
- **`prefers-reduced-motion: reduce` wajib dihormati** di seluruh produk: semua animasi non-esensial (termasuk Signal Network) dinonaktifkan total, digantikan dengan state akhir statis langsung.
- **View Transitions ditunda (keputusan September 2026).** Next.js 16 menyediakan `<ViewTransition>` (morph, directional slide, Suspense reveal, crossfade), tetapi pola ini belum diadopsi karena melanggar dua aturan di atas untuk navigasi rutin. Pengecualian hanya dibuka lewat amandemen dokumen ini dengan kriteria: (1) transisi mengomunikasikan makna nyata (mis. kontinuitas objek yang sama, bukan dekorasi), (2) ada satu anchor diam sebagai referensi spasial, (3) durasi ≤400ms dan nonaktif total saat `prefers-reduced-motion`.

---

## 11. Visual Language

**SOURCE → TRANSMISSION → DISTRIBUTION** adalah bahasa visual yang dipakai lintas produk, tidak hanya di hero halaman site. Berikut penerjemahannya ke elemen produk konkret:

| Konsep Metafora | Penerapan Visual |
|---|---|
| **Source (sumber)** | Satu titik/elemen brass yang lebih besar/menonjol dari elemen lain di sekitarnya — dipakai untuk menandai titik asal suatu proses (mis. avatar/ikon klien pengirim di log aktivitas). |
| **Transmission (perjalanan sinyal)** | Garis tipis (`--hairline` default, `--brass` saat aktif) yang menghubungkan dua titik — dipakai di diagram alur, connector antar step, garis progress. |
| **Propagation (penyebaran)** | Pulse ring yang memancar dari satu titik — dipakai saat menunjukkan "sedang mengirim/menyebar", termasuk di loading state proses distribusi. |
| **Node** | Lingkaran kecil (`3.5–6px`), default `--paper-faint`, menyala `--brass-soft`/`--signal` saat aktif/terpengaruh — merepresentasikan satu situs dalam jaringan di peta jaringan (INDICATE Grid), atau satu item dalam list status. |
| **Signal** | Warna `--signal` (teal) dipakai konsisten untuk menandai "sedang berlangsung/hidup" — pada status badge, pada garis progress yang sedang berjalan. |
| **Publication (penerbitan)** | Transisi node dari redup ke menyala — dipakai sebagai animasi/state saat satu situs berhasil menerbitkan. |
| **Distribution (hasil akhir)** | Kumpulan node yang sebagian besar menyala — direpresentasikan sebagai ringkasan visual (mis. mini network diagram di kartu ringkasan laporan), bukan sekadar angka "100/100" tanpa visual. |
| **Status** | Titik kecil berwarna semantik + label Plex Mono (lihat [8.11](#811-status-indicators)) — konsisten dengan bahasa "node menyala/padam". |
| **Timeline** | Garis horizontal/vertikal tipis dengan titik-titik (node) di sepanjangnya menandai event — memakai visual language node yang sama, bukan komponen timeline generik yang tidak berhubungan. |
| **Progress** | Progress bar presisi dengan angka eksak, opsional disertai representasi node kecil di sampingnya untuk proses distribusi (bukan bar generik tanpa konteks). |
| **Empty state** | Visual jaringan dalam keadaan "belum ada sinyal" — node-node ada tapi semua redup (`--paper-faint`), tanpa pulse — bukan ilustrasi generik yang tidak berhubungan dengan konsep jaringan. |
| **Success state** | Node-node menyala penuh + pulse terakhir yang mereda — merepresentasikan "sinyal telah sampai", konsisten dengan hero animation. |

**Prinsip kunci:** identitas INDICATE tidak boleh bergantung semata pada warna dan tipografi. Kapan pun produk butuh merepresentasikan "proses", "koneksi", atau "status", kembalikan dulu ke pertanyaan: *bagaimana source → transmission → distribution menjelaskan ini?* — baru turunkan jadi komponen visual.

---

## 12. Data Visualization

Data di INDICATE harus terlihat **presisi, editorial, dan teknis** — bukan dekoratif ala dashboard analitik generik.

### 12.1 Prinsip Umum

1. Angka selalu eksak, memakai Plex Mono, tidak dibulatkan tanpa keterangan ("98/100", bukan "~100" atau "hampir semua").
2. Warna pada chart/visualisasi mengikuti [3.3 Semantic Colors](#33-semantic-colors) — tidak menambah palet warna baru khusus chart.
3. Tidak ada gradient fill, tidak ada 3D chart, tidak ada efek glow pada data point.
4. Grid/axis chart memakai `--hairline`, teks axis memakai `--paper-faint` dengan Plex Mono kecil.

### 12.2 Chart

- Line/bar chart memakai garis/bar solid satu warna (`--brass` untuk metrik utama, `--signal` untuk status aktif) — tidak multi-gradient.
- Highlight satu titik data penting (mis. puncak distribusi) dengan node kecil bertitik brass, bukan tooltip besar yang menutupi chart.

### 12.3 Metrics (Angka Ringkasan)

- Ditampilkan sebagai angka besar (Plex Mono atau Fraunces tergantung konteks — Fraunces jika ini adalah headline laporan, Plex Mono jika ini adalah metrik dashboard operasional) + label kecil di bawahnya.
- **Hindari "meaningless KPI cards"** — setiap angka yang ditampilkan harus actionable atau langsung menjelaskan hasil nyata (jumlah situs tayang, bukan metrik vanity yang tidak jelas artinya bagi klien).

### 12.4 Tables

Lihat [8.13](#813-tables). Tabel adalah bentuk visualisasi data yang **diutamakan** di INDICATE untuk log dan status detail, karena sejalan dengan karakter presisi/editorial — dipakai lebih sering daripada chart dekoratif.

### 12.5 Timelines

- Memakai visual language node/garis (lihat [11. Visual Language](#11-visual-language)) — bukan komponen timeline generik dengan ikon bulat besar berwarna-warni.

### 12.6 Network Visualization

- Peta jaringan 100 situs (INDICATE Grid) memakai pola yang sama dengan hero Signal Network: node + spoke line dari titik pusat, atau grid layout jika representasi radial tidak lagi terbaca pada skala besar (>50 node) — dalam kasus itu gunakan grid node berbaris dengan status warna per node, tetap tanpa gradient/glow.

### 12.7 Status Distribution

- Ringkasan status (berapa banyak published/pending/failed) ditampilkan sebagai stacked bar tipis bersegmen warna semantik + angka eksak di sampingnya — bukan pie chart 3D atau donut chart dengan efek shadow.

---

## 13. Accessibility

Standar minimum: **WCAG 2.2 AA** di seluruh produk INDICATE.

### 13.1 Color Contrast

- Body text: rasio kontras minimum **4.5:1** terhadap latar.
- Teks besar (≥18px atau ≥14px bold): minimum **3:1**.
- Elemen UI non-teks (border input, ikon fungsional): minimum **3:1** terhadap latar sekitarnya.

### 13.2 Keyboard Navigation

- Seluruh elemen interaktif (tombol, link, input, tab) bisa diakses via keyboard dengan urutan tab yang logis mengikuti urutan visual/DOM.
- Tidak ada keyboard trap di dalam modal — `Escape` selalu menutup dialog, fokus kembali ke elemen pemicu.

### 13.3 Focus-Visible

- Outline fokus (`2px solid var(--focus)`, offset `2px`) **selalu** tampil untuk navigasi keyboard, memakai selector `:focus-visible` (bukan `:focus` polos) agar tidak muncul mengganggu saat klik mouse.
- Tidak pernah menghapus outline fokus tanpa pengganti yang setara kontrasnya.

### 13.4 Semantic HTML

- Heading berurutan logis (tidak melompat level sembarangan di luar aturan [4.3](#43-heading-hierarchy)).
- Tombol memakai `<button>`, link navigasi memakai `<a>` — tidak memakai `<div onclick>` untuk elemen interaktif.
- Landmark region (`<nav>`, `<main>`, `<footer>`) dipakai konsisten di setiap halaman.

### 13.5 Accessible Labels

- Setiap input punya `<label>` yang terasosiasi (bukan hanya placeholder sebagai label).
- Ikon fungsional tanpa teks visual (mis. tombol close) selalu punya `aria-label` yang deskriptif.

### 13.6 Non-Color-Only Status

- Status (success/warning/error/info) **selalu** disertai bentuk/ikon/label teks, tidak pernah hanya warna — konsisten dengan [8.11 Status Indicators](#811-status-indicators).

### 13.7 Touch Target

- Target sentuh minimum **44×44px** di mobile untuk semua elemen interaktif (tombol, checkbox, item navigasi) — padding ditambah jika ukuran visual elemen lebih kecil dari itu.

### 13.8 Reduced Motion

- `prefers-reduced-motion: reduce` wajib dihormati di seluruh animasi (lihat [10.5](#105-larangan-motion)).

### 13.9 Accessible Forms

- Pesan error terhubung ke input via `aria-describedby`, muncul di dekat field yang relevan (bukan hanya di atas form sebagai daftar umum).
- Field wajib ditandai jelas (label + indikator, bukan warna saja).

### 13.10 Accessible Dialogs

- Modal memakai `role="dialog"` + `aria-modal="true"`, fokus otomatis berpindah ke dalam dialog saat terbuka, dan kembali ke elemen pemicu saat ditutup.

---

## 14. Implementation Rules (shadcn/ui)

Jika sebuah produk INDICATE dibangun di atas **shadcn/ui**, aturan berikut berlaku:

1. **shadcn/ui adalah primitive/component foundation, bukan identitas visual final.** Struktur, aksesibilitas, dan interaksi dasar dari shadcn/ui dipakai — tapi tampilannya wajib disesuaikan penuh ke token INDICATE.
2. **Reuse dulu, baru extend.** Sebelum membuat komponen baru, cek apakah komponen shadcn/ui yang sudah ada di project bisa dipakai ulang dengan restyling token, bukan langsung ditulis dari nol.
3. **Semua nilai visual bawaan shadcn/ui harus dipetakan ke token INDICATE** — radius, warna, spacing, tipografi, border, dan state (hover/focus/disabled) mengikuti dokumen ini, bukan default Tailwind/shadcn.
4. **Jangan memakai style bawaan tanpa evaluasi.** Setiap komponen shadcn/ui yang ditambahkan ke project wajib direview: apakah radius-nya sesuai (`3–4px`, bukan default besar), apakah shadow dihilangkan/diganti surface hierarchy, apakah warna aksennya sudah brass bukan biru default.
5. **Jangan membuat duplicate component tanpa alasan.** Jika shadcn/ui sudah punya `Button`, jangan membuat `IndicateButton` terpisah kecuali ada kebutuhan varian yang benar-benar tidak bisa diakomodasi lewat props/variant yang ada.
6. Mapping token disarankan lewat CSS variables (`:root`) yang menimpa default Tailwind config, bukan override manual di tiap file komponen.

---

## 15. Anti-Slop Rules

Pattern berikut **dihindari kecuali ada alasan UX yang sangat kuat dan didokumentasikan** saat dipakai:

- Estetika generic SaaS (kartu putih rounded + shadow lembut di semua tempat)
- Estetika crypto/trading dashboard
- Estetika cyberpunk (neon ganda, scanline, glitch)
- Estetika "AI startup" generik (gradient ungu-biru sebagai identitas utama)
- Gradient berlebihan pada background atau elemen dekoratif
- Gradient text (teks dengan fill gradient warna-warni)
- Glassmorphism (blur kaca berlebihan pada card/panel)
- Blur berlebihan di luar penggunaan fungsional (backdrop navbar sticky adalah pengecualian yang sudah didefinisikan)
- Giant glowing orb / bola bercahaya sebagai dekorasi latar
- Shadow berlebihan (box-shadow ganda/berlapis untuk "kedalaman")
- Oversized rounded card (radius besar seperti `16–24px` ke atas)
- Excessive pill UI (semua elemen jadi rounded-full tanpa alasan — badge, tag, tombol sekaligus)
- Sparkle/bintang dekoratif (ikon ✨ atau elemen "AI magic" generik)
- Objek 3D mengambang sebagai hiasan
- Meaningless KPI card (angka besar tanpa konteks/actionability — lihat [12.3](#123-metrics-angka-ringkasan))
- Badge berlebihan (>2–3 badge berdampingan tanpa alasan informasional)
- Ikon berlebihan (ikon di depan setiap label/kalimat tanpa fungsi pembeda)
- Animasi yang tidak perlu (hover-effect di setiap card, fade-in berurutan di setiap elemen saat scroll)
- Motion dekoratif (animasi yang tidak merepresentasikan proses nyata — lihat [10.5](#105-larangan-motion))
- Visual noise umum (terlalu banyak elemen kompetisi perhatian dalam satu viewport)

**Tujuan bagian ini bukan membuat desain kaku — tetapi menjaga identitas.** Jika sebuah pattern di atas dianggap benar-benar dibutuhkan untuk kasus UX tertentu, dokumentasikan alasannya di komponen terkait sebelum diimplementasikan, dan diskusikan apakah itu berarti dokumen ini perlu diperbarui.

---

## 16. Extensibility / Future Development

DESIGN.md ini adalah dokumen hidup. Saat INDICATE mendapat halaman baru, fitur baru, dashboard baru, workflow baru, komponen baru, visualisasi data baru, atau product surface baru, ikuti prinsip berikut:

1. **Gunakan token existing terlebih dahulu.** Cek [3. Color](#3-color), [4. Typography](#4-typography), dan [5. Spacing](#5-spacing) sebelum membuat nilai baru.
2. **Ikuti hierarchy existing.** Surface hierarchy ([3.2](#32-surface-hierarchy)), heading hierarchy ([4.3](#43-heading-hierarchy)), dan hierarchy of importance ([1.4](#14-hierarchy-of-importance)) berlaku untuk permukaan baru apa pun.
3. **Jangan membuat visual language baru tanpa alasan.** Kembalikan dulu kebutuhan visual ke metafora [Source → Transmission → Distribution](#11-visual-language) — kemungkinan besar polanya sudah ada.
4. **Pattern baru harus reusable**, bukan solusi sekali pakai untuk satu halaman.
5. **Tetap konsisten dengan karakter INDICATE** — tenang, presisi, editorial (lihat [1. Design DNA](#1-design-dna)).

### 16.1 Kapan DESIGN.md Perlu Diperbarui

Jika kebutuhan baru **belum punya pattern** yang sesuai di dokumen ini, dokumen ini yang harus diperluas dulu — bukan diselesaikan langsung di kode dengan nilai ad-hoc. Alur yang disarankan:

1. Identifikasi kebutuhan (komponen/pattern apa yang belum ada).
2. Cek apakah kebutuhan itu sebenarnya bisa dipenuhi dengan kombinasi token/komponen existing.
3. Jika benar-benar baru, definisikan token/komponen tersebut mengikuti struktur dokumen ini (purpose, appearance, states, usage, misuse untuk komponen; token bernama + aturan pemakaian untuk nilai baru).
4. Tambahkan ke section yang relevan, jaga konsistensi penomoran dan format Daftar Isi.
5. Lakukan pengecekan silang terhadap [15. Anti-Slop Rules](#15-anti-slop-rules) sebelum finalisasi.

---

*Dokumen ini adalah otoritas visual tunggal. File `indicate-brand.html` yang dirujuk revisi-revisi awal tidak ada di tree — jangan mencari atau menirunya; implementasi (dashboard, aplikasi produk) wajib merujuk ke token dan aturan dalam dokumen ini.*
