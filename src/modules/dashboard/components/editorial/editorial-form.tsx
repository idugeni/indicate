'use client';

import { Loader2, Send } from 'lucide-react';
import type { DashboardCommand } from '@/modules/dashboard/command';
import { Button } from '@/components/ui/button';
import { SearchCombobox } from '@/modules/dashboard/components/shared/search-combobox';
import { ArticleComposerFields } from '@/modules/dashboard/components/editorial/article-composer-fields';
import { ArticleInspectorFields } from '@/modules/dashboard/components/editorial/article-inspector-fields';
import {
  ARTICLE_PUBLISH_ON_SAVE_LABELS,
  ARTICLE_STATUS_OPTIONS,
  ARTICLE_SUBMIT_LABELS,
} from '@/modules/dashboard/components/editorial/article-form-types';
import { useArticleFormState } from '@/modules/dashboard/components/editorial/use-article-form-state';

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
  const form = useArticleFormState(
    command === undefined ? { data, onSubmit, organizationId } : { data, onSubmit, command, organizationId },
  );
  const {
    statusSelectId, status, setStatus,
    willPublish, isSubmitting,
    handleCreateArticle,
  } = form;
  return (
    <form noValidate onSubmit={handleCreateArticle}>
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
          <span>{(willPublish ? ARTICLE_PUBLISH_ON_SAVE_LABELS[status] : ARTICLE_SUBMIT_LABELS[status]) ?? 'Simpan Artikel'}</span>
        </Button>
      </div>
      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        <ArticleComposerFields state={form} />

        <ArticleInspectorFields state={form} />
      </div>
    </form>
  );
}
