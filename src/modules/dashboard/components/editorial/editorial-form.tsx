'use client';

import { useId, useRef, useState, useTransition, type FormEvent } from 'react';
import { toast } from 'sonner';
import {
  Check,
  Layers,
  Loader2,
  Plus,
  Send,
} from 'lucide-react';
import { SectionCard } from '@/modules/dashboard/components/shared/section-card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Textarea } from '@/components/ui/textarea';
import type {
  AuthorEntity,
  ArticleEntity,
  CategoryEntity,
  PublisherEntity,
  RegionEntity,
  SiteEntity,
} from '@/modules/dashboard/components/shared/types';
import { slugify } from '@/modules/dashboard/components/shared/form-utils';
import { parseArticleBody } from '@/modules/site/article-markup';
import { TAG_MAX_COUNT, normalizeTagList } from '@/modules/site/slug-allocator';
import { ArticleBodyView } from '@/modules/site/components/article-body-view';

export function EditorialForm({
  data,
  onSubmit,
  onAssign,
  onSetViews,
}: {
  readonly data: unknown;
  readonly onSubmit: (payload: unknown) => Promise<unknown>;
  readonly onAssign: (payload: unknown) => Promise<unknown>;
  readonly onSetViews: (payload: unknown) => Promise<unknown>;
}) {
  const model = data as {
    readonly regions?: readonly RegionEntity[];
    readonly publishers?: readonly PublisherEntity[];
    readonly categories?: readonly CategoryEntity[];
    readonly authors?: readonly AuthorEntity[];
    readonly sites?: readonly SiteEntity[];
    readonly articles?: readonly ArticleEntity[];
  } | null;

  const regionSelectId = useId();
  const publisherSelectId = useId();
  const categorySelectId = useId();
  const authorSelectId = useId();
  const slugInputId = useId();
  const titleInputId = useId();
  const sourceInputId = useId();
  const tagsInputId = useId();
  const bodyInputId = useId();
  const assignArticleSelectId = useId();
  const viewsArticleSelectId = useId();
  const viewsSiteSelectId = useId();
  const viewsCountInputId = useId();

  const [slug, setSlug] = useState('');
  const [bodyDraft, setBodyDraft] = useState('');
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const [isSubmitting, startSubmitTransition] = useTransition();
  const [isAssigning, startAssignTransition] = useTransition();
  const [isSettingViews, startViewsTransition] = useTransition();

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
        authorId: formData.get('authorId') || null,
        slug: payloadSlug,
        title: String(formData.get('title') ?? '').trim(),
        body: String(formData.get('body') ?? '').trim(),
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

  const handleSetViews = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);

    startViewsTransition(async () => {
      await onSetViews({
        articleId: formData.get('viewsArticleId'),
        siteId: formData.get('viewsSiteId'),
        viewCount: Number(formData.get('viewCount') ?? 0),
      });
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
              <NativeSelect
                id={regionSelectId}
                name="regionId"
                required
                disabled={isSubmitting}
                className="w-full"
              >
                {model?.regions?.map((r) => (
                  <NativeSelectOption key={r.id} value={r.id}>
                    {r.name}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor={publisherSelectId} className="font-mono text-xs text-paper-dim">
                Penerbit
              </Label>
              <NativeSelect
                id={publisherSelectId}
                name="publisherId"
                disabled={isSubmitting}
                className="w-full"
              >
                <NativeSelectOption value="">Mandiri (tanpa penerbit)</NativeSelectOption>
                {model?.publishers?.map((p) => (
                  <NativeSelectOption key={p.id} value={p.id}>
                    {p.name}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor={categorySelectId} className="font-mono text-xs text-paper-dim">
                Kategori
              </Label>
              <NativeSelect
                id={categorySelectId}
                name="categoryId"
                disabled={isSubmitting}
                className="w-full"
              >
                <NativeSelectOption value="">Umum / Tanpa Kategori</NativeSelectOption>
                {model?.categories?.map((c) => (
                  <NativeSelectOption key={c.id} value={c.id}>
                    {c.name}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor={authorSelectId} className="font-mono text-xs text-paper-dim">
                Penulis
              </Label>
              <NativeSelect
                id={authorSelectId}
                name="authorId"
                disabled={isSubmitting}
                className="w-full"
              >
                <NativeSelectOption value="">Redaksi Bersama</NativeSelectOption>
                {model?.authors?.map((a) => (
                  <NativeSelectOption key={a.id} value={a.id}>
                    {a.displayName}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </div>
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
            <Input
              id={tagsInputId}
              name="tags"
              disabled={isSubmitting}
              placeholder="cth: wonosobo, pertanian, apbd"
              className="h-8 rounded border-hairline-strong bg-bg px-2.5 font-mono text-xs text-paper transition-colors duration-180 hover:border-hairline focus-visible:ring-brass"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={bodyInputId} className="font-mono text-xs text-paper-dim">
              Isi Artikel Lengkap
            </Label>
            <div className="flex flex-wrap gap-1.5">
              <button type="button" title="Tebal (**teks**)" onClick={() => insertMarkup('**', '**')} disabled={isSubmitting} className="rounded border border-hairline-strong bg-bg px-2 py-1 font-mono text-[11px] text-paper transition-colors duration-180 hover:border-hairline hover:bg-bg-raised-2 disabled:opacity-50">
                Tebal
              </button>
              <button type="button" title="Miring (*teks*)" onClick={() => insertMarkup('*', '*')} disabled={isSubmitting} className="rounded border border-hairline-strong bg-bg px-2 py-1 font-mono text-[11px] text-paper transition-colors duration-180 hover:border-hairline hover:bg-bg-raised-2 disabled:opacity-50">
                Miring
              </button>
              <button type="button" title="Daftar (- item)" onClick={() => insertMarkup('\n- ')} disabled={isSubmitting} className="rounded border border-hairline-strong bg-bg px-2 py-1 font-mono text-[11px] text-paper transition-colors duration-180 hover:border-hairline hover:bg-bg-raised-2 disabled:opacity-50">
                Daftar
              </button>
              <button type="button" title="Sisip gambar ([gambar:N])" onClick={insertFigureMarker} disabled={isSubmitting} className="rounded border border-hairline-strong bg-bg px-2 py-1 font-mono text-[11px] text-paper transition-colors duration-180 hover:border-hairline hover:bg-bg-raised-2 disabled:opacity-50">
                Gambar
              </button>
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
            {bodyDraft.trim() !== '' ? (
              <div className="rounded border border-hairline bg-bg-raised p-3">
                <p className="m-0 mb-2 font-mono text-[11px] uppercase tracking-wider text-paper-faint">Pratinjau</p>
                <div className="space-y-3">
                  <ArticleBodyView
                    blocks={previewBlocks}
                    images={previewImages}
                    paragraphClassName="font-sans text-xs leading-relaxed text-paper"
                    listClassName="space-y-1 pl-5 font-sans text-xs leading-relaxed text-paper [list-style:disc]"
                  />
                </div>
              </div>
            ) : null}
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex h-8 items-center justify-center gap-1.5 rounded bg-brass px-4 font-sans text-xs font-semibold text-bg transition-colors duration-180 hover:bg-brass-soft disabled:opacity-50"
            >
              {isSubmitting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <Send className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              <span>Simpan Draf</span>
            </button>
          </div>
        </form>
      </SectionCard>

      <SectionCard icon={Layers} title="Penyaluran Artikel" eyebrow="Pilih situs tujuan">

        <form onSubmit={handleAssignSites} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor={assignArticleSelectId} className="font-mono text-xs text-paper-dim">
              Pilih Artikel Target
            </Label>
            <NativeSelect
              id={assignArticleSelectId}
              name="articleId"
              disabled={isAssigning}
              className="w-full"
            >
              {model?.articles?.map((a) => (
                <NativeSelectOption key={a.id} value={a.id}>
                  {a.title}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </div>

          <div className="space-y-2">
            <span className="block font-mono text-xs text-paper-dim">
              Situs Tujuan
            </span>
            <div className="max-h-60 space-y-1.5 overflow-y-auto rounded border border-hairline bg-bg p-3">
              {model?.sites?.length === 0 ? (
                <p className="m-0 font-mono text-xs text-paper-faint">
                  Belum ada situs aktif.
                </p>
              ) : (
                model?.sites?.map((site) => (
                  <Label
                    key={site.id}
                    className="flex cursor-pointer items-center gap-2.5 rounded p-1.5 transition-colors duration-180 hover:bg-bg-raised-2"
                  >
                    <input
                      type="checkbox"
                      name="siteIds"
                      value={site.id}
                      disabled={isAssigning}
                      className="h-3.5 w-3.5 rounded border-hairline bg-bg text-brass accent-brass focus:ring-0"
                    />
                    <span className="font-mono text-xs text-paper">
                      {site.normalizedHostname}
                    </span>
                  </Label>
                ))
              )}
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isAssigning}
              className="inline-flex h-8 w-full items-center justify-center gap-1.5 rounded border border-hairline-strong bg-bg px-3.5 font-sans text-xs font-semibold text-paper transition-colors duration-180 hover:border-hairline hover:bg-bg-raised-2 disabled:opacity-50"
            >
              {isAssigning ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <Check className="h-3.5 w-3.5 text-brass" aria-hidden="true" />
              )}
              <span>Simpan Penyaluran</span>
            </button>
          </div>
        </form>

        <form onSubmit={handleSetViews} className="mt-5 space-y-3 border-t border-hairline pt-5">
          <p className="m-0 font-mono text-xs text-paper-dim">
            Jumlah tayangan awal terisi otomatis; tayangan asli bertambah di atas angka ini.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor={viewsArticleSelectId} className="font-mono text-xs text-paper-dim">
                Artikel
              </Label>
              <NativeSelect
                id={viewsArticleSelectId}
                name="viewsArticleId"
                disabled={isSettingViews}
                className="w-full"
              >
                {model?.articles?.map((a) => (
                  <NativeSelectOption key={a.id} value={a.id}>
                    {a.title}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={viewsSiteSelectId} className="font-mono text-xs text-paper-dim">
                Situs
              </Label>
              <NativeSelect
                id={viewsSiteSelectId}
                name="viewsSiteId"
                disabled={isSettingViews}
                className="w-full"
              >
                {model?.sites?.map((site) => (
                  <NativeSelectOption key={site.id} value={site.id}>
                    {site.normalizedHostname}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={viewsCountInputId} className="font-mono text-xs text-paper-dim">
              Jumlah tayang
            </Label>
            <Input
              id={viewsCountInputId}
              name="viewCount"
              type="number"
              min={0}
              max={1000000000}
              defaultValue={0}
              disabled={isSettingViews}
              className="h-8 rounded border-hairline-strong bg-bg px-2.5 font-mono text-xs text-paper focus-visible:ring-brass"
            />
          </div>
          <button
            type="submit"
            disabled={isSettingViews}
            className="inline-flex h-8 w-full items-center justify-center gap-1.5 rounded border border-hairline-strong bg-bg px-3.5 font-sans text-xs font-semibold text-paper transition-colors duration-180 hover:border-hairline hover:bg-bg-raised-2 disabled:opacity-50"
          >
            {isSettingViews ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <Check className="h-3.5 w-3.5 text-brass" aria-hidden="true" />
            )}
            <span>Simpan Jumlah Tayangan</span>
          </button>
        </form>
      </SectionCard>
    </div>
  );
}