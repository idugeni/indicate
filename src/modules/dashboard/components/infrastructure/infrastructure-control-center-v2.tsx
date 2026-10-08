'use client';

import { useMemo, useState } from 'react';
import { Globe, KeyRound, Palette, ShieldCheck, Zap } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SectionCard } from '@/modules/dashboard/components/shared/section-card';
import { ConfigurationPanel } from '@/modules/dashboard/components/infrastructure/configuration-panel';
import { SiteSettingsForm } from '@/modules/dashboard/components/infrastructure/site-settings-form';
import { CachePurgeForm } from '@/modules/dashboard/components/infrastructure/cache-purge-form';
import { AccessManagementForm } from '@/modules/dashboard/components/infrastructure/access-management-form';
import type { DashboardCommand } from '@/modules/dashboard/command';

type InfrastructureData = {
  readonly domains?: readonly unknown[];
  readonly regions?: readonly unknown[];
  readonly sites?: readonly unknown[];
  readonly siteSettings?: readonly unknown[];
  readonly roles?: readonly unknown[];
  readonly memberships?: readonly unknown[];
  readonly invitations?: readonly unknown[];
  readonly activationAttempts?: readonly unknown[];
};

const areas = [
  { id: 'topology', label: 'Topology', title: 'Domain & Site Topology', icon: Globe, eyebrow: '01' },
  { id: 'identity', label: 'Identity', title: 'SEO & Brand', icon: Palette, eyebrow: '02' },
  { id: 'edge', label: 'Edge', title: 'Cache & Delivery', icon: Zap, eyebrow: '03' },
  { id: 'access', label: 'Access', title: 'Access & Authorization', icon: KeyRound, eyebrow: '04' },
] as const;

export function InfrastructureControlCenterV2({
  data,
  command,
  organizationId,
}: {
  readonly data: unknown;
  readonly command: DashboardCommand;
  readonly organizationId: string;
}) {
  const [focus, setFocus] = useState<(typeof areas)[number]['id']>('topology');

  const counts = useMemo(() => {
    const model = (data ?? {}) as InfrastructureData;
    return {
      domains: model.domains?.length ?? 0,
      regions: model.regions?.length ?? 0,
      sites: model.sites?.length ?? 0,
      members: model.memberships?.length ?? 0,
      invites: model.invitations?.length ?? 0,
    };
  }, [data]);

  const activeArea = areas.find((area) => area.id === focus) ?? areas[0];

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 border-b border-hairline pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="m-0 font-mono text-[10px] uppercase tracking-[0.18em] text-brass">Infrastructure Control Center</p>
          <h1 className="m-0 mt-1 font-sans text-2xl font-semibold tracking-tight text-paper">Network Infrastructure</h1>
          <p className="m-0 mt-1 max-w-2xl text-xs leading-relaxed text-paper-dim">
            Satu command center untuk topology hostname, identitas portal, edge cache, dan kontrol akses tanpa membuat kontrak backend baru.
          </p>
        </div>
        <Badge variant="outline" className="w-fit gap-1.5">
          <ShieldCheck className="h-3 w-3" aria-hidden="true" /> Existing command contracts
        </Badge>
      </header>

      <section aria-label="Ringkasan infrastruktur" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {[
          ['Domain', counts.domains],
          ['Wilayah', counts.regions],
          ['Situs', counts.sites],
          ['Anggota', counts.members],
          ['Undangan', counts.invites],
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg border border-hairline bg-bg-raised p-4">
            <p className="m-0 font-mono text-[10px] uppercase tracking-wider text-paper-dim">{label}</p>
            <p className="m-0 mt-2 font-mono text-xl font-semibold tabular-nums text-paper">{value}</p>
          </div>
        ))}
      </section>

      <section aria-label="Area operasi infrastruktur" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {areas.map((area) => {
          const Icon = area.icon;
          const selected = area.id === focus;
          return (
            <Button
              key={area.id}
              type="button"
              variant="outline"
              onClick={() => setFocus(area.id)}
              aria-pressed={selected}
              className={`h-auto min-h-24 justify-start gap-3 p-4 text-left ${selected ? 'border-brass/60 bg-brass/5' : ''}`}
            >
              <Icon className="h-4 w-4 flex-none text-brass" aria-hidden="true" />
              <span className="min-w-0">
                <span className="block font-mono text-[9px] uppercase tracking-widest text-paper-dim">{area.eyebrow}</span>
                <span className="block truncate text-xs font-semibold text-paper">{area.title}</span>
                <span className="mt-1 block text-[10px] text-paper-dim">{selected ? 'Sedang difokuskan' : 'Buka area'}</span>
              </span>
            </Button>
          );
        })}
      </section>

      <SectionCard icon={activeArea.icon} title={activeArea.title} eyebrow={`Focused area · ${activeArea.label}`}>
        {focus === 'topology' ? <ConfigurationPanel data={data} command={command} /> : null}
        {focus === 'identity' ? <SiteSettingsForm data={data} command={command} /> : null}
        {focus === 'edge' ? <CachePurgeForm data={data} command={command} /> : null}
        {focus === 'access' ? <AccessManagementForm data={data} command={command} organizationId={organizationId} /> : null}
      </SectionCard>
    </div>
  );
}
