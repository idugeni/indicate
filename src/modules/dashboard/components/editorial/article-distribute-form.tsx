'use client';

import { useId, useMemo, useState, useTransition, type FormEvent } from 'react';
import { toast } from 'sonner';
import {
  Check,
  Layers,
  Loader2,
} from 'lucide-react';
import type { DashboardCommand } from '@/modules/dashboard/command';
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
  readonly command?: DashboardCommand;
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
  const assignQueryInputId = useId();

  /** Domain groups excluded from distribution; empty means every domain is selected (default all). */
  const [assignExcluded, setAssignExcluded] = useState<readonly string[]>([]);
  const [expandedGroupIds, setExpandedGroupIds] = useState<readonly string[]>([]);
  const [assignQuery, setAssignQuery] = useState('');
  const [isAssigning, startAssignTransition] = useTransition();
  const [isSeeding, startSeedTransition] = useTransition();

  const assignSites = useMemo(() => model?.sites ?? [], [model?.sites]);
  const assignDomains = useMemo(() => model?.domains ?? [], [model?.domains]);
  const assignGroups = useMemo(() => {
    const domainIds = new Set(assignDomains.map((domain) => domain.id));
    const byDomain = new Map<string, SiteEntity[]>();
    const orphan: SiteEntity[] = [];
    for (const site of assignSites) {
      const key = site.domainId ?? '';
      if (key === '' || !domainIds.has(key)) {
        orphan.push(site);
        continue;
      }
      const bucket = byDomain.get(key);
      if (bucket === undefined) byDomain.set(key, [site]);
      else bucket.push(site);
    }
    /**
     * A domain offers exactly one assignable portal: its apex.
     *
     * @remarks An apex hostname is its domain verbatim, while a region or city
     * portal always carries a leading label, so the apex is identifiable without
     * a level column. It is also the only correct target, because a region reads
     * its cities' articles and an apex reads its whole subtree: assigning one
     * article to every portal of a domain would list it once per portal on the
     * ancestors.
     */
    return [
      ...assignDomains
        .filter((domain) => (byDomain.get(domain.id)?.length ?? 0) > 0)
        .map((domain) => {
          const all = byDomain.get(domain.id) ?? [];
          const apex = all.find((site) => site.normalizedHostname === domain.normalizedHostname) ?? all.find((site) => site.regionId == null) ?? all[0];
          return { id: domain.id, label: domain.normalizedHostname, sites: apex === undefined ? [] : [apex], portalCount: all.length };
        }),
      ...(orphan.length > 0 ? [{ id: '__tanpa-domain__', label: 'Lainnya', sites: orphan, portalCount: orphan.length }] : []),
    ];
  }, [assignDomains, assignSites]);
  const isAssignGroupChecked = (id: string) => !assignExcluded.includes(id);
  const toggleAssignGroup = (id: string) => {
    setAssignExcluded((prev) => (prev.includes(id) ? prev.filter((excluded) => excluded !== id) : [...prev, id]));
  };
  const matchedAssignGroups = useMemo(() => {
    const needle = assignQuery.trim().toLowerCase();
    if (needle === '') return assignGroups;
    return assignGroups.filter((group) => group.label.toLowerCase().includes(needle) || group.sites.some((site) => site.normalizedHostname.toLowerCase().includes(needle)));
  }, [assignGroups, assignQuery]);
  const selectedSiteTotal = assignGroups
    .filter((group) => isAssignGroupChecked(group.id))
    .reduce((total, group) => total + group.sites.length, 0);
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
    const siteIds = assignGroups
      .filter((group) => isAssignGroupChecked(group.id))
      .flatMap((group) => group.sites.map((site) => site.id));
    if (siteIds.length === 0) {
      toast.error('Pilih minimal satu situs tujuan.');
      return;
    }
    startAssignTransition(async () => {
      await onAssign({
        articleId: formData.get('articleId'),
        siteIds,
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
    if (!Number.isFinite(viewCount) || viewCount < 0 || viewCount > 1_000_000_000) {
      toast.error('Jumlah tayang harus angka 0 sampai 1.000.000.000.');
      return;
    }
    startSeedTransition(async () => {
      try {
        const result = (await command('article.sites.views.setMany', { articleId: assignArticleValue, siteIds: seedSiteIds, viewCount }, { refresh: true })) as {
          readonly updated?: unknown;
          readonly missing?: unknown;
        } | null;
        const updated = typeof result?.updated === 'number' ? result.updated : 0;
        const missingCount = Array.isArray(result?.missing) ? result.missing.length : 0;
        if (updated === 0) toast.error('Gagal menyimpan jumlah tayang.');
        else {
          toast.success(`Jumlah tayang tersimpan untuk ${updated} situs.`);
          if (missingCount > 0) toast.info(`${missingCount} situs belum tersalurkan - salurkan dulu sebelum mengisi tayangan.`);
        }
        form.reset();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Gagal menyimpan jumlah tayang.');
      }
    });
  };

  return (
    <SectionCard icon={Layers} title="Penyaluran Artikel" eyebrow="Pilih domain tujuan">
      <form noValidate onSubmit={handleAssignSites} className="space-y-4">
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
              Artikel: <span className="text-paper">{lockedArticle?.title ?? (articleId ? 'Artikel terpilih' : 'Belum dipilih')}</span>
            </p>
          </>
        )}

        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="block font-mono text-[11px] font-medium uppercase tracking-wider text-paper-dim">
              Domain tujuan
            </span>
            <span className="font-mono text-[11px] tabular-nums text-paper-faint">
              {matchedAssignGroups.length.toLocaleString('id-ID')} dari {assignGroups.length.toLocaleString('id-ID')} domain · {selectedSiteTotal.toLocaleString('id-ID')} situs terpilih
            </span>
          </div>
          <p className="m-0 font-sans text-[11px] leading-relaxed text-paper-faint">
            Pilih portal apex yang akan menayangkan artikel; portal region dan kota di bawahnya tidak dipilih satu per satu.
            Artikel di portal kota otomatis ikut tampil di region dan apex di atasnya, sedangkan artikel yang
            ditayangkan di apex hanya tampil di apex itu sendiri.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              id={assignQueryInputId}
              type="search"
              value={assignQuery}
              disabled={isAssigning}
              onChange={(event) => setAssignQuery(event.target.value)}
              placeholder="Cari domain tujuan"
              aria-label="Cari domain tujuan"
              className="h-8 min-w-0 flex-1 rounded border-hairline-strong bg-bg px-2.5 font-mono text-xs text-paper focus-visible:ring-brass"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isAssigning || matchedAssignGroups.length === 0}
              onClick={() => setAssignExcluded((prev) => [...new Set([...prev, ...assignGroups.filter((group) => !matchedAssignGroups.some((match) => match.id === group.id)).map((group) => group.id)])])}
            >
              Pilih semua yang cocok
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={isAssigning || assignExcluded.length === 0}
              onClick={() => setAssignExcluded([])}
            >
              Pilih semuanya
            </Button>
          </div>
          <div className="max-h-60 space-y-1.5 overflow-y-auto rounded border border-hairline bg-bg p-3">
            {assignSites.length === 0 ? (
              <EmptyState title="Belum ada situs aktif." description="Data akan tampil di sini setelah tersedia." />
            ) : matchedAssignGroups.length === 0 ? (
              <p className="m-0 font-sans text-xs text-paper-faint">Tidak ada domain yang cocok dengan "{assignQuery.trim()}".</p>
            ) : (
              matchedAssignGroups.map((group) => {
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
                      <span className="min-w-0 flex-1 truncate font-mono text-xs text-paper">
                        {group.label}
                      </span>
                      <span aria-hidden="true" className="font-mono text-[11px] tabular-nums text-paper-faint">
                        {group.sites.length} portal apex
                      </span>
                    </Label>
                    <div className="ml-9 pb-1.5">
                      <Button
                        type="button"
                        variant="link"
                        size="xs"
                        disabled={isAssigning}
                        aria-expanded={expandedGroupIds.includes(group.id)}
                        aria-controls={`assign-sites-${group.id}`}
                        onClick={() => setExpandedGroupIds((prev) => (prev.includes(group.id) ? prev.filter((id) => id !== group.id) : [...prev, group.id]))}
                        className="h-auto p-0 font-mono text-[11px] text-paper-faint hover:text-paper"
                      >
                        <span>{expandedGroupIds.includes(group.id) ? 'Sembunyikan' : `Lihat ${group.portalCount.toLocaleString('id-ID')} portal`}</span>
                      </Button>
                      {expandedGroupIds.includes(group.id) ? (
                        <ul id={`assign-sites-${group.id}`} className="m-0 mt-1 list-none space-y-0.5 p-0">
                          {group.sites.map((site) => (
                            <li key={site.id} className="font-mono text-[11px] text-paper-dim">
                              {site.normalizedHostname}
                            </li>
                          ))}
                          {group.portalCount > group.sites.length ? (
                            <li className="font-sans text-[11px] text-paper-faint">
                              {(group.portalCount - group.sites.length).toLocaleString('id-ID')} portal region/kota di bawahnya
                              menampilkan artikel ini otomatis.
                            </li>
                          ) : null}
                        </ul>
                      ) : null}
                    </div>
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

      <form noValidate onSubmit={handleSeedViews} className="mt-5 flex flex-wrap items-end gap-2 border-t border-hairline pt-5">
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
