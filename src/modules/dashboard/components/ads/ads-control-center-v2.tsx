'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  CircleDollarSign,
  Image,
  Megaphone,
  RefreshCw,
  Search,
  ShieldAlert,
  SlidersHorizontal,
  Target,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/modules/dashboard/components/empty-state';
import { FormNotice } from '@/modules/dashboard/components/shared/form-notice';
import { AD_SLOT_IDS, AD_SLOTS, type AdSlotId } from '@/modules/ads/slots';

type Site = {
  readonly id: string;
  readonly name: string;
  readonly hostname: string;
  readonly templateId: string | null;
};
type Slot = { readonly id: string; readonly active: boolean };
type Setting = {
  readonly siteId: string;
  readonly slotId: string;
  readonly enabled: boolean;
  readonly creativeId: string | null;
};
type Campaign = {
  readonly id: string;
  readonly name: string;
  readonly status: string;
  readonly startsAt: string | null;
  readonly endsAt: string | null;
};
type Creative = {
  readonly id: string;
  readonly status: string;
  readonly kind: string;
  readonly campaignId: string | null;
};
type Placement = {
  readonly id: string;
  readonly campaignId: string;
  readonly slotId: string;
  readonly siteId: string | null;
  readonly active: boolean;
  readonly startsAt: string | null;
  readonly endsAt: string | null;
};
type AdsSnapshot = {
  readonly sites: readonly Site[];
  readonly slots: readonly Slot[];
  readonly settings: readonly Setting[];
  readonly campaigns: readonly Campaign[];
  readonly creatives: readonly Creative[];
  readonly placements: readonly Placement[];
};
type SlotPosture = {
  readonly id: AdSlotId;
  readonly label: string;
  readonly description: string;
  readonly enabledSites: number;
  readonly readySites: number;
  readonly active: boolean;
  readonly status: 'ready' | 'partial' | 'attention' | 'limited' | 'no-sites' | 'inactive';
};
type SlotFilter = 'all' | 'attention' | 'ready';

const AdsManagementPanel = dynamic(
  () =>
    import('@/modules/dashboard/components/ads/ads-management-panel').then((module) => ({
      default: module.AdsManagementPanel,
    })),
  {
    loading: () => (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    ),
  },
);

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}
function asString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}
function parseSnapshot(value: unknown): AdsSnapshot | null {
  const body = asRecord(value);
  if (
    body === null ||
    !Array.isArray(body.sites) ||
    !Array.isArray(body.slots) ||
    !Array.isArray(body.settings) ||
    !Array.isArray(body.campaigns) ||
    !Array.isArray(body.creatives) ||
    !Array.isArray(body.placements)
  )
    return null;
  const sites = body.sites.flatMap((value): Site[] => {
    const row = asRecord(value);
    if (
      row === null ||
      typeof row.id !== 'string' ||
      typeof row.name !== 'string' ||
      typeof row.hostname !== 'string'
    )
      return [];
    return [
      { id: row.id, name: row.name, hostname: row.hostname, templateId: asString(row.templateId) },
    ];
  });
  const slots = body.slots.flatMap((value): Slot[] => {
    const row = asRecord(value);
    if (row === null || typeof row.id !== 'string') return [];
    return [{ id: row.id, active: row.active === true }];
  });
  const settings = body.settings.flatMap((value): Setting[] => {
    const row = asRecord(value);
    if (row === null || typeof row.siteId !== 'string' || typeof row.slotId !== 'string') return [];
    return [
      {
        siteId: row.siteId,
        slotId: row.slotId,
        enabled: row.enabled === true,
        creativeId: asString(row.creativeId),
      },
    ];
  });
  const campaigns = body.campaigns.flatMap((value): Campaign[] => {
    const row = asRecord(value);
    if (
      row === null ||
      typeof row.id !== 'string' ||
      typeof row.name !== 'string' ||
      typeof row.status !== 'string'
    )
      return [];
    return [
      {
        id: row.id,
        name: row.name,
        status: row.status,
        startsAt: asString(row.startsAt),
        endsAt: asString(row.endsAt),
      },
    ];
  });
  const creatives = body.creatives.flatMap((value): Creative[] => {
    const row = asRecord(value);
    if (row === null || typeof row.id !== 'string' || typeof row.status !== 'string') return [];
    return [
      {
        id: row.id,
        status: row.status,
        kind: asString(row.kind) ?? 'unknown',
        campaignId: asString(row.campaignId),
      },
    ];
  });
  const placements = body.placements.flatMap((value): Placement[] => {
    const row = asRecord(value);
    if (
      row === null ||
      typeof row.id !== 'string' ||
      typeof row.campaignId !== 'string' ||
      typeof row.slotId !== 'string'
    )
      return [];
    return [
      {
        id: row.id,
        campaignId: row.campaignId,
        slotId: row.slotId,
        siteId: asString(row.siteId),
        active: row.active === true,
        startsAt: asString(row.startsAt),
        endsAt: asString(row.endsAt),
      },
    ];
  });
  return { sites, slots, settings, campaigns, creatives, placements };
}
function isInWindow(startsAt: string | null, endsAt: string | null, now: number): boolean {
  const start = startsAt === null ? Number.NEGATIVE_INFINITY : Date.parse(startsAt);
  const end = endsAt === null ? Number.POSITIVE_INFINITY : Date.parse(endsAt);
  return !Number.isNaN(start) && !Number.isNaN(end) && start <= now && end >= now;
}
function formatNumber(value: number): string {
  return new Intl.NumberFormat('id-ID').format(value);
}
function statusLabel(status: SlotPosture['status']): string {
  if (status === 'ready') return 'Siap';
  if (status === 'partial') return 'Cakupan parsial';
  if (status === 'limited') return 'Snapshot terbatas';
  if (status === 'no-sites') return 'Belum ada situs';
  if (status === 'inactive') return 'Nonaktif';
  return 'Perlu konfigurasi';
}

export function AdsControlCenterV2({ organizationId }: { readonly organizationId: string }) {
  const [snapshot, setSnapshot] = useState<AdsSnapshot | null>(null);
  const [snapshotAt, setSnapshotAt] = useState<number | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<SlotFilter>('all');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const requestController = useRef<AbortController | null>(null);

  const load = useCallback(async () => {
    requestController.current?.abort();
    const controller = new AbortController();
    requestController.current = controller;
    setBusy(true);
    setError(null);
    try {
      const url =
        '/api/dashboard/ads?organizationId=' +
        encodeURIComponent(organizationId) +
        '&scope=overview';
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) throw new Error('HTTP ' + response.status);
      const parsed = parseSnapshot(await response.json());
      if (parsed === null) throw new Error('Invalid ads overview payload');
      if (!controller.signal.aborted) {
        setSnapshot(parsed);
        setSnapshotAt(Date.now());
      }
    } catch (cause) {
      if (cause instanceof Error && cause.name === 'AbortError') return;
      if (!controller.signal.aborted)
        setError(
          'Ringkasan iklan gagal dimuat. Coba muat ulang; tidak ada perubahan yang disimpan.',
        );
    } finally {
      if (requestController.current === controller) {
        requestController.current = null;
        setBusy(false);
      }
    }
  }, [organizationId]);

  useEffect(() => {
    void Promise.resolve().then(() => load());
    return () => {
      requestController.current?.abort();
      requestController.current = null;
    };
  }, [load]);

  const limitsReached =
    snapshot !== null &&
    (snapshot.sites.length >= 200 ||
      snapshot.campaigns.length >= 200 ||
      snapshot.settings.length >= 2000 ||
      snapshot.creatives.length >= 500 ||
      snapshot.placements.length >= 500);
  const now = snapshotAt ?? 0;
  const activeCampaignIds = useMemo(
    () =>
      new Set(
        (snapshot?.campaigns ?? [])
          .filter(
            (campaign) =>
              campaign.status.toLowerCase() === 'active' &&
              isInWindow(campaign.startsAt, campaign.endsAt, now),
          )
          .map((campaign) => campaign.id),
      ),
    [now, snapshot],
  );
  const activeCreatives = useMemo(
    () =>
      new Set(
        (snapshot?.creatives ?? [])
          .filter(
            (creative) =>
              creative.status.toLowerCase() === 'active' &&
              (creative.campaignId === null || activeCampaignIds.has(creative.campaignId)),
          )
          .map((creative) => creative.id),
      ),
    [activeCampaignIds, snapshot],
  );
  const slots = useMemo<readonly SlotPosture[]>(() => {
    const visibleSiteIds = new Set((snapshot?.sites ?? []).map((site) => site.id));
    const activeSlotIds = new Set(
      (snapshot?.slots ?? []).filter((slot) => slot.active).map((slot) => slot.id),
    );
    return AD_SLOT_IDS.map((id) => {
      const active = activeSlotIds.has(id);
      const enabledRows = (snapshot?.settings ?? []).filter(
        (setting) => setting.slotId === id && setting.enabled && visibleSiteIds.has(setting.siteId),
      );
      const readyRows = enabledRows.filter(
        (setting) => setting.creativeId !== null && activeCreatives.has(setting.creativeId),
      );
      const enabledSites = new Set(enabledRows.map((setting) => setting.siteId)).size;
      const readySites = new Set(readyRows.map((setting) => setting.siteId)).size;
      let status: SlotPosture['status'];
      if ((snapshot?.sites.length ?? 0) === 0) status = 'no-sites';
      else if (!active) status = 'inactive';
      else if (limitsReached) status = 'limited';
      else if (readySites >= (snapshot?.sites.length ?? 0)) status = 'ready';
      else if (readySites > 0) status = 'partial';
      else status = 'attention';
      return {
        id,
        label: AD_SLOTS[id].label,
        description: AD_SLOTS[id].description,
        enabledSites,
        readySites,
        active,
        status,
      };
    });
  }, [activeCreatives, limitsReached, snapshot]);
  const filteredSlots = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return slots.filter((slot) => {
      const matchesQuery =
        needle === '' ||
        slot.id.includes(needle) ||
        slot.label.toLowerCase().includes(needle) ||
        slot.description.toLowerCase().includes(needle);
      const matchesFilter =
        filter === 'all' ||
        (filter === 'ready'
          ? slot.status === 'ready'
          : ['attention', 'partial', 'limited', 'no-sites', 'inactive'].includes(slot.status));
      return matchesQuery && matchesFilter;
    });
  }, [filter, query, slots]);

  const activeCampaigns =
    snapshot?.campaigns.filter(
      (campaign) =>
        campaign.status.toLowerCase() === 'active' &&
        isInWindow(campaign.startsAt, campaign.endsAt, now),
    ).length ?? 0;
  const activeCreativeCount =
    snapshot?.creatives.filter((creative) => creative.status.toLowerCase() === 'active').length ??
    0;
  const activeSlotCount = slots.filter((slot) => slot.active).length;
  const activePlacements =
    snapshot?.placements.filter(
      (placement) => placement.active && isInWindow(placement.startsAt, placement.endsAt, now),
    ).length ?? 0;
  const campaignExceptions = (snapshot?.campaigns ?? []).filter((campaign) => {
    if (
      campaign.status.toLowerCase() !== 'active' ||
      !isInWindow(campaign.startsAt, campaign.endsAt, now) ||
      limitsReached
    )
      return false;
    return !(snapshot?.placements ?? []).some(
      (placement) =>
        placement.campaignId === campaign.id &&
        placement.active &&
        isInWindow(placement.startsAt, placement.endsAt, now),
    );
  });

  if (showAdvanced) {
    return (
      <div className="space-y-5">
        <header className="grid gap-4 border-b border-hairline pb-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div>
            <p className="m-0 font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-brass">
              Revenue Operations · Ad Inventory
            </p>
            <h1 className="m-0 mt-1 font-serif text-2xl font-semibold tracking-tight text-paper sm:text-3xl">
              Ads Control Center
            </h1>
            <p className="m-0 mt-2 max-w-2xl text-sm leading-6 text-paper-dim">
              Kelola slot, kreatif, pengiklan, campaign, dan placement langsung dari workspace V2.
            </p>
          </div>
          <div className="inline-flex w-fit items-center gap-1 rounded-lg border border-hairline bg-bg-raised p-1" aria-label="Workspace iklan">
            <Button type="button" size="sm" variant="ghost" aria-pressed={!showAdvanced} onClick={() => setShowAdvanced(false)}>
              Ringkasan
            </Button>
            <Button type="button" size="sm" aria-pressed={showAdvanced} onClick={() => setShowAdvanced(true)}>
              Kelola iklan
            </Button>
          </div>
        </header>
        <Card className="rounded-lg border-hairline bg-bg-raised shadow-none">
          <CardHeader className="border-b border-hairline pb-3">
            <CardTitle className="text-sm">Workflow CRUD iklan</CardTitle>
            <CardDescription>Perubahan inventori dan campaign memakai API organisasi yang sama; operasi penyimpanan dilakukan hanya setelah konfirmasi pengguna.</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <AdsManagementPanel organizationId={organizationId} />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <header className="grid gap-4 border-b border-hairline pb-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div>
          <p className="m-0 font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-brass">
            Revenue Operations · Ad Inventory
          </p>
          <h1 className="m-0 mt-1 font-serif text-2xl font-semibold tracking-tight text-paper sm:text-3xl">
            Ads Control Center
          </h1>
          <p className="m-0 mt-2 max-w-2xl text-sm leading-6 text-paper-dim">
            Pantau kesiapan slot iklan, cakupan kreatif, dan campaign yang aktif. Editor lengkap
            tetap tersedia saat perlu mengubah konfigurasi.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" onClick={() => void load()} disabled={busy}>
            <RefreshCw className={'mr-2 h-4 w-4 ' + (busy ? 'animate-spin' : '')} />
            Muat ulang
          </Button>
          <div className="inline-flex items-center gap-1 rounded-lg border border-hairline bg-bg-raised p-1" aria-label="Workspace iklan">
            <Button type="button" size="sm" aria-pressed={!showAdvanced} onClick={() => setShowAdvanced(false)}>
              Ringkasan
            </Button>
            <Button type="button" size="sm" variant="ghost" aria-pressed={showAdvanced} onClick={() => setShowAdvanced(true)}>
              Kelola iklan
            </Button>
          </div>
        </div>
      </header>

      {error ? <FormNotice tone="error">{error}</FormNotice> : null}
      {busy && snapshot === null ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-64 sm:col-span-2 xl:col-span-4" />
        </div>
      ) : snapshot === null ? (
        <EmptyState
          title="Ringkasan iklan belum tersedia"
          description="Periksa akses pengelolaan situs dan koneksi dashboard, lalu coba lagi."
        />
      ) : (
        <>
          {limitsReached ? (
            <FormNotice tone="muted">
              Sebagian data mencapai batas snapshot API (situs 200, setting 2.000, kreatif 500,
              placement 500). Angka cakupan di bawah hanya indikatif; gunakan konfigurasi lanjutan
              untuk memeriksa daftar lengkap sebelum mengambil keputusan.
            </FormNotice>
          ) : null}
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              icon={Target}
              label="Slot siap"
              value={
                formatNumber(slots.filter((slot) => slot.status === 'ready').length) +
                '/' +
                activeSlotCount
              }
              detail="Slot aktif yang siap pada snapshot"
            />
            <MetricCard
              icon={CircleDollarSign}
              label="Campaign aktif"
              value={formatNumber(activeCampaigns)}
              detail="Status aktif dan berada dalam periode"
            />
            <MetricCard
              icon={Image}
              label="Kreatif aktif"
              value={formatNumber(activeCreativeCount)}
              detail="Record kreatif yang terbaca"
            />
            <MetricCard
              icon={Megaphone}
              label="Placement aktif"
              value={formatNumber(activePlacements)}
              detail="Placement aktif pada snapshot"
            />
          </div>

          {campaignExceptions.length > 0 ? (
            <Card className="rounded-lg border-warning/40 bg-warning/[0.04] shadow-none">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-warning" />
                  <CardTitle className="text-sm">Campaign aktif tanpa placement aktif</CardTitle>
                </div>
                <CardDescription>
                  Campaign berikut tidak memiliki placement aktif pada snapshot yang terbaca.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {campaignExceptions.slice(0, 6).map((campaign) => (
                  <div
                    key={campaign.id}
                    className="flex flex-col gap-2 rounded-md border border-hairline p-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="m-0 text-sm font-medium text-paper">{campaign.name}</p>
                      <p className="m-0 mt-1 text-xs text-paper-dim">Campaign ID: {campaign.id}</p>
                    </div>
                    <Badge variant="destructive">Periksa placement</Badge>
                  </div>
                ))}
                <Button type="button" variant="outline" onClick={() => setShowAdvanced(true)}>
                  Buka editor campaign
                </Button>
              </CardContent>
            </Card>
          ) : null}

          <Card className="rounded-lg border-hairline bg-bg-raised shadow-none">
            <CardHeader className="border-b border-hairline pb-3">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-brass" />
                <CardTitle className="text-sm">Slot inventory & coverage</CardTitle>
              </div>
              <CardDescription>
                {snapshot.sites.length} situs apex aktif terpantau · {snapshot.settings.length}{' '}
                setting terbaca · status readiness dihitung dari setting dan kreatif aktif.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_220px] sm:items-end">
                <div className="space-y-2">
                  <Label htmlFor="ads-slot-search">Cari slot</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-paper-faint" />
                    <Input
                      id="ads-slot-search"
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="Nama slot atau deskripsi…"
                      className="pl-9"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ads-slot-filter">Status slot</Label>
                  <select
                    id="ads-slot-filter"
                    value={filter}
                    onChange={(event) => setFilter(event.target.value as SlotFilter)}
                    className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
                  >
                    <option value="all">Semua slot</option>
                    <option value="attention">Perlu perhatian</option>
                    <option value="ready">Siap</option>
                  </select>
                </div>
              </div>
              {filteredSlots.length === 0 ? (
                <EmptyState
                  title="Slot tidak ditemukan"
                  description="Ubah kata pencarian atau status filter."
                />
              ) : (
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {filteredSlots.map((slot) => (
                    <article
                      key={slot.id}
                      aria-label={slot.label}
                      className="min-w-0 rounded-lg border border-hairline p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="m-0 break-words text-sm font-semibold text-paper">
                            {slot.label}
                          </h3>
                          <p className="m-0 mt-1 break-words text-xs text-paper-dim">
                            {slot.description}
                          </p>
                        </div>
                        <Badge
                          variant={
                            slot.status === 'ready'
                              ? 'secondary'
                              : slot.status === 'attention' || slot.status === 'partial'
                                ? 'destructive'
                                : 'outline'
                          }
                        >
                          {statusLabel(slot.status)}
                        </Badge>
                      </div>
                      <div className="mt-4 grid grid-cols-2 gap-2">
                        <div className="rounded-md bg-bg p-3">
                          <p className="m-0 text-[11px] uppercase tracking-wider text-paper-faint">
                            Situs aktif
                          </p>
                          <p className="m-0 mt-1 font-mono text-lg text-paper">
                            {formatNumber(slot.enabledSites)}
                          </p>
                        </div>
                        <div className="rounded-md bg-bg p-3">
                          <p className="m-0 text-[11px] uppercase tracking-wider text-paper-faint">
                            Siap tayang
                          </p>
                          <p className="m-0 mt-1 font-mono text-lg text-paper">
                            {slot.status === 'limited' || slot.status === 'no-sites'
                              ? '—'
                              : formatNumber(slot.readySites)}
                          </p>
                        </div>
                      </div>
                      <p className="m-0 mt-3 text-xs text-paper-dim">
                        Ukuran tersedia:{' '}
                        {AD_SLOTS[slot.id].sizes
                          .slice(0, 3)
                          .map((size) => String(size.width) + '×' + String(size.height))
                          .join(' · ')}
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        className="mt-3 w-full"
                        onClick={() => setShowAdvanced(true)}
                      >
                        Kelola slot ini
                      </Button>
                    </article>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          <div className="flex flex-col gap-2 rounded-lg border border-hairline bg-bg-raised p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <Megaphone className="mt-0.5 h-5 w-5 shrink-0 text-brass" />
              <div>
                <p className="m-0 text-sm font-semibold text-paper">
                  Perlu mengubah kreatif atau penempatan?
                </p>
                <p className="m-0 mt-1 text-sm text-paper-dim">
                  Buka editor untuk pengiklan, campaign, kreatif, upload gambar, dan pengaturan slot
                  per situs.
                </p>
              </div>
            </div>
            <Button type="button" variant="outline" onClick={() => setShowAdvanced(true)}>
              <SlidersHorizontal className="mr-2 h-4 w-4" />
              Buka editor lengkap
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  detail,
}: {
  readonly icon: typeof Target;
  readonly label: string;
  readonly value: string;
  readonly detail: string;
}) {
  return (
    <Card className="rounded-lg border-hairline bg-bg-raised shadow-none">
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="m-0 text-xs text-paper-dim">{label}</p>
          <Icon className="h-4 w-4 text-brass" aria-hidden="true" />
        </div>
        <p className="m-0 mt-3 font-mono text-2xl font-semibold tracking-tight text-paper">
          {value}
        </p>
        <p className="m-0 mt-1 text-xs text-paper-dim">{detail}</p>
      </CardContent>
    </Card>
  );
}
