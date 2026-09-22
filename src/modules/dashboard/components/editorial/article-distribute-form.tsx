'use client';

import { useId, useMemo, useState, useTransition, type FormEvent } from 'react';
import { toast } from 'sonner';
import {
  Check,
  Layers,
  Loader2,
} from 'lucide-react';
import { SectionCard } from '@/modules/dashboard/components/shared/section-card';
import { EmptyState } from '@/modules/dashboard/components/empty-state';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SearchCombobox } from '@/modules/dashboard/components/shared/search-combobox';
import type {
  ArticleEntity,
  DomainEntity,
  SiteEntity,
} from '@/modules/dashboard/components/shared/types';

/**
 * Salurkan satu artikel kanonis ke situs-situs tenant tujuan.
 *
 * @param data - Proyeksi workspace (artikel, situs, domain, assignment aktif).
 * @param onAssign - Menulis assignment `article.sites.assign` untuk artikel terpilih.
 * @param command - Perintah workspace; wajib untuk mengisi jumlah tayang.
 * @param articleId - Bila diisi, pemilih artikel disembunyikan dan form terkunci ke artikel itu.
 * @returns Kartu penyaluran + pengisi jumlah tayang.
 */
export function ArticleDistributeForm({
  data,
  onAssign,
  command,
  articleId,
}: {
  readonly data: unknown;
  readonly onAssign: (payload: unknown) => Promise<unknown>;
  readonly command?: (action: string, payload: unknown) => Promise<unknown>;
  readonly articleId?: string | undefined;
}) {
  const model = data as {
    readonly sites?: readonly SiteEntity[];
    readonly domains?: readonly DomainEntity[];
    readonly articles?: readonly ArticleEntity[];
    readonly articleSites?: readonly { readonly articleId: string; readonly siteId: string }[];
  } | null;

  const assignArticleSelectId = useId();
  const seedCountInputId = useId();

  /** Domain groups excluded from distribution; empty means every domain is selected (default all). */
  const [assignExcluded, setAssignExcluded] = useState<readonly string[]>([]);
  const [isAssigning, startAssignTransition] = useTransition();
  const [isSeeding, startSeedTransition] = useTransition();

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
  const articleOptions = useMemo(() => (model?.articles ?? []).map((a) => ({ value: a.id, label: a.title })), [model?.articles]);
  /** No silent default: distribution requires an explicit article choice (or a locked articleId). */
  const [assignArticleId, setAssignArticleId] = useState<string | null>(null);
  const assignArticleValue = articleId ?? assignArticleId ?? '';
  /** Seeding only touches sites where the target article is already assigned. */
  const seedSiteIds = (model?.articleSites ?? []).filter((row) => row.articleId === assignArticleValue).map((row) => row.siteId);
  const lockedArticle = articleId === undefined ? null : (model?.articles ?? []).find((a) => a.id === articleId) ?? null;

  const handleAssignSites = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);

    if (assignArticleValue === '') {
      toast.error('Pilih artikel target dulu sebelum menyalurkan.');
      return;
    }
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
    <SectionCard icon={Layers} title="Penyaluran Artikel" eyebrow="Pilih domain tujuan">
      <form onSubmit={handleAssignSites} className="space-y-4">
        {articleId === undefined ? (
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
        ) : (
          <>
            <input type="hidden" name="articleId" value={articleId} />
            <p className="m-0 font-mono text-xs text-paper-dim">
              Artikel: <span className="text-paper">{lockedArticle?.title ?? articleId}</span>
            </p>
          </>
        )}

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
  );
}
