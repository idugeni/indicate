'use client';

import { useEffect, useId, useMemo, useRef, useState, useTransition, type ChangeEvent, type FormEvent } from 'react';
import { toast } from 'sonner';
import {
  CaseSensitive,
  Clock,
  Image as ImageIcon,
  ImagePlus,
  Link2,
  Loader2,
  Pilcrow,
  Send,
  Share2,
  SlidersHorizontal,
  Type,
} from 'lucide-react';
import { SectionCard } from '@/modules/dashboard/components/shared/section-card';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { CategoryCombobox } from '@/modules/dashboard/components/shared/category-combobox';
import { SearchCombobox } from '@/modules/dashboard/components/shared/search-combobox';
import { rankTags } from '@/modules/dashboard/components/shared/suggestion-cache';
import { TagCombobox } from '@/modules/dashboard/components/shared/tag-combobox';
import { Textarea } from '@/components/ui/textarea';
import type {
  ArticleEntity,
  AuthorEntity,
  CategoryEntity,
  PublisherEntity,
  RegionEntity,
} from '@/modules/dashboard/components/shared/types';
import { findMatchingCategoryId, slugify } from '@/modules/dashboard/components/shared/form-utils';
import { TAG_MAX_COUNT, normalizeTagList } from '@/modules/site/slug-allocator';
import type { TipTapDoc, TipTapNode } from '@/modules/site/tiptap-document';
import { ArticlePreview } from '@/modules/dashboard/components/editorial/article-preview';
import { RichTextEditor } from '@/modules/dashboard/components/editorial/rich-text-editor';

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draf' },
  { value: 'in_review', label: 'Siap Reviu' },
  { value: 'scheduled', label: 'Terjadwal' },
  { value: 'active', label: 'Terbit Langsung' },
] as const;

const SUBMIT_LABELS: Record<string, string> = {
  draft: 'Simpan Draf',
  in_review: 'Simpan untuk Reviu',
  scheduled: 'Jadwalkan Terbit',
  active: 'Terbitkan Langsung',
};

const MODE_TABS = [
  { value: 'tulis', label: 'Tulis', tip: 'Tulis dan format isi artikel di editor' },
  { value: 'pratinjau', label: 'Pratinjau', tip: 'Lihat tampilan artikel seperti di situs' },
  { value: 'sumber', label: 'Sumber', tip: 'Lihat teks polos arsip dan RSS (hanya baca)' },
] as const;

const MODE_HINTS: Record<'tulis' | 'pratinjau' | 'sumber', string> = {
  tulis: 'Tulis dan format isi di editor — inilah yang tersimpan saat Simpan.',
  pratinjau: 'Tampilan artikel seperti di situs. Kembali ke Tulis untuk mengubah.',
  sumber: 'Teks polos yang dibuat otomatis untuk arsip dan RSS — hanya baca.',
};

/**
 * Bilah ukur panjang metadata terhadap rentang tampil idealnya.
 *
 * @param label - Nama medan (Judul/Deskripsi).
 * @param length - Panjang karakter saat ini.
 * @param idealMin - Batas bawah rentang ideal.
 * @param idealMax - Batas atas rentang ideal.
 * @param cap - Skala penuh bilah.
 * @returns Label, bilah dengan pita zona ideal, dan hitungan.
 */
function SeoMeter({
  label,
  length,
  idealMin,
  idealMax,
  cap,
}: {
  readonly label: string;
  readonly length: number;
  readonly idealMin: number;
  readonly idealMax: number;
  readonly cap: number;
}) {
  const tone = length === 0 ? 'bg-hairline-strong' : length < idealMin ? 'bg-brass' : length <= idealMax ? 'bg-signal' : 'bg-error';
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-mono text-[11px] text-paper-dim">{label}</span>
        <span className="font-mono text-[11px] tabular-nums text-paper-faint">{length}</span>
      </div>
      <div aria-hidden="true" className="relative h-1.5 overflow-hidden rounded-full bg-bg-raised-2">
        <div className="absolute inset-y-0 rounded-full bg-signal/25" style={{ left: `${(idealMin / cap) * 100}%`, width: `${((idealMax - idealMin) / cap) * 100}%` }} />
        <div className={`absolute inset-y-0 left-0 rounded-full ${tone}`} style={{ width: `${Math.min(100, (length / cap) * 100)}%` }} />
      </div>
    </div>
  );
}

/**
 * Tulis satu artikel kanonis baru dengan tata composer dua kolom.
 *
 * @param data - Opsi wilayah, penerbit, kategori, penulis, dan artikel existing untuk saran tag.
 * @param onSubmit - Menyimpan `article.create`; media upload memakai command opsional.
 * @param command - Perintah workspace untuk unggah media editor kaya; tanpa ini unggahan gagal eksplisit.
 * @returns Kanvas artikel terbuka + inspektor lengket (status, SEO, atribusi, sampul, sumber).
 */
export function ArticleCreateForm({
  data,
  onSubmit,
  command,
}: {
  readonly data: unknown;
  readonly onSubmit: (payload: unknown) => Promise<unknown>;
  readonly command?: (action: string, payload: unknown) => Promise<unknown>;
}) {
  const model = data as {
    readonly regions?: readonly RegionEntity[];
    readonly publishers?: readonly PublisherEntity[];
    readonly categories?: readonly CategoryEntity[];
    readonly authors?: readonly AuthorEntity[];
    readonly articles?: readonly ArticleEntity[];
  } | null;

  const regionSelectId = useId();
  const publisherSelectId = useId();
  const authorSelectId = useId();
  const statusSelectId = useId();
  const scheduleInputId = useId();
  const slugInputId = useId();
  const titleInputId = useId();
  const sourceInputId = useId();
  const canonicalInputId = useId();
  const tagsInputId = useId();
  const excerptInputId = useId();
  const bodyInputId = useId();
  const categoryInputId = useId();
  const featuredFileId = useId();
  const coverUrlInputId = useId();

  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [status, setStatus] = useState<string>('draft');
  /** Checked category ids in order; first entry is the primary category. */
  const [categoryIds, setCategoryIds] = useState<readonly string[]>([]);
  const [extraCategories, setExtraCategories] = useState<readonly CategoryEntity[]>([]);
  const [featuredId, setFeaturedId] = useState<string | null>(null);
  const [featuredName, setFeaturedName] = useState('');
  const [featuredPreviewUrl, setFeaturedPreviewUrl] = useState<string | null>(null);
  const [featuredStatus, setFeaturedStatus] = useState<string | null>(null);
  const [uploadingFeatured, setUploadingFeatured] = useState(false);
  const [coverUrl, setCoverUrl] = useState('');
  const [titleText, setTitleText] = useState('');
  const [descriptionText, setDescriptionText] = useState('');
  const [mode, setMode] = useState<'tulis' | 'pratinjau' | 'sumber'>('tulis');
  const [bodyText, setBodyText] = useState('');
  const [bodyJsonDraft, setBodyJsonDraft] = useState<TipTapDoc | null>(null);
  const [richResetKey, setRichResetKey] = useState(0);
  const [isSubmitting, startSubmitTransition] = useTransition();
  const editorStats = useMemo(() => {
    const trimmed = bodyText.trim();
    const words = trimmed === '' ? 0 : trimmed.split(/\s+/u).length;
    let paragraphs = 0;
    let images = 0;
    let embeds = 0;
    const visit = (node: TipTapNode): string => {
      let text = node.text ?? '';
      for (const child of node.content ?? []) text += visit(child);
      return text;
    };
    for (const node of bodyJsonDraft?.content ?? []) {
      if (node.type === 'image') {
        images += 1;
      } else if (node.type === 'youtube' || node.type === 'video' || node.type === 'twitter' || node.type === 'instagram' || node.type === 'tiktok' || node.type === 'facebook' || node.type === 'drive') {
        embeds += 1;
      } else if (node.type === 'bulletList' || node.type === 'orderedList') {
        for (const item of node.content ?? []) {
          if (visit(item).trim() !== '') paragraphs += 1;
        }
      } else if (visit(node).trim() !== '') {
        paragraphs += 1;
      }
    }
    return {
      words,
      characters: bodyText.length,
      paragraphs,
      images,
      embeds,
      minutes: words === 0 ? 0 : Math.max(1, Math.ceil(words / 200)),
    };
  }, [bodyText, bodyJsonDraft]);
  const statItems = [
    { icon: Type, label: 'kata', value: editorStats.words },
    { icon: CaseSensitive, label: 'karakter', value: editorStats.characters },
    { icon: Pilcrow, label: 'paragraf', value: editorStats.paragraphs },
    { icon: ImageIcon, label: 'gambar', value: editorStats.images },
    { icon: Share2, label: 'sematan', value: editorStats.embeds },
    { icon: Clock, label: 'mnt baca', value: editorStats.minutes },
  ];

  const handleRichChange = (change: { readonly doc: TipTapDoc; readonly text: string }) => {
    const empty = change.text.trim() === '' && (change.doc.content ?? []).every((node) => node.type === 'paragraph' && (node.content ?? []).length === 0);
    setBodyJsonDraft(empty ? null : change.doc);
    setBodyText(change.text);
  };
  const regionOptions = useMemo(() => (model?.regions ?? []).map((r) => ({ value: r.id, label: r.name })), [model?.regions]);
  const publisherOptions = useMemo(
    () => (model?.publishers ?? []).filter((p) => p.status === undefined || p.status === 'active').map((p) => ({ value: p.id, label: p.name })),
    [model?.publishers],
  );
  const activeCategories = useMemo(
    () => (model?.categories ?? []).filter((c) => c.status === undefined || c.status === 'active'),
    [model?.categories],
  );
  const allCategories = useMemo(() => {
    const seen = new Set(activeCategories.map((category) => category.id));
    return [...activeCategories, ...extraCategories.filter((category) => !seen.has(category.id))];
  }, [activeCategories, extraCategories]);
  const authorOptions = useMemo(
    () => (model?.authors ?? []).filter((a) => a.status === undefined || a.status === 'active').map((a) => ({ value: a.id, label: a.displayName })),
    [model?.authors],
  );
  const activeAuthors = useMemo(
    () => (model?.authors ?? []).filter((a) => a.status === undefined || a.status === 'active'),
    [model?.authors],
  );
  const defaultAuthorId = useMemo(
    () => activeAuthors.find((a) => a.displayName === 'Redaksi')?.id ?? activeAuthors[0]?.id ?? null,
    [activeAuthors],
  );
  const [publisherId, setPublisherId] = useState<string | null>(null);
  const [authorId, setAuthorId] = useState<string | null>(null);
  const touchedAuthor = useRef(false);

  useEffect(() => {
    if (!touchedAuthor.current && publisherId === null && authorId === null && defaultAuthorId !== null) {
      setAuthorId(defaultAuthorId);
    }
  }, [publisherId, authorId, defaultAuthorId]);

  const selectedPublisher = useMemo(
    () => (model?.publishers ?? []).find((p) => p.id === publisherId) ?? null,
    [model?.publishers, publisherId],
  );
  const selectedAuthor = activeAuthors.find((a) => a.id === authorId) ?? null;

  const handlePublisherChange = (next: string | null) => {
    const id = next === null || next === '' ? null : next;
    setPublisherId(id);
    if (id !== null) setAuthorId(null);
    else if (!touchedAuthor.current) setAuthorId(defaultAuthorId);
  };
  const handleAuthorChange = (next: string | null) => {
    touchedAuthor.current = true;
    setAuthorId(next === null || next === '' ? null : next);
  };
  const tagSuggestions = useMemo(() => rankTags(model?.articles ?? []), [model?.articles]);

  const handleTitleChange = (value: string) => {
    setTitleText(value);
    if (!slugTouched) setSlug(slugify(value));
  };

  const handleSlugChange = (value: string) => {
    setSlugTouched(true);
    setSlug(value);
  };

  const handleCreateCategory = async (rawName: string): Promise<string | null> => {
    const name = rawName.trim();
    if (name === '') {
      toast.error('Isi nama kategori dulu.');
      return null;
    }
    const matched = findMatchingCategoryId(allCategories, name);
    if (matched !== null) {
      const label = allCategories.find((c) => c.id === matched)?.name ?? name;
      setCategoryIds((prev) => (prev.includes(matched) ? prev : [...prev, matched]));
      toast.info(`Kategori "${label}" sudah ada — dipilih otomatis.`);
      return matched;
    }
    if (command === undefined) {
      toast.error('Tambah kategori tidak tersedia di pratinjau.');
      return null;
    }
    const created = (await command('category.create', { name, slug: slugify(name) })) as { readonly id?: unknown } | null;
    const newId = typeof created?.id === 'string' ? created.id : null;
    if (newId === null) {
      toast.error('Gagal menambah kategori.');
      return null;
    }
    setExtraCategories((prev) =>
      prev.some((category) => category.id === newId)
        ? prev
        : [...prev, { id: newId, name, slug: slugify(name), status: 'active', version: 1 }],
    );
    setCategoryIds((prev) => (prev.includes(newId) ? prev : [...prev, newId]));
    toast.success(`Kategori "${name}" ditambahkan dan dipilih.`);
    return newId;
  };

  const handleFeaturedFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (command === undefined) {
      toast.error('Unggah media tidak tersedia di pratinjau.');
      return;
    }
    if (!file.type.startsWith('image/')) {
      toast.error('Berkas harus gambar.');
      return;
    }
    setUploadingFeatured(true);
    setFeaturedStatus('Menyiapkan penyimpanan...');
    let dimensions: { readonly widthPx: number; readonly heightPx: number } | undefined;
    try {
      const bitmap = await createImageBitmap(file);
      if (bitmap.width > 0 && bitmap.height > 0) dimensions = { widthPx: bitmap.width, heightPx: bitmap.height };
      bitmap.close();
    } catch {
      dimensions = undefined;
    }
    try {
      const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
      const bytes = new Uint8Array(digest);
      let binary = '';
      for (const byte of bytes) binary += String.fromCharCode(byte);
      const reserved = (await command('media.reserve', {
        filename: file.name,
        mediaType: file.type,
        sizeBytes: file.size,
        checksum: btoa(binary),
        purpose: 'article-cover',
        owner: { kind: 'organization' },
      })) as {
        readonly reservationId?: string;
        readonly authorization?: { readonly url?: string; readonly requiredHeaders?: Record<string, string> };
      } | null;
      if (!reserved?.reservationId || !reserved.authorization?.url || !reserved.authorization.requiredHeaders) {
        setFeaturedStatus('Gagal menyiapkan penyimpanan. Coba lagi.');
        return;
      }
      setFeaturedStatus('Mengunggah berkas...');
      const uploadResponse = await fetch(reserved.authorization.url, {
        method: 'PUT',
        headers: reserved.authorization.requiredHeaders,
        body: file,
      });
      if (!uploadResponse.ok) {
        setFeaturedStatus('Gagal mengunggah. Periksa koneksi lalu coba lagi.');
        return;
      }
      setFeaturedStatus('Menyelesaikan pemeriksaan berkas...');
      const completed = (await command('media.complete', { reservationId: reserved.reservationId, ...(dimensions === undefined ? {} : dimensions) })) as { readonly id?: unknown } | null;
      const mediaId = typeof completed?.id === 'string' ? completed.id : null;
      if (mediaId === null) {
        setFeaturedStatus('Pemeriksaan berkas gagal. Coba unggah ulang.');
        return;
      }
      setFeaturedId(mediaId);
      setFeaturedName(file.name);
      const storedSrc = `/api/network/media/${mediaId}`;
      try {
        const read = (await command('media.read', { mediaId })) as { readonly url?: unknown } | null;
        setFeaturedPreviewUrl(typeof read?.url === 'string' && read.url !== '' ? read.url : storedSrc);
      } catch {
        setFeaturedPreviewUrl(storedSrc);
      }
      setFeaturedStatus(null);
    } finally {
      setUploadingFeatured(false);
    }
  };

  const handleCreateArticle = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const optional = (key: string): string | undefined => {
      const trimmed = String(formData.get(key) ?? '').trim();
      return trimmed === '' ? undefined : trimmed;
    };
    const rawSchedule = String(formData.get('scheduledAt') ?? '');
    const title = String(formData.get('title') ?? '').trim();
    if (title === '') {
      toast.error('Isi judul artikel dulu.');
      return;
    }
    const slugValue = String(formData.get('slug') ?? '').trim();
    if (slugValue === '') {
      toast.error('Isi slug URL dulu.');
      return;
    }
    if (!/^[a-z0-9-]+$/.test(slugValue)) {
      toast.error('Slug hanya boleh huruf kecil, angka, dan strip.');
      return;
    }
    if (String(formData.get('regionId') ?? '').trim() === '') {
      toast.error('Pilih wilayah dulu.');
      return;
    }
    if (String(formData.get('source') ?? '').trim() === '') {
      toast.error('Isi sumber dulu.');
      return;
    }
    if (status === 'scheduled' && rawSchedule === '') {
      toast.error('Isi jadwal terbit dulu untuk status Terjadwal.');
      return;
    }
    const trimmedBody = bodyText.trim();
    if (trimmedBody === '') {
      toast.error('Isi artikel masih kosong. Tulis dulu di tab Tulis.');
      return;
    }

    startSubmitTransition(async () => {
      const payloadSlug = String(formData.get('slug') ?? '').trim();
      const description = optional('excerpt');
      const created = (await onSubmit({
        regionId: formData.get('regionId'),
        publisherId: formData.get('publisherId') || null,
        categoryIds: formData.getAll('categoryIds').map(String),
        authorId: formData.get('authorId') || null,
        leadMediaId: formData.get('leadMediaId') || null,
        slug: payloadSlug,
        title: String(formData.get('title') ?? '').trim(),
        excerpt: description,
        canonicalUrl: optional('canonicalUrl'),
        coverImageUrl: optional('coverImageUrl'),
        body: trimmedBody.slice(0, 200_000),
        bodyJson: bodyJsonDraft,
        source: String(formData.get('source') ?? '').trim(),
        tags: normalizeTagList(String(formData.get('tags') ?? '').split(',')).slice(0, TAG_MAX_COUNT),
        status,
        scheduledAt: status === 'scheduled' ? `${rawSchedule}:00` : undefined,
      })) as { readonly slug?: string } | null;
      if (created !== null && typeof created.slug === 'string' && created.slug !== payloadSlug) {
        toast.info(`Slug "${payloadSlug}" sudah dipakai — disimpan sebagai "${created.slug}".`);
      }
      form.reset();
      setSlug('');
      setSlugTouched(false);
      setStatus('draft');
      setCategoryIds([]);
      setPublisherId(null);
      touchedAuthor.current = false;
      setAuthorId(defaultAuthorId);
      setTitleText('');
      setDescriptionText('');
      setMode('tulis');
      setBodyText('');
      setFeaturedId(null);
      setFeaturedName('');
      setFeaturedPreviewUrl(null);
      setFeaturedStatus(null);
      setCoverUrl('');
      setBodyJsonDraft(null);
      setRichResetKey((key) => key + 1);
    });
  };

  return (
    <form noValidate onSubmit={handleCreateArticle}>
      <div className="sticky top-3 z-10 mb-6 flex flex-wrap items-center gap-3 rounded-lg border border-hairline bg-bg/95 px-4 py-2.5 shadow-lg backdrop-blur">
        <SearchCombobox
          id={statusSelectId}
          name="status"
          required
          disabled={isSubmitting}
          placeholder="Pilih status"
          value={status}
          onValueChange={(next) => { if (next !== null) setStatus(next); }}
          options={[...STATUS_OPTIONS]}
          ariaLabel="Status artikel"
        />
        {status === 'scheduled' ? (
          <Input
            id={scheduleInputId}
            name="scheduledAt"
            type="datetime-local"
            required
            disabled={isSubmitting}
            aria-label="Jadwal terbit"
            className="h-8 w-auto rounded border-hairline-strong bg-bg px-2 font-mono text-xs text-paper focus-visible:ring-brass"
          />
        ) : null}
        <span className="flex items-center gap-1.5" title={`Judul ${titleText.length}/60 · Deskripsi ${descriptionText.length}/160`}>
          <span
            aria-hidden="true"
            className={`h-2 w-2 rounded-full ${titleText.length === 0 ? 'bg-hairline-strong' : titleText.length <= 60 ? 'bg-signal' : titleText.length <= 100 ? 'bg-brass' : 'bg-error'}`}
          />
          <span
            aria-hidden="true"
            className={`h-2 w-2 rounded-full ${descriptionText.length === 0 ? 'bg-hairline-strong' : descriptionText.length < 120 ? 'bg-brass' : descriptionText.length <= 160 ? 'bg-signal' : 'bg-error'}`}
          />
          <span className="font-mono text-[11px] tabular-nums text-paper-faint">{editorStats.words} kata</span>
        </span>
        <span className="flex-1" />
        <Button type="submit" variant="default" disabled={isSubmitting}>
          {isSubmitting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          ) : (
            <Send className="h-3.5 w-3.5" aria-hidden="true" />
          )}
          <span>{SUBMIT_LABELS[status] ?? 'Simpan Artikel'}</span>
        </Button>
      </div>
      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-10 rounded-lg border border-hairline bg-bg-raised p-5 sm:p-8">
          <div className="space-y-6">
            <p className="m-0 font-sans text-xl font-bold tracking-tight text-paper sm:text-2xl">Artikel baru</p>
            <Field>
              <Label htmlFor={titleInputId} className="font-mono text-xs text-paper-dim">
                Judul Artikel
              </Label>
              <Input
                id={titleInputId}
                name="title"
                required
                disabled={isSubmitting}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="Tulis tajuk berita di sini…"
                className="h-11 rounded-lg border-hairline-strong bg-bg px-3.5 font-serif text-lg font-semibold tracking-tight text-paper transition-colors duration-180 placeholder:font-sans placeholder:text-sm placeholder:font-normal hover:border-hairline focus-visible:border-brass focus-visible:ring-brass"
              />
              <div className="flex items-baseline justify-between gap-2">
                <FieldDescription className="font-mono text-[11px] text-paper-faint">
                  ±60 karakter tampil penuh sebagai judul di hasil cari; selebihnya bisa terpotong mengikuti lebar layar.
                </FieldDescription>
                <span
                  aria-live="polite"
                  className={`flex-none font-mono text-[11px] tabular-nums ${titleText.length === 0 ? 'text-paper-faint' : titleText.length <= 60 ? 'text-signal' : titleText.length <= 100 ? 'text-brass' : 'text-error'}`}
                >
                  {titleText.length}/60
                </span>
              </div>
            </Field>
            <Field>
              <Label htmlFor={slugInputId} className="font-mono text-xs text-paper-dim">
                Slug URL
              </Label>
              <div className="relative">
                <Link2 className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-paper-faint" aria-hidden="true" />
                <Input
                  id={slugInputId}
                  name="slug"
                  required
                  disabled={isSubmitting}
                  value={slug}
                  onChange={(e) => handleSlugChange(e.target.value)}
                  pattern="[a-z0-9-]+"
                  placeholder="judul-artikel-terkini"
                  className="h-8 rounded border-hairline-strong bg-bg pr-2.5 pl-8 font-mono text-xs text-paper transition-colors duration-180 hover:border-hairline focus-visible:ring-brass"
                />
              </div>
              <FieldDescription className="font-mono text-[11px] text-paper-faint">
                Mengikuti judul otomatis sampai Anda ubah manual. Bila sudah dipakai, akhiran -2, -3 ditambahkan otomatis.
              </FieldDescription>
            </Field>

            <Field className="border-t border-hairline pt-8">
              <div className="flex items-baseline justify-between gap-2">
                <Label htmlFor={excerptInputId} className="font-mono text-xs text-paper-dim">
                  Deskripsi
                </Label>
                <span
                  aria-live="polite"
                  className={`font-mono text-[11px] tabular-nums ${descriptionText.length === 0 ? 'text-paper-faint' : descriptionText.length < 120 ? 'text-brass' : descriptionText.length <= 160 ? 'text-signal' : 'text-error'}`}
                >
                  {descriptionText.length === 0 ? 'auto' : `${descriptionText.length}/160`}
                </span>
              </div>
              <Textarea
                id={excerptInputId}
                name="excerpt"
                disabled={isSubmitting}
                onChange={(e) => setDescriptionText(e.target.value)}
                placeholder="Satu-dua kalimat inti berita..."
                className="min-h-[64px] rounded border border-hairline-strong bg-bg p-3 font-sans text-xs leading-relaxed text-paper transition-colors duration-180 hover:border-hairline focus:border-brass focus:outline-none"
              />
              <FieldDescription className="font-mono text-[11px] text-paper-faint">
                Jadi meta description, cuplikan kartu listing, og:description, dan deskripsi RSS. Tulis 120–160 karakter
                kalimat lengkap yang memuat topik — Google bisa memotong selebihnya atau mengganti dengan isi halaman
                bila kueri tidak cocok. Kosongkan untuk dibuat otomatis dari isi.
              </FieldDescription>
              <div aria-label="Pratinjau hasil cari" className="rounded-md border border-hairline bg-bg-raised px-3 py-2.5">
                <p className="m-0 truncate font-sans text-sm font-medium text-brass">
                  {titleText.trim() === '' ? 'Judul artikel tampil di sini' : titleText.trim()}
                </p>
                <p className="m-0 truncate font-mono text-[11px] text-paper-faint">
                  portalcontoh.id/{slug.trim() === '' ? 'slug-artikel' : slug.trim()}
                </p>
                <p className="m-0 mt-1 line-clamp-2 font-sans text-xs leading-relaxed text-paper-dim">
                  {descriptionText.trim() === '' ? 'Deskripsi terisi otomatis dari kalimat awal isi bila dikosongkan.' : descriptionText.trim()}
                </p>
              </div>
            </Field>

            <div className="space-y-2 border-t border-hairline pt-8">
              <div className="flex items-center justify-between gap-2">
                <span id={`${bodyInputId}-label`} className="block font-mono text-[11px] uppercase tracking-wider text-paper-dim">
                  Isi Artikel
                </span>
                <div role="tablist" aria-label="Mode editor" className="flex gap-1 rounded-md border border-hairline bg-bg-raised p-0.5">
                  {MODE_TABS.map((tab) => (
                    <Tooltip key={tab.value}>
                      <TooltipTrigger
                        render={
                          <Button
                            type="button"
                            role="tab"
                            aria-selected={mode === tab.value}
                            variant={mode === tab.value ? 'default' : 'ghost'}
                            size="xs"
                            onClick={() => setMode(tab.value)}
                            disabled={isSubmitting}
                          >
                            <span>{tab.label}</span>
                          </Button>
                        }
                      />
                      <TooltipContent side="top" className="border border-hairline bg-bg-raised p-2 font-mono text-xs text-paper">
                        {tab.tip}
                      </TooltipContent>
                    </Tooltip>
                  ))}
                </div>
              </div>
              <p className="m-0 pb-2 font-mono text-[11px] text-paper-faint" role="note">
                {MODE_HINTS[mode]}
              </p>
              {mode === 'tulis' ? (
                <RichTextEditor
                  key={richResetKey}
                  onDocChange={handleRichChange}
                  command={command ?? (async () => { throw new Error('Unggahan media tidak tersedia di pratinjau.'); })}
                  labelledBy={`${bodyInputId}-label`}
                  disabled={isSubmitting}
                />
              ) : mode === 'pratinjau' ? (
                <ArticlePreview
                  title={titleText}
                  description={descriptionText}
                  coverImageUrl={featuredPreviewUrl ?? (coverUrl.trim() === '' ? null : coverUrl.trim())}
                  doc={bodyJsonDraft}
                  command={command ?? (async () => null)}
                />
              ) : (
                <div className="space-y-1.5">
                  <pre className="m-0 max-h-64 overflow-auto rounded border border-hairline bg-bg-raised p-3 font-mono text-[11px] leading-relaxed whitespace-pre-wrap text-paper-dim">
                    {bodyText.trim() === '' ? '— belum ada isi —' : bodyText}
                  </pre>
                  <p className="m-0 font-mono text-[11px] text-paper-faint">
                    Struktur JSON {bodyJsonDraft === null ? 'kosong' : 'valid'} · {bodyText.length} karakter tersimpan.
                  </p>
                </div>
              )}
              <div aria-label="Statistik artikel" className="flex flex-wrap items-center justify-between gap-x-5 gap-y-1.5 rounded-lg border border-hairline bg-bg-raised px-4 py-2.5">
                {statItems.map((stat) => (
                  <span key={stat.label} className="inline-flex items-center gap-1.5 font-mono text-[11px] text-paper-dim">
                    <stat.icon className="h-3.5 w-3.5 text-brass" aria-hidden="true" />
                    {stat.value} {stat.label}
                  </span>
                ))}
              </div>
              <p className="m-0 font-mono text-[11px] text-paper-faint">
                Tulis seperti dokumen biasa — tombol Gambar menyisipkan foto otomatis ke media. Teks polos untuk arsip dan RSS dibuat otomatis.
              </p>
            </div>
          </div>
        </div>

        <div className="grid content-start gap-6 lg:sticky lg:top-[72px]">
          <SectionCard icon={SlidersHorizontal} title="Inspektor artikel" eyebrow="Periksa">
            <div className="space-y-5">
              <section aria-label="Optimasi hasil cari" className="space-y-2.5">
                <div className="flex items-center gap-2">
                  <span aria-hidden="true" className="h-3 w-0.5 rounded-full bg-brass" />
                  <p className="m-0 font-mono text-[11px] font-medium uppercase tracking-wider text-paper">Hasil cari</p>
                </div>
                <SeoMeter label="Judul · ideal 50–60" length={titleText.length} idealMin={50} idealMax={60} cap={100} />
                <SeoMeter label="Deskripsi · ideal 120–160" length={descriptionText.length} idealMin={120} idealMax={160} cap={200} />
              </section>
              <Separator />
              <section aria-label="Atribusi" className="space-y-3.5">
                <div className="flex items-center gap-2">
                  <span aria-hidden="true" className="h-3 w-0.5 rounded-full bg-brass" />
                  <p className="m-0 font-mono text-[11px] font-medium uppercase tracking-wider text-paper">Atribusi</p>
                </div>
              <div className="space-y-1.5">
                <Label htmlFor={regionSelectId} className="font-mono text-xs text-paper-dim">
                  Wilayah
                </Label>
                <SearchCombobox
                  id={regionSelectId}
                  name="regionId"
                  required
                  disabled={isSubmitting}
                  placeholder="Pilih wilayah"
                  options={regionOptions}
                />
              </div>

              <Separator />

              <div className="space-y-1.5">
                <Label htmlFor={publisherSelectId} className="font-mono text-xs text-paper-dim">
                  Penerbit
                </Label>
                <SearchCombobox
                  id={publisherSelectId}
                  name="publisherId"
                  disabled={isSubmitting}
                  placeholder="Mandiri (tanpa penerbit)"
                  allowEmpty
                  emptyLabel="Mandiri (tanpa penerbit)"
                  options={publisherOptions}
                  value={publisherId ?? ''}
                  onValueChange={handlePublisherChange}
                />
              </div>

              <Separator />

              <div className="space-y-1.5">
                <Label htmlFor={categoryInputId} className="font-mono text-xs text-paper-dim">
                  Kategori {categoryIds.length > 0 ? `(${categoryIds.length} dipilih)` : '(belum ada)'}
                </Label>
                <p className="m-0 font-mono text-[11px] text-paper-faint">
                  Ketik untuk mencari; bila tidak ada, tombol tambah muncul di dalam daftar. Boleh lebih dari satu; yang pertama jadi kategori utama.
                </p>
                <CategoryCombobox
                  id={categoryInputId}
                  categories={allCategories}
                  value={categoryIds}
                  onValueChange={setCategoryIds}
                  onCreateCategory={handleCreateCategory}
                  disabled={isSubmitting}
                  placeholder="Ketik nama kategori..."
                />
              </div>

              <Separator />

              <div className="space-y-1.5">
                <Label htmlFor={authorSelectId} className="font-mono text-xs text-paper-dim">
                  Penulis
                </Label>
                <SearchCombobox
                  id={authorSelectId}
                  name="authorId"
                  disabled={isSubmitting || publisherId !== null}
                  placeholder="Tanpa penulis"
                  allowEmpty
                  emptyLabel="Tanpa penulis"
                  options={authorOptions}
                  value={authorId ?? ''}
                  onValueChange={handleAuthorChange}
                />
                <p className="m-0 font-mono text-[11px] text-paper-faint">
                  {selectedAuthor !== null
                    ? `Yang tampil: ${selectedAuthor.byline}.`
                    : selectedPublisher !== null
                      ? `Yang tampil: ${selectedPublisher.attributionLabel} (mengikuti penerbit).`
                      : 'Tanpa penulis dan penerbit: mengikuti nama situs.'}
                </p>
              </div>

              <Separator />

              <div className="space-y-1.5">
                <Label htmlFor={tagsInputId} className="font-mono text-xs text-paper-dim">
                  Topik (koma, maks. 10)
                </Label>
                <TagCombobox
                  id={tagsInputId}
                  name="tags"
                  disabled={isSubmitting}
                  placeholder="cth: wonosobo, pertanian, apbd"
                  suggestions={tagSuggestions}
                  maxItems={TAG_MAX_COUNT}
                  normalizeValue={(raw) => {
                    const first = normalizeTagList([raw])[0];
                    return typeof first === 'string' ? first : '';
                  }}
                />
              </div>
              </section>
              <Separator />
              <section aria-label="Sampul" className="space-y-3.5">
                <div className="flex items-center gap-2">
                  <span aria-hidden="true" className="h-3 w-0.5 rounded-full bg-brass" />
                  <p className="m-0 font-mono text-[11px] font-medium uppercase tracking-wider text-paper">Sampul</p>
                </div>
              <div className="space-y-1.5">
                <span className="block font-mono text-xs text-paper-dim">
                  Unggah sampul
                </span>
                {featuredId !== null ? (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 rounded border border-hairline bg-bg p-2">
                      <input type="hidden" name="leadMediaId" value={featuredId} />
                      <span className="min-w-0 flex-1 truncate font-mono text-xs text-paper">
                        {featuredName}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="xs"
                        onClick={() => { setFeaturedId(null); setFeaturedName(''); setFeaturedPreviewUrl(null); }}
                        disabled={isSubmitting || uploadingFeatured}
                      >
                        <span>Hapus</span>
                      </Button>
                    </div>
                    {featuredPreviewUrl !== null ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={featuredPreviewUrl} alt={`Pratinjau ${featuredName}`} className="max-h-40 w-full rounded border border-hairline object-cover" />
                    ) : null}
                    <p className="m-0 break-all font-mono text-[11px] text-paper-faint">
                      {`/api/network/media/${featuredId}`}
                    </p>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isSubmitting || uploadingFeatured}
                    className="w-full"
                    onClick={() => document.getElementById(featuredFileId)?.click()}
                  >
                    <ImagePlus className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>{uploadingFeatured ? 'Mengunggah...' : 'Pilih gambar...'}</span>
                  </Button>
                )}
                <input
                  id={featuredFileId}
                  type="file"
                  accept="image/*"
                  data-testid="featured-file-input"
                  className="hidden"
                  disabled={isSubmitting || uploadingFeatured}
                  onChange={(event) => void handleFeaturedFile(event)}
                />
                {featuredStatus !== null ? (
                  <p className="m-0 font-mono text-[11px] text-paper-faint">{featuredStatus}</p>
                ) : null}
              </div>

              <Separator />

              <div className="space-y-1.5">
                <Label htmlFor={coverUrlInputId} className="font-mono text-xs text-paper-dim">
                  atau URL gambar luar (opsional)
                </Label>
                <Input
                  id={coverUrlInputId}
                  name="coverImageUrl"
                  value={coverUrl}
                  onChange={(e) => setCoverUrl(e.target.value)}
                  disabled={isSubmitting}
                  placeholder="https://..."
                  className="h-8 rounded border-hairline-strong bg-bg px-2.5 font-mono text-xs text-paper transition-colors duration-180 hover:border-hairline focus-visible:ring-brass"
                />
                {coverUrl.trim() !== '' ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={coverUrl.trim()} alt="Pratinjau sampul luar" className="max-h-40 w-full rounded border border-hairline object-cover" />
                ) : null}
                <p className="m-0 font-mono text-[11px] text-paper-faint">
                  Gambar terunggah diutamakan; URL dipakai bila tidak ada unggahan.
                </p>
              </div>
              </section>
              <Separator />
              <section aria-label="Sumber" className="space-y-3.5">
                <div className="flex items-center gap-2">
                  <span aria-hidden="true" className="h-3 w-0.5 rounded-full bg-brass" />
                  <p className="m-0 font-mono text-[11px] font-medium uppercase tracking-wider text-paper">Sumber</p>
                </div>
              <div className="space-y-1.5">
                <Label htmlFor={sourceInputId} className="font-mono text-xs text-paper-dim">
                  Sumber
                </Label>
                <Input
                  id={sourceInputId}
                  name="source"
                  required
                  disabled={isSubmitting}
                  placeholder="cth: Rilis Resmi Dinas Kominfo Wonosobo"
                  className="h-8 rounded border-hairline-strong bg-bg px-2.5 font-sans text-xs text-paper transition-colors duration-180 hover:border-hairline focus-visible:ring-brass"
                />
              </div>

              <Separator />

              <div className="space-y-1.5">
                <Label htmlFor={canonicalInputId} className="font-mono text-xs text-paper-dim">
                  URL Kanonis (opsional)
                </Label>
                <Input
                  id={canonicalInputId}
                  name="canonicalUrl"
                  disabled={isSubmitting}
                  placeholder="https://sumber-resmi.example/rilis/..."
                  className="h-8 rounded border-hairline-strong bg-bg px-2.5 font-mono text-xs text-paper transition-colors duration-180 hover:border-hairline focus-visible:ring-brass"
                />
              </div>
              </section>
            </div>
          </SectionCard>
        </div>
      </div>
    </form>
  );
}
