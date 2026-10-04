/**
 * Mode artikel 6 varian untuk dasbor, API, dan AI.
 *
 * @remarks Kebenaran kanonis adalah `ArticleType` di
 * `src/data/schema/editorial.ts` (enum `article_type`, mendarat bersama kolom
 * `articles.type`/`is_sponsored`/`video_url` dan tabel `article_updates`).
 * Berkas ini memakai ulang tipe itu dan hanya menyimpan penolong runtime yang
 * aman diimpor komponen klien: tuple `ARTICLE_TYPES` mencerminkan anggota
 * pgEnum tanpa menarik `drizzle-orm` ke bundel klien. Jangan menambah varian
 * tanpa menyelaraskannya dengan skema basis data.
 */
import type { ArticleType } from '@/data/schema/editorial';

export type { ArticleType };

export const ARTICLE_TYPES = ['standard', 'video', 'gallery', 'audio', 'liveblog', 'short'] as const satisfies readonly ArticleType[];

/** Mode bawaan untuk artikel lama dan payload yang tidak menyebut mode. */
export const DEFAULT_ARTICLE_TYPE: ArticleType = 'standard';

/** Batas karakter isi mode `short`, dihitung dari isi yang sudah di-trim. */
export const SHORT_BODY_MAX = 500;

/** Node TipTap yang dihitung sebagai sematan video untuk syarat mode `video`. */
const VIDEO_NODE_TYPES: ReadonlySet<string> = new Set(['video', 'youtube', 'drive']);

/**
 * Memeriksa apakah nilai cocok dengan salah satu mode artikel.
 *
 * @param value - Nilai mentah dari payload atau rekaman lama.
 * @returns True bila nilai adalah salah satu dari {@link ARTICLE_TYPES}.
 */
export function isArticleType(value: unknown): value is ArticleType {
  return typeof value === 'string' && (ARTICLE_TYPES as readonly string[]).includes(value);
}

/**
 * Menormalkan nilai tak tepercaya menjadi mode artikel yang valid.
 *
 * @param value - Nilai mentah; tak dikenal atau kosong menjadi bawaan.
 * @returns Mode valid; tidak pernah melempar.
 */
export function normalizeArticleType(value: unknown): ArticleType {
  return isArticleType(value) ? value : DEFAULT_ARTICLE_TYPE;
}

/**
 * Label Indonesia untuk pemilih mode di formulir editorial.
 *
 * @param type - Mode artikel.
 * @returns Label tampil; tidak pernah kosong.
 */
export function articleTypeLabel(type: ArticleType): string {
  switch (type) {
    case 'standard':
      return 'Standar';
    case 'video':
      return 'Video';
    case 'gallery':
      return 'Galeri';
    case 'audio':
      return 'Audio';
    case 'liveblog':
      return 'Liveblog';
    case 'short':
      return 'Short';
  }
}

/**
 * Petunjuk mode untuk pemilih mode di formulir editorial.
 *
 * @param type - Mode artikel.
 * @returns Satu kalimat syarat mode; tidak pernah kosong.
 */
export function articleTypeHint(type: ArticleType): string {
  switch (type) {
    case 'standard':
      return 'Naskah berita biasa tanpa syarat tambahan.';
    case 'video':
      return 'Wajib sampul atau sematan video di isi.';
    case 'gallery':
      return 'Rangkaian foto; sampul dianjurkan sebagai gambar utama.';
    case 'audio':
      return 'Naskah pendamping rekaman; cocok diisi lewat Audio jadi berita.';
    case 'liveblog':
      return 'Liputan berkembang; pembaruan dikelola di editor terstruktur.';
    case 'short':
      return 'Ringkas maksimal 500 karakter; judul satu sudut.';
  }
}

/**
 * Mendeteksi sematan video di dokumen TipTap tanpa memvalidasi strukturnya.
 *
 * @param bodyJson - Dokumen TipTap mentah; bentuk liar menghasilkan false.
 * @returns True bila ada node `video`, `youtube`, atau `drive`.
 */
export function hasVideoNode(bodyJson: unknown): boolean {
  const visit = (node: unknown): boolean => {
    if (typeof node !== 'object' || node === null) return false;
    const record = node as { readonly type?: unknown; readonly content?: unknown };
    if (typeof record.type === 'string' && VIDEO_NODE_TYPES.has(record.type)) return true;
    return Array.isArray(record.content) && record.content.some(visit);
  };
  if (typeof bodyJson !== 'object' || bodyJson === null) return false;
  const content = (bodyJson as { readonly content?: unknown }).content;
  return Array.isArray(content) && content.some(visit);
}

/**
 * Validasi silang mode terhadap isi, sampul, dan struktur editor.
 *
 * @param input.type - Mode yang diminta.
 * @param input.body - Isi teks; null atau undefined berarti tidak diperiksa (update parsial memakai gabungan di layanan).
 * @param input.bodyJson - Dokumen TipTap; dipakai untuk syarat video dan liveblog.
 * @param input.leadMediaId - Sampul terunggah; memenuhi syarat video.
 * @param input.coverImageUrl - URL sampul luar; memenuhi syarat video bila tidak kosong.
 * @param input.videoUrl - URL tonton/berkas luar kolom `articles.video_url`; memenuhi syarat video bila tidak kosong.
 * @returns Pesan galat Indonesia atau null bila lolos.
 */
export function describeArticleTypeProblem(input: {
  readonly type: ArticleType;
  readonly body?: string | null | undefined;
  readonly bodyJson?: unknown;
  readonly leadMediaId?: string | null | undefined;
  readonly coverImageUrl?: string | null | undefined;
  readonly videoUrl?: string | null | undefined;
  readonly audioUrl?: string | null | undefined;
}): string | null {
  if (input.type === 'short' && typeof input.body === 'string' && input.body.trim().length > SHORT_BODY_MAX) {
    return `Mode short maksimal ${SHORT_BODY_MAX} karakter; pangkas isi atau ganti ke mode standar.`;
  }
  if (input.type === 'video') {
    const hasCover = (input.leadMediaId ?? null) !== null || (input.coverImageUrl ?? '').trim() !== '' || (input.videoUrl ?? '').trim() !== '';
    if (!hasCover && !hasVideoNode(input.bodyJson)) {
      return 'Mode video wajib memiliki sampul atau sematan video di isi.';
    }
  }
  if (input.type === 'liveblog' && input.bodyJson !== undefined && input.bodyJson === null) {
    return 'Mode liveblog wajib memakai editor update terstruktur (isi JSON tidak boleh kosong).';
  }
  if (input.type === 'audio' && (input.audioUrl ?? '').trim() === '') {
    return 'Mode audio wajib memiliki URL audio.';
  }
  return null;
}

/**
 * Tambahan instruksi mode untuk prompt AI editorial.
 *
 * @param type - Mode artikel; standar tidak menambah instruksi.
 * @returns Satu-dua kalimat penyesuaian prompt, atau null untuk standar.
 */
export function articleTypePromptNote(type: ArticleType): string | null {
  switch (type) {
    case 'short':
      return 'Mode short: padat dan ringkas; satu sudut; judul pendek; jangan mengembangkan fakta di luar yang diberi.';
    case 'video':
      return 'Mode video: naskah ini mendampingi video; bila durasi disebut di isi, pertahankan; deskripsi memancing menonton tanpa clickbait.';
    case 'gallery':
      return 'Mode galeri: naskah ini merangkai foto; utamakan deskripsi momen visual yang terlihat; caption satu kalimat per foto.';
    case 'audio':
      return 'Mode audio: naskah ini mendampingi rekaman; pertahankan kutipan verbatim bila ada; jangan mengarang ucapan.';
    case 'liveblog':
      return 'Mode liveblog: liputan berkembang; dahulukan pembaruan terbaru; pertahankan penanda waktu tiap entri; jangan tulis ulang entri lama.';
    case 'standard':
      return null;
  }
}

/**
 * Menempelkan catatan mode ke prompt AI bila ada.
 *
 * @param prompt - Prompt dasar tanpa catatan mode.
 * @param type - Mode artikel; undefined berarti standar.
 * @returns Prompt dasar plus catatan mode, atau prompt dasar apa adanya.
 */
export function withArticleTypeNote(prompt: string, type: ArticleType | undefined): string {
  if (type === undefined || type === DEFAULT_ARTICLE_TYPE) return prompt;
  const note = articleTypePromptNote(type);
  return note === null ? prompt : `${prompt}\n\n${note}`;
}
