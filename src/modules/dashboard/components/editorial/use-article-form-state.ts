import { useEffect, useId, useMemo, useRef, useState, useTransition, type ChangeEvent, type FormEvent, type MouseEvent as ReactMouseEvent } from 'react';
import { toast } from 'sonner';
import { CaseSensitive, Clock, Image as ImageIcon, Pilcrow, Share2, Type } from 'lucide-react';
import type { DashboardCommand } from '@/modules/dashboard/command';
import { rankTags } from '@/modules/dashboard/components/shared/suggestion-cache';
import type {
  ArticleEntity,
  AuthorEntity,
  CategoryEntity,
  PublisherEntity,
  RegionEntity,
} from '@/modules/dashboard/components/shared/types';
import { findMatchingCategoryId, findPublisherHomeRegion, isoToLocalDateTimeInput, localDateTimeToIso } from '@/modules/dashboard/components/shared/form-utils';
import { slugify } from '@/modules/site/slugify';
import { DEFAULT_CATEGORY_SLUG } from '@/modules/dashboard/models';
import { TAG_MAX_COUNT } from '@/modules/site/slug-allocator';
import type { TipTapDoc, TipTapNode } from '@/modules/site/tiptap-document';
import { tiptapToText, TIPTAP_MAX_NODES } from '@/modules/site/tiptap-document';
import { describeBodyJsonProblem } from '@/modules/dashboard/components/editorial/body-json-diagnostics';
import { buildArticlePayload } from '@/modules/dashboard/components/editorial/article-persistence';
import { callAi } from '@/modules/ai/components/ai-client';
import { uploadEditorImage } from '@/modules/dashboard/components/editorial/editor-image-upload';
import { chunkPublicationTargets, selectPublicationTargets } from '@/modules/dashboard/components/editorial/publication-batch';
import { beginActionProgress } from '@/modules/dashboard/components/shared/action-progress';
import { useAiSlot } from '@/modules/dashboard/components/editorial/use-ai-slot';
import type { PublicationScope, PublishTargetSite } from '@/modules/dashboard/components/editorial/publication-batch';
import { COVER_COMPRESS, formatBytes } from '@/modules/publishing/compress-image';
import { describeArticleTypeProblem, normalizeArticleType, type ArticleType } from '@/modules/site/article-type';
import {
  ARTICLE_STATUS_OPTIONS,
  COVER_CAPTION_BYTES_MAX,
  COVER_CAPTION_MIME_ALLOWLIST,
  LIBRARY_PAGE,
  PENDING_CATEGORY_PREFIX,
  blobToDataUrl,
  collectInlineMediaIds,
  fileNameOf,
  findForeignMediaIds,
  toCoverLibraryItem,
  type CoverLibraryItem,
  type EditArticleInit,
} from '@/modules/dashboard/components/editorial/article-form-types';

/** Status yang bisa dipilih di composer; arsip dibuka sebagai draf dan disimpan eksplisit. */
const EDITABLE_ARTICLE_STATUSES: ReadonlySet<string> = new Set(
  ARTICLE_STATUS_OPTIONS.map((option) => option.value),
);

/**
 * Ambil daftar kandidat sampul dari pustaka media org aktif.
 *
 * @param orgId - Organisasi pemilik pustaka.
 * @returns Kandidat gambar aktif berversi.
 */
async function fetchCoverLibrary(orgId: string): Promise<readonly CoverLibraryItem[]> {
  const response = await fetch(
    `/api/dashboard/publishing?organizationId=${encodeURIComponent(orgId)}&view=media&limit=100`,
  );
  if (!response.ok) throw new Error('Gagal memuat pustaka media.');
  const body = (await response.json()) as { readonly media?: readonly unknown[] };
  return (Array.isArray(body.media) ? body.media : [])
    .map(toCoverLibraryItem)
    .filter((item): item is CoverLibraryItem => item !== null);
}

/**
 * Seluruh state dan aksi formulir tulis artikel sebagai satu hook.
 *
 * @param data - Opsi wilayah, penerbit, kategori, penulis, dan artikel existing untuk saran tag.
 * @param onSubmit - Menyimpan article.create; media upload memakai command opsional.
 * @param command - Perintah workspace untuk unggah media editor kaya; tanpa ini unggahan gagal eksplisit.
 * @param organizationId - Tenant pemilik permintaan AI; kosong mematikan fitur AI.
 * @param initialArticle - Artikel existing untuk mode ubah; tanpa ini berarti mode buat baru.
 * @param onEditSaved - Dipanggil setelah `article.update` berhasil di mode ubah.
 * @returns Rekaman state, turunan memo, dan penangan aksi untuk kanvas dan inspektor.
 */
export function useArticleFormState({
  data,
  onSubmit,
  command,
  organizationId = '',
  initialArticle,
  onEditSaved,
}: {
  readonly data: unknown;
  readonly onSubmit: (payload: unknown) => Promise<unknown>;
  readonly command?: DashboardCommand;
  readonly organizationId?: string | undefined;
  readonly initialArticle?: EditArticleInit | undefined;
  readonly onEditSaved?: (() => void) | undefined;
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

  const isEditing = initialArticle !== undefined;
  /** Status mentah artikel yang dibuka; non-null berarti mode ubah. */
  const editOriginalStatus = initialArticle?.status ?? null;
  const [slug, setSlug] = useState(initialArticle?.slug ?? '');
  const [slugTouched, setSlugTouched] = useState(isEditing);
  const [status, setStatus] = useState<string>(() =>
    initialArticle !== undefined && EDITABLE_ARTICLE_STATUSES.has(initialArticle.status)
      ? initialArticle.status
      : 'draft',
  );
  /** Mode presentasi artikel; `standard` tanpa syarat tambahan. */
  const [articleType, setArticleType] = useState<ArticleType>(() =>
    initialArticle === undefined ? 'standard' : normalizeArticleType(initialArticle.type),
  );
  /** URL tonton/berkas luar untuk mode `video`. */
  const [videoUrl, setVideoUrl] = useState(initialArticle?.videoUrl ?? '');
  /** URL dengar/berkas luar untuk mode `audio`. */
  const [audioUrl, setAudioUrl] = useState(initialArticle?.audioUrl ?? '');
  /** Durasi detik sebagai digit untuk mode `video`/`audio`. */
  const [durationInput, setDurationInput] = useState(
    initialArticle?.durationSeconds === null || initialArticle?.durationSeconds === undefined
      ? ''
      : String(initialArticle.durationSeconds),
  );
  /** Tandai konten berbayar untuk disclosure bersponsor. */
  const [isSponsored, setIsSponsored] = useState(initialArticle?.isSponsored ?? false);
  const [categoryIds, setCategoryIds] = useState<readonly string[]>(() => [...(initialArticle?.categoryIds ?? [])]);
  const [extraCategories, setExtraCategories] = useState<readonly CategoryEntity[]>([]);
  const [featuredId, setFeaturedId] = useState<string | null>(initialArticle?.leadMediaId ?? null);
  const [featuredOrgId, setFeaturedOrgId] = useState<string | null>(null);
  /** Org tercatat tiap gambar inline saat diunggah (null = org sesi saat itu). */
  const [inlineMediaOrgs, setInlineMediaOrgs] = useState<Readonly<Record<string, string | null>>>({});
  const [featuredName, setFeaturedName] = useState('');
  const [featuredPreviewUrl, setFeaturedPreviewUrl] = useState<string | null>(null);
  const [featuredStatus, setFeaturedStatus] = useState<string | null>(null);
  /** Petakan regionId artikel ke pilihan wilayah/kota; loader menjamin daftar wilayah sudah tiba. */
  const resolveInitialRegion = (): { readonly provinceId: string | null; readonly cityId: string | null } => {
    const regionId = initialArticle?.regionId ?? null;
    if (regionId === null) return { provinceId: null, cityId: null };
    const region = (model?.regions ?? []).find((item) => item.id === regionId) ?? null;
    if (region === null) return { provinceId: null, cityId: null };
    return region.kind === 'city'
      ? { provinceId: region.parentRegionId ?? null, cityId: region.id }
      : { provinceId: region.id, cityId: null };
  };
  const [provinceId, setProvinceId] = useState<string | null>(() => resolveInitialRegion().provinceId);
  const [cityId, setCityId] = useState<string | null>(() => resolveInitialRegion().cityId);
  const [isNational, setIsNational] = useState(() => initialArticle !== undefined && initialArticle.regionId === null);
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
  const [coverUrl, setCoverUrl] = useState(initialArticle?.coverImageUrl ?? '');
  const [titleText, setTitleText] = useState(initialArticle?.title ?? '');
  const [descriptionText, setDescriptionText] = useState(initialArticle?.excerpt ?? '');
  const [mode, setMode] = useState<'tulis' | 'pratinjau' | 'sumber'>('tulis');
  const [bodyText, setBodyText] = useState(initialArticle?.body ?? '');
  const [bodyJsonDraft, setBodyJsonDraft] = useState<TipTapDoc | null>(() => {
    const doc = initialArticle?.bodyJson ?? null;
    return typeof doc === 'object' && doc !== null ? (doc as TipTapDoc) : null;
  });
  const [richResetKey, setRichResetKey] = useState(0);
  const [isSubmitting, startSubmitTransition] = useTransition();
  const [publishOnSave, setPublishOnSave] = useState(!isEditing);
  const [source, setSource] = useState(initialArticle?.source ?? '');
  const [canonicalUrl, setCanonicalUrl] = useState(initialArticle?.canonicalUrl ?? '');
  const [tags, setTags] = useState<readonly string[]>(() => [...(initialArticle?.tags ?? [])]);
  const [rawScheduleInput, setRawScheduleInput] = useState(() =>
    isoToLocalDateTimeInput(initialArticle?.scheduledAt ?? null),
  );
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
  const [publisherId, setPublisherId] = useState<string | null>(initialArticle?.publisherId ?? null);
  const [authorId, setAuthorId] = useState<string | null>(initialArticle?.authorId ?? null);
  /** Mode ubah tidak pernah menerapkan penulis bawaan; nilai awal adalah kebenaran. */
  const touchedAuthor = useRef(isEditing);

  useEffect(() => {
    if (!touchedAuthor.current && publisherId === null && authorId === null && defaultAuthorId !== null) {
      setAuthorId(defaultAuthorId);
    }
  }, [publisherId, authorId, defaultAuthorId]);

  /** expectedVersion artikel yang diubah; disegarkan dari tiap hasil `article.update`. */
  const editVersionRef = useRef(initialArticle?.version ?? 0);

  /** Ambil pratinjau sampul artikel yang diubah; id media tetap tersimpan bila gagal. */
  const coverPreviewRequested = useRef(false);
  useEffect(() => {
    const mediaId = initialArticle?.leadMediaId ?? null;
    if (!isEditing || mediaId === null || command === undefined || coverPreviewRequested.current) return;
    if (featuredId !== mediaId || featuredPreviewUrl !== null) return;
    coverPreviewRequested.current = true;
    void (async () => {
      try {
        const result = (await command('media.readMany', { mediaIds: [mediaId] })) as {
          readonly items?: readonly { readonly mediaId?: unknown; readonly url?: unknown }[];
        } | null;
        const url = result?.items?.find((item) => item?.mediaId === mediaId)?.url;
        if (typeof url === 'string' && url !== '') setFeaturedPreviewUrl(url);
      } catch {
        /* Pratinjau sampul best-effort; id media tetap tersimpan. */
      }
    })();
  }, [isEditing, initialArticle, command, featuredId, featuredPreviewUrl]);

  /**
   * Lengkapi nama/versi/alt/caption sampul artikel yang diubah dari pustaka.
   * Tanpa versi, simpan metadata dan titik fokus ditolak server; tanpa
   * backfill ini tombolnya mati padahal datanya ada. Isian yang sudah
   * disentuh pengguna tidak pernah ditimpa.
   */
  const coverMetaRequested = useRef(false);
  useEffect(() => {
    const mediaId = initialArticle?.leadMediaId ?? null;
    if (!isEditing || mediaId === null || organizationId === undefined || organizationId === '' || coverMetaRequested.current) return;
    if (featuredId !== mediaId || featuredVersion !== null) return;
    coverMetaRequested.current = true;
    void (async () => {
      try {
        const item = (await fetchCoverLibrary(organizationId)).find((candidate) => candidate.id === mediaId) ?? null;
        if (item === null) return;
        setFeaturedName((prev) => (prev === '' ? fileNameOf(item.objectKey) : prev));
        setFeaturedVersion((prev) => (prev === null ? item.version : prev));
        setFeaturedAlt((prev) => (prev === '' ? (item.altText ?? '').trim().slice(0, 300) : prev));
        setFeaturedCaption((prev) => (prev === '' ? (item.caption ?? '').trim().slice(0, 500) : prev));
      } catch {
        /* Metadata sampul best-effort; penjaga versi tetap menolak simpan buta. */
      }
    })();
  }, [isEditing, initialArticle, organizationId, featuredId, featuredVersion]);

  const effectiveCategoryIds = useMemo(
    () => (categoryIds.length > 0 ? categoryIds : defaultCategoryId === null ? [] : [defaultCategoryId]),
    [categoryIds, defaultCategoryId],
  );
  const bodyJsonProblem = useMemo(() => describeBodyJsonProblem(bodyJsonDraft), [bodyJsonDraft]);

  /** Validasi silang mode terhadap isi, sampul, dan URL khusus mode. */
  const modeProblem = useMemo(
    () => describeArticleTypeProblem({
      type: articleType,
      body: bodyText,
      bodyJson: bodyJsonDraft,
      leadMediaId: featuredId,
      coverImageUrl: coverUrl,
      videoUrl,
      audioUrl,
    }),
    [articleType, bodyText, bodyJsonDraft, featuredId, coverUrl, videoUrl, audioUrl],
  );

  const selectedPublisher = useMemo(
    () => (model?.publishers ?? []).find((p) => p.id === publisherId) ?? null,
    [model?.publishers, publisherId],
  );
  const effectiveOwnerOrg = selectedPublisher?.ownerOrganizationId ?? null;
  const foreignOwnerOrg = effectiveOwnerOrg !== null && effectiveOwnerOrg !== organizationId ? effectiveOwnerOrg : null;

  const effectiveArticleOrg = foreignOwnerOrg ?? (organizationId === '' ? '' : organizationId);

  /**
   * Catat org tiap gambar inline dan ingatkan bila penerbit belum dipilih.
   *
   * @param mediaId - Id media yang baru tersimpan.
   * @param ownerOrg - Org target unggahan (null = org sesi saat itu).
   */
  const handleInlineStored = (mediaId: string, ownerOrg: string | null): void => {
    setInlineMediaOrgs((prev) => (prev[mediaId] === (ownerOrg ?? organizationId) ? prev : { ...prev, [mediaId]: ownerOrg }));
    if (publisherId === null || publisherId === '') {
      toast.warning('Penerbit belum dipilih — gambar masuk organisasi aktif. Memilih penerbit beda org nanti memicu peringatan.');
    }
  };

  /** Id media asing yang masih dipakai draf dibanding org artikel efektif. */
  const foreignMediaIds = useMemo(() => {
    const present = collectInlineMediaIds(bodyJsonDraft);
    if (featuredId !== null) present.push(featuredId);
    const orgByMediaId: Record<string, string | null> = { ...inlineMediaOrgs };
    if (featuredId !== null) orgByMediaId[featuredId] = featuredOrgId;
    return findForeignMediaIds(present, orgByMediaId, effectiveArticleOrg);
  }, [bodyJsonDraft, featuredId, inlineMediaOrgs, featuredOrgId, effectiveArticleOrg]);

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
    ...(foreignOwnerOrg === null ? {} : { ownerOrganizationId: foreignOwnerOrg }),
    categoryIds: effectiveCategoryIds,
    leadMediaId: featuredId,
    type: articleType,
    isSponsored,
    videoUrl,
    audioUrl,
    durationSeconds: durationInput,
  }), [
    slug, titleText, descriptionText, bodyText, bodyJsonDraft, source, canonicalUrl,
    coverUrl, tags, status, rawScheduleInput, provinceId, cityId, publisherId,
    authorId, foreignOwnerOrg, effectiveCategoryIds, featuredId,
    articleType, isSponsored, videoUrl, audioUrl, durationInput,
  ]);

  const selectedAuthor = activeAuthors.find((a) => a.id === authorId) ?? null;

  const handlePublisherChange = (next: string | null) => {
    const id = next === null || next === '' ? null : next;
    setPublisherId(id);
    if (id !== null) {
      setAuthorId(null);
      const picked = (model?.publishers ?? []).find((p) => p.id === id) ?? null;
      if (picked !== null) {
        if (provinceId === null && cityId === null) {
          const home = findPublisherHomeRegion(model?.regions ?? [], picked.contacts?.city);
          if (home !== null) {
            setProvinceId(home.provinceId);
            setCityId(home.cityId);
            setIsNational(false);
          }
        }
      }
    } else if (!touchedAuthor.current) setAuthorId(defaultAuthorId);
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
        const items = await fetchCoverLibrary(organizationId);
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
    setFeaturedOrgId(null);
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
        ...(foreignOwnerOrg === null ? {} : { ownerOrganizationId: foreignOwnerOrg }),
        onConverting: () => setFeaturedStatus('Mengonversi HEIC ke JPEG di perangkat…'),
      });
      coverBlobRef.current = { blob: compressedBlob, mimeType: compressedMediaType };
      setFeaturedId(mediaId);
      setFeaturedOrgId(foreignOwnerOrg);
      setFeaturedName(file.name);
      setFeaturedVersion(version);
      setFeaturedAlt('');
      setFeaturedCaption('');
      setFeaturedFocal(null);
      setFeaturedPreviewUrl(previewUrl === '' ? storedSrc : previewUrl);
      if (publisherId === null || publisherId === '') {
        toast.warning('Penerbit belum dipilih — sampul masuk organisasi aktif. Memilih penerbit beda org nanti memicu peringatan.');
      }
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
      const updated = (await command('media.update', { mediaId: featuredId, expectedVersion: featuredVersion, ...(featuredOrgId === null ? {} : { ownerOrganizationId: featuredOrgId }), ...patch })) as { readonly version?: unknown } | null;
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
   * @param backdateIso - ISO publish time applied when the article is immediate.
   * @param initialViews - Seeded view count fanned out per portal batch; null skips seeding.
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

  const handleSaveArticle = (event: FormEvent<HTMLFormElement>) => {
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
    if (descriptionText.trim().length > 500) {
      toast.error(`Deskripsi ${descriptionText.trim().length} karakter — maksimal 500. Pangkas dulu.`);
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
    const typeProblem = describeArticleTypeProblem({
      type: normalizeArticleType(articleType),
      body: trimmedBody,
      bodyJson: bodyJsonDraft,
      leadMediaId: featuredId,
      coverImageUrl: coverUrl,
      videoUrl,
      audioUrl,
    });
    if (typeProblem !== null) {
      toast.error(typeProblem);
      return;
    }
    if (durationInput.trim() !== '') {
      const durationValue = Number(durationInput.trim());
      if (!Number.isInteger(durationValue) || durationValue < 1 || durationValue > 86400) {
        toast.error('Durasi harus 1 sampai 86400 detik.');
        return;
      }
    }

    startSubmitTransition(async () => {
      const payloadSlug = slugValue;
      const categoryIds = await persistPendingCategories(effectiveCategoryIds);
      if (categoryIds === null) {
        toast.error('Kategori baru belum tersimpan. Periksa kategori yang ditandai, lalu coba Simpan lagi.');
        return;
      }
      const payload = buildArticlePayload({ ...formSnapshot, status, rawSchedule }, categoryIds);
      if (isEditing && initialArticle !== undefined) {
        if (command === undefined) {
          toast.error('Perintah penyimpanan tidak tersedia. Muat ulang lalu coba lagi.');
          return;
        }
        try {
          const updated = (await command(
            'article.update',
            { id: initialArticle.id, expectedVersion: editVersionRef.current, ...payload },
            { refresh: true },
          )) as { readonly version?: unknown } | null;
          if (typeof updated?.version === 'number') editVersionRef.current = updated.version;
        } catch (error) {
          toast.error(error instanceof Error && error.message !== '' ? error.message : 'Artikel gagal diperbarui.');
          return;
        }
        toast.success('Artikel diperbarui.');
        onEditSaved?.();
        return;
      }
      let created: { readonly id?: string; readonly slug?: string; readonly organizationId?: string } | null;
      try {
        created = await onSubmit(payload) as { readonly id?: string; readonly slug?: string; readonly organizationId?: string };
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
      if (typeof created.organizationId === 'string' && created.organizationId !== '' && created.organizationId !== organizationId) {
        if (willPublish && status === 'active' && typeof created.id === 'string' && command !== undefined && targetSiteIds.length > 0) {
          // `siteIds` is capped per command, so the bridge request is split into as
          // many batches as the network needs instead of one oversized call.
          let bridgedSites = 0;
          let declined = false;
          try {
            for (const batch of chunkPublicationTargets(targetSiteIds)) {
              const bridged = await command('article.bridge.request', { ownerOrganizationId: created.organizationId, articleId: created.id, siteIds: batch, ...(initialViews === null ? {} : { viewCount: initialViews }) });
              if (bridged === null) {
                declined = true;
                break;
              }
              bridgedSites += batch.length;
            }
            if (!declined) {
              toast.success(`Tersimpan di organisasi tujuan dan tayang ke ${bridgedSites.toLocaleString('id-ID')} portal.`);
            } else if (bridgedSites === 0) {
              toast.info('Tersimpan sebagai draf di organisasi tujuan (milik org tersebut). Penerbitan ke portal menyusul.');
            } else {
              toast.warning(`Tersimpan di organisasi tujuan dan ${bridgedSites.toLocaleString('id-ID')} dari ${targetSiteIds.length.toLocaleString('id-ID')} portal sudah tayang. Sisanya menyusul dari Antrean Penerbitan.`);
            }
          } catch {
            toast.error(bridgedSites === 0
              ? 'Tersimpan di organisasi tujuan, tetapi gagal diterbitkan. Coba lagi dari Antrean Penerbitan.'
              : `Tersimpan di organisasi tujuan dan ${bridgedSites.toLocaleString('id-ID')} dari ${targetSiteIds.length.toLocaleString('id-ID')} portal sudah tayang, sisanya gagal. Periksa Antrean Penerbitan.`);
          }
        } else {
          toast.info('Tersimpan sebagai draf di organisasi tujuan (milik org tersebut). Penerbitan ke portal menyusul.');
        }
      } else if (willPublish && typeof created.id === 'string') {
        await publishCreatedArticle(created.id, status === 'scheduled', scheduledAt, backdateIso, initialViews);
      }
      form.reset();
      setSlug('');
      setSlugTouched(false);
      setStatus('draft');
      setArticleType('standard');
      setVideoUrl('');
      setAudioUrl('');
      setDurationInput('');
      setIsSponsored(false);
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
      setFeaturedOrgId(null);
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
      setInlineMediaOrgs({});
      setRichResetKey((key) => key + 1);
    });
  };

  return {
    regionSelectId, nationalCheckId, citySelectId, publisherSelectId, authorSelectId, statusSelectId,
    viewsInputId, transcribeFullInputId, slugInputId, titleInputId, sourceInputId, canonicalInputId,
    tagsInputId, excerptInputId, bodyInputId, categoryInputId, featuredFileId, coverUrlInputId,
    publishOnSaveId, librarySearchInputId,
    slug, status, setStatus, categoryIds, setCategoryIds, extraCategories,
    featuredId, setFeaturedId, setFeaturedOrgId, setFeaturedName, setFeaturedPreviewUrl,
    setFeaturedVersion, setFeaturedFocal, featuredName, featuredPreviewUrl, featuredStatus,
    provinceId, setProvinceId, cityId, setCityId, isNational, setIsNational,
    isEditing, editOriginalStatus,
    isUnrestricted, nationalActive,
    uploadingFeatured, featuredAlt, setFeaturedAlt, featuredCaption, setFeaturedCaption, featuredFocal,
    coverBlobRef, coverRemoteRef, libraryOpen, libraryItems, libraryLoading, libraryError,
    libraryQuery, setLibraryQuery, libraryShown, setLibraryShown, libraryPreviews,
    savingFeaturedMeta, coverUrl, setCoverUrl, titleText, descriptionText, setDescriptionText,
    mode, setMode, bodyText, bodyJsonDraft, richResetKey, isSubmitting,
    publishOnSave, setPublishOnSave, source, setSource, canonicalUrl, setCanonicalUrl,
    tags, setTags, rawScheduleInput, setRawScheduleInput, rawPublishDateInput, setRawPublishDateInput,
    viewsInput, setViewsInput, publisherId, authorId,
    articleType, setArticleType, videoUrl, setVideoUrl, audioUrl, setAudioUrl,
    durationInput, setDurationInput, isSponsored, setIsSponsored,
    titleVariants, polished, setPolished, polishRounds, aiAction, aiReady, generatingTitles,
    bumpViews, handleRichChange, handleInlineStored, handlePublisherChange, handleAuthorChange,
    handleTitleChange, handleSlugChange, applyPolishedBody,
    refineTitles, refineDescription, polishBodyInline, transcribeFileInline, classifyInline,
    openLibrary, pickLibraryCover, handleCreateCategory, handleFeaturedFile,
    handleFeaturedMetaSave, handleFocalPick, captionCoverInline,
    targetSiteIds, targetLabel, willPublish, editorStats, statItems,
    regionOptions, cityOptions, publisherOptions, activeCategories, allCategories,
    defaultCategoryName, authorOptions, activeAuthors,
    effectiveCategoryIds, bodyJsonProblem, modeProblem,
    selectedPublisher, foreignOwnerOrg, selectedAuthor, tagSuggestions,
    foreignMediaIds,
    libraryFiltered, libraryVisible, command, handleSaveArticle,
  };
}

/**
 * Rekaman state, turunan memo, dan penangan aksi formulir tulis artikel.
 */
export type ArticleFormState = ReturnType<typeof useArticleFormState>;
