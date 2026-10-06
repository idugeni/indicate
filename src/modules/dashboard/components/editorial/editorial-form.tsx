'use client';

import { useEffect, useState } from 'react';
import { ArrowLeft, Loader2, Send } from 'lucide-react';
import type { DashboardCommand } from '@/modules/dashboard/command';
import { Button } from '@/components/ui/button';
import { SearchCombobox } from '@/modules/dashboard/components/shared/search-combobox';
import { ArticleComposerFields } from '@/modules/dashboard/components/editorial/article-composer-fields';
import { ArticleInspectorFields } from '@/modules/dashboard/components/editorial/article-inspector-fields';
import {
  ARTICLE_PUBLISH_ON_SAVE_LABELS,
  ARTICLE_STATUS_OPTIONS,
  ARTICLE_SUBMIT_LABELS,
  type EditArticleInit,
} from '@/modules/dashboard/components/editorial/article-form-types';
import { useArticleFormState } from '@/modules/dashboard/components/editorial/use-article-form-state';
import { LiveblogUpdates } from '@/modules/dashboard/components/editorial/liveblog-updates';
import { normalizeArticleType } from '@/modules/site/article-type';

/**
 * Tulis satu artikel kanonis baru, atau ubah artikel existing dengan tampilan sama.
 *
 * @param data - Opsi wilayah, penerbit, kategori, penulis, dan artikel existing untuk saran tag.
 * @param onSubmit - Menyimpan `article.create`; media upload memakai command opsional.
 * @param command - Perintah workspace untuk unggah media editor kaya; tanpa ini unggahan gagal eksplisit.
 * @param organizationId - Tenant pemilik permintaan AI; kosong mematikan fitur AI.
 * @param editArticleId - Id artikel yang diubah; tanpa ini berarti mode buat baru.
 * @param onExitEdit - Keluar dari mode ubah (tombol kembali, simpan berhasil, atau gagal muat).
 * @returns Kanvas artikel terbuka + inspektor lengket (status, SEO, atribusi, sampul, sumber).
 */
export function ArticleCreateForm({
  data,
  onSubmit,
  command,
  organizationId = '',
  editArticleId,
  onExitEdit,
}: {
  readonly data: unknown;
  readonly onSubmit: (payload: unknown) => Promise<unknown>;
  readonly command?: DashboardCommand;
  readonly organizationId?: string | undefined;
  readonly editArticleId?: string | undefined;
  readonly onExitEdit?: (() => void) | undefined;
}) {
  if (typeof editArticleId === 'string' && editArticleId !== '') {
    return (
      <EditArticleLoader
        key={editArticleId}
        articleId={editArticleId}
        data={data}
        command={command}
        organizationId={organizationId}
        onExitEdit={onExitEdit}
      />
    );
  }
  return (
    <ArticleComposerForm data={data} onSubmit={onSubmit} command={command} organizationId={organizationId} />
  );
}

/**
 * Composer tulis/ubah artikel: bilah aksi lengket + kanvas dua kolom + inspektor.
 *
 * @param data - Opsi lookup seperti `ArticleCreateForm`.
 * @param onSubmit - Menyimpan `article.create` untuk mode buat baru.
 * @param command - Perintah workspace; wajib ada di mode ubah.
 * @param organizationId - Tenant aktif.
 * @param initialArticle - Artikel existing untuk mode ubah; tanpa ini berarti mode buat.
 * @param onEditSaved - Dipanggil setelah `article.update` berhasil.
 * @param onExitEdit - Tombol kembali ke daftar kelola.
 * @returns Formulir composer yang sama persis untuk buat dan ubah.
 */
function ArticleComposerForm({
  data,
  onSubmit,
  command,
  organizationId = '',
  initialArticle,
  onEditSaved,
  onExitEdit,
}: {
  readonly data: unknown;
  readonly onSubmit: (payload: unknown) => Promise<unknown>;
  readonly command?: DashboardCommand | undefined;
  readonly organizationId?: string | undefined;
  readonly initialArticle?: EditArticleInit | undefined;
  readonly onEditSaved?: (() => void) | undefined;
  readonly onExitEdit?: (() => void) | undefined;
}) {
  const form = useArticleFormState(
    command === undefined
      ? { data, onSubmit, organizationId, initialArticle, onEditSaved }
      : { data, onSubmit, command, organizationId, initialArticle, onEditSaved },
  );
  const {
    statusSelectId, status, setStatus,
    willPublish, isSubmitting,
    isEditing, editOriginalStatus,
    handleSaveArticle,
  } = form;
  const statusCoerced = editOriginalStatus !== null
    && !ARTICLE_STATUS_OPTIONS.some((option) => option.value === editOriginalStatus);
  return (
    <>
      {isEditing ? (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-brass/40 bg-brass/10 px-3 py-2.5 sm:px-4">
          <p className="m-0 font-sans text-xs text-paper">
            Mode ubah — {initialArticle?.title ?? 'memuat…'}
            {statusCoerced ? ' · dibuka dari arsip; simpan menjadikannya draf.' : null}
          </p>
          {onExitEdit === undefined ? null : (
            <Button type="button" variant="ghost" size="sm" onClick={onExitEdit} className="gap-1.5">
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Kembali ke daftar</span>
            </Button>
          )}
        </div>
      ) : null}
      <form noValidate onSubmit={handleSaveArticle}>
      <div className="sticky top-[60px] z-20 mb-6 grid grid-cols-2 items-center gap-2 overflow-hidden rounded-xl border border-hairline bg-bg/95 px-3 py-2 shadow-xl backdrop-blur sm:flex sm:flex-wrap sm:gap-3 sm:px-4 sm:py-2.5">
        <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-brass to-transparent" />
        <div className="min-w-0">
        <SearchCombobox
          id={statusSelectId}
          name="status"
          required
          disabled={isSubmitting}
          placeholder="Pilih status"
          value={status}
          onValueChange={(next) => { if (next !== null) setStatus(next); }}
          options={[...ARTICLE_STATUS_OPTIONS]}
          ariaLabel="Status artikel"
        />
        </div>
        <span className="hidden sm:block sm:flex-1" />
        <Button type="submit" variant="default" disabled={isSubmitting} className="w-full sm:w-auto">
          {isSubmitting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          ) : (
            <Send className="h-3.5 w-3.5" aria-hidden="true" />
          )}
          <span>{isEditing ? 'Simpan perubahan' : ((willPublish ? ARTICLE_PUBLISH_ON_SAVE_LABELS[status] : ARTICLE_SUBMIT_LABELS[status]) ?? 'Simpan Artikel')}</span>
        </Button>
      </div>
      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        <ArticleComposerFields state={form} />

        <ArticleInspectorFields state={form} />
      </div>
      </form>
      {isEditing && initialArticle !== undefined && normalizeArticleType(initialArticle.type) === 'liveblog' && command !== undefined ? (
        <div className="mt-6">
          <LiveblogUpdates articleId={initialArticle.id} articleTitle={initialArticle.title} command={command} />
        </div>
      ) : null}
    </>
  );
}

/**
 * Sempitkan respons `article.edit.load` menjadi nilai awal composer.
 *
 * @param value - Hasil `command('article.edit.load', ...)` yang belum tervalidasi.
 * @returns Nilai awal mode ubah; null bila bentuknya tak dikenali.
 */
function toEditArticleInit(value: unknown): EditArticleInit | null {
  if (typeof value !== 'object' || value === null) return null;
  const article = (value as { readonly article?: unknown }).article;
  if (typeof article !== 'object' || article === null) return null;
  const row = article as Record<string, unknown>;
  if (typeof row.id !== 'string' || typeof row.version !== 'number' || typeof row.slug !== 'string' || typeof row.title !== 'string' || typeof row.body !== 'string') {
    return null;
  }
  const text = (field: unknown, fallback = ''): string => (typeof field === 'string' ? field : fallback);
  const nullableText = (field: unknown): string | null => (typeof field === 'string' ? field : null);
  const stringList = (field: unknown): readonly string[] =>
    Array.isArray(field) ? field.filter((item): item is string => typeof item === 'string') : [];
  return {
    id: row.id,
    version: row.version,
    regionId: nullableText(row.regionId),
    publisherId: nullableText(row.publisherId),
    categoryIds: stringList(row.categoryIds),
    authorId: nullableText(row.authorId),
    leadMediaId: nullableText(row.leadMediaId),
    coverImageUrl: nullableText(row.coverImageUrl),
    slug: row.slug,
    title: row.title,
    excerpt: nullableText(row.excerpt),
    canonicalUrl: nullableText(row.canonicalUrl),
    body: row.body,
    bodyJson: row.bodyJson ?? null,
    source: text(row.source),
    tags: stringList(row.tags),
    status: text(row.status, 'draft'),
    type: text(row.type, 'standard'),
    isSponsored: row.isSponsored === true,
    videoUrl: nullableText(row.videoUrl),
    audioUrl: nullableText(row.audioUrl),
    durationSeconds: typeof row.durationSeconds === 'number' ? row.durationSeconds : null,
    scheduledAt: nullableText(row.scheduledAt),
  };
}

/**
 * Muat artikel lalu tampilkan composer yang sama persis dalam mode ubah.
 *
 * @param articleId - Id artikel yang diubah.
 * @param data - Opsi lookup seperti `ArticleCreateForm`.
 * @param command - Perintah workspace untuk `article.edit.load`.
 * @param organizationId - Org pemilik artikel (org aktif).
 * @param onExitEdit - Keluar dari mode ubah.
 * @returns Status muat, galat + tombol kembali, atau composer mode ubah.
 */
function EditArticleLoader({
  articleId,
  data,
  command,
  organizationId = '',
  onExitEdit,
}: {
  readonly articleId: string;
  readonly data: unknown;
  readonly command?: DashboardCommand | undefined;
  readonly organizationId?: string | undefined;
  readonly onExitEdit?: (() => void) | undefined;
}) {
  const [loaded, setLoaded] = useState<EditArticleInit | null>(null);
  const [failed, setFailed] = useState<string | null>(null);

  useEffect(() => {
    if (command === undefined || organizationId === '') return;
    let cancelled = false;
    void (async () => {
      try {
        const result = await command('article.edit.load', { id: articleId, ownerOrganizationId: organizationId });
        const init = toEditArticleInit(result);
        if (cancelled) return;
        if (init === null) {
          setFailed('Respons editor tak dikenali.');
          return;
        }
        setLoaded(init);
      } catch (error) {
        if (cancelled) return;
        setFailed(error instanceof Error && error.message !== '' ? error.message : 'Gagal memuat artikel.');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [articleId, command, organizationId]);

  if (command === undefined || organizationId === '') {
    return (
      <div className="space-y-3 rounded-xl border border-hairline bg-bg p-4 sm:p-5">
        <p className="m-0 font-sans text-sm text-paper">Perintah pemuatan tidak tersedia. Muat ulang lalu coba lagi.</p>
        {onExitEdit === undefined ? null : (
          <Button type="button" variant="outline" size="sm" onClick={onExitEdit} className="gap-1.5">
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Kembali ke daftar</span>
          </Button>
        )}
      </div>
    );
  }

  if (failed !== null) {
    return (
      <div className="space-y-3 rounded-xl border border-hairline bg-bg p-4 sm:p-5">
        <p className="m-0 font-sans text-sm text-paper">Gagal memuat artikel untuk diubah: {failed}</p>
        {onExitEdit === undefined ? null : (
          <Button type="button" variant="outline" size="sm" onClick={onExitEdit} className="gap-1.5">
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Kembali ke daftar</span>
          </Button>
        )}
      </div>
    );
  }

  if (loaded === null) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-hairline bg-bg p-4 font-sans text-sm text-paper-dim sm:p-5" role="status">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        Memuat artikel…
      </div>
    );
  }

  /**
   * Composer di-mount hanya setelah daftar wilayah tiba: pilihan
   * wilayah/kota diinisialisasi malas dari regionId, dan daftar yang
   * datang belakangan tidak boleh menimpa pilihan pengguna.
   */
  const regionsReady = typeof data === 'object' && data !== null && Array.isArray((data as { readonly regions?: unknown }).regions);
  if (!regionsReady) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-hairline bg-bg p-4 font-sans text-sm text-paper-dim sm:p-5" role="status">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        Memuat artikel…
      </div>
    );
  }

  return (
    <ArticleComposerForm
      data={data}
      onSubmit={async () => null}
      command={command}
      organizationId={organizationId}
      initialArticle={loaded}
      onEditSaved={onExitEdit}
      onExitEdit={onExitEdit}
    />
  );
}
