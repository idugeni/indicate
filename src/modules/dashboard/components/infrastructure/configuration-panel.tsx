'use client';

import { useId, useTransition, type FormEvent } from 'react';
import { toast } from 'sonner';
import {
  FolderPlus,
  Globe,
  Layers,
  Loader2,
  Plus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DashboardSelect, DashboardSelectItem } from '@/modules/dashboard/components/shared/dashboard-select';
import { SearchCombobox } from '@/modules/dashboard/components/shared/search-combobox';
import type { DomainEntity, RegionEntity, SiteEntity } from '@/modules/dashboard/components/shared/types';
import { MediaPolicySection } from '@/modules/dashboard/components/infrastructure/media-policy-section';
import { PolicyOverviewSection } from '@/modules/dashboard/components/infrastructure/policy-overview-section';

export function ConfigurationPanel({
  data,
  command,
}: {
  readonly data: unknown;
  readonly command: (action: string, payload: unknown) => Promise<unknown>;
}) {
  const model = data as {
    readonly domains?: readonly DomainEntity[];
    readonly regions?: readonly RegionEntity[];
    readonly sites?: readonly SiteEntity[];
  } | null;

  const domainInputId = useId();
  const regionNameId = useId();
  const regionSlugId = useId();
  const regionShortNameId = useId();
  const regionKindSelectId = useId();
  const regionParentSelectId = useId();
  const siteDomainSelectId = useId();
  const siteRegionSelectId = useId();
  const siteHostnameInputId = useId();

  const [isAddingDomain, startDomainTransition] = useTransition();
  const [isAddingRegion, startRegionTransition] = useTransition();
  const [isAddingSite, startSiteTransition] = useTransition();

  const handleDomainSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const hostname = String(formData.get('hostname') ?? '').trim().toLowerCase();
    if (hostname === '') {
      toast.error('Isi nama domain dulu.');
      return;
    }

    startDomainTransition(async () => {
      await command('domain.create', {
        normalizedHostname: hostname,
        status: 'inactive',
      });
      form.reset();
    });
  };

  const handleRegionSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const name = String(formData.get('name') ?? '').trim();
    const slug = String(formData.get('slug') ?? '').trim().toLowerCase();
    if (name === '') {
      toast.error('Isi nama wilayah dulu.');
      return;
    }
    if (slug === '') {
      toast.error('Isi kode wilayah dulu.');
      return;
    }
    if (!/^[a-z0-9-]+$/.test(slug)) {
      toast.error('Kode wilayah hanya boleh huruf kecil, angka, dan strip.');
      return;
    }

    startRegionTransition(async () => {
      const parentRegionId = String(formData.get('parentRegionId') ?? '').trim();
      const shortName = String(formData.get('shortName') ?? '').trim();
      await command('region.create', {
        externalKey: slug,
        name,
        shortName: shortName === '' ? null : shortName,
        slug,
        status: 'active',
        kind: String(formData.get('kind') ?? 'region'),
        parentRegionId: parentRegionId === '' ? null : parentRegionId,
      });
      form.reset();
    });
  };

  const handleSiteSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const domainId = String(formData.get('domainId') ?? '').trim();
    const hostname = String(formData.get('hostname') ?? '').trim().toLowerCase();
    if (domainId === '') {
      toast.error('Pilih domain dulu.');
      return;
    }
    if (hostname === '') {
      toast.error('Isi nama host situs dulu.');
      return;
    }

    startSiteTransition(async () => {
      await command('site.create', {
        domainId,
        regionId: formData.get('regionId') || null,
        normalizedHostname: hostname,
        status: 'inactive',
      });
      form.reset();
    });
  };

  return (
    <div className="space-y-8">
    <div className="grid gap-x-8 gap-y-8 md:grid-cols-3">
      <section aria-label="Tambah domain" className="rounded-lg border border-hairline bg-bg-raised p-5 sm:p-6">
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-[11px] tabular-nums text-brass">01</span>
          <h3 className="m-0 flex items-center gap-2 font-sans text-sm font-semibold tracking-tight text-paper">
            <Globe className="h-4 w-4 text-brass" aria-hidden="true" />
            Domain
          </h3>
        </div>

        <form noValidate onSubmit={handleDomainSubmit} className="mt-4 space-y-3.5">
          <div className="space-y-1.5">
            <Label htmlFor={domainInputId} className="font-sans text-xs font-medium text-paper-dim">
              Nama domain utama
            </Label>
            <Input
              id={domainInputId}
              name="hostname"
              required
              disabled={isAddingDomain}
              placeholder="medianusantara.co.id"
              className="h-9 border-hairline-strong bg-bg px-2.5 font-mono text-xs text-paper transition-colors duration-180 hover:border-paper-faint focus-visible:ring-brass"
            />
          </div>

          <Button
            type="submit"
            variant="default"
            size="lg"
            disabled={isAddingDomain}
            className="w-full"
          >
            {isAddingDomain ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            <span>Buat domain</span>
          </Button>
        </form>
      </section>

      <section aria-label="Tambah wilayah" className="rounded-lg border border-hairline bg-bg-raised p-5 sm:p-6">
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-[11px] tabular-nums text-brass">02</span>
          <h3 className="m-0 flex items-center gap-2 font-sans text-sm font-semibold tracking-tight text-paper">
            <Layers className="h-4 w-4 text-brass" aria-hidden="true" />
            Wilayah
          </h3>
        </div>

        <form noValidate onSubmit={handleRegionSubmit} className="mt-4 space-y-3.5">
          <div className="space-y-1.5">
            <Label htmlFor={regionNameId} className="font-sans text-xs font-medium text-paper-dim">
              Nama wilayah
            </Label>
            <Input
              id={regionNameId}
              name="name"
              required
              disabled={isAddingRegion}
              placeholder="Wonosobo"
              className="h-9 border-hairline-strong bg-bg px-2.5 font-sans text-xs text-paper transition-colors duration-180 hover:border-paper-faint focus-visible:ring-brass"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={regionSlugId} className="font-sans text-xs font-medium text-paper-dim">
              Kode Wilayah
            </Label>
            <Input
              id={regionSlugId}
              name="slug"
              required
              disabled={isAddingRegion}
              placeholder="wonosobo"
              pattern="[a-z0-9-]+"
              className="h-9 border-hairline-strong bg-bg px-2.5 font-mono text-xs text-paper transition-colors duration-180 hover:border-paper-faint focus-visible:ring-brass"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={regionShortNameId} className="font-sans text-xs font-medium text-paper-dim">
              Nama singkat
            </Label>
            <Input
              id={regionShortNameId}
              name="shortName"
              disabled={isAddingRegion}
              placeholder="mis. Jatim"
              className="h-9 border-hairline-strong bg-bg px-2.5 font-sans text-xs text-paper transition-colors duration-180 hover:border-paper-faint focus-visible:ring-brass"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={regionKindSelectId} className="font-sans text-xs font-medium text-paper-dim">
              Tingkatan
            </Label>
            <DashboardSelect
              id={regionKindSelectId}
              name="kind"
              disabled={isAddingRegion}
              defaultValue="region"
              placeholder="Pilih tingkatan"
            >
              <DashboardSelectItem value="region">Wilayah (region)</DashboardSelectItem>
              <DashboardSelectItem value="city">Kota (di bawah region)</DashboardSelectItem>
            </DashboardSelect>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={regionParentSelectId} className="font-sans text-xs font-medium text-paper-dim">
              Induk (khusus kota)
            </Label>
            <SearchCombobox
              id={regionParentSelectId}
              name="parentRegionId"
              disabled={isAddingRegion}
              placeholder="Tanpa induk (wilayah)"
              allowEmpty
              emptyLabel="Tanpa induk (wilayah)"
              options={(model?.regions ?? []).map((item) => ({ value: item.id, label: item.name }))}
            />
          </div>

          <Button
            type="submit"
            variant="default"
            size="lg"
            disabled={isAddingRegion}
            className="w-full"
          >
            {isAddingRegion ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            <span>Buat wilayah</span>
          </Button>
        </form>
      </section>

      <section aria-label="Tambah situs" className="rounded-lg border border-hairline bg-bg-raised p-5 sm:p-6">
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-[11px] tabular-nums text-brass">03</span>
          <h3 className="m-0 flex items-center gap-2 font-sans text-sm font-semibold tracking-tight text-paper">
            <FolderPlus className="h-4 w-4 text-brass" aria-hidden="true" />
            Situs
          </h3>
        </div>

        <form noValidate onSubmit={handleSiteSubmit} className="mt-4 space-y-3.5">
          <div className="space-y-1.5">
            <Label htmlFor={siteDomainSelectId} className="font-sans text-xs font-medium text-paper-dim">
              Domain
            </Label>
            <SearchCombobox
              id={siteDomainSelectId}
              name="domainId"
              disabled={isAddingSite}
              defaultValue={model?.domains?.[0]?.id ?? ''}
              placeholder="Pilih domain"
              options={(model?.domains ?? []).map((item) => ({ value: item.id, label: item.normalizedHostname }))}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={siteRegionSelectId} className="font-sans text-xs font-medium text-paper-dim">
              Wilayah
            </Label>
            <SearchCombobox
              id={siteRegionSelectId}
              name="regionId"
              disabled={isAddingSite}
              placeholder="Domain utama (tanpa wilayah)"
              allowEmpty
              emptyLabel="Domain utama (tanpa wilayah)"
              options={(model?.regions ?? []).map((item) => ({ value: item.id, label: item.name }))}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={siteHostnameInputId} className="font-sans text-xs font-medium text-paper-dim">
              Alamat Situs
            </Label>
            <Input
              id={siteHostnameInputId}
              name="hostname"
              required
              disabled={isAddingSite}
              placeholder="wonosobo.suaradesa.net"
              className="h-9 border-hairline-strong bg-bg px-2.5 font-mono text-xs text-paper transition-colors duration-180 hover:border-paper-faint focus-visible:ring-brass"
            />
          </div>

          <Button
            type="submit"
            variant="default"
            size="lg"
            disabled={isAddingSite}
            className="w-full"
          >
            {isAddingSite ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            <span>Buat situs</span>
          </Button>
        </form>
      </section>
    </div>
      <MediaPolicySection />
      <PolicyOverviewSection />
    </div>
  );
}