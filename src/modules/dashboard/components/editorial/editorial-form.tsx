'use client';

import { Loader2, Send } from 'lucide-react';
import type { DashboardCommand } from '@/modules/dashboard/command';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { DateTimeField } from '@/modules/dashboard/components/shared/date-time-field';
import { SearchCombobox } from '@/modules/dashboard/components/shared/search-combobox';
import { AppTooltip } from '@/ui/app-tooltip';
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
    statusSelectId, publishOnSaveId, status, setStatus, rawScheduleInput, setRawScheduleInput,
    rawPublishDateInput, setRawPublishDateInput, titleText, descriptionText, editorStats,
    publishOnSave, setPublishOnSave, targetSiteIds, targetLabel, willPublish, isSubmitting,
    handleCreateArticle, editorPinned,
  } = form;
  return (
    <form noValidate onSubmit={handleCreateArticle}>
      <div className={`${editorPinned ? 'relative' : 'sticky top-[60px] z-20'} mb-6 grid grid-cols-2 items-center gap-2 rounded-lg border border-hairline bg-bg/95 px-3 py-2 shadow-lg backdrop-blur sm:flex sm:flex-wrap sm:gap-3 sm:px-4 sm:py-2.5`}>
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
        <div className="min-w-0 justify-self-end sm:justify-self-auto">
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
        {status !== 'scheduled' && status !== 'active' ? (
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
        ) : null}
        </div>
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
          <span className="justify-self-end text-right font-mono text-[11px] tabular-nums text-paper-faint">
            {targetSiteIds.length.toLocaleString('id-ID')} {targetLabel}
          </span>
        ) : (
          <span className="hidden sm:block sm:flex-1" />
        )}
        <Button type="submit" variant="default" disabled={isSubmitting} className="col-span-2 w-full sm:col-span-1 sm:w-auto">
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
