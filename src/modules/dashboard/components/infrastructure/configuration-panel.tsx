'use client';

import {
  useId,
  useMemo,
  useState,
  useTransition,
  type FormEvent,
} from 'react';
import { toast } from 'sonner';
import {
  Check,
  FolderPlus,
  Globe,
  Layers,
  Loader2,
  Plus,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DashboardSelect, DashboardSelectItem } from '@/modules/dashboard/components/shared/dashboard-select';
import { SearchCombobox } from '@/modules/dashboard/components/shared/search-combobox';
import { SectionCard } from '@/modules/dashboard/components/shared/section-card';
import type { DomainEntity, RegionEntity, SiteEntity } from '@/modules/dashboard/components/shared/types';
import { MediaPolicySection } from '@/modules/dashboard/components/infrastructure/media-policy-section';
import { PolicyOverviewSection } from '@/modules/dashboard/components/infrastructure/policy-overview-section';
import { slugify } from '@/modules/site/slugify';

interface ConfigurationPanelProps {
  readonly data: unknown;
  readonly command: (action: string, payload: unknown) => Promise<unknown>;
}

interface ConfigurationModel {
  readonly domains?: readonly DomainEntity[];
  readonly regions?: readonly RegionEntity[];
  readonly sites?: readonly SiteEntity[];
}

function sanitizeHostname(raw: string): string {
  return (raw
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//i, '')
    .split('/')[0] ?? '')
    .replace(/[^a-z0-9.-]/g, '');
}

export function ConfigurationPanel({
  data,
  command,
}: ConfigurationPanelProps) {
  const model = data as ConfigurationModel | null;

  const domains = useMemo(() => model?.domains ?? [], [model]);
  const regions = useMemo(() => model?.regions ?? [], [model]);
  const sites = useMemo(() => model?.sites ?? [], [model]);

  const domainInputId = useId();
  const regionNameId = useId();
  const regionSlugId = useId();
  const regionShortNameId = useId();
  const regionKindSelectId = useId();
  const regionParentSelectId = useId();
  const siteDomainSelectId = useId();
  const siteRegionSelectId = useId();
  const siteHostnameInputId = useId();

  const [domainHostname, setDomainHostname] = useState('');

  const [regionName, setRegionName] = useState('');
  const [regionSlug, setRegionSlug] = useState('');
  const [isRegionSlugManual, setIsRegionSlugManual] = useState(false);
  const [regionShortName, setRegionShortName] = useState('');
  const [regionKind, setRegionKind] = useState('region');
  const [regionParentId, setRegionParentId] = useState('');

  const [siteDomainId, setSiteDomainId] = useState('');
  const [siteRegionId, setSiteRegionId] = useState('');
  const [siteHostname, setSiteHostname] = useState('');
  const [isSiteHostnameManual, setIsSiteHostnameManual] = useState(false);

  const [isAddingDomain, startDomainTransition] = useTransition();
  const [isAddingRegion, startRegionTransition] = useTransition();
  const [isAddingSite, startSiteTransition] = useTransition();

  const activeDomainId = siteDomainId || (domains[0]?.id ?? '');
  const selectedDomain = useMemo(
    () => domains.find((d) => d.id === activeDomainId) ?? domains[0] ?? null,
    [domains, activeDomainId],
  );

  const selectedRegion = useMemo(
    () => regions.find((r) => r.id === siteRegionId) ?? null,
    [regions, siteRegionId],
  );

  const handleRegionNameChange = (name: string) => {
    setRegionName(name);
    if (!isRegionSlugManual) {
      setRegionSlug(slugify(name));
    }
  };

  const handleSiteRegionChange = (nextRegionId: string | null) => {
    const cleanId = nextRegionId ?? '';
    setSiteRegionId(cleanId);

    if (!isSiteHostnameManual && selectedDomain) {
      const targetRegion = regions.find((r) => r.id === cleanId);
      if (targetRegion) {
        setSiteHostname(`${targetRegion.slug}.${selectedDomain.normalizedHostname}`);
      } else {
        setSiteHostname(selectedDomain.normalizedHostname);
      }
    }
  };

  const handleSiteDomainChange = (nextDomainId: string | null) => {
    const cleanId = nextDomainId ?? '';
    setSiteDomainId(cleanId);

    if (!isSiteHostnameManual) {
      const targetDomain = domains.find((d) => d.id === cleanId);
      if (targetDomain) {
        if (selectedRegion) {
          setSiteHostname(`${selectedRegion.slug}.${targetDomain.normalizedHostname}`);
        } else {
          setSiteHostname(targetDomain.normalizedHostname);
        }
      }
    }
  };

  const handleDomainSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const cleanHostname = sanitizeHostname(domainHostname);

    if (cleanHostname === '') {
      toast.error('Nama domain utama wajib diisi.');
      return;
    }

    if (!cleanHostname.includes('.')) {
      toast.error('Format domain harus valid, contoh: medianusantara.co.id');
      return;
    }

    startDomainTransition(async () => {
      try {
        await command('domain.create', {
          normalizedHostname: cleanHostname,
          status: 'inactive',
        });
        toast.success(`Domain ${cleanHostname} berhasil ditambahkan.`);
        setDomainHostname('');
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Gagal membuat domain baru.';
        toast.error(message);
      }
    });
  };

  const handleRegionSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const cleanName = regionName.trim();
    const cleanSlug = (regionSlug.trim() || slugify(cleanName)).toLowerCase();

    if (cleanName === '') {
      toast.error('Nama wilayah wajib diisi.');
      return;
    }
    if (cleanSlug === '') {
      toast.error('Kode slug wilayah wajib diisi.');
      return;
    }
    if (!/^[a-z0-9-]+$/.test(cleanSlug)) {
      toast.error('Kode wilayah hanya boleh berisi huruf kecil, angka, dan tanda hubung.');
      return;
    }

    startRegionTransition(async () => {
      try {
        await command('region.create', {
          externalKey: cleanSlug,
          name: cleanName,
          shortName: regionShortName.trim() || null,
          slug: cleanSlug,
          status: 'active',
          kind: regionKind,
          parentRegionId: regionParentId.trim() || null,
        });

        toast.success(`Wilayah ${cleanName} berhasil didaftarkan.`);
        setRegionName('');
        setRegionSlug('');
        setRegionShortName('');
        setRegionParentId('');
        setIsRegionSlugManual(false);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Gagal membuat data wilayah.';
        toast.error(message);
      }
    });
  };

  const handleSiteSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const cleanDomainId = activeDomainId;
    const cleanHostname = sanitizeHostname(siteHostname);

    if (cleanDomainId === '') {
      toast.error('Pilih domain master terlebih dahulu.');
      return;
    }
    if (cleanHostname === '') {
      toast.error('Nama host situs wajib diisi.');
      return;
    }

    startSiteTransition(async () => {
      try {
        await command('site.create', {
          domainId: cleanDomainId,
          regionId: siteRegionId.trim() || null,
          normalizedHostname: cleanHostname,
          status: 'inactive',
        });

        toast.success(`Situs portal ${cleanHostname} berhasil disiapkan.`);
        setSiteHostname('');
        setSiteRegionId('');
        setIsSiteHostnameManual(false);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Gagal membuat situs baru.';
        toast.error(message);
      }
    });
  };

  const domainCount = domains.length.toLocaleString('id-ID');
  const regionCount = regions.length.toLocaleString('id-ID');
  const siteCount = sites.length.toLocaleString('id-ID');

  return (
    <div className="flex flex-col gap-6">
      <p className="m-0 font-sans text-xs leading-relaxed text-paper-dim">
        Siapkan berurutan: daftarkan{' '}
        <span className="font-mono text-[11px] text-paper">domain utama</span> → petakan{' '}
        <span className="font-mono text-[11px] text-paper">wilayah</span> → terbitkan{' '}
        <span className="font-mono text-[11px] text-paper">situs portal</span>.
      </p>
      <div className="grid items-start gap-6 md:grid-cols-3">
        <SectionCard
          icon={Globe}
          title="Domain Utama"
          eyebrow={`01 · ${domainCount} terdaftar`}
        >
          <div>
            <form noValidate onSubmit={handleDomainSubmit} className="flex flex-col gap-3.5">
              <div className="space-y-1.5">
                <Label
                  htmlFor={domainInputId}
                  className="font-mono text-xs uppercase tracking-wider text-paper-dim"
                >
                  Hostname Master
                </Label>
                <Input
                  id={domainInputId}
                  name="hostname"
                  value={domainHostname}
                  onChange={(e) => setDomainHostname(e.target.value)}
                  required
                  disabled={isAddingDomain}
                  placeholder="medianusantara.co.id"
                  className="h-9 rounded-md border-hairline-strong bg-bg px-3 font-mono text-xs text-paper placeholder:font-sans placeholder:text-paper-dim/50 hover:border-hairline focus-visible:ring-1 focus-visible:ring-brass"
                />
                <p className="m-0 font-mono text-[10px] text-paper-dim">
                  Domain induk jaringan tanpa awalan protokol http/https.
                </p>
              </div>

              {domainHostname.trim() !== '' && (
                <div className="flex items-center gap-1.5 rounded border border-hairline bg-bg px-2.5 py-1.5 font-mono text-[11px] text-paper">
                  <Check className="h-3 w-3 text-emerald-400" />
                  <span className="truncate">https://{sanitizeHostname(domainHostname)}</span>
                </div>
              )}

              <Button
                type="submit"
                disabled={isAddingDomain}
                className="mt-2 w-full gap-2 font-sans text-xs font-medium"
              >
                {isAddingDomain ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                <span>Daftarkan Domain</span>
              </Button>
            </form>
          </div>
        </SectionCard>

        <SectionCard
          icon={Layers}
          title="Wilayah"
          eyebrow={`02 · ${regionCount} cakupan`}
        >
          <div>
            <form noValidate onSubmit={handleRegionSubmit} className="flex flex-col gap-3.5">
              <div className="space-y-1.5">
                <Label
                  htmlFor={regionNameId}
                  className="font-mono text-xs uppercase tracking-wider text-paper-dim"
                >
                  Nama Wilayah
                </Label>
                <Input
                  id={regionNameId}
                  name="name"
                  value={regionName}
                  onChange={(e) => handleRegionNameChange(e.target.value)}
                  required
                  disabled={isAddingRegion}
                  placeholder="Wonosobo"
                  className="h-9 rounded-md border-hairline-strong bg-bg px-3 font-sans text-xs text-paper placeholder:text-paper-dim/50 hover:border-hairline focus-visible:ring-1 focus-visible:ring-brass"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label
                    htmlFor={regionSlugId}
                    className="font-mono text-xs uppercase tracking-wider text-paper-dim"
                  >
                    Kode Wilayah (Slug)
                  </Label>
                  {isRegionSlugManual && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsRegionSlugManual(false);
                        setRegionSlug(slugify(regionName));
                      }}
                      className="inline-flex items-center gap-1 font-mono text-[10px] text-brass hover:underline"
                    >
                      <RefreshCw className="h-2.5 w-2.5" />
                      <span>Otomatis</span>
                    </button>
                  )}
                </div>
                <Input
                  id={regionSlugId}
                  name="slug"
                  value={regionSlug}
                  onChange={(e) => {
                    setIsRegionSlugManual(true);
                    setRegionSlug(e.target.value.toLowerCase());
                  }}
                  required
                  disabled={isAddingRegion}
                  placeholder="wonosobo"
                  pattern="[a-z0-9-]+"
                  className="h-9 rounded-md border-hairline-strong bg-bg px-3 font-mono text-xs text-paper placeholder:text-paper-dim/50 hover:border-hairline focus-visible:ring-1 focus-visible:ring-brass"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label
                    htmlFor={regionShortNameId}
                    className="font-mono text-xs uppercase tracking-wider text-paper-dim"
                  >
                    Singkatan
                  </Label>
                  <Input
                    id={regionShortNameId}
                    name="shortName"
                    value={regionShortName}
                    onChange={(e) => setRegionShortName(e.target.value)}
                    disabled={isAddingRegion}
                    placeholder="Wsb"
                    className="h-9 rounded-md border-hairline-strong bg-bg px-3 font-sans text-xs text-paper placeholder:text-paper-dim/50 hover:border-hairline focus-visible:ring-1 focus-visible:ring-brass"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label
                    htmlFor={regionKindSelectId}
                    className="font-mono text-xs uppercase tracking-wider text-paper-dim"
                  >
                    Tingkatan
                  </Label>
                  <DashboardSelect
                    id={regionKindSelectId}
                    name="kind"
                    value={regionKind}
                    onValueChange={(val) => setRegionKind(val ?? 'region')}
                    disabled={isAddingRegion}
                    placeholder="Pilih tingkatan"
                  >
                    <DashboardSelectItem value="region">Wilayah</DashboardSelectItem>
                    <DashboardSelectItem value="city">Kota / Kab</DashboardSelectItem>
                  </DashboardSelect>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor={regionParentSelectId}
                  className="font-mono text-xs uppercase tracking-wider text-paper-dim"
                >
                  Wilayah Induk (Opsional)
                </Label>
                <SearchCombobox
                  id={regionParentSelectId}
                  name="parentRegionId"
                  value={regionParentId}
                  onValueChange={(val) => setRegionParentId(val ?? '')}
                  disabled={isAddingRegion}
                  placeholder="Tanpa induk (tingkat utama)"
                  allowEmpty
                  emptyLabel="Tanpa induk (tingkat utama)"
                  options={regions.map((item) => ({ value: item.id, label: item.name }))}
                />
              </div>

              <Button
                type="submit"
                disabled={isAddingRegion}
                className="mt-2 w-full gap-2 font-sans text-xs font-medium"
              >
                {isAddingRegion ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                <span>Simpan Wilayah</span>
              </Button>
            </form>
          </div>
        </SectionCard>

        <SectionCard
          icon={FolderPlus}
          title="Situs Portal"
          eyebrow={`03 · ${siteCount} aktif`}
        >
          <div>
            <form noValidate onSubmit={handleSiteSubmit} className="flex flex-col gap-3.5">
              <div className="space-y-1.5">
                <Label
                  htmlFor={siteDomainSelectId}
                  className="font-mono text-xs uppercase tracking-wider text-paper-dim"
                >
                  Domain Master
                </Label>
                <SearchCombobox
                  id={siteDomainSelectId}
                  name="domainId"
                  value={activeDomainId}
                  onValueChange={handleSiteDomainChange}
                  disabled={isAddingSite || domains.length === 0}
                  placeholder={domains.length === 0 ? 'Buat domain terlebih dahulu' : 'Pilih domain induk'}
                  options={domains.map((item) => ({
                    value: item.id,
                    label: item.normalizedHostname,
                  }))}
                />
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor={siteRegionSelectId}
                  className="font-mono text-xs uppercase tracking-wider text-paper-dim"
                >
                  Afiliasi Wilayah
                </Label>
                <SearchCombobox
                  id={siteRegionSelectId}
                  name="regionId"
                  value={siteRegionId}
                  onValueChange={handleSiteRegionChange}
                  disabled={isAddingSite}
                  placeholder="Portal Utama (Tanpa Wilayah)"
                  allowEmpty
                  emptyLabel="Portal Utama (Tanpa Wilayah)"
                  options={regions.map((item) => ({ value: item.id, label: item.name }))}
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label
                    htmlFor={siteHostnameInputId}
                    className="font-mono text-xs uppercase tracking-wider text-paper-dim"
                  >
                    Alamat Host Portal
                  </Label>
                  {isSiteHostnameManual && selectedDomain && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsSiteHostnameManual(false);
                        if (selectedRegion) {
                          setSiteHostname(`${selectedRegion.slug}.${selectedDomain.normalizedHostname}`);
                        } else {
                          setSiteHostname(selectedDomain.normalizedHostname);
                        }
                      }}
                      className="inline-flex items-center gap-1 font-mono text-[10px] text-brass hover:underline"
                    >
                      <Sparkles className="h-2.5 w-2.5" />
                      <span>Saran Otomatis</span>
                    </button>
                  )}
                </div>
                <Input
                  id={siteHostnameInputId}
                  name="hostname"
                  value={siteHostname}
                  onChange={(e) => {
                    setIsSiteHostnameManual(true);
                    setSiteHostname(e.target.value.toLowerCase());
                  }}
                  required
                  disabled={isAddingSite || domains.length === 0}
                  placeholder="wonosobo.suaradesa.net"
                  className="h-9 rounded-md border-hairline-strong bg-bg px-3 font-mono text-xs text-paper placeholder:font-sans placeholder:text-paper-dim/50 hover:border-hairline focus-visible:ring-1 focus-visible:ring-brass"
                />
              </div>

              {siteHostname.trim() !== '' && (
                <div className="flex items-center gap-1.5 rounded border border-hairline bg-bg px-2.5 py-1.5 font-mono text-[11px] text-paper">
                  <Check className="h-3 w-3 text-emerald-400" />
                  <span className="truncate">https://{sanitizeHostname(siteHostname)}</span>
                </div>
              )}

              <Button
                type="submit"
                disabled={isAddingSite || domains.length === 0}
                className="mt-2 w-full gap-2 font-sans text-xs font-medium"
              >
                {isAddingSite ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                <span>Buat Situs Portal</span>
              </Button>
            </form>
          </div>
        </SectionCard>
      </div>

      <MediaPolicySection />
      <PolicyOverviewSection />
    </div>
  );
}