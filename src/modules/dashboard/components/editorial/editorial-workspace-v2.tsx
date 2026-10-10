'use client';

import { useEffect, useState } from 'react';
import { ArrowLeft, CheckCircle2, FileText, Loader2, Save, Send, ShieldCheck } from 'lucide-react';
import type { DashboardCommand } from '@/modules/dashboard/command';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ArticleComposerFields } from '@/modules/dashboard/components/editorial/article-composer-fields';
import { ArticleInspectorFields } from '@/modules/dashboard/components/editorial/article-inspector-fields';
import {
  ARTICLE_PUBLISH_ON_SAVE_LABELS,
  ARTICLE_STATUS_OPTIONS,
  ARTICLE_SUBMIT_LABELS,
  type EditArticleInit,
} from '@/modules/dashboard/components/editorial/article-form-types';
import { useArticleFormState, type ArticleFormState } from '@/modules/dashboard/components/editorial/use-article-form-state';
import { LiveblogUpdates } from '@/modules/dashboard/components/editorial/liveblog-updates';
import { normalizeArticleType } from '@/modules/site/article-type';

function toEditArticleInit(value: unknown): EditArticleInit | null {
  if (typeof value !== 'object' || value === null) return null;
  const article = (value as { readonly article?: unknown }).article;
  if (typeof article !== 'object' || article === null) return null;
  const row = article as Record<string, unknown>;
  if (
    typeof row.id !== 'string' ||
    typeof row.version !== 'number' ||
    typeof row.slug !== 'string' ||
    typeof row.title !== 'string' ||
    typeof row.body !== 'string'
  ) return null;
  const text = (field: unknown, fallback = '') => (typeof field === 'string' ? field : fallback);
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

function readiness(state: ArticleFormState) {
  const checks = [
    { label: 'Judul', ok: state.titleText.trim().length > 0 },
    { label: 'Slug', ok: state.slug.trim().length > 0 },
    { label: 'Wilayah', ok: state.provinceId !== null || state.nationalActive },
    { label: 'Isi', ok: state.bodyText.trim().length > 0 && state.bodyJsonProblem === null },
    { label: 'Kategori', ok: state.effectiveCategoryIds.length > 0 },
  ];
  const passed = checks.filter((item) => item.ok).length;
  return { checks, passed, total: checks.length, percent: Math.round((passed / checks.length) * 100) };
}

function WorkspaceSurface({
  form,
  onExitEdit,
  initialArticle,
  command,
}: {
  readonly form: ArticleFormState;
  readonly onExitEdit?: (() => void) | undefined;
  readonly initialArticle?: EditArticleInit | undefined;
  readonly command?: DashboardCommand;
}) {
  const {
    status,
    setStatus,
    isSubmitting,
    isEditing,
    willPublish,
    statusSelectId,
    handleSaveArticle,
    editorStats,
    targetLabel,
    targetSiteIds,
    bodyJsonProblem,
    modeProblem,
  } = form;
  const health = readiness(form);
  const statusCoerced =
    form.editOriginalStatus !== null &&
    !ARTICLE_STATUS_OPTIONS.some((option) => option.value === form.editOriginalStatus);

  return (
    <form noValidate onSubmit={handleSaveArticle} className="space-y-5">
      <header className="rounded-2xl border border-hairline bg-bg-raised/80 p-4 shadow-sm sm:p-5 lg:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="m-0 font-mono text-[10px] uppercase tracking-[0.18em] text-brass">05 / Editorial Workspace</p>
            <div className="mt-2 flex items-center gap-2">
              <FileText className="h-5 w-5 flex-none text-brass" aria-hidden="true" />
              <h1 className="m-0 truncate text-xl font-semibold tracking-tight text-paper sm:text-2xl">
                {isEditing ? 'Edit & Prepare' : 'Create & Prepare'}
              </h1>
            </div>
            <p className="m-0 mt-1 max-w-3xl text-sm leading-6 text-paper-faint">
              Ruang kerja editorial terpusat untuk menulis, mengoptimalkan metadata, memeriksa kesiapan, lalu menyimpan atau menerbitkan artikel.
            </p>
          </div>
          {isEditing && onExitEdit ? (
            <Button type="button" variant="outline" size="sm" onClick={onExitEdit} className="gap-1.5">
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              Kembali ke library
            </Button>
          ) : null}
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_180px_auto]">
          <div className="rounded-lg border border-hairline bg-bg p-3">
            <p className="m-0 font-mono text-[10px] uppercase tracking-wider text-paper-faint">Readiness</p>
            <div className="mt-2 flex items-center gap-3">
              <Progress value={health.percent} aria-label="Kesiapan artikel" className="h-1.5 flex-1" />
              <span className="font-mono text-xs tabular-nums text-paper">{health.passed}/{health.total}</span>
            </div>
          </div>
          <div className="rounded-lg border border-hairline bg-bg p-3">
            <p className="m-0 font-mono text-[10px] uppercase tracking-wider text-paper-faint">Draft metrics</p>
            <p className="m-0 mt-2 font-mono text-sm tabular-nums text-paper">
              {editorStats.words.toLocaleString('id-ID')} kata · {editorStats.minutes} mnt
            </p>
          </div>
          <div className="flex items-center justify-start gap-2 lg:justify-end">
            <Badge variant="outline" className="font-mono text-[10px] uppercase">
              {isEditing ? 'Editing' : 'New article'}
            </Badge>
          </div>
        </div>
      </header>

      <div className="sticky top-[60px] z-30 rounded-xl border border-hairline bg-bg/95 p-3 shadow-xl backdrop-blur sm:p-3.5">
        <div className="flex flex-wrap items-center gap-2">
          <div className="min-w-[170px] flex-1 sm:max-w-[220px]">
            <label htmlFor={statusSelectId} className="sr-only">Status artikel</label>
            <select
              id={statusSelectId}
              value={status}
              disabled={isSubmitting}
              onChange={(event) => setStatus(event.target.value)}
              className="h-9 w-full rounded-md border border-hairline-strong bg-bg px-2.5 text-sm text-paper outline-none focus:border-brass focus:ring-1 focus:ring-brass"
            >
              {ARTICLE_STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
          <div className="hidden flex-1 sm:block" />
          <div className="flex w-full justify-end sm:w-auto">
            <Button type="submit" disabled={isSubmitting} className="w-full gap-1.5 sm:w-auto">
              {isSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : willPublish ? <Send className="h-3.5 w-3.5" aria-hidden="true" /> : isEditing ? <Save className="h-3.5 w-3.5" aria-hidden="true" /> : <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />}
              {isEditing ? 'Simpan perubahan' : ((willPublish ? ARTICLE_PUBLISH_ON_SAVE_LABELS[status] : ARTICLE_SUBMIT_LABELS[status]) ?? 'Simpan Artikel')}
            </Button>
          </div>
        </div>
        {statusCoerced ? (
          <p className="m-0 mt-2 text-xs text-warning">Artikel arsip dibuka sebagai draf; status arsip tidak dapat diteruskan langsung.</p>
        ) : null}
      </div>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <section aria-label="Editorial canvas" className="min-w-0 space-y-5">
          <div className="rounded-2xl border border-hairline bg-bg-raised/60 p-3 sm:p-5">
            <div className="mb-4 flex items-center justify-between gap-3 border-b border-hairline pb-3">
              <div>
                <p className="m-0 font-mono text-[10px] uppercase tracking-wider text-brass">Writing canvas</p>
                <p className="m-0 mt-1 text-xs text-paper-faint">Konten utama dan rich media</p>
              </div>
              <Badge variant="outline" className="font-mono text-[10px]">{modeProblem === null ? 'Ready' : 'Needs review'}</Badge>
            </div>
            <ArticleComposerFields state={form} />
          </div>
        </section>

        <aside aria-label="Editorial inspector" className="min-w-0 xl:sticky xl:top-[138px]">
          <div className="rounded-2xl border border-hairline bg-bg-raised/60 p-3 sm:p-5">
            <div className="mb-4 flex items-center justify-between gap-3 border-b border-hairline pb-3">
              <div>
                <p className="m-0 font-mono text-[10px] uppercase tracking-wider text-brass">Publication inspector</p>
                <p className="m-0 mt-1 text-xs text-paper-faint">Metadata, SEO, cover, attribution, targeting</p>
              </div>
              <Badge variant="outline" className="font-mono text-[10px]">{targetSiteIds.length} target</Badge>
            </div>
            <ArticleInspectorFields state={form} />
          </div>

          <div className="mt-4 rounded-xl border border-hairline bg-bg-raised/60 p-4">
            <p className="m-0 font-mono text-[10px] uppercase tracking-wider text-paper-faint">Preflight</p>
            <div className="mt-3 space-y-2">
              {health.checks.map((check) => (
                <div key={check.label} className="flex items-center gap-2 text-xs">
                  <CheckCircle2 className={check.ok ? 'h-3.5 w-3.5 text-success' : 'h-3.5 w-3.5 text-paper-faint'} aria-hidden="true" />
                  <span className={check.ok ? 'text-paper' : 'text-paper-faint'}>{check.label}</span>
                </div>
              ))}
            </div>
            {bodyJsonProblem ? <p className="m-0 mt-3 text-xs text-error">{bodyJsonProblem}</p> : null}
            <p className="m-0 mt-3 border-t border-hairline pt-3 text-xs text-paper-faint">
              {willPublish ? ('Mode publikasi: ' + status + ' · ' + targetLabel) : 'Mode penyimpanan: draf/editorial review.'}
            </p>
          </div>
        </aside>
      </div>

      {isEditing && initialArticle && normalizeArticleType(initialArticle.type) === 'liveblog' && command ? (
        <LiveblogUpdates articleId={initialArticle.id} articleTitle={initialArticle.title} command={command} />
      ) : null}
    </form>
  );
}

function toEditLoadError(value: unknown): string | null {
  if (typeof value !== 'object' || value === null) return null;
  const envelope = value as { readonly error?: unknown; readonly requestId?: unknown };
  if (typeof envelope.error !== 'object' || envelope.error === null) return null;
  const error = envelope.error as { readonly code?: unknown; readonly message?: unknown };
  const requestSuffix = typeof envelope.requestId === 'string' && envelope.requestId !== ''
    ? ` (ID permintaan: ${envelope.requestId})`
    : '';
  if (error.code === 'RESOURCE_UNAVAILABLE') {
    return `Akses ke artikel ditolak atau artikel tidak berada dalam organisasi yang dipilih. Periksa organisasi pemilik dan izin akses Anda.${requestSuffix}`;
  }
  if (typeof error.message === 'string' && error.message.trim() !== '') return `${error.message}${requestSuffix}`;
  return `Artikel gagal dimuat.${requestSuffix}`;
}

function EditorLoader({
  articleId,
  data,
  command,
  organizationId,
  ownerOrganizationId,
  onExitEdit,
}: {
  readonly articleId: string;
  readonly data: unknown;
  readonly command: DashboardCommand;
  readonly organizationId: string;
  readonly ownerOrganizationId?: string | undefined;
  readonly onExitEdit?: (() => void) | undefined;
}) {
  const effectiveOwnerOrganizationId = ownerOrganizationId ?? organizationId;
  const [loaded, setLoaded] = useState<EditArticleInit | null>(null);
  const [failed, setFailed] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const result = await command('article.edit.load', { id: articleId, ownerOrganizationId: effectiveOwnerOrganizationId });
        if (cancelled) return;
        const loadError = toEditLoadError(result);
        if (loadError !== null) {
          setFailed(loadError);
          return;
        }
        const init = toEditArticleInit(result);
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
    return () => { cancelled = true; };
  }, [articleId, command, effectiveOwnerOrganizationId]);

  if (failed) {
    return (
      <div role="alert" className="rounded-2xl border border-error/30 bg-error/[0.06] p-5">
        <p className="m-0 text-sm text-paper">Gagal memuat artikel untuk diubah: {failed}</p>
        {onExitEdit ? <Button type="button" variant="outline" size="sm" onClick={onExitEdit} className="mt-3">Kembali ke library</Button> : null}
      </div>
    );
  }

  if (!loaded) {
    return (
      <div role="status" className="flex items-center gap-2 rounded-2xl border border-hairline bg-bg-raised p-5 text-sm text-paper-dim">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        Memuat artikel…
      </div>
    );
  }

  const regionsReady = typeof data === 'object' && data !== null && Array.isArray((data as { readonly regions?: unknown }).regions);
  if (!regionsReady) {
    return (
      <div role="status" className="flex items-center gap-2 rounded-2xl border border-hairline bg-bg-raised p-5 text-sm text-paper-dim">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        Menyiapkan referensi editorial…
      </div>
    );
  }

  return (
    <LoadedEditor
      data={data}
      command={command}
      organizationId={organizationId}
      initialArticle={loaded}
      onExitEdit={onExitEdit}
    />
  );
}

function LoadedEditor({
  data,
  command,
  organizationId,
  initialArticle,
  onExitEdit,
}: {
  readonly data: unknown;
  readonly command: DashboardCommand;
  readonly organizationId: string;
  readonly initialArticle: EditArticleInit;
  readonly onExitEdit?: (() => void) | undefined;
}) {
  const form = useArticleFormState({
    data,
    onSubmit: async () => null,
    command,
    organizationId,
    initialArticle,
    onEditSaved: onExitEdit,
  });

  return <WorkspaceSurface form={form} onExitEdit={onExitEdit} initialArticle={initialArticle} command={command} />;
}

function CreateEditor({
  data,
  onSubmit,
  command,
  organizationId,
  onExitEdit,
}: {
  readonly data: unknown;
  readonly onSubmit: (payload: unknown) => Promise<unknown>;
  readonly command: DashboardCommand;
  readonly organizationId: string;
  readonly onExitEdit?: (() => void) | undefined;
}) {
  const form = useArticleFormState({
    data,
    onSubmit,
    command,
    organizationId,
  });

  return <WorkspaceSurface form={form} onExitEdit={onExitEdit} command={command} />;
}

export function EditorialWorkspaceV2({
  data,
  onSubmit,
  command,
  organizationId = '',
  editArticleId,
  editOwnerOrganizationId,
  onExitEdit,
}: {
  readonly data: unknown;
  readonly onSubmit: (payload: unknown) => Promise<unknown>;
  readonly command: DashboardCommand;
  readonly organizationId?: string;
  readonly editArticleId?: string | undefined;
  readonly editOwnerOrganizationId?: string | undefined;
  readonly onExitEdit?: () => void;
}) {
  if (editArticleId) {
    return (
      <EditorLoader
        key={editArticleId}
        articleId={editArticleId}
        data={data}
        command={command}
        organizationId={organizationId}
        ownerOrganizationId={editOwnerOrganizationId}
        onExitEdit={onExitEdit}
      />
    );
  }

  return (
    <CreateEditor
      data={data}
      onSubmit={onSubmit}
      command={command}
      organizationId={organizationId}
      onExitEdit={onExitEdit}
    />
  );
}
