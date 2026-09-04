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
}

export interface ServiceTierItem {
  readonly slug: 'starter' | 'growth' | 'pro' | 'enterprise';
  readonly name: string;
  readonly target: string;
  readonly summary: string;
  readonly price: string;
  readonly period: string;
  readonly features: readonly string[];
  readonly highlighted: boolean;
  readonly cta: string;
}

/** Single tier source for homepage + /pricing. Prices must mirror the `packages` table; DB `service_tiers` overrides when reachable. */
export const SERVICE_TIERS: readonly ServiceTierItem[] = Object.freeze([
  {
    slug: 'starter',
    name: 'Starter',
    target: 'Punya 10 portal berita sendiri mulai hari ini',
    summary: 'Terima beres: website berita profesional yang langsung bisa dipakai menulis dan terbit.',
    price: 'Rp149.000',
    period: '/bulan',
    features: [
      '10 website berita siap tayang',
      'Desain cantik tinggal pilih',
      'Domain, hosting, dan keamanan kami yang urus',
      'Bantuan ramah lewat email',
    ],
    highlighted: false,
    cta: 'Mulai Sekarang',
  },
  {
    slug: 'growth',
    name: 'Growth',
    target: 'Satu redaksi untuk 50 portal daerah',
    summary: 'Tulis satu kali, berita Anda tayang di semua portal sekaligus.',
    price: 'Rp299.000',
    period: '/bulan',
    features: [
      '50 website berita siap tayang',
      'Terbit sekali, tayang di mana-mana',
      'Kelola dari HP, kerja dari mana saja',
      'Bantuan prioritas yang cepat tanggap',
    ],
    highlighted: false,
    cta: 'Mulai Sekarang',
  },
  {
    slug: 'pro',
    name: 'Pro',
    target: 'Untuk grup media yang serius bertumbuh',
    summary: 'Kapasitas besar plus tim kami dampingi sampai benar-benar jalan.',
    price: 'Rp550.000',
    period: '/bulan',
    features: [
      '100 website berita siap tayang',
      'Ajak rekan redaksi bergabung (10 orang)',
      'Pindahan dari sistem lama kami bantu',
      'Didampingi sampai jalan',
    ],
    highlighted: true,
    cta: 'Ambil yang Pro',
  },
  {
    slug: 'enterprise',
    name: 'Enterprise',
    target: 'Ada kebutuhan khusus? Mari duduk bersama',
    summary: 'Ceritakan kebutuhan Anda, kami rancangkan solusinya.',
    price: 'Kustom',
    period: '',
    features: [
      'Jumlah website mengikuti kebutuhan',
      'Pindahan data massal kami yang kerjakan',
      'Kontak khusus yang siap dihubungi',
      'Didampingi sampai jalan',
    ],
    highlighted: false,
    cta: 'Hubungi Tim Penjualan',
  },
]);

/** @deprecated Gunakan SERVICE_TIERS agar homepage dan /pricing memakai satu skema. */
export const PRICING_PLANS: readonly ServiceTierItem[] = SERVICE_TIERS;

/** @deprecated Gunakan ServiceTierItem. */
export type PricingPlanItem = ServiceTierItem;

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
export const SERVICE_TAGLINE = 'Satu ruang redaksi untuk seluruh jaringan portal berita Anda.';
export const SERVICE_SUMMARY =
  'Indicate menyatukan pengelolaan banyak portal berita ke dalam satu dasbor terpusat. Redaksi menulis satu kali, lalu menerbitkannya ke situs mana pun yang dipilih — dengan data masing-masing pelanggan yang terjaga dan terpisah.';

export const SITE_ROUTES: readonly NavigationLink[] = Object.freeze([
  { href: '/services', label: 'Layanan' },
  { href: '/pricing', label: 'Paket' },
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

export const ENTERPRISE_NETWORK_LOGOS: readonly string[] = Object.freeze([]);

export const PROOF_POINTS: readonly ProofPointItem[] = Object.freeze([
  { term: 'Satu Aplikasi', detail: 'Semua domain dilayani dari satu penyebaran terpusat, bukan satu aplikasi terpisah per pelanggan.' },
  { term: 'Satu Basis Data', detail: 'PostgreSQL 17 menjadi sumber kebenaran tunggal untuk redaksi, penerbitan, dan jejak audit.' },
  { term: 'Host Tepat', detail: 'Situs publik ditentukan dari nama host yang sama persis secara eksak, tanpa fallback tenant.' },
]);

/** Empty until real customer testimonials exist; the section auto-hides while empty. */
export const TESTIMONIALS: readonly TestimonialItem[] = Object.freeze([]);

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
    title: 'Harga jelas di depan',
    description:
      'Paket dihitung dari jumlah website, tercantum terbuka di halaman Paket. Tidak ada biaya tersembunyi, tidak ada negosiasi berlapis untuk paket standar.',
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
      'Mulai dari satu portal kecil dengan paket Starter, tambah portal baru kapan pun tanpa pindah sistem.',
  },
]);

export const CAPABILITIES: readonly FeatureItem[] = Object.freeze([
  {
    title: 'Redaksi terpusat',
    description:
      'Kelola artikel, kategori, wilayah, penulis, dan penugasan situs dari satu tempat. Setiap perubahan sensitif tercatat pada jejak audit yang tidak dapat dihapus oleh aplikasi.',
  },
  {
    title: 'Terbit sekali ke banyak situs',
    description:
      'Satu artikel bisa tayang di belasan portal sekaligus tanpa salin-tempel. Status tiap penayangan terpantau: antre, terkirim, atau gagal dan dicoba ulang otomatis.',
  },
  {
    title: 'Media privat yang aman',
    description:
      'Gambar disimpan pada penyimpanan privat dan hanya dibuka lewat tautan bertanda tangan berumur pendek. Tidak ada folder publik yang bisa diintip orang.',
  },
  {
    title: 'Tampilan tiap situs bisa beda',
    description:
      'Setiap portal punya warna, logo, dan susunan sendiri-sendiri — tetap dikelola dari satu dasbor yang sama.',
  },
  {
    title: 'Ramah mesin pencari',
    description:
      'Judul, deskripsi, pratinjau tautan, peta situs, dan umpan RSS dibuat otomatis per situs, sehingga tiap portal dinilai mandiri oleh Google.',
  },
  {
    title: 'Kerja dari Telegram',
    description:
      'Wartawan bisa mengirim berita lewat chat Telegram. Hanya nomor yang sudah didaftarkan yang diterima; sisanya ditolak otomatis.',
  },
  {
    title: 'Wilayah dan subdomain',
    description:
      'Setiap domain induk dapat memiliki situs wilayah pada subdomainnya sendiri, dengan konten dan penjenamaan terpisah namun tetap satu ruang redaksi.',
  },
  {
    title: 'Jejak audit lengkap',
    description:
      'Siapa mengubah apa dan kapan — tercatat semua dan tidak bisa dihapus. Cocok untuk redaksi yang butuh pertanggungjawaban.',
  },
  {
    title: 'Didampingi manusia',
    description:
      'Bukan sekadar aplikasi: tim kami membantu penyiapan awal, pindahan data, dan menjawab pertanyaan lewat saluran yang jelas.',
  },
]);

export const WORKFLOW_STEPS: readonly FeatureItem[] = Object.freeze([
  {
    title: 'Pilih paket',
    description:
      'Tentukan berapa website yang dibutuhkan dan pilih paketnya. Paket Enterprise didahului obrolan kebutuhan lewat WhatsApp.',
  },
  {
    title: 'Bayar dan kirim bukti',
    description:
      'Buat order dari dasbor, bayar, lalu unggah bukti bayarnya. Tim kami memverifikasi paling lambat 1x24 jam.',
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
      'Setelah bukti bayar diverifikasi, langganan aktif paling lambat 1x24 jam. Anda dipandu statusnya dari dasbor.',
  },
  {
    title: 'Data aman saat tenggang',
    description:
      'Masa aktif habis bukan akhir dunia: 7 hari tenggang baca menjaga data tetap utuh dan terlihat sambil menunggu perpanjangan.',
  },
  {
    title: 'Pindah paket bebas',
    description:
      'Naik atau turun paket kapan saja lewat order baru. Masa aktif dihitung ulang 30 hari sejak disetujui.',
  },
  {
    title: 'Berhenti tanpa sandera',
    description:
      'Domain, konten, dan data adalah milik Anda. Berhenti kapan pun dan bawa semuanya pergi.',
  },
]);

export const FAQ_ITEMS: readonly FaqItem[] = Object.freeze([
  {
    id: 'faq-1',
    question: 'Apakah saya membutuhkan server terpisah untuk setiap portal berita?',
    answer: 'Tidak. Seluruh portal Anda berjalan di atas 1 infrastruktur terpusat yang sama. Pemisahan data dan tampilan dilakukan otomatis berdasarkan nama domain, jadi nambah portal tidak nambah urusan server.'
  },
  {
    id: 'faq-2',
    question: 'Bagaimana cara wartawan menerbitkan berita dari luar kantor?',
    answer: 'Cukup buka dasbor dari HP atau kirim via chat Telegram yang sudah didaftarkan. Tidak perlu laptop, tidak perlu datang ke kantor.'
  },
  {
    id: 'faq-3',
    question: 'Apakah satu artikel bisa tayang di lebih dari satu situs sekaligus?',
    answer: 'Ya. Tulis satu kali, pilih situs-situs tujuannya, lalu terbitkan. Status tiap penayangan terpantau satu per satu.'
  },
  {
    id: 'faq-4',
    question: 'Bagaimana cara mulai berlangganan?',
    answer: 'Daftar akun, pilih paket, buat order, bayar, lalu unggah bukti bayarnya. Tim kami memverifikasi paling lambat 1x24 jam, setelah itu langganan aktif 30 hari.'
  },
  {
    id: 'faq-5',
    question: 'Apa yang terjadi kalau masa aktif habis?',
    answer: 'Anda mendapat masa tenggang baca 7 hari — data aman dan masih bisa dilihat. Perpanjang kapan saja untuk kembali menulis dan menerbitkan seperti biasa.'
  },
  {
    id: 'faq-6',
    question: 'Apakah nama domain tetap milik saya?',
    answer: 'Ya, 100%. Domain dibeli dan dipegang atas nama Anda. Berhenti kapan pun, domain dan seluruh konten dibawa pergi.'
  },
  {
    id: 'faq-7',
    question: 'Bisakah naik atau turun paket di tengah jalan?',
    answer: 'Bisa. Buat order paket baru dari halaman Langganan; setelah diverifikasi, paket langsung berganti dan masa aktif dihitung ulang 30 hari.'
  },
  {
    id: 'faq-8',
    question: 'Bagaimana paket Enterprise bekerja?',
    answer: 'Hubungi tim penjualan lewat WhatsApp, ceritakan kebutuhan dan jumlah websitenya. Kami susun penawaran yang pas, lalu jadwalkan onboarding dan pindahan data.'
  },
  {
    id: 'faq-9',
    question: 'Apakah data redaksi saya tercampur dengan pelanggan lain?',
    answer: 'Tidak. Setiap data terikat pada satu organisasi dan pemisahannya ditegakkan sampai lapisan basis data. Pelanggan lain tidak bisa mengintip data Anda lewat domain apa pun.'
  },
  {
    id: 'faq-10',
    question: 'Saya sudah punya website berjalan. Bisa pindah?',
    answer: 'Bisa. Paket Pro ke atas mencakup bantuan pindahan, dan paket Enterprise mencakup pindahan data massal yang kami kerjakan. Ceritakan sistem lama Anda saat mendaftar.'
  },
  {
    id: 'faq-11',
    question: 'Apakah ada masa percobaan gratis?',
    answer: 'Tidak ada trial otomatis, tapi Anda bisa melihat semua paket beserta batasnya secara terbuka sebelum membayar. Paket Starter mulai Rp149rb per bulan.'
  },
  {
    id: 'faq-12',
    question: 'Bagaimana kalau butuh bantuan?',
    answer: 'Paket Starter dan Growth dilayani lewat email dan prioritas; paket Pro didampingi sampai jalan; Enterprise punya kontak khusus. Semua paket dijawab manusia, bukan bot.'
  }
]);

export const CONTACT_CHANNELS: readonly FeatureItem[] = Object.freeze([
  {
    title: 'Surel',
    description: 'officialelsa21@gmail.com — kirim kebutuhan Anda beserta jumlah domain dan wilayah yang direncanakan.',
    href: 'mailto:officialelsa21@gmail.com',
  },
  {
    title: 'WhatsApp',
    description: '0856-4115-9405 — jalur tercepat untuk paket Enterprise, pindahan sistem, atau pertanyaan harga.',
    href: 'https://wa.me/6285641159405?text=Halo%20Indicate%2C%20saya%20ingin%20bertanya.',
  },
  {
    title: 'Telegram',
    description: '@eliyantosarage — tanya jawab singkat mengenai alur redaksi dan integrasi bot.',
    href: 'https://t.me/eliyantosarage',
  },
  {
    title: 'Peninjauan bersama',
    description: 'Sesi daring untuk menelusuri dasbor dan alur penerbitan — jadwalkan lewat WhatsApp atau surel.',
  },
]);

export const ABOUT_STORY: readonly string[] = Object.freeze([
  'Indicate lahir dari pengalaman mendampingi grup media yang portalnya tumbuh lebih cepat dari timnya. Tiap portal baru berarti pengeluaran baru yang berlipat — padahal yang dibutuhkan redaksi hanya tempat menulis dan tombol terbitkan.',
  'Kami membalik pendekatannya: satu ruang redaksi untuk seluruh jaringan portal. Nambah portal tidak lagi jadi proyek besar yang mahal. Harga mengikuti jumlah website secara terbuka, dan domain tetap milik Anda sepenuhnya.',
  'Hari ini Indicate melayani redaksi solo hingga grup media — semuanya dengan janji yang sama: Anda terima beres, kami yang mengurus mesinnya.',
]);

export const ABOUT_PRINCIPLES: readonly FeatureItem[] = Object.freeze([
  {
    title: 'Terima beres, bukan terima PR',
    description:
      'Anda tidak perlu tahu cara kerja server, cache, atau DNS. Tugas Anda menulis dan menerbitkan; tugas kami memastikan semuanya jalan.',
  },
  {
    title: 'Harga di depan, bukan di belakang',
    description:
      'Semua paket dan batasnya tercantum terbuka. Tidak ada biaya tersembunyi, tidak ada kejutan tagihan, tidak ada negosiasi berlapis untuk paket standar.',
  },
  {
    title: 'Milik Anda tetap milik Anda',
    description:
      'Domain, konten, dan data redaksi adalah milik Anda. Berhenti kapan pun dan bawa semuanya pergi — kami tidak menyandera apa pun.',
  },
  {
    title: 'Dijawab manusia',
    description:
      'Bantuan ditangani orang sungguhan yang paham redaksi, bukan bot yang memutar-mutar jawaban. Paket Pro didampingi sampai jalan.',
  },
  {
    title: 'Jujur soal batas',
    description:
      'Setiap paket mencantumkan batasnya dengan jelas: jumlah website, anggota, dan masa aktif. Kalau butuh lebih, naik paket — bukan bayar denda siluman.',
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

export interface DocSectionItem {
  readonly heading: string;
  readonly body: string;
}

export const TERMS_SECTIONS: readonly DocSectionItem[] = Object.freeze([
  {
    heading: 'Lingkup layanan',
    body: 'Indicate menyediakan website berita siap tayang, ruang redaksi terpusat, penerbitan ke banyak situs, penyimpanan media, dan pendampingan sesuai paket. Pengadaan nama domain berada di luar lingkup ini, namun kami bantu mengarahkannya.',
  },
  {
    heading: 'Paket dan harga',
    body: 'Harga tiap paket tercantum terbuka di halaman Paket dan dihitung dari jumlah website. Harga yang berlaku adalah harga saat order Anda disetujui. Perubahan harga tidak berlaku surut untuk masa aktif yang sedang berjalan.',
  },
  {
    heading: 'Pembayaran dan aktivasi',
    body: 'Setelah membayar, unggah bukti bayar dari dasbor. Tim kami memverifikasi paling lambat 1x24 jam; begitu disetujui, langganan aktif 30 hari penuh.',
  },
  {
    heading: 'Masa tenggang',
    body: 'Jika masa aktif habis, Anda mendapat 7 hari tenggang baca: data utuh dan terlihat, tapi menulis dan menerbitkan dijeda. Perpanjang kapan saja untuk kembali normal — tidak ada denda.',
  },
  {
    heading: 'Naik dan turun paket',
    body: 'Ganti paket kapan saja lewat order baru. Setelah disetujui, paket berganti dan masa aktif 30 hari dihitung ulang dari tanggal persetujuan.',
  },
  {
    heading: 'Paket Enterprise',
    body: 'Enterprise disusun per kesepakatan lewat tim penjualan: cakupan, harga, dan jadwal onboarding mengikuti hasil peninjauan kebutuhan yang disetujui bersama.',
  },
  {
    heading: 'Kepemilikan konten dan domain',
    body: 'Seluruh konten, media, data redaksi, dan nama domain adalah milik organisasi Anda. Kami memprosesnya hanya untuk menjalankan layanan yang Anda minta.',
  },
  {
    heading: 'Tanggung jawab penerbitan',
    body: 'Organisasi Anda bertanggung jawab atas kebenaran, kelayakan, dan kepatuhan hukum atas konten yang diterbitkan, termasuk hak atas gambar dan atribusi sumber.',
  },
  {
    heading: 'Akun dan akses',
    body: 'Anda bertanggung jawab menjaga keamanan akun anggota redaksi. Akses anggota dapat dicabut sewaktu-waktu oleh pengurus organisasi; akun yang disalahgunakan dapat kami bekukan setelah pemberitahuan.',
  },
  {
    heading: 'Penggunaan yang dilarang',
    body: 'Layanan tidak boleh digunakan untuk menyebarkan konten melanggar hukum, melakukan penyalahgunaan sistem, atau mencoba mengakses data organisasi lain.',
  },
  {
    heading: 'Ketersediaan dan pemeliharaan',
    body: 'Kami mengupayakan layanan selalu bisa diakses dan melakukan pemeliharaan secara terencana dengan pemberitahuan. Janji tingkat layanan yang khusus hanya berlaku bila disepakati tertulis, umumnya pada paket Enterprise.',
  },
  {
    heading: 'Berhenti dan pindah',
    body: 'Anda dapat berhenti kapan saja tanpa penalti. Domain, konten, dan data Anda dibawa pergi; salinan operasional kami hapus dalam tenggat wajar setelah semua kewajiban selesai.',
  },
]);

export const PRIVACY_SECTIONS: readonly DocSectionItem[] = Object.freeze([
  {
    heading: 'Data yang diproses',
    body: 'Layanan memproses data akun redaksi, konten yang Anda terbitkan, berkas media yang Anda unggah, bukti pembayaran, serta catatan operasional yang diperlukan untuk menjalankan penerbitan. Konten dan media adalah milik Anda.',
  },
  {
    heading: 'Pemisahan antar pelanggan',
    body: 'Setiap data terikat pada satu organisasi. Pemisahan ditegakkan berlapis, dari aturan aplikasi hingga kebijakan keamanan baris pada basis data, sehingga data satu pelanggan tidak dapat dibaca melalui domain pelanggan lain.',
  },
  {
    heading: 'Kata sandi dan bukti bayar',
    body: 'Kata sandi disimpan dalam bentuk yang tidak bisa dibaca balik. Bukti pembayaran hanya dilihat tim verifikasi untuk keperluan persetujuan order, lalu disimpan sebagai arsip transaksi.',
  },
  {
    heading: 'Kredensial dan rahasia',
    body: 'Kredensial disimpan pada penyimpanan rahasia di sisi server dan tidak pernah dikirim ke peramban, tidak dicatat pada log, dan tidak disertakan pada pesan galat.',
  },
  {
    heading: 'Media',
    body: 'Berkas media disimpan pada penyimpanan objek privat. Akses diberikan per objek melalui tautan bertanda tangan berumur pendek, dan tidak ada daftar berkas yang dapat ditelusuri publik.',
  },
  {
    heading: 'Jejak audit',
    body: 'Aktivitas yang sensitif dicatat untuk keperluan pertanggungjawaban. Catatan ini bersifat hanya-tambah dan tidak memuat nilai rahasia.',
  },
  {
    heading: 'Penyedia yang digunakan',
    body: 'Layanan berjalan di atas penyedia terkelola untuk basis data dan autentikasi, penyimpanan objek, antrian dan cache, jaringan tepi, serta hosting aplikasi. Masing-masing hanya menerima data yang diperlukan untuk fungsinya.',
  },
  {
    heading: 'Data pembaca situs Anda',
    body: 'Halaman publik tidak meminta data pribadi pembaca dan tidak memasang pelacak iklan. Log teknis standar (untuk keamanan dan keandalan) disimpan terbatas dan tidak dijual.',
  },
  {
    heading: 'Masa simpan',
    body: 'Data aktif disimpan selama langganan berjalan. Setelah berhenti, data operasional dihapus dalam tenggat wajar; arsip transaksi dan jejak audit disimpan sesuai kewajiban hukum yang berlaku.',
  },
  {
    heading: 'Permintaan data',
    body: 'Anda dapat meminta ekspor atau penghapusan data organisasi Anda melalui saluran kontak. Permintaan ditangani setelah identitas pemohon terverifikasi sebagai pengurus organisasi tersebut.',
  },
]);
