'use client';

import { Link2, Minus, Newspaper, Plus, RefreshCw, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { SLUG_MAX_LENGTH } from '@/modules/site/slug-allocator';
import { ArticlePreview } from '@/modules/dashboard/components/editorial/article-preview';
import { RichTextEditor } from '@/modules/dashboard/components/editorial/rich-text-editor';
import { AiActionButton, AiPending } from '@/modules/ai/components/ai-action-button';
import { AppTooltip } from '@/ui/app-tooltip';
import { ArticleModeFields } from '@/modules/dashboard/components/editorial/article-mode-fields';
import {
  ARTICLE_MODE_HINTS,
  ARTICLE_MODE_TABS,
} from '@/modules/dashboard/components/editorial/article-form-types';
import type { ArticleFormState } from '@/modules/dashboard/components/editorial/use-article-form-state';

/**
 * Kanvas tulis artikel: judul, slug, deskripsi, mode, dan editor isi.
 *
 * @param state - State, turunan memo, dan penangan aksi dari `useArticleFormState`.
 * @returns Kolom kanvas lengkap dengan tab tulis/pratinjau/sumber dan statistik.
 */
export function ArticleComposerFields({ state }: { readonly state: ArticleFormState }) {
  const {
    titleInputId, slugInputId, excerptInputId, bodyInputId, transcribeFullInputId, viewsInputId,
    titleText, handleTitleChange, slug, handleSlugChange, descriptionText, setDescriptionText,
    refineTitles, refineDescription, aiAction, aiReady, titleVariants, generatingTitles,
    bodyJsonProblem, setMode, mode, bodyText, transcribeFileInline, polished, polishRounds,
    setPolished, applyPolishedBody, bodyJsonDraft, richResetKey, handleRichChange, command,
    foreignOwnerOrg, polishBodyInline, isSubmitting,
    willPublish, viewsInput, setViewsInput, bumpViews, editorStats, statItems, featuredId,
    featuredPreviewUrl, coverUrl, articleType, setArticleType, videoUrl, setVideoUrl,
    audioUrl, setAudioUrl, durationInput, setDurationInput, isSponsored, setIsSponsored,
    modeProblem,
  } = state;
  const shortLength = articleType === 'short' ? bodyText.trim().length : null;
  const hasVideoCover = featuredId !== null || coverUrl.trim() !== '';
  return (
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
          <ArticleModeFields
            type={articleType}
            onTypeChange={setArticleType}
            videoUrl={videoUrl}
            onVideoUrlChange={setVideoUrl}
            audioUrl={audioUrl}
            onAudioUrlChange={setAudioUrl}
            durationInput={durationInput}
            onDurationInputChange={setDurationInput}
            isSponsored={isSponsored}
            onSponsoredChange={setIsSponsored}
            shortLength={shortLength}
            imageCount={editorStats.images}
            modeProblem={modeProblem}
            hasVideoCover={hasVideoCover}
            disabled={isSubmitting}
          />

            <div className="space-y-2 border-t border-hairline pt-8">
              <div className="flex items-center justify-between gap-2">
                <span id={`${bodyInputId}-label`} className="block font-mono text-[11px] uppercase tracking-wider text-paper-dim">
                  Isi Artikel
                </span>
                <div role="tablist" aria-label="Mode editor" className="flex gap-1 rounded-md border border-hairline bg-bg-raised p-0.5">
                  {ARTICLE_MODE_TABS.map((tab) => (
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
                {ARTICLE_MODE_HINTS[mode]}
              </p>
              <div className="space-y-2 rounded-md border border-hairline/70 bg-bg px-3 py-2.5" aria-label="Audio jadi berita">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                  <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-paper-faint">
                    <Newspaper className="h-3 w-3 text-brass" aria-hidden="true" />
                    <span>Audio jadi berita</span>
                  </span>
                  <span className="m-0 font-mono text-[11px] text-paper-faint">
                    Unggah rekaman — judul, isi, kategori, dan topik terisi otomatis. Tinjau sebelum menyimpan.
                  </span>
                  <AppTooltip label="Transkripsikan rekaman menjadi berita lengkap siap isi formulir">
                    <AiActionButton
                      busy={aiAction === 'transcribe'}
                      idleLabel="Pilih audio…"
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
                <>
                <RichTextEditor
                  key={richResetKey}
                  initialDoc={bodyJsonDraft}
                  onDocChange={handleRichChange}
                  command={command ?? (async () => { throw new Error('Unggahan media tidak tersedia di pratinjau.'); })}
                  ownerOrganizationId={foreignOwnerOrg}
                  onPolish={polishBodyInline}
                  polishBusy={aiAction === 'polish'}
                  polishDisabled={!aiReady || bodyText.trim() === ''}
                  polishLabel={polishRounds === 0 ? 'Poles isi' : 'Poles ulang'}
                  labelledBy={`${bodyInputId}-label`}
                  disabled={isSubmitting}
                />
                </>
              ) : mode === 'pratinjau' ? (
                <ArticlePreview
                  title={titleText}
                  description={descriptionText}
                  coverImageUrl={featuredPreviewUrl ?? (coverUrl.trim() === '' ? null : coverUrl.trim())}
                  doc={bodyJsonDraft}
                  command={command ?? (async () => null)}
                  ownerOrganizationId={foreignOwnerOrg}
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
  );
}
