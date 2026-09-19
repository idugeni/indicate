/** Public service-surface copy: single reviewed source; never tenant data, never reads Organization/Site. */
import { SERVICE_PATHS } from '@/core/routing/control-plane-paths';

export interface NavigationLink {
  readonly href: string;
  readonly label: string;
}

export interface FeatureItem {
  readonly title: string;
  readonly description: string;
  readonly href?: string;
  readonly points?: readonly string[];
}

export interface FaqItem {
  readonly id?: string;
  readonly question: string;
  readonly answer: string;
}

export interface TestimonialItem {
  readonly quote: string;
  readonly author: string;
  readonly role: string;
  readonly media: string;
}

export interface ProofPointItem {
  readonly term: string;
  readonly detail: string;
}

export const SERVICE_NAME = 'Indicate';
export const SERVICE_TAGLINE = 'Satu ruang redaksi untuk seluruh jaringan media Anda.';
/**
 * Logo instansi fallback untuk avatar publisher: dipakai bila publisher belum
 * menyematkan logonya sendiri (`contacts.logoUrl`). Berkasnya WAJIB ada di
 * `public/brand/logo-kemenimipas.png` — sebelum ada, Avatar otomatis
 * menampilkan inisial (shadcn AvatarImage gagal → AvatarFallback).
 */
export const MINISTRY_FALLBACK_LOGO_URL = '/brand/logo-kemenimipas.png';
/**
 * Ilustrasi fallback gambar utama berita: dipakai kartu artikel, hero halaman
 * artikel, dan sampul editorial bila artikel tidak punya `imageUrl`.
 * Berkasnya WAJIB ada di `public/assets/article-fallback.webp`.
 */
export const ARTICLE_FALLBACK_IMAGE_URL = '/assets/article-fallback.webp';
export const SERVICE_SUMMARY =
  'Indicate menyatukan pengelolaan banyak portal berita ke dalam satu dasbor terpusat. Redaksi menulis satu kali, lalu menerbitkannya ke situs mana pun yang dipilih — dengan data masing-masing pelanggan yang terjaga dan terpisah.';

export const SITE_ROUTES: readonly NavigationLink[] = Object.freeze([
  { href: '/services', label: 'Layanan' },
  { href: '/pricing', label: 'Harga' },
  { href: '/about', label: 'Tentang' },
  { href: '/faq', label: 'FAQ' },
  { href: '/contact', label: 'Kontak' },
]);

export const LEGAL_ROUTES: readonly NavigationLink[] = Object.freeze([
  { href: '/privacy', label: 'Kebijakan Privasi' },
  { href: '/terms', label: 'Ketentuan Layanan' },
]);

/** Every site path, kept in sync with the routing contract in shared/. */
export const SITE_PATHS = SERVICE_PATHS;

export const PROOF_POINTS: readonly ProofPointItem[] = Object.freeze([
  { term: 'Satu Aplikasi', detail: 'Semua domain dilayani dari satu penyebaran terpusat, bukan satu aplikasi terpisah per pelanggan.' },
  { term: 'Satu Basis Data', detail: 'PostgreSQL 17 menjadi sumber kebenaran tunggal untuk redaksi, penerbitan, dan jejak audit.' },
  { term: 'Host Tepat', detail: 'Situs publik ditentukan dari nama host yang sama persis secara eksak, tanpa fallback tenant.' },
]);

export const VALUE_PROPOSITIONS: readonly FeatureItem[] = Object.freeze([
  {
    title: 'Satu artikel, banyak situs',
    description:
      'Tulis satu artikel kanonik, lalu tugaskan ke beberapa situs sekaligus. Penerbitan berjalan sebagai pekerjaan latar yang tahan gagal, bukan salin-tempel manual, dan isinya tidak diduplikasi.',
  },
  {
    title: 'Satu dasbor untuk semua domain',
    description:
      'Menambah domain, wilayah, atau situs baru adalah operasi data, bukan penyiapan aplikasi baru. Tidak ada deployment tambahan, tidak ada basis data terpisah per pelanggan.',
  },
  {
    title: 'Isolasi antar organisasi',
    description:
      'Setiap pembacaan dan perubahan terikat pada satu organisasi. Pengunjung diarahkan ke satu situs berdasarkan nama host yang sama persis, tanpa kecocokan sebagian dan tanpa situs cadangan.',
  },
  {
    title: 'Alur kerja dari mana saja',
    description:
      'Dasbor web dan bot Telegram memakai aturan bisnis yang sama, sehingga izin dan hasilnya tidak berbeda antar pintu masuk.',
  },
  {
    title: 'Domain tetap milik Anda',
    description:
      'Nama domain dibeli dan dipegang atas nama Anda sendiri. Berhenti kapan pun: domain, konten, dan data dibawa pergi tanpa sandera.',
  },
  {
    title: 'Satu harga pasti',
    description:
      'Satu harga Rp550.000 per bulan, sudah termasuk PPN: Anda menghubungi kami, membayar manual ke rekening resmi, lalu organisasi Anda diaktifkan dan berjalan terus. Tidak ada biaya tersembunyi.',
  },
]);

export const USE_CASES: readonly FeatureItem[] = Object.freeze([
  {
    title: 'Grup media multi-portal',
    description:
      'Belasan portal di banyak kota dikelola satu redaksi pusat. Berita ditulis sekali, tayang di semua portal yang relevan.',
  },
  {
    title: 'Humas dan instansi',
    description:
      'Siaran pers resmi terbit serentak ke portal utama dan portal unit kerja, dengan arsip yang rapi dan dapat diaudit.',
  },
  {
    title: 'Korporat multi-brand',
    description:
      'Setiap merek punya portal berwajah sendiri, dikelola tim komunikasi yang sama tanpa membeli sistem baru per merek.',
  },
  {
    title: 'Komunitas dan kampus',
    description:
      'Mulai dari satu portal kecil, tambah portal baru kapan pun tanpa pindah sistem.',
  },
]);

export const CAPABILITIES: readonly FeatureItem[] = Object.freeze([
  {
    title: 'Redaksi terpusat',
    description:
      'Kelola artikel, kategori, wilayah, penulis, dan penugasan situs dari satu tempat. Setiap perubahan sensitif tercatat pada jejak audit hanya-tambah yang dirancang tidak dapat diubah melalui aplikasi.',
    points: [
      'Artikel, kategori, wilayah, dan penulis dalam satu layar',
      'Peran owner, editor, dan penulis yang tegas',
      'Perubahan sensitif tercatat otomatis di audit',
    ],
  },
  {
    title: 'Terbit sekali ke banyak situs',
    description:
      'Satu artikel bisa tayang di belasan portal sekaligus tanpa salin-tempel. Status tiap penayangan terpantau: antre, terkirim, atau gagal dan dicoba ulang otomatis.',
    points: [
      'Pilih belasan portal tujuan dalam satu aksi',
      'Status antre, terkirim, dan gagal terpantau per situs',
      'Kegagalan dicoba ulang otomatis oleh sistem',
    ],
  },
  {
    title: 'Media privat berlapis',
    description:
      'Gambar disimpan pada penyimpanan privat dan dibuka per objek lewat otorisasi bertanda tangan berumur pendek. Dirancang tanpa folder publik; tautan kedaluwarsa otomatis.',
    points: [
      'Penyimpanan privat tanpa folder publik',
      'Tautan bertanda tangan yang kedaluwarsa otomatis',
      'Akses media terikat konteks situs yang meminta',
    ],
  },
  {
    title: 'Tampilan tiap situs bisa beda',
    description:
      'Setiap portal punya warna, logo, dan susunan sendiri-sendiri — tetap dikelola dari satu dasbor yang sama.',
    points: [
      'Warna, logo, dan susunan diatur per portal',
      'Situs wilayah mewarisi brand induk otomatis',
      'Satu dasbor untuk seluruh penjenamaan',
    ],
  },
  {
    title: 'Ramah mesin pencari',
    description:
      'Judul, deskripsi, pratinjau tautan, peta situs, dan umpan RSS dibuat otomatis per situs, sehingga tiap portal dinilai mandiri oleh Google.',
    points: [
      'Judul, deskripsi, dan pratinjau dibuat per situs',
      'Peta situs dan umpan RSS otomatis per portal',
      'Tiap portal dinilai mandiri oleh mesin pencari',
    ],
  },
  {
    title: 'Kerja dari Telegram',
    description:
      'Wartawan bisa mengirim berita lewat chat Telegram. Hanya nomor yang sudah didaftarkan yang diterima; sisanya ditolak otomatis.',
    points: [
      'Kirim berita lewat chat dari nomor terdaftar',
      'Nomor tak dikenal ditolak otomatis',
      'Aturan bisnis sama dengan dasbor web',
    ],
  },
  {
    title: 'Wilayah dan subdomain',
    description:
      'Setiap domain induk dapat memiliki situs wilayah pada subdomainnya sendiri, dengan konten dan penjenamaan terpisah namun tetap satu ruang redaksi.',
    points: [
      'Subdomain wilayah untuk tiap domain induk',
      'Konten dan brand terpisah per wilayah',
      'Tetap dikelola satu ruang redaksi',
    ],
  },
  {
    title: 'Jejak audit hanya-tambah',
    description:
      'Siapa mengubah apa dan kapan — tercatat untuk pertanggungjawaban dan dirancang tidak dapat diubah melalui aplikasi. Retensi mengikuti Kebijakan Privasi.',
    points: [
      'Siapa, apa, dan kapan tercatat rapi',
      'Tidak dapat diubah melalui aplikasi',
      'Retensi mengikuti Kebijakan Privasi',
    ],
  },
  {
    title: 'Didampingi manusia',
    description:
      'Bukan sekadar aplikasi: tim kami membantu penyiapan awal, pindahan data, dan menjawab pertanyaan lewat saluran yang jelas.',
    points: [
      'Penyiapan awal dibantu tim sampai jalan',
      'Bantuan pindahan dari sistem lama',
      'Jawaban dari manusia, bukan bot',
    ],
  },
]);

export const WORKFLOW_STEPS: readonly FeatureItem[] = Object.freeze([
  {
    title: 'Hubungi kami',
    description:
      'Ceritakan kebutuhan lewat WhatsApp atau surel — jumlah portal, wilayah, dan jadwal yang diinginkan.',
  },
  {
    title: 'Bayar per bulan',
    description:
      'Biaya tetap Rp550.000 per bulan, sudah termasuk PPN. Pembayaran manual ke rekening resmi yang kami informasikan; admin memproses satu pembayaran beserta satu invoice untuk setiap bulan berjalan.',
  },
  {
    title: 'Kami siapkan semuanya',
    description:
      'Organisasi, domain, dan wilayah Anda disiapkan. DNS dan sertifikat diarahkan, dan nama host diaktifkan setelah semua pemeriksaan lulus.',
  },
  {
    title: 'Susun redaksi',
    description:
      'Tambahkan anggota beserta perannya, hubungkan nomor Telegram bila diperlukan, dan tentukan penjenamaan tiap situs.',
  },
  {
    title: 'Terbitkan dan pantau',
    description:
      'Tulis satu artikel, pilih situs tujuannya, lalu terbitkan. Status penerbitan dan jejak audit terpantau dari dasbor yang sama.',
  },
]);

export const GUARANTEES: readonly FeatureItem[] = Object.freeze([
  {
    title: 'Aktif maks. 1x24 jam',
    description:
      'Setelah pembayaran terkonfirmasi, organisasi Anda diaktifkan paling lambat 1x24 jam. Anda dipandu statusnya dari dasbor.',
  },
  {
    title: 'Aktif terus, tanpa kedaluwarsa',
    description:
      'Tidak ada masa aktif 30 hari dan tidak ada masa tenggang: selama status aktif, seluruh fungsi berjalan penuh.',
  },
  {
    title: 'Rp550.000 per bulan, sudah termasuk PPN',
    description:
      'Satu nominal pasti setiap bulan: tidak ada tingkatan, tidak ada katalog, dan tidak ada tagihan kejutan di tengah jalan.',
  },
  {
    title: 'Berhenti tanpa sandera',
    description:
      'Domain, konten, dan data adalah milik Anda. Berhenti kapan pun dan bawa semuanya pergi.',
  },
]);

export const ABOUT_STORY: readonly string[] = Object.freeze([
  'Indicate lahir dari pengalaman mendampingi grup media yang portalnya tumbuh lebih cepat dari timnya. Tiap portal baru berarti pengeluaran baru yang berlipat — padahal yang dibutuhkan redaksi hanya tempat menulis dan tombol terbitkan.',
  'Kami membalik pendekatannya: satu ruang redaksi untuk seluruh jaringan portal. Nambah portal tidak lagi jadi proyek besar yang mahal. Biaya tetap Rp550.000 per bulan, sudah termasuk PPN, dan domain tetap milik Anda sepenuhnya.',
  'Hari ini Indicate melayani redaksi solo hingga grup media — semuanya dengan janji yang sama: Anda terima beres, kami yang mengurus mesinnya.',
]);

export const ABOUT_PRINCIPLES: readonly FeatureItem[] = Object.freeze([
  {
    title: 'Terima beres, bukan terima PR',
    description:
      'Anda tidak perlu tahu cara kerja server, cache, atau DNS. Tugas Anda menulis dan menerbitkan; tugas kami memastikan semuanya jalan.',
  },
  {
    title: 'Satu harga pasti',
    description:
      'Tidak ada tingkatan dan tidak ada biaya tersembunyi: satu harga Rp550.000 per bulan, sudah termasuk PPN.',
  },
  {
    title: 'Milik Anda tetap milik Anda',
    description:
      'Domain, konten, dan data redaksi adalah milik Anda. Berhenti kapan pun dan bawa semuanya pergi — kami tidak menyandera apa pun.',
  },
  {
    title: 'Dijawab manusia',
    description:
      'Bantuan ditangani orang sungguhan yang paham redaksi, bukan bot yang memutar-mutar jawaban. Didampingi sampai jalan.',
  },
  {
    title: 'Tanpa batas paket',
    description:
      'Tidak ada kuota tingkatan yang mengunci fitur: selama status aktif, seluruh fungsi tersedia penuh untuk kebutuhan redaksi Anda.',
  },
  {
    title: 'Bukti, bukan janji',
    description:
      'Status penerbitan terpantau satu per satu, kegagalan dicoba ulang otomatis, dan semua aktivitas tercatat. Anda selalu bisa memeriksa sendiri.',
  },
]);

export const CONTACT_CHECKLIST: readonly string[] = Object.freeze([
  'Jumlah domain induk dan daftar wilayah yang direncanakan',
  'Perkiraan jumlah anggota redaksi beserta perannya',
  'Apakah wartawan perlu kirim berita via Telegram',
  'Apakah ada konten yang perlu dipindahkan dari sistem lama',
]);

/** Tenant live per `docs/DOMAINS.md` (batch Exabytes 2026-09-03). */
export const LIVE_TENANT_APEX: readonly string[] = Object.freeze([
  'fakta01.my.id',
  'jurnalism.web.id',
  'kabar360.biz.id',
  'liputan99.web.id',
  'nusantara24.web.id',
  'pantaunusantara.web.id',
  'suarafakta24.biz.id',
  'wartakini7.web.id',
  'wawasannusa.biz.id',
]);

/** Situs wilayah live per `docs/DOMAINS.md` (`wonosobo.*`, tercakup zona apex). */
export const LIVE_TENANT_REGIONAL: readonly string[] = Object.freeze([
  'wonosobo.fakta01.my.id',
  'wonosobo.jurnalism.web.id',
  'wonosobo.kabar360.biz.id',
  'wonosobo.liputan99.web.id',
  'wonosobo.nusantara24.web.id',
  'wonosobo.pantaunusantara.web.id',
  'wonosobo.suarafakta24.biz.id',
  'wonosobo.wartakini7.web.id',
  'wonosobo.wawasannusa.biz.id',
]);

export interface DocSectionItem {
  readonly heading: string;
  readonly body: string;
}

export const TERMS_SECTIONS: readonly DocSectionItem[] = Object.freeze([
  {
    heading: '1. Definisi',
    body: 'Dalam Ketentuan Layanan ini, “Indicate”, “kami”, atau “Penyelenggara” berarti penyelenggara layanan Indicate beserta karyawan, kontraktor, dan afiliasinya yang bertindak atas nama Penyelenggara. “Pelanggan”, “Anda”, atau “Organisasi” berarti badan usaha, lembaga, atau perorangan yang memesan dan menggunakan layanan, termasuk setiap pengurus dan anggota redaksi yang diberi akses oleh Pelanggan. “Layanan” berarti platform Indicate secara keseluruhan: situs web berita siap tayang, ruang redaksi terpusat, penerbitan multi-situs, penyimpanan dan penayangan media, dasbor, serta pendampingan manusia. “Konten Pelanggan” berarti seluruh artikel, gambar, video, logo, teks, metadata SEO, dan materi lain yang diunggah, ditulis, atau diterbitkan Pelanggan melalui Layanan. Tidak ada tingkatan paket, tidak ada masa aktif berkala: status langganan hanya aktif, ditangguhkan, atau dibatalkan sebagaimana diatur pada Bagian 8. Kontrak terbentuk dari kesepakatan biaya melalui kontak resmi ditambah Ketentuan ini. Penyelenggara adalah PT SANCA PHENA CAKRA, berdomisili di Jl. Raya Kalierang Gg. Melati RT 001/RW 005, Kalierang, Selomerto, Kabupaten Wonosobo, Jawa Tengah 56361 (NPWP tercantum pada arsip penagihan resmi), surel sancaphenacakra@gmail.com, telepon 0856-4115-9405.',
  },
  {
    heading: '2. Lingkup layanan dan hal yang dikecualikan',
    body: 'Indicate menyediakan layanan terkelola terima beres: penyediaan dan hosting situs berita, satu ruang redaksi terpusat untuk menulis dan mengelola artikel lintas situs, penerbitan satu-klik ke situs tujuan yang dipilih, penyimpanan objek privat untuk media dengan penayangan melalui otorisasi bertanda tangan berumur pendek, pengelolaan domain dan situs, kanal, kategori, penulis, dan peran redaksi, serta pendampingan aktivasi dan operasional oleh manusia. Pengadaan dan kepemilikan nama domain berada di luar lingkup Layanan — domain sepenuhnya milik dan tanggung jawab Pelanggan — namun tim kami membantu mengarahkan nameserver, memverifikasi propagasi DNS, dan mengaitkan domain ke situs Anda tanpa biaya tambahan yang wajar. Yang secara tegas dikecualikan dari Layanan standar adalah: pengembangan perangkat lunak kustom di luar konfigurasi yang tersedia, migrasi massal arsip historis dari sistem lama kecuali disepakati tertulis, jasa hukum atau editorial (penyuntingan naskah, verifikasi fakta, kurasi), pengadaan lisensi pihak ketiga seperti foto stok, font komersial, atau layanan analitik berbayar, serta penanganan insiden yang disebabkan penyalahgunaan kredensial oleh pihak Pelanggan. Setiap pekerjaan di luar lingkup ditawarkan sebagai layanan profesional terpisah dengan penawaran tertulis.',
  },
  {
    heading: '3. Kelayakan dan kewenangan',
    body: 'Dengan memesan Layanan, Anda menyatakan bahwa Anda berusia paling sedikit 18 tahun atau telah cakap hukum menurut hukum yang berlaku, dan — apabila bertindak atas nama organisasi — Anda memiliki kewenangan penuh untuk mengikat organisasi tersebut pada Kontrak ini. Pelanggan wajib memberikan informasi identitas, kontak penagihan, dan daftar domain yang akurat, lengkap, dan terkini, serta memperbaruinya apabila berubah. Kami berhak menolak, menunda, atau membatalkan order apabila informasi yang diberikan tidak dapat diverifikasi, terindikasi palsu, atau penggunaannya melanggar hukum. Layanan tidak diperuntukkan bagi pihak yang dilarang menerima layanan teknologi berdasarkan sanksi atau pembatasan yang berlaku. Pelanggan bertanggung jawab memastikan bahwa seluruh pengguna yang diberi akses mematuhi Ketentuan ini seolah-olah mereka adalah pihak pada Kontrak.',
  },
  {
    heading: '4. Akun organisasi, peran, dan keamanan kredensial',
    body: 'Setiap Pelanggan menerima satu ruang organisasi dengan peran bertingkat: pengurus organisasi (owner/admin), editor, penulis, dan peran baca sesuai kebutuhan redaksi. Pengurus organisasi berwenang menambah, mengubah peran, menonaktifkan, dan menghapus anggota kapan saja dari dasbor, dan setiap perubahan berlaku serta-merta. Anda bertanggung jawab penuh menjaga kerahasiaan kata sandi, sesi masuk, token integrasi, dan kunci API milik organisasi Anda, termasuk menerapkan kata sandi yang kuat, membatasi perangkat bersama, dan mencabut akses anggota yang sudah tidak berhak — misalnya karyawan yang mengundurkan diri — pada hari yang sama. Apabila terjadi dugaan pembobolan, phising, atau akses tidak sah, Anda wajib segera mengganti kredensial yang terdampak, mencabut sesi aktif, dan memberi tahu kami melalui kanal kontak resmi agar kami dapat membantu pembekuan dan investigasi. Kami menerapkan penyimpanan kata sandi satu arah (hashing modern dengan salt), pemisahan kredensial sistem pada penyimpanan rahasia sisi server, dan pencatatan audit hanya-tambah untuk aktivitas sensitif. Kami tidak pernah meminta kata sandi Anda melalui surel atau pesan instan, dan setiap permintaan demikian harus diabaikan serta dilaporkan.',
  },
  {
    heading: '5. Pemesanan dan pembentukan kontrak',
    body: 'Alur pemesanan standar adalah: Anda menghubungi kami lewat halaman Kontak, lalu melakukan pembayaran manual sebesar Rp550.000 ke rekening resmi yang kami informasikan. Kontrak terbentuk pada saat organisasi Anda kami aktifkan, bukan pada saat Anda membayar. Kami dapat menolak pemesanan yang melewati batas kapasitas operasional, memuat domain yang bermasalah secara hukum, atau terindikasi penipuan, dengan pengembalian dana penuh atas pembayaran yang sudah diterima untuk pemesanan yang ditolak tersebut. Untuk kebutuhan khusus, ruang lingkup tambahan dituangkan dalam kesepakatan tertulis yang berlaku melengkapi Ketentuan ini kecuali dinyatakan sebaliknya secara tertulis.',
  },
  {
    heading: '6. Biaya, pajak, dan transparansi',
    body: 'Biaya layanan adalah Rp550.000 per bulan dan sudah termasuk PPN. Admin memproses satu pembayaran manual beserta satu invoice untuk setiap bulan berjalan; langganan sendiri tidak memiliki jangka waktu dan tetap aktif sampai admin membatalkannya. Biaya perbankan mengikuti ketentuan bank yang digunakan, serta biaya registrar domain dibayarkan langsung oleh Anda kepada registrar pilihan Anda. Apabila terjadi kesalahan penulisan nominal yang nyata dan tidak wajar, kami akan memberi tahu Anda sebelum aktivasi dan memberi pilihan untuk melanjutkan dengan angka yang benar atau menerima pengembalian dana penuh. Status langganan selalu dapat diperiksa dari dasbor organisasi Anda demi keterbukaan penuh. Kebijakan refund: pemesanan yang ditolak mendapat pengembalian penuh; refund pasca-aktivasi hanya atas persetujuan platform dan diproses paling lambat 14 hari kerja ke rekening asal; penghentian sukarela tidak dihitung pro-rata; arsip penagihan tersedia di dasbor, sedangkan dokumen pajak resmi diterbitkan atas nama PT SANCA PHENA CAKRA mengikuti ketentuan perpajakan yang berlaku pada saat transaksi.',
  },
  {
    heading: '7. Pembayaran dan verifikasi',
    body: 'Pembayaran dilakukan manual ke rekening resmi yang kami informasikan melalui kanal kontak resmi pada halaman Kontak setelah kesepakatan — jangan mentransfer ke rekening dari sumber lain yang mengatasnamakan kami. Pembayaran dianggap lunas setelah dana efektif diterima dan kami konfirmasi; aktivasi dilakukan paling lambat 1x24 jam sejak konfirmasi. Setiap sengketa tagihan wajib diajukan paling lambat 14 hari kalender sejak pembayaran agar dapat kami selidiki selagi jejak transaksi masih hangat.',
  },
  {
    heading: '8. Aktivasi dan masa berlaku',
    body: 'Begitu pembayaran terkonfirmasi, administrator mengaktifkan organisasi Anda — paling lambat 1x24 jam kecuali terdapat kendala DNS di sisi registrar yang berada di luar kendali kami. Selama status aktif, seluruh fungsi tersedia penuh: menulis, mengunggah media, menerbitkan lintas situs, mengelola pengguna, dan mengunduh arsip. Tidak ada masa aktif berkala yang kedaluwarsa dan tidak ada masa tenggang: langganan tidak memiliki jangka waktu dan berjalan terus sampai administrator membatalkannya atas permintaan tertulis Anda yang terverifikasi atau menangguhkan karena pelanggaran.',
  },
  {
    heading: '9. Penangguhan dan pemutusan',
    body: 'Penangguhan dan pemutusan dilaksanakan oleh administrator. Kami hanya menangguhkan layanan karena pelanggaran ketentuan (setelah peringatan tertulis sebagaimana Bagian 15), perintah hukum, atau atas permintaan tertulis Anda yang terverifikasi. Penangguhan bukan penghapusan — data Anda dipertahankan sesuai jadwal retensi pada Kebijakan Privasi — dan pemulihan penuh dilakukan segera setelah dasar penangguhan selesai. Kami hanya melakukan pemutusan permanen dan penghapusan data operasional setelah seluruh kewajiban selesai dan tenggat retensi terpenuhi, atau lebih awal atas permintaan tertulis Anda yang terverifikasi.',
  },
  {
    heading: '10. Perubahan kebutuhan',
    body: 'Kebutuhan bertambah (portal baru, anggota baru, pindahan sistem) atau berkurang? Sampaikan lewat kanal kontak resmi; penyesuaian — termasuk biaya bila ada — disepakati tertulis sebelum berlaku. Tidak ada penalti perubahan dan tidak ada hitungan pro-rata yang rumit.',
  },
  {
    heading: '11. Kebutuhan khusus dan onboarding',
    body: 'Untuk kebutuhan khusus — grup media besar, kepatuhan tambahan, integrasi khusus, atau jadwal onboarding bertahap — cakupan, jadwal, tanggung jawab masing-masing pihak, dan kriteria penerimaan dituangkan dalam kesepakatan tertulis sebelum pekerjaan dimulai. Onboarding mencakup penemuan kebutuhan, konfigurasi awal situs dan peran, pengarahan DNS dan TLS, uji penerbitan ujung-ke-ujung, serta serah terima operasional dengan dokumentasi. Setiap perubahan ruang lingkup setelah kesepakatan ditandatangani dituangkan dalam adendum tertulis; pekerjaan di luar adendum tidak dimulai sebelum disetujui.',
  },
  {
    heading: '12. Domain, DNS, TLS, dan konektivitas',
    body: 'Nama domain sepenuhnya milik Anda dan terdaftar atas nama Anda pada registrar pilihan Anda; kami tidak pernah mengambil alih kepemilikan domain Anda. Kami membantu mengarahkan nameserver atau catatan DNS ke infrastruktur kami, memverifikasi propagasi, dan menerbitkan sertifikat TLS untuk koneksi terenkripsi. Waktu aktivasi situs dapat bergantung pada propagasi DNS global dan validasi registrar yang berada di luar kendali kami — dalam hal demikian tenggat 1x24 jam dihitung sejak konfigurasi DNS Anda terdeteksi benar. Anda bertanggung jawab memperpanjang pendaftaran domain tepat waktu; kedaluwarsa domain di sisi registrar dapat menyebabkan situs tidak dapat diakses walaupun langganan Indicate Anda masih aktif. Kami tidak bertanggung jawab atas gangguan yang disebabkan pemadaman registrar, kesalahan konfigurasi DNS oleh pihak Anda, atau pemblokiran oleh penyedia akses internet, namun akan membantu diagnosis dan pemulihan sejauh yang wajar.',
  },
  {
    heading: '13. Kepemilikan konten dan lisensi terbatas kepada kami',
    body: 'Seluruh Konten Pelanggan — artikel, foto, video, logo, arsip, dan data redaksi — adalah dan tetap milik organisasi Anda. Kami tidak mengklaim kepemilikan apa pun atas Konten Pelanggan. Dengan menggunakan Layanan, Anda memberi kami lisensi non-eksklusif, berlaku di seluruh dunia, bebas royalti, dan terbatas strictly untuk meng-hosting, menyimpan, mencadangkan, mengubah format teknis (misalnya kompresi gambar), menayangkan melalui jaringan tepi, dan memproses Konten Pelanggan semata-mata untuk menyediakan Layanan yang Anda minta. Lisensi ini berakhir ketika konten dihapus sesuai jadwal retensi, kecuali salinan arsip yang wajib dipertahankan menurut hukum. Anda menyatakan memiliki seluruh hak yang diperlukan untuk mengunggah dan menerbitkan Konten Pelanggan, termasuk lisensi foto, kutipan, dan merek yang muncul di dalamnya. Kami tidak meninjau kebenaran editorial konten Anda secara proaktif, namun dapat menangguhkan penayangan materi tertentu apabila diwajibkan putusan pengadilan, permintaan aparat penegak hukum yang sah, atau untuk mencegah kerugian yang nyata dan segera.',
  },
  {
    heading: '14. Tanggung jawab editorial, pers, hak cipta, dan atribusi',
    body: 'Sebagai penerbit, organisasi Anda bertanggung jawab penuh atas kebenaran, kelayakan, dan kepatuhan hukum atas setiap konten yang diterbitkan melalui Layanan, termasuk kepatuhan terhadap Undang-Undang Pers, Undang-Undang Informasi dan Transaksi Elektronik (UU ITE) beserta perubahannya, Kitab Undang-Undang Hukum Pidana, Undang-Undang Hak Cipta, dan peraturan sektoral yang berlaku. Anda wajib memastikan setiap gambar memiliki hak pakai yang sah, setiap kutipan diberi atribusi yang benar, setiap konten bersponsor atau iklan ditandai secara jelas, dan setiap koreksi atau hak jawab ditangani sesuai kode etik jurnalistik. Apabila kami menerima pemberitahuan pelanggaran hak cipta atau konten melawan hukum yang kredibel dan spesifik, kami akan meneruskannya kepada pengurus organisasi Anda dan dapat membatasi penayangan materi yang disengketakan selama pemeriksaan, dengan pemberitahuan kepada Anda. Pelanggaran berulang atau berat — misalnya plagiarisme sistematis atau penerbitan konten yang telah dinyatakan melawan hukum oleh putusan berkekuatan hukum tetap — dapat mengakibatkan penangguhan akun setelah peringatan tertulis. Setiap situs menyediakan kanal Laporkan Konten (/report) yang terbuka untuk umum; setiap laporan kredibel dan spesifik kami teruskan kepada pengurus organisasi, kami tinjau paling lambat 1x24 jam, materi yang disengketakan dapat dibatasi penayangannya selama pemeriksaan dengan pemberitahuan, dan seluruh penanganan tercatat sebagai bukti. Setiap media yang diunggah wajib dicatat sumber lisensinya pada kolom lisensi yang tersedia; unggahan tanpa hak pakai yang sah wajib diturunkan segera setelah diketahui.',
  },
  {
    heading: '15. Penggunaan yang dapat diterima dan yang dilarang',
    body: 'Layanan wajib digunakan secara sah, wajar, dan menghormati hak pihak lain. Dilarang menggunakan Layanan untuk: menerbitkan atau mendistribusikan konten yang melanggar hukum, termasuk ujaran kebencian, hasutan kekerasan, pornografi anak, perjudian ilegal, penipuan, atau pelanggaran privasi; mengunggah malware, menjalankan pemindaian atau serangan terhadap infrastruktur kami atau pihak ketiga, mencoba melewati kontrol akses, atau mengakses data organisasi lain dengan cara apa pun; mengirim spam, melakukan pengerukan (scraping) agresif yang mengganggu ketersediaan, atau menyalahgunakan kanal notifikasi; memalsukan identitas redaksi, memanipulasi atribusi penerbit, atau mengelabui pembaca mengenai sumber konten; serta menjual kembali atau menyewakan akses dasbor kepada pihak ketiga tanpa persetujuan tertulis, kecuali dalam rangka kerja sama redaksi yang sah di bawah organisasi Anda. Kami dapat menyelidiki dugaan pelanggaran, meminta klarifikasi, membatasi fungsi tertentu untuk meredam dampak, dan — untuk pelanggaran berat atau mendesak — membekukan akun setelah pemberitahuan. Pembekuan karena perintah hukum tidak memerlukan pemberitahuan terlebih dahulu apabila pemberitahuan dilarang oleh hukum.',
  },
  {
    heading: '16. Keamanan, pencadangan, dan tanggung jawab bersama',
    body: 'Keamanan adalah tanggung jawab bersama. Di sisi kami, Layanan menerapkan pemisahan tenant berlapis — dari aturan aplikasi hingga kebijakan keamanan tingkat baris (row-level security) pada PostgreSQL dengan peran runtime khusus tanpa hak pintas — enkripsi saat transit (TLS) dan saat tersimpan untuk data sensitif, penyimpanan rahasia sisi server yang tidak pernah dikirim ke peramban atau dicatat pada log, tautan media bertanda tangan berumur pendek tanpa daftar publik, serta jejak audit hanya-tambah untuk aktivitas sensitif. Pencadangan basis data dilakukan berkala oleh penyedia terkelola untuk tujuan pemulihan bencana; pencadangan bukan arsip publik dan hanya dipulihkan untuk memulihkan Layanan secara keseluruhan, bukan untuk memulihkan satu artikel yang dihapus pengguna — untuk itu tersedia fungsi ekspor dan riwayat di dasbor. Di sisi Anda, tanggung jawab meliputi pengelolaan anggota dan peran, keamanan perangkat redaksi, serta kehati-hatian terhadap rekayasa sosial. Tidak ada sistem yang kebal mutlak; ketentuan ini tidak menjanjikan keamanan sempurna, melainkan komitmen pada praktik terbaik yang wajar dan perbaikan berkelanjutan.',
  },
  {
    heading: '17. Ketersediaan, pemeliharaan, dan SLA',
    body: 'Kami mengupayakan Layanan tersedia setiap saat dan memantau ketersediaan, latensi, serta kegagalan penerbitan secara proaktif. Pemeliharaan terjadwal yang berpotensi menimbulkan gangguan dilakukan pada jam sepi dengan pemberitahuan terlebih dahulu melalui dasbor atau kanal status, sedangkan pemeliharaan darurat untuk keamanan dapat dilakukan sewaktu-waktu dengan pemberitahuan menyusul. Target ketersediaan adalah upaya terbaik yang wajar (best effort) tanpa kredit layanan; janji tingkat layanan (SLA) dengan target terukur, kredit, dan jalur eskalasi prioritas hanya berlaku apabila disepakati tertulis. Pengecualian SLA — di mana pun disepakati — mencakup pemadaman penyedia infrastruktur di luar kendali wajar kami, keadaan kahar, kesalahan konfigurasi DNS atau registrar oleh Pelanggan, serangan siber berskala internet, serta penangguhan karena pelanggaran. Setiap klaim SLA wajib diajukan dengan bukti waktu dan dampak dalam tenggat yang tercantum pada kesepakatan tertulis.',
  },
  {
    heading: '18. Dukungan dan pendampingan',
    body: 'Setiap pelanggan mendapat pendampingan manusia dalam Bahasa Indonesia: bantuan aktivasi dan pengarahan DNS, panduan penggunaan dasbor redaksi, serta penanganan kendala operasional. Saluran dukungan resmi adalah halaman Kontak dan kanal yang tercantum di dasbor; dukungan melalui kanal tidak resmi tidak dijamin ditindaklanjuti. Prioritas penanganan mengikuti dampak: situs tidak dapat diakses publik ditangani sebelum permintaan konfigurasi kosmetik. Cakupan dukungan standar tidak mencakup penulisan atau penyuntingan naskah, desain kustom di luar templat yang tersedia, pengembangan integrasi khusus, atau investigasi forensik atas perangkat milik Pelanggan — layanan tersebut dapat ditawarkan sebagai layanan profesional terpisah. Kami mencatat setiap tiket dukungan beserta penyelesaiannya untuk pengendalian mutu, dan Anda dapat meminta ringkasan riwayat dukungan organisasi Anda.',
  },
  {
    heading: '19. Privasi, pemrosesan data, dan subprosesor',
    body: 'Perlindungan data pribadi diatur dalam Kebijakan Privasi yang merupakan bagian yang tidak terpisahkan dari Kontrak ini. Ringkasnya: kami bertindak sebagai pengendali untuk data akun dan operasional Layanan, dan sebagai pemroses untuk Konten Pelanggan yang Anda kelola; setiap data terikat pada satu organisasi dan dipisahkan secara teknis sehingga tidak dapat diakses lintas tenant; kata sandi disimpan satu arah dan rahasia sistem tidak pernah terekspos ke peramban; media disimpan privat dan ditayangkan melalui otorisasi berumur pendek; dan jejak audit bersifat hanya-tambah tanpa nilai rahasia. Untuk menjalankan Layanan, kami menggunakan subprosesor terkelola — basis data dan autentikasi, penyimpanan objek, antrian dan cache, jaringan tepi, serta hosting aplikasi — yang masing-masing hanya menerima data minimum yang diperlukan untuk fungsinya. Daftar subprosesor terkini tercantum pada Kebijakan Privasi, dan perubahan material akan diberitahukan sebelum berlaku. Dengan menggunakan Layanan, Anda menginstruksikan kami memproses data sebagaimana dijelaskan dalam Kebijakan Privasi dan menjamin bahwa Anda memiliki dasar hukum yang sah untuk data pribadi yang Anda serahkan kepada kami.',
  },
  {
    heading: '20. Jaminan, penafian, dan batas tanggung jawab',
    body: 'Kami menjamin bahwa Layanan akan disediakan dengan keterampilan dan kehati-hatian yang wajar sesuai standar industri, dan bahwa kami memiliki hak untuk menyediakan Layanan sebagaimana dijelaskan dalam Kontrak. Selain jaminan tegas tersebut, sejauh diizinkan hukum yang berlaku, Layanan disediakan “sebagaimana adanya” tanpa jaminan tersirat mengenai kesesuaian untuk tujuan tertentu, ketiadaan gangguan mutlak, atau kebebasan mutlak dari galat — kami akan memperbaiki kekurangan yang terbukti sebagai bagian dari dukungan, bukan sebagai penjaminan hasil. Sejauh diizinkan hukum, tanggung jawab agregat kami atas seluruh klaim yang timbul dari atau terkait Kontrak dalam 12 bulan sebelum klaim pertama dibatasi sebesar total biaya langganan yang Anda bayarkan dalam 12 bulan tersebut, dan kami tidak bertanggung jawab atas kerugian tidak langsung, insidental, khusus, konsekuensial, hilangnya laba, hilangnya reputasi, atau hilangnya data yang timbul dari kesalahan pengelolaan kredensial oleh Pelanggan. Batasan ini tidak berlaku untuk kewajiban yang tidak dapat dibatasi menurut hukum, termasuk kesengajaan dan kelalaian berat, serta kewajiban pembayaran yang telah jatuh tempo.',
  },
  {
    heading: '21. Ganti rugi (indemnifikasi)',
    body: 'Anda setuju mengganti rugi dan membebaskan kami dari setiap klaim, kerugian, biaya pengacara yang wajar, dan denda yang timbul akibat: Konten Pelanggan yang Anda terbitkan; pelanggaran Anda atas Ketentuan ini atau hukum yang berlaku; pelanggaran hak kekayaan intelektual, privasi, atau hak publisitas pihak ketiga akibat tindakan Anda; atau penyalahgunaan akun organisasi Anda oleh pihak yang Anda beri akses. Kami setuju mengganti rugi Anda atas klaim pihak ketiga yang menyatakan bahwa Layanan — sebagaimana disediakan oleh kami dan digunakan sesuai Kontrak — melanggar hak kekayaan intelektual pihak ketiga, sepanjang Anda segera memberi tahu kami, memberi kami kendali atas pembelaan, dan bekerja sama secara wajar. Pihak yang menuntut ganti rugi wajib memitigasi kerugiannya dan tidak mengakui tanggung jawab tanpa persetujuan tertulis pihak yang mengganti rugi. Ketentuan ini tetap berlaku setelah Kontrak berakhir untuk klaim yang timbul selama Masa Aktif.',
  },
  {
    heading: '22. Keadaan kahar (force majeure)',
    body: 'Tidak ada pihak yang bertanggung jawab atas keterlambatan atau kegagalan memenuhi kewajiban (selain kewajiban pembayaran yang telah jatuh tempo) apabila disebabkan peristiwa di luar kendali wajarnya, termasuk bencana alam, kebakaran, banjir, pandemi, perang, terorisme, kerusuhan, pemadaman listrik regional, gangguan internet backbone, serangan siber berskala luas, tindakan pemerintah, atau kegagalan penyedia infrastruktur kritis. Pihak yang terdampak wajib segera memberi tahu pihak lain, mengupayakan mitigasi yang wajar, dan melanjutkan pelaksanaan segera setelah peristiwa berakhir. Apabila peristiwa kahar berlangsung terus-menerus lebih dari 30 hari kalender dan secara material menghalangi penyediaan Layanan inti, setiap pihak dapat mengakhiri bagian Kontrak yang terdampak dengan pemberitahuan tertulis.',
  },
  {
    heading: '23. Jangka waktu, penghentian, ekspor data, dan penghapusan',
    body: 'Kontrak berlaku selama status langganan aktif. Anda dapat berhenti kapan saja tanpa penalti: kirimkan permintaan tertulis dari pengurus organisasi dan kami akan menonaktifkan Layanan dalam tenggat wajar setelah verifikasi identitas. Sebelum penghentian berlaku, gunakan fungsi ekspor di dasbor untuk mengunduh artikel, media, dan data konfigurasi — kami menyediakan format yang wajar dan dapat dibaca mesin. Setelah penghentian, data operasional dihapus dalam tenggat wajar paling lama 90 hari, kecuali arsip penagihan dan jejak audit yang wajib disimpan menurut hukum sebagaimana dijelaskan pada Kebijakan Privasi. Kami dapat mengakhiri Kontrak dengan pemberitahuan 30 hari apabila Anda melanggar Ketentuan secara material dan tidak memperbaikinya setelah peringatan tertulis, atau serta-merta untuk pelanggaran berat pada Bagian 15 atau perintah hukum. Pengakhiran tidak menghapus kewajiban pembayaran yang telah jatuh tempo maupun ketentuan yang menurut sifatnya tetap berlaku.',
  },
  {
    heading: '24. Perubahan ketentuan, pemberitahuan, hukum, sengketa, dan kontak',
    body: 'Kami dapat memperbarui Ketentuan ini untuk mencerminkan perubahan fitur, regulasi, atau praktik keamanan. Perubahan material akan diumumkan melalui dasbor atau surel pemberitahuan paling lambat 14 hari sebelum berlaku, disertai tanggal efektif dan ringkasan perubahan; penggunaan Layanan setelah tanggal efektif dianggap sebagai persetujuan atas versi baru. Apabila Anda tidak setuju, Anda dapat berhenti sebelum tanggal efektif, dan versi sebelumnya tetap berlaku hingga status langganan Anda berakhir. Pemberitahuan resmi kepada kami disampaikan melalui halaman Kontak, surel sancaphenacakra@gmail.com, atau WhatsApp 0856-4115-9405, dan kepada Anda melalui alamat surel organisasi atau pengumuman dasbor. Kontrak ini diatur oleh dan ditafsirkan menurut hukum Republik Indonesia. Setiap perselisihan diselesaikan terlebih dahulu melalui musyawarah untuk mufakat dalam 30 hari sejak pemberitahuan sengketa; apabila gagal, sengketa diselesaikan melalui pengadilan yang berwenang di Indonesia. Ketentuan ini berlaku efektif sejak 7 September 2026. Untuk pertanyaan mengenai Ketentuan ini, hubungi kami melalui halaman Kontak atau surel sancaphenacakra@gmail.com.',
  },
]);

export const PRIVACY_SECTIONS: readonly DocSectionItem[] = Object.freeze([
  {
    heading: '1. Pengendali data, ruang lingkup, dan komitmen kami',
    body: 'Kebijakan Privasi ini menjelaskan bagaimana PT SANCA PHENA CAKRA ("Penyelenggara Indicate"; Jl. Raya Kalierang Gg. Melati RT 001/RW 005, Kalierang, Selomerto, Kabupaten Wonosobo, Jawa Tengah 56361) — selaku penyelenggara layanan — mengumpulkan, menggunakan, menyimpan, dan menghapus data pribadi dalam menyediakan platform redaksi multi-portal. Untuk data akun, penagihan, dan operasional Layanan (misalnya identitas pengurus, bukti pembayaran, dan log keamanan), kami bertindak sebagai pengendali data pribadi menurut Undang-Undang Nomor 27 Tahun 2022 tentang Pelindungan Data Pribadi (UU PDP). Untuk Konten Pelanggan yang Anda tulis, unggah, dan terbitkan — termasuk data pribadi pihak ketiga yang mungkin tercantum di dalamnya seperti nama narasumber — Anda bertindak sebagai pengendali dan kami bertindak sebagai pemroses yang memproses data semata-mata atas instruksi Anda untuk menyediakan Layanan. Kebijakan ini mencakup dasbor redaksi, situs publik yang kami hosting untuk Anda, serta kanal dukungan kami, tetapi tidak mencakup situs atau sistem pihak ketiga yang Anda tautkan sendiri. Komitmen kami sederhana dan dapat diaudit: kumpulkan minimum yang diperlukan, pisahkan data tiap organisasi secara teknis, enkripsi dan batasi akses, simpan tidak lebih lama dari yang dibutuhkan, dan hormati setiap hak subjek data.',
  },
  {
    heading: '2. Kategori data pribadi yang kami proses',
    body: 'Kami memproses enam kategori data. Pertama, data identitas dan kontak akun: nama, surel, peran redaksi, foto profil opsional, serta pengenal autentikasi yang diterbitkan penyedia identitas. Kedua, data konten dan editorial: artikel, draf, kategori, tag, penulis, atribusi penerbit, komentar internal, dan riwayat revisi yang Anda kelola. Ketiga, data media: berkas gambar, video, dan dokumen yang Anda unggah beserta metadata teknisnya (ukuran, dimensi, tipe berkas). Keempat, data penagihan: nominal dan tanggal pembayaran serta identitas pengirim sebagai arsip penagihan. Kelima, data operasional dan keamanan: jejak audit aktivitas sensitif, log akses dan galat yang telah disanitasi dari nilai rahasia, preferensi konfigurasi situs, serta catatan tiket dukungan. Keenam, data teknis pembaca situs publik Anda: log standar keamanan dan keandalan seperti alamat IP yang disamarkan, jenis peramban, halaman yang diakses, dan waktu akses — tanpa profil iklan dan tanpa penjualan data. Kami tidak meminta dan meminta Anda untuk tidak mengunggah data yang tidak diperlukan untuk penerbitan, terutama nomor identitas kependudukan, data biometrik, atau data kesehatan, kecuali terdapat dasar hukum yang sah dan telah dikonsultasikan dengan kami.',
  },
  {
    heading: '3. Sumber data',
    body: 'Sebagian besar data berasal langsung dari Anda dan anggota redaksi Anda: saat mendaftar, mengundang anggota, menulis artikel, mengunggah media, mengubah konfigurasi, atau menghubungi dukungan. Sebagian data dihasilkan otomatis oleh sistem untuk menjalankan Layanan: stempel waktu penerbitan, pengenal objek media, catatan audit atas tindakan sensitif, serta log teknis untuk keamanan dan diagnosis. Sebagian kecil data berasal dari penyedia infrastruktur tepercaya kami — misalnya status pengiriman surel, hasil validasi DNS, atau peristiwa keamanan tepi — yang dibatasi pada apa yang diperlukan untuk fungsi tersebut. Kami tidak membeli basis data pemasaran, tidak melakukan pengerukan profil dari media sosial, dan tidak menggabungkan data Anda dengan sumber periklanan pihak ketiga.',
  },
  {
    heading: '4. Tujuan dan dasar hukum pemrosesan',
    body: 'Setiap pemrosesan memiliki tujuan yang spesifik dan dasar hukum menurut UU PDP. Pelaksanaan kontrak menjadi dasar untuk menyediakan dan mengoperasikan Layanan yang Anda pesan: aktivasi situs, penerbitan multi-situs, penayangan media, penagihan dan verifikasi pembayaran, serta dukungan operasional. Kepentingan yang sah menjadi dasar untuk menjaga keamanan dan keandalan: pencegahan penyalahgunaan dan akses lintas tenant, deteksi anomali, pencatatan audit, serta peningkatan kinerja — selalu dengan uji keseimbangan agar tidak mengesampingkan hak Anda. Kewajiban hukum menjadi dasar untuk menyimpan arsip transaksi dan jejak audit tertentu selama periode yang diwajibkan peraturan perpajakan, keuangan, atau penegakan hukum. Persetujuan menjadi dasar untuk komunikasi pemasaran yang tidak esensial dan untuk cookie non-esensial bila kami menggunakannya di kemudian hari; persetujuan tersebut dapat ditarik kapan saja tanpa memengaruhi keabsahan pemrosesan sebelumnya. Apabila Anda menyerahkan data pribadi pihak lain (misalnya data wartawan atau narasumber), Anda menjamin memiliki dasar hukum yang sah — seperti persetujuan atau kepentingan jurnalistik yang sah menurut hukum pers — dan telah menyampaikan pemberitahuan yang diwajibkan kepada subjek data tersebut.',
  },
  {
    heading: '5. Data anak dan data sensitif',
    body: 'Layanan ditujukan untuk redaksi profesional dan bukan untuk anak di bawah umur. Kami tidak secara sadar mengumpulkan data pribadi anak; apabila Anda mengetahui adanya akun anak atau unggahan data anak yang tidak sah, beri tahu kami agar kami dapat menghapusnya setelah verifikasi. Untuk data pribadi yang bersifat spesifik menurut UU PDP — termasuk data kesehatan, biometrik, genetika, catatan kejahatan, data anak, dan data keuangan pribadi — kami menerapkan prinsip larangan umum: jangan unggah ke Layanan kecuali benar-benar diperlukan, memiliki dasar hukum eksplisit, dan, untuk konten pemberitaan yang memuat data demikian, telah melalui penilaian kepentingan publik serta penyuntingan yang meminimalkan paparan (misalnya penyamaran identitas korban).',
  },
  {
    heading: '6. Cookie, penyimpanan lokal, dan telemetri',
    body: 'Halaman publik yang kami hosting untuk pembaca Anda dirancang hemat pelacakan: tidak ada piksel iklan, tidak ada broker data, dan tidak ada profil lintas situs untuk keperluan periklanan. Dasbor redaksi menggunakan cookie sesi dan penyimpanan lokal yang esensial untuk menjaga status masuk, preferensi antarmuka (seperti organisasi aktif), dan perlindungan terhadap pemalsuan permintaan lintas situs — yang tanpanya Anda tidak dapat tetap masuk dengan aman. Kami dapat mencatat telemetri agregat dan anonim untuk keandalan, seperti laju galat per halaman atau waktu muat agregat, tanpa mengaitkannya kembali ke individu. Apabila di masa depan kami memperkenalkan cookie analitik non-esensial, kami akan meminta persetujuan terlebih dahulu melalui spanduk persetujuan, menyediakan pilihan menolak yang setara mudahnya dengan menerima, serta mendokumentasikan daftar cookie, tujuan, dan masa berlakunya pada bagian ini. Anda dapat menghapus cookie melalui pengaturan peramban kapan saja; menghapus cookie esensial akan mengeluarkan Anda dari dasbor.',
  },
  {
    heading: '7. Pemisahan tenant dan kontrol akses internal',
    body: 'Setiap baris data operasional terikat pada tepat satu organizationId, dan tidak ada jalur baca publik yang dapat berpindah tenant: situs publik ditentukan dari pencocokan nama host yang sama persis (exact match) tanpa tenant cadangan, dan konteks baca publik diturunkan dari host tersebut. Pemisahan ditegakkan berlapis: aturan otorisasi pada lapisan aplikasi yang menurunkan tepat satu organizationId terautorisasi per operasi, kebijakan keamanan tingkat baris (row-level security) pada PostgreSQL dengan peran runtime khusus yang tidak memiliki hak pintas, serta namespace cache dan otorisasi media yang diturunkan dari konteks host yang sama. Akses internal mengikuti prinsip hak minimum: hanya personel dengan kebutuhan tugas yang sah — misalnya verifikator pembayaran untuk arsip transaksi atau insinyur siaga untuk insiden — yang dapat mengakses data produksi, setiap akses sensitif tercatat pada jejak audit, dan akses istimewa ditinjau berkala. Arsitektur ini berarti data satu pelanggan tidak dapat dibaca melalui domain pelanggan lain, bahkan apabila terjadi galat pada satu lapisan, karena lapisan lainnya tetap menahan.',
  },
  {
    heading: '8. Enkripsi, kata sandi, dan pengelolaan rahasia',
    body: 'Seluruh lalu lintas antara peramban dan Layanan dilindungi enkripsi saat transit (TLS) dengan konfigurasi modern, dan data sensitif saat tersimpan dilindungi enkripsi yang dikelola penyedia terkelola. Kata sandi tidak pernah disimpan dalam bentuk yang dapat dibaca balik: kami hanya menyimpan hash satu arah dengan salt memakai fungsi hashing kata sandi modern yang tahan terhadap serangan kamus dan brute force, dan proses masuk diverifikasi tanpa pernah mendekripsi apa pun. Kredensial sistem, kunci API antar layanan, dan token integrasi disimpan pada penyimpanan rahasia sisi server, tidak pernah dikirim ke peramban, tidak dicatat pada log, dan tidak disertakan pada pesan galat — setiap pelanggaran prinsip ini diperlakukan sebagai insiden keamanan. Kami tidak pernah meminta kata sandi atau kode otentikasi Anda melalui surel atau pesan instan. Anda bertanggung jawab menerapkan kata sandi yang kuat dan mencabut akses anggota yang sudah tidak berhak pada hari yang sama.',
  },
  {
    heading: '9. Penyimpanan media dan tautan bertanda tangan',
    body: 'Seluruh berkas media disimpan pada satu penyimpanan objek privat (tanpa bucket publik dan tanpa bucket per tenant), dengan kunci objek berawalan terkontrol yang terikat pada organisasi pemiliknya. Tidak ada daftar berkas yang dapat ditelusuri publik dan tidak ada URL bucket langsung yang dibagikan: setiap penayangan — baik di dasbor maupun di situs publik — diberikan per objek melalui otorisasi bertanda tangan berumur pendek yang kedaluwarsa otomatis, sehingga tautan yang bocor segera tidak berguna. Unggahan divalidasi tipe dan ukurannya di sisi server, dipindai sesuai kemampuan penyedia, dan file yang melanggar dapat dikarantina. Penghapusan media dari dasbor mencabut otorisasi baru serta-merta; salinan cache tepi kedaluwarsa menurut masa hidup cache dan tidak diperpanjang. Metadata teknis berkas dipertahankan untuk keperluan penayangan dan diagnosis, sedangkan konten media itu sendiri adalah milik Anda dan hanya diproses untuk menyediakan Layanan.',
  },
  {
    heading: '10. Jejak audit dan log keamanan',
    body: 'Aktivitas sensitif — seperti perubahan peran anggota, persetujuan order, perubahan konfigurasi situs dan domain, penerbitan dan penarikan artikel, serta akses administratif — dicatat pada jejak audit yang bersifat hanya-tambah: dapat disisipkan dan dibaca untuk pertanggungjawaban, tetapi tidak dapat diubah atau dihapus melalui Layanan, bahkan oleh administrator. Catatan audit sengaja tidak memuat nilai rahasia seperti kata sandi, token, atau kunci; apabila nilai sensitif terdeteksi dalam masukan, sistem menyanitasi sebelum pencatatan. Pengenal Telegram pada konteks audit hanya disimpan sebagai pseudonim hash satu arah, bukan nilai mentah. Setiap baris audit dirantai secara kriptografis (hash + HMAC dengan kunci terpisah, stempel jam database) dan integritas rantai diverifikasi otomatis setiap malam; hasilnya menjadi bukti jadwal retensi pada Bagian 13. Log teknis untuk keamanan dan diagnosis (misalnya kegagalan masuk, galat aplikasi, dan peristiwa batas laju) disimpan terpisah dengan masa simpan pendek dan akses terbatas pada personel siaga, serta ditinjau hanya untuk investigasi insiden. Jejak audit dipertahankan lebih lama daripada log teknis karena fungsinya sebagai bukti pertanggungjawaban, sesuai jadwal retensi pada Bagian 13, dan dapat diberikan kepada auditor atau aparat penegak hukum yang sah apabila diwajibkan hukum.',
  },
  {
    heading: '11. Subprosesor dan penyedia infrastruktur',
    body: 'Untuk menjalankan Layanan, kami menggunakan subprosesor terkelola yang masing-masing hanya menerima data minimum yang diperlukan untuk fungsinya, berdasarkan kontrak pemrosesan data yang mewajibkan kerahasiaan, keamanan, dan larangan penggunaan di luar instruksi. Kategori dan peran mereka adalah: (a) basis data terkelola dan layanan autentikasi — menyimpan data akun, konten, dan konfigurasi serta menerbitkan sesi masuk; (b) penyimpanan objek privat — menyimpan berkas media Anda; (c) layanan antrian dan cache — mengoordinasikan penjadwalan penerbitan, batas laju, dan invalidasi cache tanpa menjadi catatan utama; (d) jaringan tepi dan DNS — menghantarkan halaman publik dengan cepat dan aman melalui TLS; (e) hosting aplikasi — menjalankan kode Layanan; dan (f) kanal notifikasi operasional seperti surel transaksional — mengirim pemberitahuan penagihan dan keamanan yang Anda minta. Kami tidak menjual data kepada subprosesor dan tidak mengizinkan mereka menggunakannya untuk periklanan. Daftar nama dagang terkini, lokasi pemrosesan, dan fungsi masing-masing tersedia atas permintaan melalui kontak privasi, dan perubahan subprosesor yang material akan diberitahukan paling lambat 14 hari sebelum berlaku sehingga Anda dapat mengajukan keberatan yang wajar.',
  },
  {
    heading: '12. Lokasi penyimpanan dan transfer data',
    body: 'Data utama diproses dan disimpan pada infrastruktur terkelola yang kami pilih karena postur keamanannya; salinan cadangan terenkripsi dapat berada di wilayah berbeda dalam jaringan penyedia yang sama untuk tujuan pemulihan bencana. Apabila pemrosesan melibatkan transfer lintas negara, kami memastikan mekanisme yang diakui — seperti klausul kontrak baku, penilaian dampak transfer, dan enkripsi — serta membatasi transfer pada data yang benar-benar perlu diproses di lokasi tersebut. Penayangan halaman publik secara alami melibatkan jaringan tepi global agar pembaca menerima konten dari titik terdekat; yang direplikasi adalah salinan cache konten publik Anda, bukan basis data akun Anda. Kami tidak menempatkan basis data utama di yurisdiksi yang melemahkan perlindungan hukum Anda tanpa pemberitahuan dan dasar yang sah. Pembatasan domisili data tertentu dapat disepakati tertulis sepanjang didukung penyedia infrastruktur.',
  },
  {
    heading: '13. Masa retensi dan jadwal penghapusan',
    body: 'Kami menyimpan data tidak lebih lama dari yang diperlukan untuk tujuannya, lalu menghapus atau menganonimkan. Jadwal baku kami adalah: data akun dan konten aktif dipertahankan selama langganan berjalan; setelah penghentian, data operasional (artikel, media, konfigurasi, keanggotaan) dihapus dalam tenggat wajar paling lama 90 hari sejak seluruh kewajiban selesai, kecuali Anda meminta penghapusan lebih cepat yang akan kami prioritaskan; salinan cadangan terenkripsi bergulir dan akan terhapus menurut siklus rotasi cadangan tanpa pemulihan selektif per artikel; arsip penagihan disimpan hingga 10 tahun untuk memenuhi kewajiban perpajakan dan pembuktian keuangan; jejak audit keamanan disimpan hingga 5 tahun sebagai bukti pertanggungjawaban; log teknis berumur pendek disimpan 30–90 hari lalu diagregasi atau dihapus; dan tiket dukungan disimpan hingga 2 tahun untuk pengendalian mutu. Data kedaluwarsa bantu (undangan basi, klaim replay kedaluwarsa, tugas cleanup selesai, percakapan Telegram kedaluwarsa) disapu otomatis setiap malam dan setiap penyapuan dicatat sebagai bukti. Apabila hukum mewajibkan penyimpanan lebih lama untuk perkara tertentu (litigation hold), penghapusan ditunda sebatas yang diwajibkan dan dilanjutkan segera setelah dasarnya berakhir.',
  },
  {
    heading: '14. Hak Anda sebagai subjek data menurut UU PDP',
    body: 'Menurut UU PDP, Anda memiliki hak atas informasi pemrosesan, hak akses dan memperoleh salinan data pribadi Anda, hak melengkapi, memperbarui, dan memperbaiki kekeliruan, hak menghapus atau memusnahkan data tertentu, hak menarik persetujuan untuk pemrosesan berbasis persetujuan, hak menolak pemrosesan untuk pemasaran langsung, hak atas portabilitas dalam format yang umum dan dapat dibaca mesin untuk data yang Anda berikan, hak menunda atau membatasi pemrosesan dalam keadaan tertentu, serta hak menggugat dan menerima ganti rugi atas pelanggaran yang terbukti. Pengurus organisasi dapat melaksanakan sebagian hak secara mandiri dari dasbor — memperbarui profil, mengelola anggota, mengekspor artikel dan media, serta menghapus draf dan media yang tidak diperlukan. Untuk hak yang memerlukan tindakan di sisi kami, ajukan permintaan melalui Bagian 15. Pelaksanaan hak tidak dipungut biaya yang tidak wajar, dan kami tidak akan mendiskriminasi Anda karena melaksanakan hak Anda.',
  },
  {
    heading: '15. Cara mengajukan permintaan data dan tenggat kami',
    body: 'Kirimkan permintaan akses, koreksi, portabilitas, pembatasan, atau penghapusan melalui halaman Kontak atau surel resmi yang tercantum di sana, dengan subjek yang jelas seperti “Permintaan Data — [Nama Organisasi]”. Sertakan nama lengkap, surel akun, nama organisasi, dan uraian spesifik permintaan agar dapat kami tindaklanjuti tanpa bolak-balik. Demi melindungi data Anda dari pemohon yang tidak berhak, kami memverifikasi identitas pemohon sebagai pengurus organisasi yang sah — misalnya melalui tantangan masuk ulang, konfirmasi dari alamat surel terdaftar, atau dokumen pendukung yang proporsional — dan kami tidak akan meminta kata sandi Anda dalam proses ini. Kami mengakui penerimaan paling lambat 3 hari kerja dan menyelesaikan permintaan paling lambat 30 hari kalender sejak identitas terverifikasi dan ruang lingkup jelas; setiap permintaan yang diajukan dari dasbor menerima nomor tiket (format DSAR-YYYY-XXXXXXXX) yang statusnya dapat dipantau dari dasbor; untuk permintaan kompleks atau bervolume besar, kami dapat memperpanjang hingga 30 hari tambahan dengan pemberitahuan dan alasan. Apabila permintaan ditolak — misalnya karena kewajiban hukum untuk menyimpan arsip atau karena akan mengungkap data pihak lain — kami menjelaskan dasarnya dan memberi tahu jalur banding internal serta hak mengadu ke otoritas sebagaimana Bagian 20.',
  },
  {
    heading: '16. Insiden keamanan dan pemberitahuan pelanggaran',
    body: 'Kami memantau anomali autentikasi, pola akses lintas tenant, dan kegagalan sistem secara proaktif, serta memiliki prosedur respons insiden: isolasi, penilaian dampak, pemulihan, dan tinjauan pasca-insiden. Apabila terjadi pelanggaran pelindungan data pribadi yang menimbulkan risiko terhadap hak Anda, kami akan memberi tahu Anda tanpa penundaan yang tidak wajar — disertai uraian kejadian, kategori data yang terdampak, langkah yang telah kami ambil, dan langkah yang sebaiknya Anda ambil — serta memberitahukan otoritas yang berwenang sesuai tenggat UU PDP dan peraturan pelaksananya. Pemberitahuan disampaikan melalui surel organisasi terdaftar dan pengumuman dasbor; kami tidak akan meminta kredensial dalam pemberitahuan insiden. Anda wajib memberi tahu kami segera apabila menemukan indikasi pelanggaran dari sisi Anda — misalnya perangkat redaksi yang hilang atau penerusan surel mencurigakan — agar mitigasi bersama dapat dimulai. Kewajiban pemberitahuan ini tidak merupakan pengakuan tanggung jawab hukum, yang ditentukan menurut Kontrak dan hukum yang berlaku.',
  },
  {
    heading: '17. Data pembaca portal Anda dan peran kami',
    body: 'Halaman publik portal Anda tidak meminta data pribadi pembaca, tidak menyediakan formulir pelacakan perilaku, dan tidak memasang pelacak iklan. Satu-satunya pemrosesan pembaca di sisi kami adalah log teknis standar untuk keamanan dan keandalan — seperti alamat IP yang disamarkan, halaman yang diakses, dan waktu akses — yang disimpan terbatas, tidak dijual, dan tidak digunakan untuk membangun profil pemasaran. Apabila Anda di kemudian hari menambahkan formulir (misalnya buletin, komentar, atau analitik pihak ketiga) ke situs Anda, Anda bertindak sebagai pengendali atas data yang dikumpulkan formulir tersebut dan bertanggung jawab menyediakan pemberitahuan serta memperoleh persetujuan yang sah dari pembaca; konfigurasi demikian berada di luar tanggung jawab bawaan kami. Kami menyediakan mekanisme yang wajar untuk membantu Anda memenuhi permintaan hak pembaca — seperti menghapus cache halaman yang memuat data yang ditarik — sejauh secara teknis memungkinkan. Setiap perjanjian pemrosesan data lanjutan dapat dituangkan dalam adendum pemrosesan data (DPA) atas permintaan.',
  },
  {
    heading: '18. Komunikasi operasional dan preferensi pemasaran',
    body: 'Kami mengirim tiga jenis komunikasi. Pemberitahuan transaksional dan keamanan — seperti pemberitahuan penagihan, peringatan masuk yang mencurigakan, dan pemberitahuan insiden — merupakan bagian dari Layanan dan tidak dapat dimatikan selama Anda memiliki akun aktif, karena tanpanya Anda berisiko kehilangan akses atau melewatkan tenggat penting. Pembaruan produk esensial — seperti perubahan material pada Ketentuan atau Kebijakan ini — diumumkan melalui dasbor dan, untuk perubahan material, melalui surel. Komunikasi pemasaran — seperti penawaran layanan baru atau undangan webinar — hanya dikirim atas persetujuan dan setiap pesannya memuat tautan berhenti berlangganan yang berfungsi dalam satu klik; penarikan persetujuan berlaku untuk pengiriman berikutnya dan tidak memengaruhi legalitas pengiriman sebelumnya. Kami tidak pernah menjual daftar kontak Anda dan tidak membagikan surel Anda kepada pengiklan.',
  },
  {
    heading: '19. Perubahan kebijakan, versi, dan arsip',
    body: 'Kami meninjau Kebijakan ini paling sedikit setahun sekali dan setiap kali terdapat perubahan fitur, regulasi, atau subprosesor. Perubahan material — misalnya kategori data baru, tujuan baru, subprosesor baru, atau perubahan masa retensi — diumumkan melalui dasbor dan surel pemberitahuan paling lambat 14 hari sebelum tanggal efektif, disertai ringkasan perubahan dan tautan ke versi sebelumnya. Perubahan non-material seperti perbaikan bahasa atau pembaruan kontak berlaku sejak dipublikasikan. Penggunaan Layanan setelah tanggal efektif dianggap sebagai persetujuan atas versi baru; apabila Anda tidak setuju, Anda dapat berhenti dengan tidak memperpanjang sebelum tanggal efektif dan versi sebelumnya tetap berlaku hingga status langganan Anda berakhir. Setiap versi bertanggal dan diarsipkan; Anda dapat meminta salinan versi yang berlaku pada periode tertentu untuk keperluan audit melalui kontak privasi. Kebijakan ini terakhir diperbarui dan berlaku efektif sejak 5 September 2026.',
  },
  {
    heading: '20. Kontak privasi, penanggung jawab, dan pengaduan ke otoritas',
    body: 'Untuk pertanyaan privasi, permintaan hak subjek data, keberatan atas subprosesor baru, atau pelaporan dugaan pelanggaran, hubungi kami melalui halaman Kontak atau surel resmi yang tercantum di sana dengan subjek “Privasi — [Keperluan Anda]”. Sertakan nama organisasi dan surel akun agar verifikasi berjalan cepat; mohon tidak mencantumkan kata sandi atau data identitas yang tidak diminta. Permintaan dalam Bahasa Indonesia akan ditangani dalam Bahasa Indonesia oleh tim yang memahami kewajiban UU PDP. Apabila keluhan Anda belum terselesaikan setelah kami menanggapi, Anda berhak menyampaikan pengaduan kepada lembaga atau otoritas pelindungan data pribadi yang berwenang di Republik Indonesia sesuai peraturan perundang-undangan yang berlaku, serta menempuh upaya hukum lainnya. Kami berkomitmen bekerja sama dengan itikad baik dengan otoritas dan akan memberi tahu Anda tentang perkembangan material terkait keluhan Anda, dengan tetap menjaga kerahasiaan yang diwajibkan hukum.',
  },
]);
