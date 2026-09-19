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
      <SectionCard icon={Plus} title="Naskah baru" eyebrow="Tulis sekali">

        <form onSubmit={handleCreateArticle} className="space-y-3.5">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor={regionSelectId} className="font-mono text-xs text-paper-dim">
                Wilayah Induk
              </label>
              <select
                id={regionSelectId}
                name="regionId"
                required
                disabled={isSubmitting}
                className="h-8 w-full rounded border border-hairline-strong bg-bg px-2 font-mono text-xs text-paper transition-colors duration-180 hover:border-hairline focus:border-brass focus:outline-none"
              >
                {model?.regions?.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor={publisherSelectId} className="font-mono text-xs text-paper-dim">
                Penerbit (Publisher)
              </label>
              <select
                id={publisherSelectId}
                name="publisherId"
                disabled={isSubmitting}
                className="h-8 w-full rounded border border-hairline-strong bg-bg px-2 font-mono text-xs text-paper transition-colors duration-180 hover:border-hairline focus:border-brass focus:outline-none"
              >
                <option value="">Tanpa Afiliasi (Mandiri)</option>
                {model?.publishers?.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor={categorySelectId} className="font-mono text-xs text-paper-dim">
                Kategori Taksonomi
              </label>
              <select
                id={categorySelectId}
                name="categoryId"
                disabled={isSubmitting}
                className="h-8 w-full rounded border border-hairline-strong bg-bg px-2 font-mono text-xs text-paper transition-colors duration-180 hover:border-hairline focus:border-brass focus:outline-none"
              >
                <option value="">Umum / Tanpa Kategori</option>
                {model?.categories?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor={authorSelectId} className="font-mono text-xs text-paper-dim">
                Atribusi Penulis (Author)
              </label>
              <select
                id={authorSelectId}
                name="authorId"
                disabled={isSubmitting}
                className="h-8 w-full rounded border border-hairline-strong bg-bg px-2 font-mono text-xs text-paper transition-colors duration-180 hover:border-hairline focus:border-brass focus:outline-none"
              >
                <option value="">Redaksi Bersama</option>
                {model?.authors?.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.displayName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor={titleInputId} className="font-mono text-xs text-paper-dim">
                Judul Artikel
              </label>
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
              <label htmlFor={slugInputId} className="font-mono text-xs text-paper-dim">
                URL Slug (Kanonikal)
              </label>
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
                Bila sudah dipakai, akhiran -2, -3 ditambahkan otomatis.
              </p>
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor={sourceInputId} className="font-mono text-xs text-paper-dim">
              Sumber / Verifikasi Rilis
            </label>
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
            <label htmlFor={tagsInputId} className="font-mono text-xs text-paper-dim">
              Topik (koma, maks. 10)
            </label>
            <Input
              id={tagsInputId}
              name="tags"
              disabled={isSubmitting}
              placeholder="cth: wonosobo, pertanian, apbd"
              className="h-8 rounded border-hairline-strong bg-bg px-2.5 font-mono text-xs text-paper transition-colors duration-180 hover:border-hairline focus-visible:ring-brass"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor={bodyInputId} className="font-mono text-xs text-paper-dim">
              Isi Naskah Lengkap (Plain Text / Paragraf Terstruktur)
            </label>
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
              Baris kosong = paragraf baru. Nomor [gambar:N] mengikuti urutan unggah di tab Media (pemilik artikel ini).
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
              <span>Simpan Draf Kanonikal</span>
            </button>
          </div>
        </form>
      </SectionCard>

      <SectionCard icon={Layers} title="Alokasi portal" eyebrow="Kanal tujuan">

        <form onSubmit={handleAssignSites} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor={assignArticleSelectId} className="font-mono text-xs text-paper-dim">
              Pilih Artikel Target
            </label>
            <select
              id={assignArticleSelectId}
              name="articleId"
              disabled={isAssigning}
              className="h-8 w-full rounded border border-hairline-strong bg-bg px-2 font-mono text-xs text-paper transition-colors duration-180 hover:border-hairline focus:border-brass focus:outline-none"
            >
              {model?.articles?.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.title}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <span className="block font-mono text-xs text-paper-dim">
              Kanal Distribusi Sinyal
            </span>
            <div className="max-h-60 space-y-1.5 overflow-y-auto rounded border border-hairline bg-bg p-3">
              {model?.sites?.length === 0 ? (
                <p className="m-0 font-mono text-xs text-paper-faint">
                  Tidak ada kanal aktif terdaftar.
                </p>
              ) : (
                model?.sites?.map((site) => (
                  <label
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
                  </label>
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
              <span>Terapkan Pemetaan Kanal</span>
            </button>
          </div>
        </form>

        <form onSubmit={handleSetViews} className="mt-5 space-y-3 border-t border-hairline pt-5">
          <p className="m-0 font-mono text-xs text-paper-dim">
            Jumlah tayang absolut (tayang perdana terisi otomatis 10rb-100rb; real menumpuk di atas angka ini)
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor={viewsArticleSelectId} className="font-mono text-xs text-paper-dim">
                Artikel
              </label>
              <select
                id={viewsArticleSelectId}
                name="viewsArticleId"
                disabled={isSettingViews}
                className="h-8 w-full rounded border border-hairline-strong bg-bg px-2 font-mono text-xs text-paper transition-colors duration-180 hover:border-hairline focus:border-brass focus:outline-none"
              >
                {model?.articles?.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.title}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label htmlFor={viewsSiteSelectId} className="font-mono text-xs text-paper-dim">
                Kanal
              </label>
              <select
                id={viewsSiteSelectId}
                name="viewsSiteId"
                disabled={isSettingViews}
                className="h-8 w-full rounded border border-hairline-strong bg-bg px-2 font-mono text-xs text-paper transition-colors duration-180 hover:border-hairline focus:border-brass focus:outline-none"
              >
                {model?.sites?.map((site) => (
                  <option key={site.id} value={site.id}>
                    {site.normalizedHostname}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="space-y-1.5">
            <label htmlFor={viewsCountInputId} className="font-mono text-xs text-paper-dim">
              Jumlah tayang
            </label>
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
            <span>Simpan tampilan manual</span>
          </button>
        </form>
      </SectionCard>
    </div>
  );
}