'use client';

import { Image as ImageIcon, ImagePlus, Images, SlidersHorizontal, Sparkles, Tags } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { SectionCard } from '@/modules/dashboard/components/shared/section-card';
import { CategoryCombobox } from '@/modules/dashboard/components/shared/category-combobox';
import { SearchCombobox } from '@/modules/dashboard/components/shared/search-combobox';
import { TagCombobox } from '@/modules/dashboard/components/shared/tag-combobox';
import { TAG_MAX_COUNT, normalizeTagList } from '@/modules/site/slug-allocator';
import { COVER_COMPRESS, formatBytes } from '@/modules/publishing/compress-image';
import { AiActionButton, AiPending } from '@/modules/ai/components/ai-action-button';
import { AppTooltip } from '@/ui/app-tooltip';
import { fileNameOf, LIBRARY_PAGE } from '@/modules/dashboard/components/editorial/article-form-types';
import type { ArticleFormState } from '@/modules/dashboard/components/editorial/use-article-form-state';

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
 * Inspektor artikel: hasil cari, atribusi, sampul, dan sumber.
 *
 * @param state - State, turunan memo, dan penangan aksi dari `useArticleFormState`.
 * @returns Kolom inspektor lengket dengan semua seksi metadata.
 */
export function ArticleInspectorFields({ state }: { readonly state: ArticleFormState }) {
  const {
    regionSelectId, nationalCheckId, citySelectId, publisherSelectId, authorSelectId,
    categoryInputId, featuredFileId, coverUrlInputId, sourceInputId, canonicalInputId, tagsInputId,
    librarySearchInputId, categoryIds, setCategoryIds, featuredId, featuredName, featuredPreviewUrl,
    featuredStatus, provinceId, setProvinceId, cityId, setCityId, isNational, setIsNational,
    isUnrestricted, nationalActive, uploadingFeatured, featuredAlt, setFeaturedAlt, featuredCaption,
    setFeaturedCaption, featuredFocal, coverBlobRef, coverRemoteRef, libraryOpen, libraryItems,
    libraryLoading, libraryError, libraryQuery, setLibraryQuery, setLibraryShown,
    libraryPreviews, savingFeaturedMeta, coverUrl, setCoverUrl, titleText, descriptionText,
    bodyText, isSubmitting, source, setSource, canonicalUrl, setCanonicalUrl, tags, setTags,
    setFeaturedId, setFeaturedOrgId, setFeaturedName, setFeaturedPreviewUrl, setFeaturedVersion,
    setFeaturedFocal,
    publisherId, authorId, regionOptions, cityOptions, publisherOptions, allCategories,
    defaultCategoryName, authorOptions, effectiveCategoryIds, selectedPublisher,
    foreignOwnerOrg, selectedAuthor, tagSuggestions, libraryFiltered, libraryVisible,
    handlePublisherChange, handleAuthorChange, handleCreateCategory, handleFeaturedFile,
    handleFeaturedMetaSave, handleFocalPick, captionCoverInline, classifyInline, openLibrary,
    pickLibraryCover, aiAction, aiReady,
  } = state;
  return (
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
              {isUnrestricted ? (
                <div className="flex items-start gap-2 rounded border border-hairline bg-bg p-2.5">
                  <Checkbox
                    id={nationalCheckId}
                    checked={isNational}
                    onCheckedChange={(checked) => {
                      const next = checked === true;
                      setIsNational(next);
                      if (next) {
                        setProvinceId(null);
                        setCityId(null);
                      }
                    }}
                    disabled={isSubmitting}
                    className="mt-0.5 border-hairline-strong data-checked:border-brass data-checked:bg-brass data-checked:text-bg"
                  />
                  <div className="min-w-0 space-y-0.5">
                    <Label htmlFor={nationalCheckId} className="font-mono text-xs text-paper">
                      Nasional — semua apex utama
                    </Label>
                    <p className="m-0 font-mono text-[11px] leading-relaxed text-paper-faint">
                      Tayang ke semua portal apex tanpa memilih wilayah; portal region dan kota tidak ikut.
                    </p>
                  </div>
                </div>
              ) : null}
              {nationalActive ? null : (
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
              )}

              {nationalActive || provinceId === null ? null : (
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
                <div className="flex items-baseline justify-between gap-2">
                  <Label htmlFor={categoryInputId} className="font-mono text-xs text-paper-dim">
                    Kategori ({effectiveCategoryIds.length} dipilih{effectiveCategoryIds.length === categoryIds.length || defaultCategoryName === null ? '' : ` · ${defaultCategoryName}`})
                  </Label>
                  <AppTooltip label="Isi kategori dan topik otomatis dari isi dengan AI" side="left">
                    <AiActionButton
                      busy={aiAction === 'classify'}
                      idleLabel="Lengkapi otomatis"
                      icon={Tags}
                      size="xs"
                      tone="primary"
                      disabled={!aiReady || bodyText.trim() === ''}
                      onClick={classifyInline}
                    />
                  </AppTooltip>
                </div>
                {aiAction === 'classify' ? <AiPending label="Mengklasifikasi kategori dan tag" rows={[100, 72]} /> : null}
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
                {foreignOwnerOrg !== null && selectedPublisher !== null ? (
                  <p className="m-0 font-mono text-[11px] text-brass">
                    {`Tersimpan untuk ${selectedPublisher.attributionLabel} — artikel dan fotonya milik organisasi tersebut.`}
                  </p>
                ) : null}
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
                        onClick={() => { coverBlobRef.current = null; coverRemoteRef.current = null; setFeaturedId(null); setFeaturedOrgId(null); setFeaturedName(''); setFeaturedPreviewUrl(null); setFeaturedVersion(null); setFeaturedAlt(''); setFeaturedCaption(''); setFeaturedFocal(null); }}
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
                    <div className="flex flex-wrap items-center gap-1.5">
                      <AppTooltip label="Susun teks alt dan caption dari gambar sampul dengan AI">
                        <AiActionButton
                          busy={aiAction === 'caption'}
                          idleLabel="Isi otomatis"
                          icon={Sparkles}
                          size="xs"
                          tone="primary"
                          disabled={!aiReady || featuredId === null}
                          onClick={captionCoverInline}
                          ariaLabel="Isi alt dan caption otomatis"
                        />
                      </AppTooltip>
                      {aiAction === 'caption' ? <AiPending label="Menyusun alt dan caption" /> : null}
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
                  <div className="space-y-2">
                    <div className="grid gap-2 rounded border border-hairline bg-bg p-2.5">
                      <Button
                        type="button"
                        variant="outline"
                        size="lg"
                        disabled={isSubmitting || uploadingFeatured}
                        className="w-full"
                        onClick={() => document.getElementById(featuredFileId)?.click()}
                      >
                        <ImagePlus className="h-4 w-4" aria-hidden="true" />
                        <span>{uploadingFeatured ? 'Mengunggah...' : 'Unggah sampul'}</span>
                      </Button>
                      <div className="flex items-center gap-2" aria-hidden="true">
                        <span className="h-px flex-1 bg-hairline" />
                        <span className="font-mono text-[11px] uppercase tracking-wider text-paper-faint">atau</span>
                        <span className="h-px flex-1 bg-hairline" />
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="lg"
                        disabled={isSubmitting || uploadingFeatured}
                        className="w-full"
                        onClick={openLibrary}
                        aria-expanded={libraryOpen}
                      >
                        <Images className="h-4 w-4" aria-hidden="true" />
                        <span>{libraryOpen ? 'Tutup pustaka' : 'Pilih dari pustaka'}</span>
                      </Button>
                    </div>
                    {libraryOpen ? (
                      <div className="space-y-2 rounded border border-hairline bg-bg p-2.5">
                        <Input
                          id={librarySearchInputId}
                          type="search"
                          value={libraryQuery}
                          onChange={(event) => { setLibraryQuery(event.target.value); setLibraryShown(LIBRARY_PAGE); }}
                          placeholder="Cari gambar di pustaka..."
                          aria-label="Cari gambar di pustaka"
                          className="h-8 rounded border-hairline-strong bg-bg-raised px-2.5 font-mono text-xs text-paper focus-visible:ring-brass"
                        />
                        {libraryLoading ? (
                          <p className="m-0 font-mono text-[11px] text-paper-faint">Memuat pustaka…</p>
                        ) : libraryError !== null ? (
                          <p className="m-0 font-mono text-[11px] text-error" role="alert">{libraryError}</p>
                        ) : libraryFiltered.length === 0 ? (
                          <p className="m-0 font-mono text-[11px] text-paper-faint">
                            {libraryItems === null ? 'Pustaka belum dimuat.' : 'Tidak ada gambar yang cocok. Unggah baru atau ubah kata kunci.'}
                          </p>
                        ) : (
                          <>
                            <div className="grid max-h-64 grid-cols-3 gap-1.5 overflow-y-auto">
                              {libraryVisible.map((item) => {
                                const preview = libraryPreviews[item.id];
                                return (
                                  <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => pickLibraryCover(item)}
                                    aria-label={`Pilih ${fileNameOf(item.objectKey)} sebagai sampul`}
                                    className="group min-w-0 overflow-hidden rounded border border-hairline bg-bg-raised text-left transition-colors duration-180 hover:border-brass"
                                  >
                                    {preview === undefined ? (
                                      <span className="flex h-20 items-center justify-center gap-1 bg-bg px-1">
                                        <ImageIcon className="h-4 w-4 flex-none text-paper-faint" aria-hidden="true" />
                                        <span className="truncate font-mono text-[10px] text-paper-faint">{formatBytes(item.sizeBytes)}</span>
                                      </span>
                                    ) : (
                                      // eslint-disable-next-line @next/next/no-img-element -- dashboard preview only; public delivery uses EditorialImage
                                      <img src={preview} alt={fileNameOf(item.objectKey)} className="h-20 w-full object-cover" />
                                    )}
                                    <span className="block truncate px-1.5 py-1 font-mono text-[10px] text-paper-dim">
                                      {fileNameOf(item.objectKey)}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                            <p className="m-0 font-mono text-[11px] tabular-nums text-paper-faint">
                              {libraryVisible.length.toLocaleString('id-ID')} dari {libraryFiltered.length.toLocaleString('id-ID')} gambar
                            </p>
                            {libraryVisible.length < libraryFiltered.length ? (
                              <Button
                                type="button"
                                variant="ghost"
                                size="xs"
                                onClick={() => setLibraryShown((shown) => shown + LIBRARY_PAGE)}
                                className="w-full"
                              >
                                <span>Tampilkan {(libraryFiltered.length - libraryVisible.length).toLocaleString('id-ID')} lagi</span>
                              </Button>
                            ) : null}
                          </>
                        )}
                      </div>
                    ) : null}
                  </div>
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
  );
}
