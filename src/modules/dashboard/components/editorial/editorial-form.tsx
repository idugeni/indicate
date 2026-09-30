'use client';

import { useEffect, useId, useMemo, useRef, useState, useTransition, type ChangeEvent, type FormEvent, type MouseEvent as ReactMouseEvent } from 'react';
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
import { Checkbox } from '@/components/ui/checkbox';
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
import { findMatchingCategoryId, localDateTimeToIso } from '@/modules/dashboard/components/shared/form-utils';
import { slugify } from '@/modules/site/slugify';
import { DEFAULT_CATEGORY_SLUG } from '@/modules/dashboard/models';
import { SLUG_MAX_LENGTH, TAG_MAX_COUNT, normalizeTagList } from '@/modules/site/slug-allocator';
import type { TipTapDoc, TipTapNode } from '@/modules/site/tiptap-document';
import { isTipTapDoc, tiptapToText, TIPTAP_MAX_NODES } from '@/modules/site/tiptap-document';
import { describeBodyJsonProblem } from '@/modules/dashboard/components/editorial/body-json-diagnostics';
import {
  buildArticlePayload,
  buildAutosavePayload,
  persistDraftArticle,
  type AutosavedDraft,
} from '@/modules/dashboard/components/editorial/article-persistence';
import {
  clearArticleDraft,
  readArticleDraft,
  useArticleDraftMirror,
  type ArticleDraft,
} from '@/modules/dashboard/components/editorial/use-article-draft';
import { ArticlePreview } from '@/modules/dashboard/components/editorial/article-preview';
import { RichTextEditor } from '@/modules/dashboard/components/editorial/rich-text-editor';
import { AiDraftAssist, type EditorialDraft } from '@/modules/ai/components/ai-draft-assist';
import { AiSeoAssist, type SeoApplySelection } from '@/modules/ai/components/ai-seo-assist';
import { AiTtsPanel } from '@/modules/ai/components/ai-tts-panel';
import { AiTranscribePanel } from '@/modules/ai/components/ai-transcribe-panel';
import { uploadEditorImage } from '@/modules/dashboard/components/editorial/editor-image-upload';
import { chunkPublicationTargets, selectPublicationTargets } from '@/modules/dashboard/components/editorial/publication-batch';
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

/**
 * Jeda autosave ke server.
 *
 * @remarks Sengaja 60 detik, bukan 15. Setiap `article.update` menulis satu baris
 * `audit_logs`, jadi autosave 15 detik berarti sekitar 240 baris audit per jam
 * per editor. `audit_logs` sudah tercatat sebagai tabel besar yang pembacaannya
 * belum seluruhnya berbatas, jadi angka ini dipilih agar tidak memperbesar
 * masalah yang sedang ditangani, bukan agar terasa paling responsif.
 */
const AUTOSAVE_DEBOUNCE_MS = 60_000;

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
 * @param organizationId - Tenant pemilik draft. Kosong mematikan cermin `localStorage`;
 *   layar produksi selalu meneruskannya, dan kunci draft tidak pernah lintas tenant.
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
  readonly command?: (action: string, payload: unknown) => Promise<unknown>;
  readonly organizationId?: string | undefined;
}) {
  const model = data as {
    readonly regions?: readonly RegionEntity[];
    readonly publishers?: readonly PublisherEntity[];
    readonly categories?: readonly CategoryEntity[];
    readonly authors?: readonly AuthorEntity[];
    readonly articles?: readonly ArticleEntity[];
    readonly sites?: readonly PublishTargetSite[];
  } | null;

  const regionSelectId = useId();
  const citySelectId = useId();
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
  const [uploadingFeatured, setUploadingFeatured] = useState(false);
  const [featuredVersion, setFeaturedVersion] = useState<number | null>(null);
  const [featuredAlt, setFeaturedAlt] = useState('');
  const [featuredCaption, setFeaturedCaption] = useState('');
  const [featuredFocal, setFeaturedFocal] = useState<{ readonly x: number; readonly y: number } | null>(null);
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
  const [autosavedDraft, setAutosavedDraft] = useState<AutosavedDraft | null>(null);
  const [autosaveNotice, setAutosaveNotice] = useState<string | null>(null);
  const [rawScheduleInput, setRawScheduleInput] = useState('');
  const restoredDraftRef = useRef(false);

  const liveSites = useMemo(() => model?.sites ?? [], [model?.sites]);
  const publicationScope = useMemo<PublicationScope>(() => {
    const pickedCity = model?.regions?.find((region) => region.id === cityId);
    return pickedCity?.kind === 'city' ? { kind: 'city', regionId: pickedCity.id } : { kind: 'apex' };
  }, [model?.regions, cityId]);
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
  const serverCategoryIds = useMemo(
    () => effectiveCategoryIds.filter((id) => !id.startsWith(PENDING_CATEGORY_PREFIX)),
    [effectiveCategoryIds],
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

  const draftSnapshot = useMemo<ArticleDraft | null>(() => {
    if (organizationId === '') return null;
    const meaningful = titleText.trim() !== '' || bodyText.trim() !== '' || bodyJsonDraft !== null;
    return meaningful
      ? {
        version: 1,
        savedAt: new Date().toISOString(),
        slug,
        slugTouched,
        status,
        categoryIds,
        extraCategories,
        publisherId,
        authorId,
        provinceId,
        cityId,
        titleText,
        descriptionText,
        bodyText,
        bodyJson: bodyJsonDraft,
        source,
        canonicalUrl,
        coverUrl,
        tags,
        publishOnSave,
      }
      : null;
  }, [
    organizationId, titleText, bodyText, bodyJsonDraft, slug, slugTouched, status,
    categoryIds, extraCategories, publisherId, authorId, provinceId, cityId,
    descriptionText, source, canonicalUrl, coverUrl, tags, publishOnSave,
  ]);

  useEffect(() => {
    if (restoredDraftRef.current || organizationId === '') return;
    restoredDraftRef.current = true;
    const stored = readArticleDraft(organizationId);
    if (stored === null) return;
    /* eslint-disable react-hooks/set-state-in-effect -- one-time hydration restore, not a state sync loop. `localStorage` does not exist during SSR, so a lazy `useState` initializer would read `null` on the server and the stored draft on the client, producing a hydration mismatch. Reading browser storage once on mount is the only way to restore it without diverging the first render. */
    setSlug(stored.slug);
    setSlugTouched(stored.slugTouched);
    setStatus(stored.status);
    setCategoryIds(stored.categoryIds);
    setExtraCategories(stored.extraCategories);
    setPublisherId(stored.publisherId);
    setAuthorId(stored.authorId);
    setProvinceId(stored.provinceId);
    setCityId(stored.cityId);
    setTitleText(stored.titleText);
    setDescriptionText(stored.descriptionText);
    setBodyText(stored.bodyText);
    setBodyJsonDraft(isTipTapDoc(stored.bodyJson) ? stored.bodyJson : null);
    setSource(stored.source);
    setCanonicalUrl(stored.canonicalUrl);
    setCoverUrl(stored.coverUrl);
    setTags(stored.tags);
    setPublishOnSave(stored.publishOnSave);
    setRichResetKey((key) => key + 1);
    toast.info(`Draf artikel dipulihkan: "${stored.titleText.trim() === '' ? 'tanpa judul' : stored.titleText.trim()}".`);
  }, [organizationId]);

  // Declared after the restore effect on purpose: React runs effects in
  // declaration order, so the mirror must not be armed before the stored draft
  // has been read back into state.
  useArticleDraftMirror(organizationId, draftSnapshot);

  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const snapshotRef = useRef(formSnapshot);
  const autosavedRef = useRef(autosavedDraft);

  useEffect(() => {
    snapshotRef.current = formSnapshot;
  }, [formSnapshot]);
  useEffect(() => {
    autosavedRef.current = autosavedDraft;
  }, [autosavedDraft]);

  useEffect(() => {
    if (command === undefined || isSubmitting) return;
    if (buildAutosavePayload(formSnapshot, serverCategoryIds) === null) return;
    if (autosaveTimerRef.current !== null) clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = setTimeout(() => {
      autosaveTimerRef.current = null;
      void (async () => {
        const active = command;
        const payload = buildAutosavePayload(snapshotRef.current, serverCategoryIds);
        if (payload === null || active === undefined) return;
        const saved = await persistDraftArticle(active, payload, autosavedRef.current);
        if (saved === null) {
          setAutosaveNotice('Draf terakhir belum tersimpan ke server. Isi tetap aman di peramban ini.');
          return;
        }
        setAutosavedDraft(saved);
        setAutosaveNotice(`Draf tersimpan ${new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}.`);
      })();
    }, AUTOSAVE_DEBOUNCE_MS);
    return () => {
      if (autosaveTimerRef.current !== null) clearTimeout(autosaveTimerRef.current);
    };
  }, [formSnapshot, serverCategoryIds, command, isSubmitting]);

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

  const applyAiDraft = (draft: EditorialDraft) => {
    handleTitleChange(draft.title);
    if (draft.excerpt !== '') setDescriptionText(draft.excerpt);
    if (draft.content !== '') {
      void navigator.clipboard?.writeText(draft.content).catch(() => undefined);
      toast.info('Judul, slug, dan deskripsi terisi; isi draf tersalin — tempel ke editor.');
    } else {
      toast.success('Judul, slug, dan deskripsi terisi dari draf AI.');
    }
  };

  const applyAiSeo = (selection: SeoApplySelection) => {
    if (selection.title !== undefined && selection.title !== '') handleTitleChange(selection.title);
    if (selection.slug !== undefined && selection.slug !== '') handleSlugChange(selection.slug);
    const description = selection.metaDescription ?? selection.excerpt ?? '';
    if (description !== '') setDescriptionText(description);
    toast.success('Saran SEO diterapkan ke formulir.');
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
    setUploadingFeatured(true);
    setFeaturedStatus('Menganalisis & mengompresi gambar di perangkat…');
    try {
      const { mediaId, previewUrl, storedSrc, version, sizeBytes, savingsBytes } = await uploadEditorImage(file, { kind: 'organization' }, command, {
        purpose: 'article-cover',
        compress: COVER_COMPRESS,
        onConverting: () => setFeaturedStatus('Mengonversi HEIC ke JPEG di perangkat…'),
      });
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
   * @remarks Two server rules shape this. First, `siteIds` is capped per command,
   * so a network with more apex portals than the cap has to be split into as many
   * batches as it takes — the batch count therefore follows the live apex count
   * instead of a fixed number. Second, any multi-portal request must carry a
   * distinct title and description per portal, so each batch asks for suggested
   * variants first and sends them back as overrides; sending an empty override
   * map is rejected. Batches run in order because each one's suggestions are
   * computed against the variants the previous batch already claimed, which is
   * what keeps every portal's title unique across the whole fan-out.
   *
   * The article exists before any of this runs, so a failure leaves it publishable
   * from the queue rather than losing the writing.
   */
  const publishCreatedArticle = async (articleId: string, scheduled: boolean, scheduledAt: string | null | undefined) => {
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
    try {
      for (const [index, batch] of batches.entries()) {
        const suggested = (await command('publication.suggest', { articleId, siteIds: batch })) as {
          readonly overrides?: Readonly<Record<string, { readonly title?: string; readonly description?: string }>>;
        } | null;
        const overrides = suggested?.overrides ?? {};
        if (Object.keys(overrides).length !== batch.length) {
          throw new Error('Varian portal tidak lengkap untuk satu batch.');
        }
        await command('publication.request', {
          articleId,
          siteIds: batch,
          idempotencyKey: `${idempotencyPrefix}:${index}`,
          options: { mode: scheduled ? 'scheduled' : 'immediate' },
          publishAt: scheduled ? (scheduledAt ?? null) : null,
          overrides,
        });
        dispatched += batch.length;
      }
      toast.success(
        scheduled
          ? `Terjadwal ke ${dispatched.toLocaleString('id-ID')} portal.`
          : `Dikirim ke ${dispatched.toLocaleString('id-ID')} portal. Buka Hasil Tayang untuk menyalin URL.`,
      );
    } catch {
      toast.error(
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
    if (provinceId === null) {
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
        created = autosavedDraft !== null && command !== undefined
          ? await command('article.update', { ...payload, id: autosavedDraft.id, expectedVersion: autosavedDraft.version }) as { readonly id?: string; readonly slug?: string }
          : await onSubmit(payload) as { readonly id?: string; readonly slug?: string };
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
        await publishCreatedArticle(created.id, status === 'scheduled', scheduledAt);
      }
      if (organizationId !== '') clearArticleDraft(organizationId);
      form.reset();
      setSlug('');
      setSlugTouched(false);
      setStatus('draft');
      setCategoryIds([]);
      setExtraCategories([]);
      setPublisherId(null);
      setProvinceId(null);
      setCityId(null);
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
      setAutosavedDraft(null);
      setAutosaveNotice(null);
      setFeaturedId(null);
      setFeaturedName('');
      setFeaturedPreviewUrl(null);
      setFeaturedStatus(null);
      setFeaturedVersion(null);
      setFeaturedAlt('');
      setFeaturedCaption('');
      setFeaturedFocal(null);
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
            value={rawScheduleInput}
            onChange={(e) => setRawScheduleInput(e.target.value)}
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
        {autosaveNotice === null ? null : (
          <span className="font-mono text-[11px] text-paper-faint" aria-live="polite">
            {autosaveNotice}
          </span>
        )}
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
            <AiDraftAssist organizationId={organizationId} currentTitle={titleText} currentBody={bodyText} onDraft={applyAiDraft} />
            <AiSeoAssist organizationId={organizationId} currentTitle={titleText} currentBody={bodyText} onApply={applyAiSeo} />
            <AiTtsPanel organizationId={organizationId} sourceText={bodyText} />
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
              <p className="m-0 font-mono text-[11px] text-paper-faint" role="note">
                {MODE_HINTS[mode]}
              </p>
              {bodyJsonProblem === null ? null : (
                <p className="m-0 font-mono text-[11px] text-error" role="alert">
                  {bodyJsonProblem}
                </p>
              )}
              <AiTranscribePanel organizationId={organizationId} onTranscript={applyTranscript} />
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

              {provinceId === null ? null : (
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
                <Label htmlFor={categoryInputId} className="font-mono text-xs text-paper-dim">
                  Kategori ({effectiveCategoryIds.length} dipilih{effectiveCategoryIds.length === categoryIds.length || defaultCategoryName === null ? '' : ` · ${defaultCategoryName}`})
                </Label>
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
                        onClick={() => { setFeaturedId(null); setFeaturedName(''); setFeaturedPreviewUrl(null); setFeaturedVersion(null); setFeaturedAlt(''); setFeaturedCaption(''); setFeaturedFocal(null); }}
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
                          title="Klik untuk menentukan titik fokus crop"
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
