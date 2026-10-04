'use client';

import { useEffect, useId, useMemo, useRef, useState, useTransition, type ChangeEvent, type FormEvent, type MouseEvent as ReactMouseEvent } from 'react';
import { toast } from 'sonner';
import {
  CaseSensitive,
  Clock,
  Image as ImageIcon,
  ImagePlus,
  Images,
  Link2,
  Loader2,
  Minus,
  Newspaper,
  Pilcrow,
  Plus,
  RefreshCw,
  Send,
  Share2,
  SlidersHorizontal,
  Sparkles,
  Tags,
  Type,
  WandSparkles,
} from 'lucide-react';
import type { DashboardCommand } from '@/modules/dashboard/command';
import { SectionCard } from '@/modules/dashboard/components/shared/section-card';
import { DateTimeField } from '@/modules/dashboard/components/shared/date-time-field';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
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
import { findMatchingCategoryId, localDateTimeToIso } from '@/modules/dashboard/components/shared/form-utils';
import { slugify } from '@/modules/site/slugify';
import { DEFAULT_CATEGORY_SLUG } from '@/modules/dashboard/models';
import { SLUG_MAX_LENGTH, TAG_MAX_COUNT, normalizeTagList } from '@/modules/site/slug-allocator';
import type { TipTapDoc, TipTapNode } from '@/modules/site/tiptap-document';
import { tiptapToText, TIPTAP_MAX_NODES } from '@/modules/site/tiptap-document';
import { describeBodyJsonProblem } from '@/modules/dashboard/components/editorial/body-json-diagnostics';
import { buildArticlePayload } from '@/modules/dashboard/components/editorial/article-persistence';
import { ArticlePreview } from '@/modules/dashboard/components/editorial/article-preview';
import { RichTextEditor } from '@/modules/dashboard/components/editorial/rich-text-editor';
import { callAi } from '@/modules/ai/components/ai-client';
import { AiActionButton, AiPending } from '@/modules/ai/components/ai-action-button';
import { uploadEditorImage } from '@/modules/dashboard/components/editorial/editor-image-upload';
import { chunkPublicationTargets, selectPublicationTargets } from '@/modules/dashboard/components/editorial/publication-batch';
import { beginActionProgress } from '@/modules/dashboard/components/shared/action-progress';
import { AppTooltip } from '@/ui/app-tooltip';
import { useAiSlot } from '@/modules/dashboard/components/editorial/use-ai-slot';
import type { PublicationScope, PublishTargetSite } from '@/modules/dashboard/components/editorial/publication-batch';
import { COVER_COMPRESS, formatBytes } from '@/modules/publishing/compress-image';

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

const PUBLISH_ON_SAVE_LABELS: Record<string, string> = {
  draft: 'Simpan Draf',
  in_review: 'Simpan untuk Reviu',
  scheduled: 'Jadwalkan dan Terbitkan',
  active: 'Simpan dan Terbitkan',
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

/** Awalan id kategori yang masih hidup di memori dan belum ada di server. */
const PENDING_CATEGORY_PREFIX = 'new:';

/** Jumlah pustaka sampul per halaman; otorisasi pratinjau diminta per halaman tampil. */
const LIBRARY_PAGE = 24;

/** Batas byte gambar untuk caption AI; 5 MB tetap di bawah batas 7 juta karakter base64 server. */
const COVER_CAPTION_BYTES_MAX = 5_000_000;

/** MIME yang diterima model vision; sama dengan allowlist server. */
const COVER_CAPTION_MIME_ALLOWLIST: ReadonlySet<string> = new Set(['image/jpeg', 'image/png', 'image/webp']);

/** Gambar yang layak jadi sampul dan bisa dipratinjau browser. */
const COVER_PICK_MIME_ALLOWLIST: ReadonlySet<string> = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif']);

/** Satu baris media dari `GET view=media` yang layak jadi sampul. */
interface CoverLibraryItem {
  readonly id: string;
  readonly objectKey: string;
  readonly mediaType: string;
  readonly sizeBytes: number;
  readonly altText: string | null;
  readonly caption: string | null;
  readonly version: number;
}

function fileNameOf(objectKey: string): string {
  const segments = objectKey.split('/').filter((segment) => segment.length > 0);
  return segments[segments.length - 1] ?? objectKey;
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
    reader.onerror = () => reject(new Error('Gagal membaca gambar sampul.'));
    reader.readAsDataURL(blob);
  });
}

/**
 * Menyaring satu baris media pustaka menjadi kandidat sampul.
 *
 * @param value - Baris mentah dari respons `view=media`.
 * @returns Kandidat sampul; null bila bukan gambar aktif berversi.
 */
function toCoverLibraryItem(value: unknown): CoverLibraryItem | null {
  if (typeof value !== 'object' || value === null) return null;
  const row = value as Record<string, unknown>;
  if (typeof row.id !== 'string' || typeof row.objectKey !== 'string' || typeof row.mediaType !== 'string') return null;
  if (row.state !== 'active' || !COVER_PICK_MIME_ALLOWLIST.has(row.mediaType) || typeof row.version !== 'number') return null;
  return {
    id: row.id,
    objectKey: row.objectKey,
    mediaType: row.mediaType,
    sizeBytes: typeof row.sizeBytes === 'number' ? row.sizeBytes : 0,
    altText: typeof row.altText === 'string' ? row.altText : null,
    caption: typeof row.caption === 'string' ? row.caption : null,
    version: row.version,
  };
}

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
 * @param organizationId - Tenant pemilik permintaan AI; kosong mematikan fitur AI.
 * @returns Kanvas artikel terbuka + inspektor lengket (status, SEO, atribusi, sampul, sumber).
 */
export function ArticleCreateForm({
  data,
  onSubmit,
  command,
  organizationId = '',
}: {
  readonly data: unknown;
  readonly onSubmit: (payload: unknown) => Promise<unknown>;
  readonly command?: DashboardCommand;
  readonly organizationId?: string | undefined;
}) {
  const model = data as {
    readonly regions?: readonly RegionEntity[];
    readonly publishers?: readonly PublisherEntity[];
    readonly categories?: readonly CategoryEntity[];
    readonly authors?: readonly AuthorEntity[];
    readonly articles?: readonly ArticleEntity[];
    readonly sites?: readonly PublishTargetSite[];
    readonly regionScope?: { readonly id: string; readonly name: string } | null;
  } | null;

  const regionSelectId = useId();
  const nationalCheckId = useId();
  const citySelectId = useId();
  const publisherSelectId = useId();
  const authorSelectId = useId();
  const statusSelectId = useId();
  const viewsInputId = useId();
  const transcribeFullInputId = useId();  const slugInputId = useId();
  const titleInputId = useId();
  const sourceInputId = useId();
  const canonicalInputId = useId();
  const tagsInputId = useId();
  const excerptInputId = useId();
  const bodyInputId = useId();
  const categoryInputId = useId();
  const featuredFileId = useId();
  const coverUrlInputId = useId();
  const publishOnSaveId = useId();

  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [status, setStatus] = useState<string>('draft');
  const [categoryIds, setCategoryIds] = useState<readonly string[]>([]);
  const [extraCategories, setExtraCategories] = useState<readonly CategoryEntity[]>([]);
  const [featuredId, setFeaturedId] = useState<string | null>(null);
  const [featuredName, setFeaturedName] = useState('');
  const [featuredPreviewUrl, setFeaturedPreviewUrl] = useState<string | null>(null);
  const [featuredStatus, setFeaturedStatus] = useState<string | null>(null);
  const [provinceId, setProvinceId] = useState<string | null>(null);
  const [cityId, setCityId] = useState<string | null>(null);
  const [isNational, setIsNational] = useState(false);
  /** Admin tanpa kunci wilayah boleh menerbitkan nasional ke semua apex. */
  const isUnrestricted = model !== null && model.regionScope === null;
  const nationalActive = isUnrestricted && isNational;
  const [uploadingFeatured, setUploadingFeatured] = useState(false);
  const [featuredVersion, setFeaturedVersion] = useState<number | null>(null);
  const [featuredAlt, setFeaturedAlt] = useState('');
  const [featuredCaption, setFeaturedCaption] = useState('');
  const [featuredFocal, setFeaturedFocal] = useState<{ readonly x: number; readonly y: number } | null>(null);
  const coverBlobRef = useRef<{ readonly blob: Blob; readonly mimeType: string } | null>(null);
  const coverRemoteRef = useRef<{ readonly url: string; readonly mimeType: string } | null>(null);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [libraryItems, setLibraryItems] = useState<readonly CoverLibraryItem[] | null>(null);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [libraryError, setLibraryError] = useState<string | null>(null);
  const [libraryQuery, setLibraryQuery] = useState('');
  const [libraryShown, setLibraryShown] = useState(LIBRARY_PAGE);
  const [libraryPreviews, setLibraryPreviews] = useState<Readonly<Record<string, string>>>({});
  const libraryAuthInFlight = useRef<Set<string>>(new Set());
  const libraryExpiry = useRef<ReadonlyMap<string, number>>(new Map());
  const librarySearchInputId = useId();
  const [savingFeaturedMeta, setSavingFeaturedMeta] = useState(false);
  const [coverUrl, setCoverUrl] = useState('');
  const [titleText, setTitleText] = useState('');
  const [descriptionText, setDescriptionText] = useState('');
  const [mode, setMode] = useState<'tulis' | 'pratinjau' | 'sumber'>('tulis');
  const [bodyText, setBodyText] = useState('');
  const [bodyJsonDraft, setBodyJsonDraft] = useState<TipTapDoc | null>(null);
  const [richResetKey, setRichResetKey] = useState(0);
  const [isSubmitting, startSubmitTransition] = useTransition();
  const [publishOnSave, setPublishOnSave] = useState(true);
  const [source, setSource] = useState('');
  const [canonicalUrl, setCanonicalUrl] = useState('');
  const [tags, setTags] = useState<readonly string[]>([]);
  const [rawScheduleInput, setRawScheduleInput] = useState('');
  const [rawPublishDateInput, setRawPublishDateInput] = useState('');
  const [viewsInput, setViewsInput] = useState('');

  const bumpViews = (delta: number) => {
    const current = viewsInput.trim() === '' ? 0 : Number(viewsInput);
    if (!Number.isInteger(current)) return;
    const next = Math.min(1_000_000_000, Math.max(0, current + delta));
    setViewsInput(String(next));
  };
  const liveSites = useMemo(() => model?.sites ?? [], [model?.sites]);
  const publicationScope = useMemo<PublicationScope>(() => {
    if (nationalActive) return { kind: 'apex' };
    const pickedCity = model?.regions?.find((region) => region.id === cityId);
    return pickedCity?.kind === 'city' ? { kind: 'city', regionId: pickedCity.id } : { kind: 'apex' };
  }, [model?.regions, cityId, nationalActive]);
  const targetSiteIds = useMemo(
    () => selectPublicationTargets(liveSites, publicationScope),
    [liveSites, publicationScope],
  );
  const targetLabel = useMemo(() => {
    if (publicationScope.kind !== 'city') return 'portal apex';
    return `portal kota ${model?.regions?.find((region) => region.id === publicationScope.regionId)?.name ?? ''}`.trim();
  }, [publicationScope, model?.regions]);
  const willPublish = publishOnSave && (status === 'active' || status === 'scheduled');
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
  const regionOptions = useMemo(
    () => (model?.regions ?? []).filter((r) => r.kind !== 'city').map((r) => ({ value: r.id, label: r.name })),
    [model?.regions],
  );
  const cityOptions = useMemo(
    () => (model?.regions ?? [])
      .filter((r) => r.kind === 'city' && (provinceId === null || r.parentRegionId === provinceId))
      .map((r) => ({ value: r.id, label: r.name })),
    [model?.regions, provinceId],
  );
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
  const defaultCategory = useMemo(
    () => allCategories.find((category) => category.slug === DEFAULT_CATEGORY_SLUG) ?? allCategories[0] ?? null,
    [allCategories],
  );
  const defaultCategoryId = defaultCategory?.id ?? null;
  const defaultCategoryName = defaultCategory?.name ?? null;
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

  const effectiveCategoryIds = useMemo(
    () => (categoryIds.length > 0 ? categoryIds : defaultCategoryId === null ? [] : [defaultCategoryId]),
    [categoryIds, defaultCategoryId],
  );
  const bodyJsonProblem = useMemo(() => describeBodyJsonProblem(bodyJsonDraft), [bodyJsonDraft]);

  const formSnapshot = useMemo(() => ({
    slug,
    titleText,
    descriptionText,
    bodyText,
    bodyJson: bodyJsonDraft,
    source,
    canonicalUrl,
    coverUrl,
    tags,
    status,
    rawSchedule: rawScheduleInput,
    provinceId,
    cityId,
    publisherId,
    authorId,
    categoryIds: effectiveCategoryIds,
    leadMediaId: featuredId,
  }), [
    slug, titleText, descriptionText, bodyText, bodyJsonDraft, source, canonicalUrl,
    coverUrl, tags, status, rawScheduleInput, provinceId, cityId, publisherId,
    authorId, effectiveCategoryIds, featuredId,
  ]);

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
  const tagSuggestions = useMemo(() => {
    const options = (model as { readonly tagOptions?: readonly { readonly tag: string }[] } | null)?.tagOptions;
    if (options !== undefined) return options.map((option) => option.tag);
    return rankTags(model?.articles ?? []);
  }, [model]);

  const handleTitleChange = (value: string) => {
    setTitleText(value);
    if (!slugTouched) setSlug(slugify(value));
  };

  const handleSlugChange = (value: string) => {
    setSlugTouched(true);
    setSlug(value);
  };

  const applyTranscript = (transcript: string) => {
    const lines = transcript.split('\n').map((line) => line.trim()).filter((line) => line !== '');
    if (lines.length === 0) return;
    const nodes = lines.map((line) => ({ type: 'paragraph', content: [{ type: 'text', text: line.slice(0, 2000) }] }));
    const merged: TipTapDoc = { type: 'doc', content: [...(bodyJsonDraft?.content ?? []), ...nodes].slice(-TIPTAP_MAX_NODES) };
    handleRichChange({ doc: merged, text: tiptapToText(merged) });
    setRichResetKey((key) => key + 1);
    toast.success('Transkrip ditambahkan ke isi artikel.');
  };

  const applyPolishedBody = (polished: string) => {
    const paragraphs = polished.split('\n').map((line) => line.trim()).filter((line) => line !== '');
    if (paragraphs.length === 0) return;
    const remaining = [...paragraphs];
    const rewrite = (nodes: readonly TipTapNode[]): TipTapNode[] =>
      nodes.map((node) => {
        if (node.type === 'paragraph' || node.type === 'heading') {
          const next = remaining.shift();
          if (next === undefined) return node;
          return { ...node, content: [{ type: 'text', text: next.slice(0, 2000) }] };
        }
        if (node.content !== undefined) return { ...node, content: rewrite(node.content) };
        return node;
      });
    const base = bodyJsonDraft?.content ?? [];
    const content = [...rewrite(base), ...remaining.map((line) => ({ type: 'paragraph', content: [{ type: 'text', text: line.slice(0, 2000) }] }))].slice(-TIPTAP_MAX_NODES);
    const merged: TipTapDoc = { type: 'doc', content };
    handleRichChange({ doc: merged, text: tiptapToText(merged) });
    setRichResetKey((key) => key + 1);
    toast.success('Isi poles diterapkan; gambar dan sematan tidak berubah.');
  };

  const applyClassification = (selection: { readonly categoryIds?: readonly string[] | undefined; readonly tags?: readonly string[] | undefined }) => {
    if (selection.categoryIds !== undefined && selection.categoryIds.length > 0) {
      setCategoryIds([...selection.categoryIds]);
    }
    const tags = selection.tags ?? [];
    if (tags.length > 0) {
      setTags((prev) => [...prev, ...tags.filter((tag) => !prev.includes(tag))].slice(0, TAG_MAX_COUNT));
    }
    toast.success('Kategori dan topik terisi dari klasifikasi AI.');
  };

  const aiReady = organizationId !== undefined && organizationId !== '';
  const [titleVariants, setTitleVariants] = useState<readonly string[] | null>(null);
  const [polished, setPolished] = useState('');
  const [polishRounds, setPolishRounds] = useState(0);
  const { action: aiAction, claim: claimAi, release: releaseAi } = useAiSlot();

  const generatingTitles = aiAction === 'title' || aiAction === 'title-variants';

  const refineTitles = (action: 'title' | 'title-variants') => {
    if (!aiReady || titleText.trim() === '' || !claimAi(action)) return;
    void (async () => {
      try {
        const result = (await callAi(organizationId, 'seo-titles', { title: titleText.trim(), body: bodyText.trim() })) as {
          readonly titles?: readonly string[];
        };
        const titles = Array.isArray(result.titles)
          ? result.titles.filter((item): item is string => typeof item === 'string' && item.trim() !== '').slice(0, 3)
          : [];
        if (titles.length === 0) throw new Error('Layanan AI sedang sibuk. Silakan coba lagi.');
        setTitleVariants(titles);
      } catch (err) {
        toast.error(err instanceof Error && err.message !== '' ? err.message : 'Layanan AI sedang sibuk. Silakan coba lagi.');
      } finally {
        releaseAi();
      }
    })();
  };

  const refineDescription = () => {
    if (!aiReady || !claimAi('description')) return;
    void (async () => {
      try {
        const result = (await callAi(organizationId, 'seo-meta', {
          title: titleText.trim(),
          body: bodyText.trim(),
          current: descriptionText.trim(),
        })) as {
          readonly metaDescription?: string;
        };
        const meta = typeof result.metaDescription === 'string' ? result.metaDescription.trim().slice(0, 160) : '';
        if (meta === '') throw new Error('Layanan AI sedang sibuk. Silakan coba lagi.');
        setDescriptionText(meta);
        toast.success('Deskripsi disempurnakan AI.');
      } catch (err) {
        toast.error(err instanceof Error && err.message !== '' ? err.message : 'Layanan AI sedang sibuk. Silakan coba lagi.');
      } finally {
        releaseAi();
      }
    })();
  };

  const polishBodyInline = () => {
    if (!aiReady || bodyText.trim() === '' || !claimAi('polish')) return;
    void (async () => {
      try {
        const result = (await callAi(organizationId, 'polish-body', { title: titleText.trim(), body: bodyText.trim() })) as {
          readonly body?: string;
        };
        if (typeof result.body !== 'string' || result.body.trim() === '') {
          throw new Error('Layanan AI sedang sibuk. Silakan coba lagi.');
        }
        setPolished(result.body.trim());
        setPolishRounds((count) => count + 1);
      } catch (err) {
        toast.error(err instanceof Error && err.message !== '' ? err.message : 'Layanan AI sedang sibuk. Silakan coba lagi.');
      } finally {
        releaseAi();
      }
    })();
  };

  const transcribeFileInline = (file: File | null) => {
    if (file === null || !aiReady) return;
    if (file.size > 10_000_000) {
      toast.error('Berkas audio maksimal 10 MB.');
      return;
    }
    if (!claimAi('transcribe')) return;
    void (async () => {
      try {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const output = String(reader.result ?? '');
            const comma = output.indexOf(',');
            resolve(comma < 0 ? output : output.slice(comma + 1));
          };
          reader.onerror = () => reject(new Error('Gagal membaca berkas audio.'));
          reader.readAsDataURL(file);
        });
        const result = (await callAi(organizationId, 'transcribe-to-article', {
          base64,
          mimeType: file.type || 'audio/webm',
          categories: allCategories.map((category) => category.name),
        })) as {
          readonly article?: {
            readonly draft?: { readonly title?: string; readonly excerpt?: string; readonly content?: string; readonly slug?: string };
            readonly classification?: { readonly categories?: readonly string[]; readonly tags?: readonly string[] };
          };
        };
        const draft = result.article?.draft;
        if (draft === undefined) throw new Error('Layanan AI sedang sibuk. Silakan coba lagi.');
        if (titleText.trim() === '' && typeof draft.title === 'string' && draft.title.trim() !== '') {
          handleTitleChange(draft.title.trim().slice(0, 160));
        }
        if (descriptionText.trim() === '' && typeof draft.excerpt === 'string' && draft.excerpt.trim() !== '') {
          setDescriptionText(draft.excerpt.trim().slice(0, 400));
        }
        if (typeof draft.content === 'string' && draft.content.trim() !== '') {
          applyTranscript(draft.content.trim());
        }
        const rawCategories = Array.isArray(result.article?.classification?.categories) ? result.article.classification.categories : [];
        const ids = [...new Set(
          rawCategories
            .filter((item): item is string => typeof item === 'string')
            .map((name) => allCategories.find((category) => category.name.toLowerCase() === name.trim().toLowerCase())?.id)
            .filter((id): id is string => id !== undefined),
        )].slice(0, 3);
        const tags = Array.isArray(result.article?.classification?.tags)
          ? result.article.classification.tags.filter((item): item is string => typeof item === 'string')
          : [];
        applyClassification({ ...(ids.length === 0 ? {} : { categoryIds: ids }), ...(tags.length === 0 ? {} : { tags }) });
        toast.success('Berita dari audio terisi penuh — tinjau sebelum menyimpan.');
      } catch (err) {
        toast.error(err instanceof Error && err.message !== '' ? err.message : 'Layanan AI sedang sibuk. Silakan coba lagi.');
      } finally {
        releaseAi();
      }
    })();
  };

  const classifyInline = () => {
    if (!aiReady || bodyText.trim() === '' || !claimAi('classify')) return;
    void (async () => {
      try {
        const result = (await callAi(organizationId, 'classify-article', {
          title: titleText.trim(),
          body: bodyText.trim(),
          categories: allCategories.map((category) => category.name),
        })) as {
          readonly classification?: { readonly categories?: readonly string[]; readonly category?: string | null; readonly tags?: readonly string[] };
        };
        const raw = Array.isArray(result.classification?.categories)
          ? result.classification.categories
          : typeof result.classification?.category === 'string'
            ? [result.classification.category]
            : [];
        const ids = [...new Set(
          raw
            .filter((item): item is string => typeof item === 'string')
            .map((name) => allCategories.find((category) => category.name.toLowerCase() === name.trim().toLowerCase())?.id)
            .filter((id): id is string => id !== undefined),
        )].slice(0, 3);
        const tags = Array.isArray(result.classification?.tags)
          ? result.classification.tags.filter((item): item is string => typeof item === 'string')
          : [];
        applyClassification({ ...(ids.length === 0 ? {} : { categoryIds: ids }), ...(tags.length === 0 ? {} : { tags }) });
      } catch (err) {
        toast.error(err instanceof Error && err.message !== '' ? err.message : 'Layanan AI sedang sibuk. Silakan coba lagi.');
      } finally {
        releaseAi();
      }
    })();
  };

  const openLibrary = () => {
    if (command === undefined || organizationId === undefined || organizationId === '') {
      toast.error('Pustaka media tidak tersedia di pratinjau.');
      return;
    }
    setLibraryOpen((open) => !open);
    if (libraryItems !== null || libraryLoading) return;
    setLibraryLoading(true);
    setLibraryError(null);
    void (async () => {
      try {
        const response = await fetch(
          `/api/dashboard/publishing?organizationId=${encodeURIComponent(organizationId)}&view=media&limit=100`,
        );
        if (!response.ok) throw new Error('Gagal memuat pustaka media.');
        const body = (await response.json()) as { readonly media?: readonly unknown[] };
        const items = (Array.isArray(body.media) ? body.media : [])
          .map(toCoverLibraryItem)
          .filter((item): item is CoverLibraryItem => item !== null);
        setLibraryItems(items);
        if (items.length === 0) toast.info('Pustaka media belum berisi gambar.');
      } catch {
        setLibraryError('Gagal memuat pustaka media. Coba lagi.');
      } finally {
        setLibraryLoading(false);
      }
    })();
  };

  const libraryFiltered = useMemo(() => {
    const needle = libraryQuery.trim().toLowerCase();
    const items = libraryItems ?? [];
    if (needle === '') return items;
    return items.filter((item) =>
      `${fileNameOf(item.objectKey)} ${item.altText ?? ''} ${item.caption ?? ''}`.toLowerCase().includes(needle),
    );
  }, [libraryItems, libraryQuery]);
  const libraryVisible = libraryFiltered.slice(0, libraryShown);

  useEffect(() => {
    if (!libraryOpen || command === undefined || libraryVisible.length === 0) return undefined;
    const now = Date.now();
    const missing = libraryVisible.filter(
      (item) =>
        (libraryPreviews[item.id] === undefined || (libraryExpiry.current.get(item.id) ?? 0) - 60_000 <= now) &&
        !libraryAuthInFlight.current.has(item.id),
    );
    if (missing.length === 0) return undefined;
    for (const item of missing) libraryAuthInFlight.current.add(item.id);
    const timer = window.setTimeout(() => {
      const run = command;
      void (async () => {
        try {
          const result = (await run('media.readMany', { mediaIds: missing.map((item) => item.id) })) as {
            readonly items?: readonly { readonly mediaId?: unknown; readonly url?: unknown; readonly expiresAt?: unknown }[];
          } | null;
          if (!Array.isArray(result?.items)) return;
          const entries: [string, string][] = [];
          const expiry = new Map(libraryExpiry.current);
          for (const entry of result.items) {
            if (typeof entry?.mediaId !== 'string' || typeof entry?.url !== 'string' || entry.url === '') continue;
            entries.push([entry.mediaId, entry.url]);
            const expires = typeof entry?.expiresAt === 'string' ? Date.parse(entry.expiresAt) : Number.NaN;
            if (Number.isFinite(expires)) expiry.set(entry.mediaId, expires);
          }
          libraryExpiry.current = expiry;
          if (entries.length > 0) setLibraryPreviews((prev) => ({ ...prev, ...Object.fromEntries(entries) }));
        } catch {
          /* Pratinjau per baris best-effort; kartu tanpa URL tetap bisa dipilih. */
        }
      })().finally(() => {
        for (const item of missing) libraryAuthInFlight.current.delete(item.id);
      });
    }, 400);
    return () => window.clearTimeout(timer);
  }, [libraryOpen, libraryVisible, command, libraryPreviews]);

  const pickLibraryCover = (item: CoverLibraryItem) => {
    const url = libraryPreviews[item.id];
    if (url === undefined) {
      toast.error('Pratinjau belum siap. Tunggu sebentar lalu coba lagi.');
      return;
    }
    coverBlobRef.current = null;
    coverRemoteRef.current = { url, mimeType: item.mediaType };
    setFeaturedId(item.id);
    setFeaturedName(fileNameOf(item.objectKey));
    setFeaturedVersion(item.version);
    setFeaturedFocal(null);
    if (featuredAlt.trim() === '' && (item.altText ?? '').trim() !== '') {
      setFeaturedAlt((item.altText ?? '').trim().slice(0, 300));
    }
    if (featuredCaption.trim() === '' && (item.caption ?? '').trim() !== '') {
      setFeaturedCaption((item.caption ?? '').trim().slice(0, 500));
    }
    setFeaturedPreviewUrl(url);
    setFeaturedStatus(null);
    setLibraryOpen(false);
    toast.success('Sampul diambil dari pustaka.');
  };

  const resolveCoverBytes = async (): Promise<{ readonly dataUrl: string; readonly mimeType: string }> => {
    const direct = coverBlobRef.current;
    if (direct !== null) {
      return { dataUrl: await blobToDataUrl(direct.blob), mimeType: direct.mimeType };
    }
    const remote = coverRemoteRef.current;
    if (remote === null) throw new Error('Gambar sampul tidak tersedia.');
    if (!COVER_CAPTION_MIME_ALLOWLIST.has(remote.mimeType)) {
      throw new Error('Format gambar belum didukung. Gunakan JPEG, PNG, atau WebP.');
    }
    const response = await fetch(remote.url);
    if (!response.ok) throw new Error('Gagal mengunduh gambar sampul.');
    const blob = await response.blob();
    if (blob.size === 0 || blob.size > COVER_CAPTION_BYTES_MAX) throw new Error('Berkas gambar terlalu besar atau kosong.');
    return { dataUrl: await blobToDataUrl(blob), mimeType: remote.mimeType };
  };

  const captionCoverInline = () => {
    if (!aiReady || featuredId === null || !claimAi('caption')) return;
    void (async () => {
      try {
        const { dataUrl, mimeType } = await resolveCoverBytes();
        const result = (await callAi(organizationId, 'cover-caption', { base64: dataUrl, mimeType, title: titleText.trim().slice(0, 200) })) as {
          readonly caption?: { readonly alt?: unknown; readonly caption?: unknown };
        };
        const alt = typeof result.caption?.alt === 'string' ? result.caption.alt.trim().slice(0, 300) : '';
        const caption = typeof result.caption?.caption === 'string' ? result.caption.caption.trim().slice(0, 500) : '';
        if (alt === '' && caption === '') throw new Error('Layanan AI sedang sibuk. Silakan coba lagi.');
        if (alt !== '') setFeaturedAlt(alt);
        if (caption !== '') setFeaturedCaption(caption);
        toast.success('Alt dan caption terisi otomatis — tinjau lalu simpan metadata sampul.');
      } catch (err) {
        toast.error(err instanceof Error && err.message !== '' ? err.message : 'Layanan AI sedang sibuk. Silakan coba lagi.');
      } finally {
        releaseAi();
      }
    })();
  };

  const handleCreateCategory = (rawName: string): string | null => {
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
    const pendingId = `${PENDING_CATEGORY_PREFIX}${crypto.randomUUID()}`;
    setExtraCategories((prev) => (prev.some((category) => category.id === pendingId) ? prev : [...prev, { id: pendingId, name, slug: slugify(name), status: 'active', version: 1 }]));
    setCategoryIds((prev) => (prev.includes(pendingId) ? prev : [...prev, pendingId]));
    return pendingId;
  };

  /**
   * Ubah kategori lokal (belum tersimpan) menjadi id server saat artikel disimpan.
   *
   * @param ids - Id kategori terpilih; yang berawalan `new:` masih lokal.
   * @returns Id server dalam urutan yang sama, atau null bila ada yang gagal.
   */
  const persistPendingCategories = async (ids: readonly string[]): Promise<readonly string[] | null> => {
    if (!ids.some((id) => id.startsWith(PENDING_CATEGORY_PREFIX))) return ids;
    if (command === undefined) {
      toast.error('Kategori baru tidak dapat disimpan dari layar ini.');
      return null;
    }
    const resolved: string[] = [];
    for (const id of ids) {
      if (!id.startsWith(PENDING_CATEGORY_PREFIX)) {
        resolved.push(id);
        continue;
      }
      const pending = extraCategories.find((category) => category.id === id);
      if (pending === undefined) return null;
      let created: { readonly id?: unknown } | null;
      try {
        created = (await command('category.create', { name: pending.name, slug: slugify(pending.name) })) as { readonly id?: unknown } | null;
      } catch (error) {
        toast.error(error instanceof Error && error.message !== '' ? error.message : `Kategori "${pending.name}" gagal disimpan.`);
        return null;
      }
      const newId = typeof created?.id === 'string' ? created.id : null;
      if (newId === null) {
        // A rejected org switch can leave the row committed, so re-check the
        // server-backed list before telling the editor the category is missing.
        // `allCategories` would match the pending chip against itself and hand
        // back a `new:` id the server has never seen.
        const settled = findMatchingCategoryId(activeCategories, pending.name);
        if (settled === null) return null;
        resolved.push(settled);
        setExtraCategories((prev) => prev.filter((category) => category.id !== id));
        continue;
      }
      resolved.push(newId);
      setExtraCategories((prev) => prev.filter((category) => category.id !== id));
    }
    return resolved;
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
    coverBlobRef.current = null;
    coverRemoteRef.current = null;
    setUploadingFeatured(true);
    setFeaturedStatus('Menganalisis & mengompresi gambar di perangkat…');
    try {
      const { mediaId, previewUrl, storedSrc, version, sizeBytes, savingsBytes, compressedBlob, compressedMediaType } = await uploadEditorImage(file, { kind: 'organization' }, command, {
        purpose: 'article-cover',
        compress: COVER_COMPRESS,
        onConverting: () => setFeaturedStatus('Mengonversi HEIC ke JPEG di perangkat…'),
      });
      coverBlobRef.current = { blob: compressedBlob, mimeType: compressedMediaType };
      setFeaturedId(mediaId);
      setFeaturedName(file.name);
      setFeaturedVersion(version);
      setFeaturedAlt('');
      setFeaturedCaption('');
      setFeaturedFocal(null);
      setFeaturedPreviewUrl(previewUrl === '' ? storedSrc : previewUrl);
      setFeaturedStatus(savingsBytes > 0 ? `Terkompresi ${formatBytes(file.size)} → ${formatBytes(sizeBytes)} (WebP).` : null);
    } catch (error) {
      setFeaturedStatus(error instanceof Error ? error.message : 'Gagal mengunggah gambar sampul. Coba lagi.');
    } finally {
      setUploadingFeatured(false);
    }
  };

  const saveFeaturedMeta = async (patch: { readonly altText?: string | null; readonly caption?: string | null; readonly focalX?: number | null; readonly focalY?: number | null }) => {
    if (command === undefined || featuredId === null || featuredVersion === null) {
      toast.error('Simpan metadata sampul tidak tersedia.');
      return;
    }
    setSavingFeaturedMeta(true);
    try {
      const updated = (await command('media.update', { mediaId: featuredId, expectedVersion: featuredVersion, ...patch })) as { readonly version?: unknown } | null;
      if (updated === null) {
        toast.warning('Penyimpanan dibatalkan karena organisasi aktif berubah.');
        return;
      }
      setFeaturedVersion(typeof updated.version === 'number' ? updated.version : featuredVersion + 1);
      toast.success('Metadata sampul disimpan.');
    } catch (error) {
      toast.error(error instanceof Error && error.message !== '' ? error.message : 'Gagal menyimpan metadata sampul. Coba lagi.');
    } finally {
      setSavingFeaturedMeta(false);
    }
  };

  const handleFeaturedMetaSave = () => {
    const alt = featuredAlt.trim();
    const caption = featuredCaption.trim();
    void saveFeaturedMeta({ altText: alt === '' ? null : alt, caption: caption === '' ? null : caption });
  };

  const handleFocalPick = (event: ReactMouseEvent<HTMLButtonElement>) => {
    if (savingFeaturedMeta) return;
    const rect = event.currentTarget.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    const x = Math.min(100, Math.max(0, Math.round(((event.clientX - rect.left) / rect.width) * 100)));
    const y = Math.min(100, Math.max(0, Math.round(((event.clientY - rect.top) / rect.height) * 100)));
    setFeaturedFocal({ x, y });
    const alt = featuredAlt.trim();
    const caption = featuredCaption.trim();
    void saveFeaturedMeta({ altText: alt === '' ? null : alt, caption: caption === '' ? null : caption, focalX: x, focalY: y });
  };

  /**
   * Publish a freshly created article across every target portal.
   *
   * @param articleId - Id of the article the create call just persisted.
   * @param scheduled - True when the article carries a future publish time.
   * @param scheduledAt - ISO publish time for a scheduled article.
   * @returns Nothing; the toast carries the outcome.
   *
   * @remarks `siteIds` is capped per command, so a network with more apex
   * portals than the cap has to be split into as many batches as it takes.
   * Every portal carries the canonical title/description unchanged.
   *
   * The article exists before any of this runs, so a failure leaves it publishable
   * from the queue rather than losing the writing.
   */
  const publishCreatedArticle = async (articleId: string, scheduled: boolean, scheduledAt: string | null | undefined, backdateIso: string | null, initialViews: number | null) => {
    if (command === undefined) {
      toast.error('Artikel tersimpan, tetapi perintah publikasi tidak tersedia di layar ini.');
      return;
    }
    if (targetSiteIds.length === 0) {
      toast.error('Artikel tersimpan, tetapi tidak ada portal aktif untuk ditayangkan.');
      return;
    }
    const batches = chunkPublicationTargets(targetSiteIds);
    const idempotencyPrefix = crypto.randomUUID();
    let dispatched = 0;
    let viewsFailed = 0;
    const progress = beginActionProgress(`Mengirim ke ${targetSiteIds.length.toLocaleString('id-ID')} portal…`);
    try {
      for (const [index, batch] of batches.entries()) {
        await command('publication.request', {
          articleId,
          siteIds: batch,
          idempotencyKey: `${idempotencyPrefix}:${index}`,
          options: { mode: scheduled ? 'scheduled' : 'immediate' },
          publishAt: scheduled ? (scheduledAt ?? null) : (backdateIso ?? null),
          overrides: {},
        });
        dispatched += batch.length;
        progress.step(`Terkirim ke ${dispatched.toLocaleString('id-ID')} dari ${targetSiteIds.length.toLocaleString('id-ID')} portal…`);
        if (initialViews !== null) {
          try {
            const seeded = (await command('article.sites.views.setMany', { articleId, siteIds: batch, viewCount: initialViews })) as {
              readonly missing?: unknown;
            } | null;
            viewsFailed += Array.isArray(seeded?.missing) ? seeded.missing.length : batch.length;
          } catch {
            viewsFailed += batch.length;
          }
        }
      }
      const viewsNote = viewsFailed > 0
        ? ` ${viewsFailed.toLocaleString('id-ID')} portal gagal diisi tayangan awal — atur manual dari Hasil Tayang.`
        : '';
      progress.succeed(
        scheduled
          ? `Terjadwal ke ${dispatched.toLocaleString('id-ID')} portal.${viewsNote}`
          : `Dikirim ke ${dispatched.toLocaleString('id-ID')} portal. Buka Hasil Tayang untuk menyalin URL.${viewsNote}`,
      );
    } catch {
      progress.fail(
        dispatched === 0
          ? 'Artikel tersimpan, tetapi gagal ditayangkan. Coba lagi dari Antrean Penerbitan.'
          : `Artikel tersimpan dan ${dispatched.toLocaleString('id-ID')} portal sudah masuk antrean, sisanya gagal. Periksa Antrean Penerbitan.`,
      );
    }
  };

  const handleCreateArticle = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const rawSchedule = rawScheduleInput;
    const title = titleText.trim();
    if (title === '') {
      toast.error('Isi judul artikel dulu.');
      return;
    }
    const slugValue = slug.trim();
    if (slugValue === '') {
      toast.error('Isi slug URL dulu.');
      return;
    }
    if (!/^[a-z0-9-]+$/.test(slugValue)) {
      toast.error('Slug hanya boleh huruf kecil, angka, dan strip.');
      return;
    }
    if (provinceId === null && !nationalActive) {
      toast.error('Pilih wilayah dulu.');
      return;
    }
    if (bodyJsonProblem !== null) {
      setMode('tulis');
      toast.error(`Isi artikel ditolak: ${bodyJsonProblem}`);
      return;
    }
    if (status === 'scheduled' && rawSchedule === '') {
      toast.error('Isi jadwal terbit dulu untuk status Terjadwal.');
      return;
    }
    const scheduledAt = status === 'scheduled' ? localDateTimeToIso(rawSchedule) : undefined;
    if (status === 'scheduled' && scheduledAt === null) {
      toast.error('Jadwal terbit tidak valid.');
      return;
    }
    let backdateIso: string | null = null;
    if (status === 'active' && rawPublishDateInput.trim() !== '') {
      backdateIso = localDateTimeToIso(rawPublishDateInput);
      if (backdateIso === null) {
        toast.error('Tanggal terbit tidak valid.');
        return;
      }
      if (new Date(backdateIso).getTime() > Date.now()) {
        toast.error('Tanggal terbit masa depan — gunakan status Terjadwal.');
        return;
      }
    }
    let initialViews: number | null = null;
    if (viewsInput.trim() !== '') {
      const parsedViews = Number(viewsInput.trim());
      if (!Number.isInteger(parsedViews) || parsedViews < 0 || parsedViews > 1_000_000_000) {
        toast.error('Tayangan awal harus angka 0 sampai 1.000.000.000.');
        return;
      }
      initialViews = parsedViews;
    }
    const trimmedBody = bodyText.trim();
    if (trimmedBody === '') {
      toast.error('Isi artikel masih kosong. Tulis dulu di tab Tulis.');
      return;
    }

    startSubmitTransition(async () => {
      const payloadSlug = slugValue;
      const categoryIds = await persistPendingCategories(effectiveCategoryIds);
      if (categoryIds === null) {
        toast.error('Kategori baru belum tersimpan. Periksa kategori yang ditandai, lalu coba Simpan lagi.');
        return;
      }
      const payload = buildArticlePayload({ ...formSnapshot, status, rawSchedule }, categoryIds);
      let created: { readonly id?: string; readonly slug?: string } | null;
      try {
        created = await onSubmit(payload) as { readonly id?: string; readonly slug?: string };
      } catch (error) {
        // The article may already exist server-side, so keep the draft instead
        // of clearing the form and reporting a rollback that never happened.
        toast.error(error instanceof Error && error.message !== '' ? error.message : 'Artikel gagal disimpan.');
        return;
      }
      if (created === null) {
        toast.warning('Penyimpanan dibatalkan karena organisasi aktif berubah. Tulis ulang bila perlu.');
        return;
      }
      if (typeof created.slug === 'string' && created.slug !== payloadSlug) {
        toast.info(`Slug "${payloadSlug}" sudah dipakai — disimpan sebagai "${created.slug}".`);
      }
      if (willPublish && typeof created.id === 'string') {
        await publishCreatedArticle(created.id, status === 'scheduled', scheduledAt, backdateIso, initialViews);
      }
      form.reset();
      setSlug('');
      setSlugTouched(false);
      setStatus('draft');
      setCategoryIds([]);
      setExtraCategories([]);
      setPublisherId(null);
      setProvinceId(null);
      setCityId(null);
      setIsNational(false);
      touchedAuthor.current = false;
      setAuthorId(defaultAuthorId);
      setTitleText('');
      setDescriptionText('');
      setMode('tulis');
      setBodyText('');
      setSource('');
      setCanonicalUrl('');
      setTags([]);
      setRawScheduleInput('');
      setRawPublishDateInput('');
      setViewsInput('');
      setFeaturedId(null);
      setFeaturedName('');
      setFeaturedPreviewUrl(null);
      setFeaturedStatus(null);
      setFeaturedVersion(null);
      setFeaturedAlt('');
      setFeaturedCaption('');
      setFeaturedFocal(null);
      coverBlobRef.current = null;
      coverRemoteRef.current = null;
      setCoverUrl('');
      setBodyJsonDraft(null);
      setRichResetKey((key) => key + 1);
    });
  };

  return (
    <form noValidate onSubmit={handleCreateArticle}>
      <div className="sticky top-[60px] z-20 mb-6 flex flex-wrap items-center gap-3 rounded-lg border border-hairline bg-bg/95 px-4 py-2.5 shadow-lg backdrop-blur">
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
          <DateTimeField
            value={rawScheduleInput}
            onChange={setRawScheduleInput}
            disabled={isSubmitting}
            ariaLabel="Jadwal terbit"
            mode="future"
          />
        ) : null}
        {status === 'active' ? (
          <DateTimeField
            value={rawPublishDateInput}
            onChange={setRawPublishDateInput}
            disabled={isSubmitting}
            ariaLabel="Tanggal terbit"
            mode="past"
          />
        ) : null}
        <AppTooltip label={`Judul ${titleText.length}/60 · Deskripsi ${descriptionText.length}/160`}>
          <span className="flex items-center gap-1.5">
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
        </AppTooltip>
        <span className="flex items-center gap-2">
          <Checkbox
            id={publishOnSaveId}
            checked={publishOnSave}
            onCheckedChange={(checked) => setPublishOnSave(checked === true)}
            disabled={isSubmitting}
            className="border-hairline-strong data-checked:border-brass data-checked:bg-brass data-checked:text-bg"
          />
          <Label htmlFor={publishOnSaveId} className="font-mono text-[10px] uppercase tracking-wider text-paper-faint">
            Tayang otomatis
          </Label>
        </span>
        {willPublish ? (
          <span className="font-mono text-[11px] tabular-nums text-paper-faint">
            {targetSiteIds.length.toLocaleString('id-ID')} {targetLabel}
          </span>
        ) : null}
        <span className="flex-1" />
        <Button type="submit" variant="default" disabled={isSubmitting}>
          {isSubmitting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          ) : (
            <Send className="h-3.5 w-3.5" aria-hidden="true" />
          )}
          <span>{(willPublish ? PUBLISH_ON_SAVE_LABELS[status] : SUBMIT_LABELS[status]) ?? 'Simpan Artikel'}</span>
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
                value={titleText}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="Tulis tajuk berita di sini…"
                className="h-11 rounded-lg border-hairline-strong bg-bg px-3.5 font-serif text-lg font-semibold tracking-tight text-paper transition-colors duration-180 placeholder:font-sans placeholder:text-sm placeholder:font-normal hover:border-hairline focus-visible:border-brass focus-visible:ring-brass"
              />
              <div className="flex items-baseline justify-between gap-2">
                <FieldDescription className="font-mono text-[11px] text-paper-faint">
                  ±60 karakter tampil penuh sebagai judul di hasil cari; selebihnya bisa terpotong mengikuti lebar layar.
                </FieldDescription>
                <span className="flex flex-none items-center gap-2">
                  <AppTooltip label="Sempurnakan judul dengan AI">
                    <AiActionButton
                      busy={aiAction === 'title'}
                      idleLabel="Sempurnakan"
                      icon={Sparkles}
                      size="xs"
                      tone="primary"
                      disabled={!aiReady || titleText.trim() === ''}
                      onClick={() => refineTitles('title')}
                      ariaLabel="Sempurnakan judul"
                    />
                  </AppTooltip>
                  <span
                    aria-live="polite"
                    className={`font-mono text-[11px] tabular-nums ${titleText.length === 0 ? 'text-paper-faint' : titleText.length <= 60 ? 'text-signal' : titleText.length <= 100 ? 'text-brass' : 'text-error'}`}
                  >
                    {titleText.length}/60
                  </span>
                </span>
              </div>
              {generatingTitles && titleVariants === null ? <AiPending label="Menyusun varian judul" rows={[100, 80]} /> : null}
              {titleVariants !== null ? (
                <div className="space-y-2">
                  <div className="overflow-hidden rounded-lg border border-hairline">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-b border-hairline hover:bg-transparent">
                          <TableHead className="w-8 px-2 py-1.5 font-mono text-[10px] font-medium uppercase tracking-wider text-paper-faint">No</TableHead>
                          <TableHead className="px-2 py-1.5 font-mono text-[10px] font-medium uppercase tracking-wider text-paper-faint">Varian judul</TableHead>
                          <TableHead className="w-16 px-2 py-1.5 font-mono text-[10px] font-medium uppercase tracking-wider text-paper-faint">Panjang</TableHead>
                          <TableHead className="w-20 px-2 py-1.5 text-right font-mono text-[10px] font-medium uppercase tracking-wider text-paper-faint">Aksi</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {titleVariants.map((item, index) => (
                          <TableRow key={item} className="border-b border-hairline align-top last:border-0">
                            <TableCell className="px-2 py-1.5 align-top font-mono text-[11px] tabular-nums text-paper-faint">{index + 1}</TableCell>
                            <TableCell className="px-2 py-1.5 align-top">
                              <p className="m-0 line-clamp-2 break-words font-sans text-xs leading-relaxed text-paper">{item}</p>
                            </TableCell>
                            <TableCell className="px-2 py-1.5 align-top">
                              <span className={`font-mono text-[11px] tabular-nums ${item.length <= 60 ? 'text-signal' : item.length <= 100 ? 'text-brass' : 'text-error'}`}>
                                {item.length}/60
                              </span>
                            </TableCell>
                            <TableCell className="px-2 py-1.5 text-right align-top">
                              <Button type="button" variant="outline" size="xs" onClick={() => handleTitleChange(item)}>
                                <span>Pakai</span>
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <AppTooltip label="Minta varian judul lain">
                    <AiActionButton
                      busy={aiAction === 'title-variants'}
                      idleLabel="Buat ulang varian"
                      icon={RefreshCw}
                      size="xs"
                      disabled={!aiReady}
                      onClick={() => refineTitles('title-variants')}
                    />
                  </AppTooltip>
                </div>
              ) : null}
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
                  maxLength={SLUG_MAX_LENGTH}
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
                <span className="flex flex-none items-center gap-2">
                  <AppTooltip
                    label={descriptionText.trim() === ''
                      ? 'Buatkan deskripsi dari judul dan isi dengan AI'
                      : 'Sempurnakan deskripsi yang ada dengan AI'}
                  >
                    <AiActionButton
                      busy={aiAction === 'description'}
                      idleLabel={descriptionText.trim() === '' ? 'Buatkan' : 'Sempurnakan'}
                      icon={Sparkles}
                      size="xs"
                      tone="primary"
                      disabled={!aiReady || (titleText.trim() === '' && bodyText.trim() === '' && descriptionText.trim() === '')}
                      onClick={refineDescription}
                      ariaLabel={descriptionText.trim() === '' ? 'Buatkan deskripsi' : 'Sempurnakan deskripsi'}
                    />
                  </AppTooltip>
                <span
                  aria-live="polite"
                  className={`font-mono text-[11px] tabular-nums ${descriptionText.length === 0 ? 'text-paper-faint' : descriptionText.length < 120 ? 'text-brass' : descriptionText.length <= 160 ? 'text-signal' : 'text-error'}`}
                >
                  {descriptionText.length === 0 ? 'auto' : `${descriptionText.length}/160`}
                </span>
                </span>
              </div>
              <Textarea
                id={excerptInputId}
                name="excerpt"
                disabled={isSubmitting}
                value={descriptionText}
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
                    <AppTooltip key={tab.value} label={tab.tip} side="top">
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
                    </AppTooltip>
                  ))}
                </div>
              </div>
              <p className="m-0 font-mono text-[11px] text-paper-faint" role="note">
                {MODE_HINTS[mode]}
              </p>
              <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-hairline/70 bg-bg px-2 py-1.5" aria-label="Bantuan AI untuk isi">
                <span className="mr-1 flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-paper-faint">
                  <Sparkles className="h-3 w-3 text-brass" aria-hidden="true" />
                  <span>AI</span>
                </span>
                <AppTooltip label="Poles alur dan EYD isi dengan AI tanpa mengubah fakta">
                  <AiActionButton
                    busy={aiAction === 'polish'}
                    idleLabel={polishRounds === 0 ? 'Poles isi' : 'Poles ulang'}
                    icon={WandSparkles}
                    size="xs"
                    tone="primary"
                    disabled={!aiReady || bodyText.trim() === ''}
                    onClick={polishBodyInline}
                  />
                </AppTooltip>
                <AppTooltip label="Transkripsikan rekaman menjadi berita lengkap siap isi formulir">
                  <AiActionButton
                    busy={aiAction === 'transcribe'}
                    idleLabel="Audio jadi berita"
                    icon={Newspaper}
                    size="xs"
                    disabled={!aiReady}
                    onClick={() => document.getElementById(transcribeFullInputId)?.click()}
                  />
                </AppTooltip>
                <input
                  id={transcribeFullInputId}
                  type="file"
                  accept="audio/*"
                  className="sr-only"
                  aria-label="Pilih berkas audio untuk dijadikan berita"
                  onChange={(event) => {
                    transcribeFileInline(event.target.files?.[0] ?? null);
                    event.target.value = '';
                  }}
                />
              </div>
              {bodyJsonProblem === null ? null : (
                <p className="m-0 font-mono text-[11px] text-error" role="alert">
                  {bodyJsonProblem}
                </p>
              )}
              {aiAction === 'polish' && polished === '' ? <AiPending label="Memoles alur dan EYD" /> : null}
              {polished !== '' ? (
                <div className="space-y-1.5 rounded border border-hairline bg-bg p-2.5">
                  <p className="m-0 font-sans text-xs font-medium text-paper">
                    Isi poles{polishRounds > 1 ? ` (ronde ${polishRounds})` : ''} — tinjau sebelum diterapkan
                  </p>
                  <p className="m-0 max-h-40 overflow-auto whitespace-pre-wrap font-sans text-xs leading-relaxed text-paper-dim">
                    {polished.slice(0, 1200)}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    <Button type="button" variant="outline" size="xs" onClick={() => { applyPolishedBody(polished); setPolished(''); }}>
                      <span>Terapkan ke isi</span>
                    </Button>
                    <Button type="button" variant="ghost" size="xs" onClick={() => setPolished('')}>
                      <span>Buang</span>
                    </Button>
                  </div>
                </div>
              ) : null}
              {mode === 'tulis' ? (
                <RichTextEditor
                  key={richResetKey}
                  initialDoc={bodyJsonDraft}
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
              {willPublish ? (
                <div className="space-y-1.5">
                  <Label htmlFor={viewsInputId} className="font-mono text-xs text-paper-dim">
                    Tayangan awal per portal (opsional)
                  </Label>
                  <div className="flex h-8 items-center rounded border border-hairline-strong bg-bg transition-colors duration-180 hover:border-hairline focus-within:border-brass">
                    <input
                      id={viewsInputId}
                      name="initialViews"
                      inputMode="numeric"
                      disabled={isSubmitting}
                      value={viewsInput}
                      onChange={(e) => setViewsInput(e.target.value.replace(/[^0-9]/g, '').slice(0, 10))}
                      placeholder="cth: 2500 — kosong mengikuti seeding bawaan"
                      aria-label="Tayangan awal (opsional — kosong mengikuti logika seeding)"
                      className="h-full min-w-0 flex-1 bg-transparent px-2.5 font-mono text-xs text-paper outline-none placeholder:text-paper-faint"
                    />
                    <span aria-hidden="true" className="h-5 w-px flex-none bg-hairline-strong" />
                    <AppTooltip label="Kurangi 100" side="top">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        disabled={isSubmitting}
                        onClick={() => bumpViews(-100)}
                        aria-label="Kurangi tayangan awal"
                        className="flex-none rounded-none"
                      >
                        <Minus className="h-3.5 w-3.5" aria-hidden="true" />
                      </Button>
                    </AppTooltip>
                    <span aria-hidden="true" className="h-5 w-px flex-none bg-hairline-strong" />
                    <AppTooltip label="Tambah 100" side="top">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        disabled={isSubmitting}
                        onClick={() => bumpViews(100)}
                        aria-label="Tambah tayangan awal"
                        className="flex-none rounded-none"
                      >
                        <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                      </Button>
                    </AppTooltip>
                  </div>
                  <p className="m-0 font-mono text-[11px] text-paper-faint">
                    Dikosongkan: tayangan awal mengikuti logika seeding (1000–12000 acak). Diisi: angka ini dipakai apa adanya.
                  </p>
                </div>
              ) : null}
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
              {isUnrestricted ? (
                <div className="flex items-start gap-2 rounded border border-hairline bg-bg p-2.5">
                  <Checkbox
                    id={nationalCheckId}
                    checked={isNational}
                    onCheckedChange={(checked) => {
                      const next = checked === true;
                      setIsNational(next);
                      if (next) {
                        setProvinceId(null);
                        setCityId(null);
                      }
                    }}
                    disabled={isSubmitting}
                    className="mt-0.5 border-hairline-strong data-checked:border-brass data-checked:bg-brass data-checked:text-bg"
                  />
                  <div className="min-w-0 space-y-0.5">
                    <Label htmlFor={nationalCheckId} className="font-mono text-xs text-paper">
                      Nasional — semua apex utama
                    </Label>
                    <p className="m-0 font-mono text-[11px] leading-relaxed text-paper-faint">
                      Tayang ke semua portal apex tanpa memilih wilayah; portal region dan kota tidak ikut.
                    </p>
                  </div>
                </div>
              ) : null}
              {nationalActive ? null : (
              <div className="space-y-1.5">
                <Label htmlFor={regionSelectId} className="font-mono text-xs text-paper-dim">
                  Wilayah
                </Label>
                <SearchCombobox
                  id={regionSelectId}
                  name="provinceId"
                  required
                  disabled={isSubmitting}
                  placeholder="Pilih wilayah"
                  value={provinceId ?? ''}
                  onValueChange={(next) => {
                    setProvinceId(next);
                    setCityId(null);
                  }}
                  options={regionOptions}
                />
              </div>
              )}

              {nationalActive || provinceId === null ? null : (
                <div className="space-y-1.5">
                  <Label htmlFor={citySelectId} className="font-mono text-xs text-paper-dim">
                    Kota / kabupaten
                  </Label>
                  <SearchCombobox
                    id={citySelectId}
                    name="cityId"
                    disabled={isSubmitting}
                    allowEmpty
                    emptyLabel="Semua kota di wilayah ini"
                    placeholder={cityOptions.length === 0 ? 'Wilayah ini belum punya kota' : 'Pilih kota'}
                    value={cityId ?? ''}
                    onValueChange={setCityId}
                    options={cityOptions}
                  />
                </div>
              )}

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
                <div className="flex items-baseline justify-between gap-2">
                  <Label htmlFor={categoryInputId} className="font-mono text-xs text-paper-dim">
                    Kategori ({effectiveCategoryIds.length} dipilih{effectiveCategoryIds.length === categoryIds.length || defaultCategoryName === null ? '' : ` · ${defaultCategoryName}`})
                  </Label>
                  <AppTooltip label="Isi kategori dan topik otomatis dari isi dengan AI" side="left">
                    <AiActionButton
                      busy={aiAction === 'classify'}
                      idleLabel="Lengkapi otomatis"
                      icon={Tags}
                      size="xs"
                      tone="primary"
                      disabled={!aiReady || bodyText.trim() === ''}
                      onClick={classifyInline}
                    />
                  </AppTooltip>
                </div>
                {aiAction === 'classify' ? <AiPending label="Mengklasifikasi kategori dan tag" rows={[100, 72]} /> : null}
                <p className="m-0 font-mono text-[11px] text-paper-faint">
                  Ketik untuk mencari; bila tidak ada, tekan Enter atau tombol tambah di dalam daftar — kategori baru disimpan ke server hanya saat artikel disimpan. Boleh lebih dari satu; yang pertama jadi kategori utama. Wajib — tanpa pilihan, artikel memakai{defaultCategoryName === null ? ' kategori bawaan tenant' : ` “${defaultCategoryName}”`}.
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
                  value={tags}
                  onValueChange={setTags}
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
                        onClick={() => { coverBlobRef.current = null; coverRemoteRef.current = null; setFeaturedId(null); setFeaturedName(''); setFeaturedPreviewUrl(null); setFeaturedVersion(null); setFeaturedAlt(''); setFeaturedCaption(''); setFeaturedFocal(null); }}
                        disabled={isSubmitting || uploadingFeatured}
                      >
                        <span>Hapus</span>
                      </Button>
                    </div>
                    {featuredPreviewUrl !== null ? (
                      <div className="space-y-1.5">
                        <button
                          type="button"
                          onClick={handleFocalPick}
                          disabled={isSubmitting || uploadingFeatured || savingFeaturedMeta}
                          aria-label="Pilih titik fokus sampul"
                          className="relative block w-full cursor-crosshair overflow-hidden rounded border border-hairline"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element -- dashboard preview only; public delivery uses EditorialImage */}
                          <img
                            src={featuredPreviewUrl}
                            alt={`Pratinjau ${featuredName}`}
                            className="max-h-40 w-full object-cover"
                            {...(featuredFocal === null ? {} : { style: { objectPosition: `${featuredFocal.x}% ${featuredFocal.y}%` } })}
                          />
                          {featuredFocal === null ? null : (
                            <span
                              aria-hidden="true"
                              className="absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-brass/80"
                              style={{ left: `${featuredFocal.x}%`, top: `${featuredFocal.y}%` }}
                            />
                          )}
                        </button>
                        <p className="m-0 font-mono text-[11px] text-paper-faint">
                          {featuredFocal === null ? 'Klik pratinjau untuk menentukan titik fokus crop.' : `Fokus ${featuredFocal.x}%, ${featuredFocal.y}% — klik lagi untuk mengubah.`}
                        </p>
                      </div>
                    ) : null}
                    <div className="space-y-1.5">
                      <Label htmlFor={`${featuredFileId}-alt`} className="font-mono text-xs text-paper-dim">
                        Teks alt sampul
                      </Label>
                      <Input
                        id={`${featuredFileId}-alt`}
                        value={featuredAlt}
                        onChange={(e) => setFeaturedAlt(e.target.value)}
                        disabled={isSubmitting || uploadingFeatured || savingFeaturedMeta}
                        placeholder="cth: Suasana pasar pagi"
                        maxLength={300}
                        className="h-8 rounded border-hairline-strong bg-bg px-2.5 font-sans text-xs text-paper transition-colors duration-180 hover:border-hairline focus-visible:ring-brass"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor={`${featuredFileId}-caption`} className="font-mono text-xs text-paper-dim">
                        Keterangan sampul (opsional)
                      </Label>
                      <Input
                        id={`${featuredFileId}-caption`}
                        value={featuredCaption}
                        onChange={(e) => setFeaturedCaption(e.target.value)}
                        disabled={isSubmitting || uploadingFeatured || savingFeaturedMeta}
                        placeholder="cth: Suasana pasar pagi di Wonosobo"
                        maxLength={500}
                        className="h-8 rounded border-hairline-strong bg-bg px-2.5 font-sans text-xs text-paper transition-colors duration-180 hover:border-hairline focus-visible:ring-brass"
                      />
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <AppTooltip label="Susun teks alt dan caption dari gambar sampul dengan AI">
                        <AiActionButton
                          busy={aiAction === 'caption'}
                          idleLabel="Isi otomatis"
                          icon={Sparkles}
                          size="xs"
                          tone="primary"
                          disabled={!aiReady || featuredId === null}
                          onClick={captionCoverInline}
                          ariaLabel="Isi alt dan caption otomatis"
                        />
                      </AppTooltip>
                      {aiAction === 'caption' ? <AiPending label="Menyusun alt dan caption" /> : null}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="xs"
                      onClick={handleFeaturedMetaSave}
                      disabled={isSubmitting || uploadingFeatured || savingFeaturedMeta}
                      className="w-full"
                    >
                      <span>{savingFeaturedMeta ? 'Menyimpan...' : 'Simpan metadata sampul'}</span>
                    </Button>
                    <p className="m-0 break-all font-mono text-[11px] text-paper-faint">
                      {`/api/network/media/${featuredId}`}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-1.5">
                      <Button
                        type="button"
                        variant="outline"
                        size="xs"
                        disabled={isSubmitting || uploadingFeatured}
                        className="flex-1"
                        onClick={() => document.getElementById(featuredFileId)?.click()}
                      >
                        <ImagePlus className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>{uploadingFeatured ? 'Mengunggah...' : 'Pilih gambar...'}</span>
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="xs"
                        disabled={isSubmitting || uploadingFeatured}
                        className="flex-1"
                        onClick={openLibrary}
                        aria-expanded={libraryOpen}
                      >
                        <Images className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>{libraryOpen ? 'Tutup pustaka' : 'Pilih dari pustaka...'}</span>
                      </Button>
                    </div>
                    {libraryOpen ? (
                      <div className="space-y-2 rounded border border-hairline bg-bg p-2.5">
                        <Input
                          id={librarySearchInputId}
                          type="search"
                          value={libraryQuery}
                          onChange={(event) => { setLibraryQuery(event.target.value); setLibraryShown(LIBRARY_PAGE); }}
                          placeholder="Cari gambar di pustaka..."
                          aria-label="Cari gambar di pustaka"
                          className="h-8 rounded border-hairline-strong bg-bg-raised px-2.5 font-mono text-xs text-paper focus-visible:ring-brass"
                        />
                        {libraryLoading ? (
                          <p className="m-0 font-mono text-[11px] text-paper-faint">Memuat pustaka…</p>
                        ) : libraryError !== null ? (
                          <p className="m-0 font-mono text-[11px] text-error" role="alert">{libraryError}</p>
                        ) : libraryFiltered.length === 0 ? (
                          <p className="m-0 font-mono text-[11px] text-paper-faint">
                            {libraryItems === null ? 'Pustaka belum dimuat.' : 'Tidak ada gambar yang cocok. Unggah baru atau ubah kata kunci.'}
                          </p>
                        ) : (
                          <>
                            <div className="grid max-h-64 grid-cols-3 gap-1.5 overflow-y-auto">
                              {libraryVisible.map((item) => {
                                const preview = libraryPreviews[item.id];
                                return (
                                  <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => pickLibraryCover(item)}
                                    aria-label={`Pilih ${fileNameOf(item.objectKey)} sebagai sampul`}
                                    className="group min-w-0 overflow-hidden rounded border border-hairline bg-bg-raised text-left transition-colors duration-180 hover:border-brass"
                                  >
                                    {preview === undefined ? (
                                      <span className="flex h-20 items-center justify-center gap-1 bg-bg px-1">
                                        <ImageIcon className="h-4 w-4 flex-none text-paper-faint" aria-hidden="true" />
                                        <span className="truncate font-mono text-[10px] text-paper-faint">{formatBytes(item.sizeBytes)}</span>
                                      </span>
                                    ) : (
                                      // eslint-disable-next-line @next/next/no-img-element -- dashboard preview only; public delivery uses EditorialImage
                                      <img src={preview} alt={fileNameOf(item.objectKey)} className="h-20 w-full object-cover" />
                                    )}
                                    <span className="block truncate px-1.5 py-1 font-mono text-[10px] text-paper-dim">
                                      {fileNameOf(item.objectKey)}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                            <p className="m-0 font-mono text-[11px] tabular-nums text-paper-faint">
                              {libraryVisible.length.toLocaleString('id-ID')} dari {libraryFiltered.length.toLocaleString('id-ID')} gambar
                            </p>
                            {libraryVisible.length < libraryFiltered.length ? (
                              <Button
                                type="button"
                                variant="ghost"
                                size="xs"
                                onClick={() => setLibraryShown((shown) => shown + LIBRARY_PAGE)}
                                className="w-full"
                              >
                                <span>Tampilkan {(libraryFiltered.length - libraryVisible.length).toLocaleString('id-ID')} lagi</span>
                              </Button>
                            ) : null}
                          </>
                        )}
                      </div>
                    ) : null}
                  </div>
                )}
                <input
                  id={featuredFileId}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/avif,.heic,.heif"
                  data-testid="featured-file-input"
                  className="hidden"
                  disabled={isSubmitting || uploadingFeatured}
                  onChange={(event) => void handleFeaturedFile(event)}
                />
                {featuredStatus !== null ? (
                  <p className="m-0 font-mono text-[11px] text-paper-faint">{featuredStatus}</p>
                ) : (
                  <p className="m-0 font-mono text-[11px] text-paper-faint">
                    JPEG, PNG, WebP, AVIF, atau HEIC · maks {formatBytes(COVER_COMPRESS.maxSourceBytes)} · dikompresi otomatis ke WebP
                  </p>
                )}
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
                  // eslint-disable-next-line @next/next/no-img-element -- dashboard preview only; public delivery uses EditorialImage
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
                  disabled={isSubmitting}
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  placeholder="cth: Rilis Resmi Dinas Kominfo Wonosobo"
                  className="h-8 rounded border-hairline-strong bg-bg px-2.5 font-sans text-xs text-paper transition-colors duration-180 hover:border-hairline focus-visible:ring-brass"
                />
                <p className="m-0 font-mono text-[11px] text-paper-faint">
                  Opsional. Kosongkan bila atribusi mengikuti penulis atau penerbit.
                </p>
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
                  value={canonicalUrl}
                  onChange={(e) => setCanonicalUrl(e.target.value)}
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
