'use client';

import { useId, useTransition, type FormEvent } from 'react';
import {
  FolderPlus,
  Globe,
  Layers,
  Loader2,
  Plus,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import type { DomainEntity, RegionEntity, SiteEntity } from '@/modules/dashboard/components/shared/types';
import { MediaPolicySection } from '@/modules/dashboard/components/infrastructure/media-policy-section';

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

    startDomainTransition(async () => {
      await command('domain.create', {
        normalizedHostname: String(formData.get('hostname') ?? '').trim().toLowerCase(),
        status: 'inactive',
      });
      form.reset();
    });
  };

  const handleRegionSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const slug = String(formData.get('slug') ?? '').trim().toLowerCase();

    startRegionTransition(async () => {
      await command('region.create', {
        externalKey: slug,
        name: String(formData.get('name') ?? '').trim(),
        slug,
        status: 'active',
      });
      form.reset();
    });
  };

  const handleSiteSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);

    startSiteTransition(async () => {
      await command('site.create', {
        domainId: formData.get('domainId'),
        regionId: formData.get('regionId') || null,
        normalizedHostname: String(formData.get('hostname') ?? '').trim().toLowerCase(),
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

        <form onSubmit={handleDomainSubmit} className="mt-4 space-y-3.5">
          <div className="space-y-1.5">
            <label htmlFor={domainInputId} className="font-sans text-xs font-medium text-paper-dim">
              Hostname apex
            </label>
            <Input
              id={domainInputId}
              name="hostname"
              required
              disabled={isAddingDomain}
              placeholder="medianusantara.co.id"
              className="h-9 border-hairline-strong bg-bg px-2.5 font-mono text-xs text-paper transition-colors duration-180 hover:border-paper-faint focus-visible:ring-brass"
            />
          </div>

          <button
            type="submit"
            disabled={isAddingDomain}
            className="inline-flex h-9 w-full items-center justify-center gap-1.5 bg-brass px-3 font-sans text-xs font-semibold text-bg transition-colors duration-180 hover:bg-brass-soft disabled:opacity-50"
          >
            {isAddingDomain ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            <span>Buat domain</span>
          </button>
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

        <form onSubmit={handleRegionSubmit} className="mt-4 space-y-3.5">
          <div className="space-y-1.5">
            <label htmlFor={regionNameId} className="font-sans text-xs font-medium text-paper-dim">
              Nama wilayah
            </label>
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
            <label htmlFor={regionSlugId} className="font-sans text-xs font-medium text-paper-dim">
              Slug
            </label>
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

          <button
            type="submit"
            disabled={isAddingRegion}
            className="inline-flex h-9 w-full items-center justify-center gap-1.5 bg-brass px-3 font-sans text-xs font-semibold text-bg transition-colors duration-180 hover:bg-brass-soft disabled:opacity-50"
          >
            {isAddingRegion ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            <span>Buat wilayah</span>
          </button>
        </form>
      </section>

      <section aria-label="Tambah kanal" className="rounded-lg border border-hairline bg-bg-raised p-5 sm:p-6">
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-[11px] tabular-nums text-brass">03</span>
          <h3 className="m-0 flex items-center gap-2 font-sans text-sm font-semibold tracking-tight text-paper">
            <FolderPlus className="h-4 w-4 text-brass" aria-hidden="true" />
            Kanal
          </h3>
        </div>

        <form onSubmit={handleSiteSubmit} className="mt-4 space-y-3.5">
          <div className="space-y-1.5">
            <label htmlFor={siteDomainSelectId} className="font-sans text-xs font-medium text-paper-dim">
              Domain
            </label>
            <select
              id={siteDomainSelectId}
              name="domainId"
              disabled={isAddingSite}
              className="h-9 w-full border border-hairline-strong bg-bg px-2 font-mono text-xs text-paper transition-colors duration-180 hover:border-paper-faint focus:border-brass focus:outline-none"
            >
              {model?.domains?.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.normalizedHostname}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor={siteRegionSelectId} className="font-sans text-xs font-medium text-paper-dim">
              Wilayah
            </label>
            <select
              id={siteRegionSelectId}
              name="regionId"
              disabled={isAddingSite}
              className="h-9 w-full border border-hairline-strong bg-bg px-2 font-mono text-xs text-paper transition-colors duration-180 hover:border-paper-faint focus:border-brass focus:outline-none"
            >
              <option value="">Kanal apex (sentral)</option>
              {model?.regions?.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor={siteHostnameInputId} className="font-sans text-xs font-medium text-paper-dim">
              Hostname
            </label>
            <Input
              id={siteHostnameInputId}
              name="hostname"
              required
              disabled={isAddingSite}
              placeholder="wonosobo.suaradesa.net"
              className="h-9 border-hairline-strong bg-bg px-2.5 font-mono text-xs text-paper transition-colors duration-180 hover:border-paper-faint focus-visible:ring-brass"
            />
          </div>

          <button
            type="submit"
            disabled={isAddingSite}
            className="inline-flex h-9 w-full items-center justify-center gap-1.5 bg-brass px-3 font-sans text-xs font-semibold text-bg transition-colors duration-180 hover:bg-brass-soft disabled:opacity-50"
          >
            {isAddingSite ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            <span>Buat kanal</span>
          </button>
        </form>
      </section>
    </div>
      <MediaPolicySection />
    </div>
  );
}