'use client';

import { useId, useMemo, useRef, useState, useTransition, type FormEvent } from 'react';
import { toast } from 'sonner';
import {
  Check,
  Layers,
  Loader2,
  Plus,
  Send,
} from 'lucide-react';
import { SectionCard } from '@/modules/dashboard/components/shared/section-card';
import { EmptyState } from '@/modules/dashboard/components/empty-state';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SearchCombobox } from '@/modules/dashboard/components/shared/search-combobox';
import { rankTags } from '@/modules/dashboard/components/shared/suggestion-cache';
import { TagCombobox } from '@/modules/dashboard/components/shared/tag-combobox';
import { Textarea } from '@/components/ui/textarea';
import type {
  ArticleEntity,
  CategoryEntity,
  DomainEntity,
  PublisherEntity,
  RegionEntity,
  SiteEntity,
} from '@/modules/dashboard/components/shared/types';
import { slugify } from '@/modules/dashboard/components/shared/form-utils';
import { parseArticleBody } from '@/modules/site/article-markup';
import { TAG_MAX_COUNT, normalizeTagList } from '@/modules/site/slug-allocator';
import { ArticleBodyView } from '@/modules/site/components/article-body-view';
import { TipTapBodyView } from '@/modules/site/components/tiptap-body-view';
import { isTipTapDoc, type TipTapDoc } from '@/modules/site/tiptap-document';
import { RichTextEditor } from '@/modules/dashboard/components/editorial/rich-text-editor';

export function EditorialForm({
  data,
  onSubmit,
  onAssign,
  command,
}: {
  readonly data: unknown;
  readonly onSubmit: (payload: unknown) => Promise<unknown>;
  readonly onAssign: (payload: unknown) => Promise<unknown>;
  readonly command?: (action: string, payload: unknown) => Promise<unknown>;
}) {
  const model = data as {
    readonly regions?: readonly RegionEntity[];
    readonly publishers?: readonly PublisherEntity[];
    readonly categories?: readonly CategoryEntity[];
    readonly sites?: readonly SiteEntity[];
    readonly domains?: readonly DomainEntity[];
    readonly articles?: readonly ArticleEntity[];
    readonly articleSites?: readonly { readonly articleId: string; readonly siteId: string }[];
  } | null;

  const regionSelectId = useId();
  const publisherSelectId = useId();
  const categorySelectId = useId();
  const slugInputId = useId();
  const titleInputId = useId();
  const sourceInputId = useId();
  const tagsInputId = useId();
  const bodyInputId = useId();
  const assignArticleSelectId = useId();
  const seedCountInputId = useId();

  const [slug, setSlug] = useState('');
  const [bodyDraft, setBodyDraft] = useState('');
  /** Domain groups excluded from distribution; empty means every domain is selected (default all). */
  const [assignExcluded, setAssignExcluded] = useState<readonly string[]>([]);
  const [bodyJsonDraft, setBodyJsonDraft] = useState<TipTapDoc | null>(null);
  const [richResetKey, setRichResetKey] = useState(0);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const [isSubmitting, startSubmitTransition] = useTransition();
  const [isAssigning, startAssignTransition] = useTransition();
  const [isSeeding, startSeedTransition] = useTransition();

  const insertMarkup = (before: string, after = '') => {
    const element = bodyRef.current;
    if (element === null) return;
    const { selectionStart: start, selectionEnd: end, value } = element;
    const next = `${value.slice(0, start)}${before}${value.slice(start, end)}${after}${value.slice(end)}`;
    setBodyDraft(next);
    const cursor = start + before.length;
    requestAnimationFrame(() => {
      element.focus();
      element.setSelectionRange(cursor, end + before.length);
    });
  };

  const insertFigureMarker = () => {
    const existing = parseArticleBody(bodyDraft).filter((block) => block.kind === 'figure').length;
    insertMarkup(`\n[gambar:${existing + 1}]\n`);
  };

  const previewBlocks = parseArticleBody(bodyDraft);
  const previewImages = previewBlocks.flatMap((block) =>
    block.kind === 'figure' ? [{ url: '', alt: `Gambar ${block.index} (pratinjau — asli tampil setelah diunggah di tab Media)` }] : [],
  );
  const assignSites = model?.sites ?? [];
  const assignDomains = model?.domains ?? [];
  const assignGroups = [
    ...assignDomains
      .map((domain) => ({ id: domain.id, label: domain.normalizedHostname, sites: assignSites.filter((site) => site.domainId === domain.id) }))
      .filter((group) => group.sites.length > 0),
    ...(assignSites.some((site) => site.domainId === undefined || site.domainId === null || !assignDomains.some((domain) => domain.id === site.domainId))
      ? [{
        id: '__tanpa-domain__',
        label: 'Lainnya',
        sites: assignSites.filter((site) => site.domainId === undefined || site.domainId === null || !assignDomains.some((domain) => domain.id === site.domainId)),
      }]
      : []),
  ];
  const isAssignGroupChecked = (id: string) => !assignExcluded.includes(id);
  const toggleAssignGroup = (id: string) => {
    setAssignExcluded((prev) => (prev.includes(id) ? prev.filter((excluded) => excluded !== id) : [...prev, id]));
  };
  const regionOptions = useMemo(() => (model?.regions ?? []).map((r) => ({ value: r.id, label: r.name })), [model?.regions]);
  const publisherOptions = useMemo(
    () => (model?.publishers ?? []).filter((p) => p.status === undefined || p.status === 'active').map((p) => ({ value: p.id, label: p.name })),
    [model?.publishers],
  );
  const categoryOptions = useMemo(() => (model?.categories ?? []).map((c) => ({ value: c.id, label: c.name })), [model?.categories]);
  const articleOptions = useMemo(() => (model?.articles ?? []).map((a) => ({ value: a.id, label: a.title })), [model?.articles]);
  const tagSuggestions = useMemo(() => rankTags(model?.articles ?? []), [model?.articles]);
  /** One article picker drives both distribution and view seeding; defaults to the first article. */
  const [assignArticleId, setAssignArticleId] = useState<string | null>(null);
  const assignArticleValue = assignArticleId ?? model?.articles?.[0]?.id ?? '';
  /** Seeding only touches sites where the target article is already assigned. */
  const seedSiteIds = (model?.articleSites ?? []).filter((row) => row.articleId === assignArticleValue).map((row) => row.siteId);
  const richDoc = bodyJsonDraft !== null && isTipTapDoc(bodyJsonDraft) && (bodyJsonDraft.content ?? []).length > 0 ? bodyJsonDraft : null;

  const handleRichChange = (change: { readonly doc: TipTapDoc; readonly text: string }) => {
    const empty = change.text.trim() === '' && (change.doc.content ?? []).every((node) => node.type === 'paragraph' && (node.content ?? []).length === 0);
    setBodyJsonDraft(empty ? null : change.doc);
    if (bodyDraft.trim() === '' && change.text.trim() !== '') setBodyDraft(change.text.slice(0, 200_000));
  };

  const handleTitleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    if (!slug) {
      setSlug(slugify(e.target.value));
    }
  };

  const handleCreateArticle = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);

    startSubmitTransition(async () => {
      const payloadSlug = String(formData.get('slug') ?? '').trim();
      const created = (await onSubmit({
        regionId: formData.get('regionId'),
        publisherId: formData.get('publisherId') || null,
        categoryId: formData.get('categoryId') || null,
        authorId: null,
        slug: payloadSlug,
        title: String(formData.get('title') ?? '').trim(),
        body: String(formData.get('body') ?? '').trim(),
        bodyJson: bodyJsonDraft,
        source: String(formData.get('source') ?? '').trim(),
        tags: normalizeTagList(String(formData.get('tags') ?? '').split(',')).slice(0, TAG_MAX_COUNT),
        status: 'draft',
      })) as { readonly slug?: string } | null;
      if (created !== null && typeof created.slug === 'string' && created.slug !== payloadSlug) {
        toast.info(`Slug "${payloadSlug}" sudah dipakai — disimpan sebagai "${created.slug}".`);
      }
      form.reset();
      setSlug('');
      setBodyDraft('');
      setBodyJsonDraft(null);
      setRichResetKey((key) => key + 1);
    });
  };

  const handleAssignSites = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);

    startAssignTransition(async () => {
      await onAssign({
        articleId: formData.get('articleId'),
        siteIds: formData.getAll('siteIds'),
      });
    });
  };

  const handleSeedViews = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);

    if (command === undefined) {
      toast.error('Penyaluran tidak tersedia di pratinjau.');
      return;
    }
    if (assignArticleValue === '' || seedSiteIds.length === 0) {
      toast.error('Salurkan artikel ke situs dulu sebelum mengisi jumlah tayang.');
      return;
    }
    const viewCount = Number(formData.get('viewCount') ?? 0);
    startSeedTransition(async () => {
      let succeeded = 0;
      for (const siteId of seedSiteIds) {
        const result = await command('article.sites.views.set', { articleId: assignArticleValue, siteId, viewCount });
        if (result !== null) succeeded += 1;
      }
      if (succeeded === 0) toast.error('Gagal menyimpan jumlah tayang.');
      else toast.success(`Jumlah tayang tersimpan untuk ${succeeded} situs.`);
      form.reset();
    });
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
      <SectionCard icon={Plus} title="Artikel Baru" eyebrow="Tulis sekali">

        <form onSubmit={handleCreateArticle} className="space-y-3.5">
          <div className="grid gap-3 sm:grid-cols-2">
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
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={categorySelectId} className="font-mono text-xs text-paper-dim">
              Kategori
            </Label>
            <SearchCombobox
              id={categorySelectId}
              name="categoryId"
              disabled={isSubmitting}
              placeholder="Umum / Tanpa Kategori"
              allowEmpty
              emptyLabel="Umum / Tanpa Kategori"
              options={categoryOptions}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor={titleInputId} className="font-mono text-xs text-paper-dim">
                Judul Artikel
              </Label>
              <Input
                id={titleInputId}
                name="title"
                required
                disabled={isSubmitting}
                onBlur={handleTitleBlur}
                placeholder="Masukkan tajuk berita resmi..."
                className="h-8 rounded border-hairline-strong bg-bg px-2.5 font-sans text-xs text-paper transition-colors duration-180 hover:border-hairline focus-visible:ring-brass"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor={slugInputId} className="font-mono text-xs text-paper-dim">
                Slug URL
              </Label>
              <Input
                id={slugInputId}
                name="slug"
                required
                disabled={isSubmitting}
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                pattern="[a-z0-9-]+"
                placeholder="judul-artikel-terkini"
                className="h-8 rounded border-hairline-strong bg-bg px-2.5 font-mono text-xs text-paper transition-colors duration-180 hover:border-hairline focus-visible:ring-brass"
              />
              <p className="m-0 font-mono text-[11px] text-paper-faint">
                Nama pendek alamat artikel (huruf kecil, tanpa spasi). Bila sudah dipakai, akhiran -2, -3 ditambahkan otomatis.
              </p>
            </div>
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

          <div className="space-y-1.5">
            <span id={`${bodyInputId}-rich-label`} className="block font-mono text-xs text-paper-dim">
              Konten Kaya (opsional)
            </span>
            <RichTextEditor
              key={richResetKey}
              onDocChange={handleRichChange}
              command={command ?? (async () => { throw new Error('Unggahan media tidak tersedia di pratinjau.'); })}
              labelledBy={`${bodyInputId}-rich-label`}
              disabled={isSubmitting}
            />
            <p className="m-0 font-mono text-[11px] text-paper-faint">
              Editor kaya menyimpan struktur JSON; teksnya mengisi kolom biasa otomatis bila masih kosong.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={bodyInputId} className="font-mono text-xs text-paper-dim">
              Isi Artikel Lengkap
            </Label>
            <div className="flex flex-wrap gap-1.5">
              <Button type="button" variant="outline" size="xs" title="Tebal (**teks**)" onClick={() => insertMarkup('**', '**')} disabled={isSubmitting}>
                Tebal
              </Button>
              <Button type="button" variant="outline" size="xs" title="Miring (*teks*)" onClick={() => insertMarkup('*', '*')} disabled={isSubmitting}>
                Miring
              </Button>
              <Button type="button" variant="outline" size="xs" title="Daftar (- item)" onClick={() => insertMarkup('\n- ')} disabled={isSubmitting}>
                Daftar
              </Button>
              <Button type="button" variant="outline" size="xs" title="Sisip gambar ([gambar:N])" onClick={insertFigureMarker} disabled={isSubmitting}>
                Gambar
              </Button>
            </div>
            <Textarea
              id={bodyInputId}
              name="body"
              required
              ref={bodyRef}
              value={bodyDraft}
              onChange={(e) => setBodyDraft(e.target.value)}
              disabled={isSubmitting}
              placeholder="Tuliskan materi berita di sini... (**tebal**, *miring*, - daftar, [gambar:1])"
              className="min-h-[140px] rounded border border-hairline-strong bg-bg p-3 font-sans text-xs leading-relaxed text-paper transition-colors duration-180 hover:border-hairline focus:border-brass focus:outline-none"
            />
            <p className="m-0 font-mono text-[11px] text-paper-faint">
              Baris kosong = paragraf baru. [gambar:N] memakai gambar ke-N dari halaman Media.
            </p>
            {bodyDraft.trim() !== '' || richDoc !== null ? (
              <div className="rounded border border-hairline bg-bg-raised p-3">
                <p className="m-0 mb-2 font-mono text-[11px] uppercase tracking-wider text-paper-faint">Pratinjau</p>
                <div className="space-y-3">
                  {richDoc !== null ? (
                    <TipTapBodyView
                      doc={richDoc}
                      paragraphClassName="font-sans text-xs leading-relaxed text-paper"
                      listClassName="space-y-1 pl-5 font-sans text-xs leading-relaxed text-paper [list-style:disc]"
                    />
                  ) : (
                    <ArticleBodyView
                      blocks={previewBlocks}
                      images={previewImages}
                      paragraphClassName="font-sans text-xs leading-relaxed text-paper"
                      listClassName="space-y-1 pl-5 font-sans text-xs leading-relaxed text-paper [list-style:disc]"
                    />
                  )}
                </div>
              </div>
            ) : null}
          </div>

          <div className="pt-2">
            <Button
              type="submit"
              variant="default"
              disabled={isSubmitting}
              className="w-full sm:w-auto"
            >
              {isSubmitting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <Send className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              <span>Simpan Draf</span>
            </Button>
          </div>
        </form>
      </SectionCard>

      <SectionCard icon={Layers} title="Penyaluran Artikel" eyebrow="Pilih domain tujuan">

        <form onSubmit={handleAssignSites} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor={assignArticleSelectId} className="font-mono text-xs text-paper-dim">
              Pilih Artikel Target
            </Label>
            <SearchCombobox
              id={assignArticleSelectId}
              name="articleId"
              value={assignArticleValue}
              onValueChange={(next) => { if (next !== null) setAssignArticleId(next); }}
              disabled={isAssigning}
              placeholder="Pilih artikel"
              options={articleOptions}
            />
          </div>

          <div className="space-y-2">
            <span className="block font-mono text-xs text-paper-dim">
              Domain Tujuan (default: semua)
            </span>
            <p className="m-0 font-mono text-[11px] text-paper-faint">
              Memilih domain menyalurkan ke seluruh situs (subdomain) di bawahnya.
            </p>
            <div className="max-h-60 space-y-1.5 overflow-y-auto rounded border border-hairline bg-bg p-3">
              {assignSites.length === 0 ? (
                <EmptyState title="Belum ada situs aktif." description="Data akan tampil di sini setelah tersedia." />
              ) : (
                assignGroups.map((group) => {
                  const checked = isAssignGroupChecked(group.id);
                  return (
                    <div key={group.id} className="rounded transition-colors duration-180 hover:bg-bg-raised-2">
                      <Label
                        htmlFor={`assign-domain-${group.id}`}
                        className="flex cursor-pointer items-center gap-2.5 rounded p-1.5"
                      >
                        <Checkbox
                          id={`assign-domain-${group.id}`}
                          checked={checked}
                          onCheckedChange={() => toggleAssignGroup(group.id)}
                          disabled={isAssigning}
                          className="border-hairline-strong data-checked:border-brass data-checked:bg-brass data-checked:text-bg"
                        />
                        {checked ? group.sites.map((site) => <input key={site.id} type="hidden" name="siteIds" value={site.id} />) : null}
                        <span className="font-mono text-xs text-paper">
                          {group.label}
                        </span>
                        <span aria-hidden="true" className="ml-auto font-mono text-[11px] tabular-nums text-paper-faint">
                          {group.sites.length} situs
                        </span>
                      </Label>
                      <details className="ml-9 pb-1.5">
                        <summary className="cursor-pointer font-mono text-[11px] text-paper-faint hover:text-paper">
                          Lihat situs
                        </summary>
                        <ul className="m-0 mt-1 list-none space-y-0.5 p-0">
                          {group.sites.map((site) => (
                            <li key={site.id} className="font-mono text-[11px] text-paper-dim">
                              {site.normalizedHostname}
                            </li>
                          ))}
                        </ul>
                      </details>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="pt-2">
            <Button
              type="submit"
              variant="outline"
              disabled={isAssigning}
              className="w-full"
            >
              {isAssigning ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <Check className="h-3.5 w-3.5 text-brass" aria-hidden="true" />
              )}
              <span>Simpan Penyaluran</span>
            </Button>
          </div>
        </form>

        <form onSubmit={handleSeedViews} className="mt-5 flex flex-wrap items-end gap-2 border-t border-hairline pt-5">
          <div className="min-w-0 flex-1 space-y-1.5">
            <Label htmlFor={seedCountInputId} className="font-mono text-xs text-paper-dim">
              Jumlah tayang {seedSiteIds.length > 0 ? `(${seedSiteIds.length} situs tersalurkan)` : '(belum tersalurkan)'}
            </Label>
            <Input
              id={seedCountInputId}
              name="viewCount"
              type="number"
              min={0}
              max={1000000000}
              defaultValue={0}
              disabled={isSeeding || seedSiteIds.length === 0}
              className="h-8 rounded border-hairline-strong bg-bg px-2.5 font-mono text-xs text-paper focus-visible:ring-brass"
            />
          </div>
          <Button
            type="submit"
            variant="outline"
            disabled={isSeeding || seedSiteIds.length === 0}
            className="flex-none"
          >
            {isSeeding ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <Check className="h-3.5 w-3.5 text-brass" aria-hidden="true" />
            )}
            <span>Simpan</span>
          </Button>
        </form>
      </SectionCard>
    </div>
  );
}