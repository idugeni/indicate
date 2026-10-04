'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Image as ImageIcon, LayoutGrid, Megaphone, MousePointerClick, Newspaper } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EmptyState } from '@/modules/dashboard/components/empty-state';
import { DashboardSelect, DashboardSelectItem } from '@/modules/dashboard/components/shared/dashboard-select';
import { FormNotice } from '@/modules/dashboard/components/shared/form-notice';
import { SectionCard } from '@/modules/dashboard/components/shared/section-card';
import { AD_SLOT_IDS, AD_SLOTS, type AdSlotId } from '@/modules/ads/slots';
import { isSlotMapped, safeTemplateId } from '@/modules/ads/config';
import { TEMPLATE_AD_MAP } from '@/modules/ads/placement-map';
import { TEMPLATE_IDS, type TemplateId } from '@/modules/site/components/network/templates/listing-shared';

interface OverviewSite { readonly id: string; readonly name: string; readonly hostname: string; readonly templateId: string | null }
interface OverviewSlot { readonly id: string; readonly name: string; readonly description: string; readonly active: boolean }
interface OverviewSetting { readonly siteId: string; readonly slotId: string; readonly enabled: boolean; readonly creativeId: string | null; readonly version: number }
interface OverviewAdvertiser { readonly id: string; readonly name: string; readonly contactEmail: string | null; readonly version: number }
interface OverviewCampaign { readonly id: string; readonly advertiserId: string; readonly name: string; readonly status: string; readonly priority: number; readonly startsAt: string | null; readonly endsAt: string | null; readonly version: number }
interface OverviewCreative { readonly id: string; readonly campaignId: string | null; readonly kind: string; readonly imageUrl: string | null; readonly href: string | null; readonly altText: string | null; readonly html: string | null; readonly provider: string | null; readonly providerClientId: string | null; readonly providerSlotId: string | null; readonly status: string; readonly version: number }
interface OverviewPlacement { readonly id: string; readonly campaignId: string; readonly creativeId: string; readonly slotId: string; readonly siteId: string | null; readonly templateId: string | null; readonly device: string | null; readonly priority: number; readonly startsAt: string | null; readonly endsAt: string | null; readonly active: boolean; readonly version: number }
interface Overview {
  readonly sites: readonly OverviewSite[];
  readonly slots: readonly OverviewSlot[];
  readonly settings: readonly OverviewSetting[];
  readonly advertisers: readonly OverviewAdvertiser[];
  readonly campaigns: readonly OverviewCampaign[];
  readonly creatives: readonly OverviewCreative[];
  readonly placements: readonly OverviewPlacement[];
}

async function apiGet(organizationId: string): Promise<Overview> {
  const response = await fetch(`/api/dashboard/ads?organizationId=${encodeURIComponent(organizationId)}&scope=overview`);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return (await response.json()) as Overview;
}

async function apiPost(organizationId: string, action: string, payload: Record<string, unknown>): Promise<unknown> {
  const response = await fetch('/api/dashboard/ads', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ organizationId, action, payload }),
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { readonly error?: { readonly message?: string } } | null;
    throw new Error(body?.error?.message ?? `HTTP ${response.status}`);
  }
  return response.json() as Promise<unknown>;
}

function templatesForSlot(slot: AdSlotId): readonly TemplateId[] {
  return TEMPLATE_IDS.filter((templateId) => {
    const zones = TEMPLATE_AD_MAP[templateId];
    return zones.header.includes(slot) || zones.top.includes(slot) || zones.listing.includes(slot) || zones.article.includes(slot) || zones.channel.includes(slot) || zones.footer.includes(slot);
  });
}

function creativeLabel(creative: OverviewCreative): string {
  if (creative.kind === 'image') return creative.imageUrl ?? creative.id;
  if (creative.kind === 'html') return `HTML · ${(creative.html ?? '').slice(0, 42)}`;
  return `Adsense · ${creative.id.slice(0, 8)}`;
}

const toIsoOrNull = (value: string): string | null => (value === '' ? null : new Date(value).toISOString());

/**
 * Self-fetching ad management workspace: slot switches per site, advertisers,
 * campaigns, creatives, and placements.
 *
 * @param organizationId - Active tenant organization.
 * @returns Tabbed management panel owning its own fetch lifecycle.
 */
export function AdsManagementPanel({ organizationId }: { readonly organizationId: string }) {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [siteId, setSiteId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const body = await apiGet(organizationId);
      setOverview(body);
      setSiteId((previous) => previous !== '' ? previous : (body.sites[0]?.id ?? ''));
    } catch {
      setError('Gagal memuat data iklan.');
    } finally {
      setBusy(false);
    }
  }, [organizationId]);

  useEffect(() => {
    void Promise.resolve().then(() => reload());
  }, [reload]);

  const mutate = useCallback(async (action: string, payload: Record<string, unknown>, success: string) => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await apiPost(organizationId, action, payload);
      setNotice(success);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Perintah iklan gagal.');
    } finally {
      setBusy(false);
    }
  }, [organizationId, reload]);

  const settingsBySlot = useMemo(() => {
    const map = new Map<string, OverviewSetting>();
    for (const setting of overview?.settings ?? []) {
      if (setting.siteId === siteId) map.set(setting.slotId, setting);
    }
    return map;
  }, [overview, siteId]);

  const activeSite = overview?.sites.find((site) => site.id === siteId) ?? null;
  const activeTemplateId = activeSite === null ? null : safeTemplateId(activeSite.templateId);

  return (
    <div className="space-y-6">
      {error ? <FormNotice tone="error">{error}</FormNotice> : null}
      {notice ? <FormNotice tone="success">{notice}</FormNotice> : null}
      <Tabs defaultValue="slot" className="w-full">
        <TabsList aria-label="Bagian manajemen iklan" className="max-w-full overflow-x-auto overflow-y-clip">
          <TabsTrigger value="slot" className="flex-none">
            <LayoutGrid className="h-3.5 w-3.5 text-brass" aria-hidden="true" />
            <span>Slot Situs</span>
          </TabsTrigger>
          <TabsTrigger value="kampanye" className="flex-none">
            <Newspaper className="h-3.5 w-3.5 text-brass" aria-hidden="true" />
            <span>Kampanye</span>
          </TabsTrigger>
          <TabsTrigger value="kreatif" className="flex-none">
            <ImageIcon className="h-3.5 w-3.5 text-brass" aria-hidden="true" />
            <span>Kreatif</span>
          </TabsTrigger>
          <TabsTrigger value="penempatan" className="flex-none">
            <MousePointerClick className="h-3.5 w-3.5 text-brass" aria-hidden="true" />
            <span>Penempatan</span>
          </TabsTrigger>
        </TabsList>
        <TabsContent keepMounted value="slot">
          <SectionCard icon={LayoutGrid} title="Slot per situs" eyebrow="tenant · slot">
            <div className="grid gap-2 py-4 sm:max-w-sm">
              <Label htmlFor="ads-site">Situs</Label>
              <DashboardSelect id="ads-site" value={siteId} disabled={busy || (overview?.sites.length ?? 0) === 0} onValueChange={(next) => setSiteId(next ?? '')} placeholder="Pilih situs" ariaLabel="Pilih situs">
                {(overview?.sites ?? []).map((site) => (
                  <DashboardSelectItem key={site.id} value={site.id}>
                    {`${site.name} · ${site.hostname}`}
                  </DashboardSelectItem>
                ))}
              </DashboardSelect>
            </div>
            {activeSite === null ? (
              <EmptyState title="Belum ada situs aktif" description="Tambahkan situs aktif agar slot iklan dapat dikelola." compact />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Slot</TableHead>
                    <TableHead>Template</TableHead>
                    <TableHead>Aktif</TableHead>
                    <TableHead>Kreatif kustom</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {AD_SLOT_IDS.map((slot) => {
                    const setting = settingsBySlot.get(slot);
                    const enabled = setting?.enabled ?? false;
                    const templates = templatesForSlot(slot);
                    const mappedForSite = activeTemplateId === null || isSlotMapped(activeTemplateId, slot);
                    return (
                      <TableRow key={slot}>
                        <TableCell>
                          <p className="m-0 font-sans text-[13px] font-semibold text-paper">{AD_SLOTS[slot].label}</p>
                          <p className="m-0 font-mono text-[11px] text-paper-faint">{slot}</p>
                          {mappedForSite || activeTemplateId === null ? null : (
                            <p className="m-0 mt-1 font-sans text-[11px] text-paper-faint">
                              {`Tidak tersedia di template ${activeTemplateId}.`}
                            </p>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="flex flex-wrap gap-1">
                            {templates.length === 0 ? (
                              <Badge variant="outline">cadangan</Badge>
                            ) : (
                              templates.slice(0, 3).map((template) => <Badge key={template} variant="outline">{template}</Badge>)
                            )}
                            {templates.length > 3 ? <Badge variant="outline">+{templates.length - 3}</Badge> : null}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Checkbox
                            checked={enabled}
                            disabled={busy || !mappedForSite}
                            aria-label={mappedForSite ? `Aktifkan slot ${slot}` : `Slot ${slot} tidak tersedia di template situs ini`}
                            onCheckedChange={(checked) => {
                              void mutate('ads.tenant_setting.save', {
                                siteId, slotId: slot, enabled: checked === true,
                                creativeId: setting?.creativeId ?? null,
                                expectedVersion: setting?.version ?? null,
                              }, `Slot ${slot} ${checked === true ? 'diaktifkan' : 'dinonaktifkan'}.`);
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <DashboardSelect
                            id={`ads-creative-${slot}`}
                            value={setting?.creativeId ?? ''}
                            disabled={busy || !mappedForSite}
                            placeholder="Bawaan kampanye"
                            onValueChange={(next) => {
                              void mutate('ads.tenant_setting.save', {
                                siteId, slotId: slot, enabled,
                                creativeId: next === '' ? null : next,
                                expectedVersion: setting?.version ?? null,
                              }, `Kreatif slot ${slot} diperbarui.`);
                            }}
                            ariaLabel={`Kreatif kustom slot ${slot}`}
                          >
                            <DashboardSelectItem value="">Bawaan kampanye</DashboardSelectItem>
                            {(overview?.creatives ?? []).filter((creative) => creative.status === 'active').map((creative) => (
                              <DashboardSelectItem key={creative.id} value={creative.id}>
                                {`${creative.kind} · ${creativeLabel(creative).slice(0, 40)}`}
                              </DashboardSelectItem>
                            ))}
                          </DashboardSelect>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </SectionCard>
        </TabsContent>
        <TabsContent keepMounted value="kampanye">
          <div className="space-y-6">
            <AdvertiserForm busy={busy} advertisers={overview?.advertisers ?? []} onCreate={(payload) => mutate('ads.advertiser.create', payload, 'Pengiklan dibuat.')} onUpdate={(payload) => mutate('ads.advertiser.update', payload, 'Pengiklan diperbarui.')} onDelete={(payload) => mutate('ads.advertiser.delete', payload, 'Pengiklan dihapus.')} />
            <CampaignSection overview={overview} busy={busy} onCreate={(payload) => mutate('ads.campaign.create', payload, 'Kampanye dibuat.')} onStatus={(payload) => mutate('ads.campaign.status', payload, 'Status kampanye diperbarui.')} onUpdate={(payload) => mutate('ads.campaign.update', payload, 'Kampanye diperbarui.')} onDelete={(payload) => mutate('ads.campaign.delete', payload, 'Kampanye dihapus.')} />
          </div>
        </TabsContent>
        <TabsContent keepMounted value="kreatif">
          <CreativeSection organizationId={organizationId} overview={overview} busy={busy} onCreate={(payload) => mutate('ads.creative.create', payload, 'Kreatif dibuat.')} onStatus={(payload) => mutate('ads.creative.status', payload, 'Status kreatif diperbarui.')} onUpdate={(payload) => mutate('ads.creative.update', payload, 'Kreatif diperbarui.')} onDelete={(payload) => mutate('ads.creative.delete', payload, 'Kreatif dihapus.')} />
        </TabsContent>
        <TabsContent keepMounted value="penempatan">
          <PlacementSection overview={overview} busy={busy} onCreate={(payload) => mutate('ads.placement.create', payload, 'Penempatan dibuat.')} onUpdate={(payload) => mutate('ads.placement.update', payload, 'Penempatan diperbarui.')} onDelete={(payload) => mutate('ads.placement.delete', payload, 'Penempatan dihapus.')} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function AdvertiserForm({ busy, advertisers, onCreate, onUpdate, onDelete }: {
  readonly busy: boolean;
  readonly advertisers: readonly OverviewAdvertiser[];
  readonly onCreate: (payload: Record<string, unknown>) => Promise<void>;
  readonly onUpdate: (payload: Record<string, unknown>) => Promise<void>;
  readonly onDelete: (payload: Record<string, unknown>) => Promise<void>;
}) {
  const [name, setName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editVersion, setEditVersion] = useState(0);
  return (
    <SectionCard icon={Megaphone} title="Pengiklan" eyebrow="advertiser">
      <form
        className="grid gap-3 py-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end"
        onSubmit={(event) => {
          event.preventDefault();
          void onCreate({ name: name.trim(), contactEmail: contactEmail.trim() === '' ? null : contactEmail.trim() }).then(() => { setName(''); setContactEmail(''); });
        }}
      >
        <span className="grid gap-1.5">
          <Label htmlFor="ads-adv-name">Nama pengiklan</Label>
          <Input id="ads-adv-name" value={name} onChange={(event) => setName(event.target.value)} required minLength={3} maxLength={120} disabled={busy} placeholder="PT Contoh Iklan" />
        </span>
        <span className="grid gap-1.5">
          <Label htmlFor="ads-adv-email">Surel kontak</Label>
          <Input id="ads-adv-email" type="email" value={contactEmail} onChange={(event) => setContactEmail(event.target.value)} disabled={busy} placeholder="iklan@contoh.id" />
        </span>
        <Button type="submit" disabled={busy || name.trim().length < 3}>Tambah</Button>
      </form>
      {advertisers.length === 0 ? (
        <EmptyState title="Belum ada pengiklan" description="Buat pengiklan dulu sebelum membuat kampanye." compact />
      ) : (
        <ul className="m-0 grid gap-2 p-0 py-2">
          {advertisers.map((advertiser) => (
            <li key={advertiser.id} className="list-none">
              {editingId === advertiser.id ? (
                <form
                  className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto_auto] sm:items-end"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void onUpdate({ id: advertiser.id, name: editName.trim(), contactEmail: editEmail.trim() === '' ? null : editEmail.trim(), expectedVersion: editVersion }).then(() => setEditingId(null));
                  }}
                >
                  <span className="grid gap-1.5">
                    <Label htmlFor={`ads-adv-edit-name-${advertiser.id}`}>Nama</Label>
                    <Input id={`ads-adv-edit-name-${advertiser.id}`} value={editName} onChange={(event) => setEditName(event.target.value)} required minLength={3} maxLength={120} disabled={busy} />
                  </span>
                  <span className="grid gap-1.5">
                    <Label htmlFor={`ads-adv-edit-email-${advertiser.id}`}>Surel kontak</Label>
                    <Input id={`ads-adv-edit-email-${advertiser.id}`} type="email" value={editEmail} onChange={(event) => setEditEmail(event.target.value)} disabled={busy} />
                  </span>
                  <Button type="submit" size="sm" disabled={busy || editName.trim().length < 3}>Simpan</Button>
                  <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={() => setEditingId(null)}>Batal</Button>
                </form>
              ) : (
                <span className="flex flex-wrap items-center gap-1.5">
                  <Badge variant="outline">{advertiser.name}</Badge>
                  <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={() => { setEditingId(advertiser.id); setEditName(advertiser.name); setEditEmail(advertiser.contactEmail ?? ''); setEditVersion(advertiser.version); }}>Ubah</Button>
                  <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={() => { if (!window.confirm(`Hapus pengiklan "${advertiser.name}"?`)) return; void onDelete({ id: advertiser.id }); }}>Hapus</Button>
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}

function CampaignSection({ overview, busy, onCreate, onStatus, onUpdate, onDelete }: {
  readonly overview: Overview | null;
  readonly busy: boolean;
  readonly onCreate: (payload: Record<string, unknown>) => Promise<void>;
  readonly onStatus: (payload: Record<string, unknown>) => Promise<void>;
  readonly onUpdate: (payload: Record<string, unknown>) => Promise<void>;
  readonly onDelete: (payload: Record<string, unknown>) => Promise<void>;
}) {
  const [advertiserId, setAdvertiserId] = useState('');
  const [name, setName] = useState('');
  const [status, setStatus] = useState('draft');
  const [priority, setPriority] = useState('0');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editPriority, setEditPriority] = useState('0');
  const [editStartsAt, setEditStartsAt] = useState('');
  const [editEndsAt, setEditEndsAt] = useState('');
  const [editVersion, setEditVersion] = useState(0);
  const advertisers = overview?.advertisers ?? [];
  const campaigns = overview?.campaigns ?? [];
  const editingCampaign = campaigns.find((campaign) => campaign.id === editingId) ?? null;
  return (
    <SectionCard icon={Newspaper} title="Kampanye" eyebrow="campaign">
      <form
        className="grid gap-3 py-4 sm:grid-cols-2 lg:grid-cols-3"
        onSubmit={(event) => {
          event.preventDefault();
          void onCreate({
            advertiserId, name: name.trim(), status, priority: Number(priority),
            startsAt: toIsoOrNull(startsAt), endsAt: toIsoOrNull(endsAt),
          }).then(() => { setName(''); setPriority('0'); setStartsAt(''); setEndsAt(''); });
        }}
      >
        <span className="grid gap-1.5">
          <Label htmlFor="ads-cam-adv">Pengiklan</Label>
          <DashboardSelect id="ads-cam-adv" value={advertiserId} required disabled={busy || advertisers.length === 0} onValueChange={(next) => setAdvertiserId(next ?? '')} placeholder="Pilih pengiklan" ariaLabel="Pilih pengiklan">
            {advertisers.map((advertiser) => <DashboardSelectItem key={advertiser.id} value={advertiser.id}>{advertiser.name}</DashboardSelectItem>)}
          </DashboardSelect>
        </span>
        <span className="grid gap-1.5">
          <Label htmlFor="ads-cam-name">Nama kampanye</Label>
          <Input id="ads-cam-name" value={name} onChange={(event) => setName(event.target.value)} required minLength={3} maxLength={160} disabled={busy} />
        </span>
        <span className="grid gap-1.5">
          <Label htmlFor="ads-cam-status">Status awal</Label>
          <DashboardSelect id="ads-cam-status" value={status} disabled={busy} onValueChange={(next) => setStatus(next ?? 'draft')} placeholder="Status" ariaLabel="Status awal kampanye">
            {['draft', 'scheduled', 'active', 'paused', 'ended'].map((value) => <DashboardSelectItem key={value} value={value}>{value}</DashboardSelectItem>)}
          </DashboardSelect>
        </span>
        <span className="grid gap-1.5">
          <Label htmlFor="ads-cam-priority">Prioritas</Label>
          <Input id="ads-cam-priority" type="number" min={0} max={1000} value={priority} onChange={(event) => setPriority(event.target.value)} disabled={busy} />
        </span>
        <span className="grid gap-1.5">
          <Label htmlFor="ads-cam-start">Mulai</Label>
          <Input id="ads-cam-start" type="datetime-local" value={startsAt} onChange={(event) => setStartsAt(event.target.value)} disabled={busy} />
        </span>
        <span className="grid gap-1.5">
          <Label htmlFor="ads-cam-end">Berakhir</Label>
          <Input id="ads-cam-end" type="datetime-local" value={endsAt} onChange={(event) => setEndsAt(event.target.value)} disabled={busy} />
        </span>
        <span className="flex items-end"><Button type="submit" disabled={busy || advertiserId === '' || name.trim().length < 3}>Buat kampanye</Button></span>
      </form>
      {campaigns.length === 0 ? (
        <EmptyState title="Belum ada kampanye" description="Kampanye aktif dengan penempatan menentukan kreatif yang tayang." compact />
      ) : (
        <>
          {editingCampaign === null ? null : (
            <form
              className="grid gap-3 border-b border-line-data py-4 sm:grid-cols-2 lg:grid-cols-3"
              onSubmit={(event) => {
                event.preventDefault();
                void onUpdate({
                  id: editingCampaign.id, name: editName.trim(), priority: Number(editPriority),
                  startsAt: toIsoOrNull(editStartsAt), endsAt: toIsoOrNull(editEndsAt),
                  expectedVersion: editVersion,
                }).then(() => setEditingId(null));
              }}
            >
              <span className="grid gap-1.5">
                <Label htmlFor="ads-cam-edit-name">Nama kampanye</Label>
                <Input id="ads-cam-edit-name" value={editName} onChange={(event) => setEditName(event.target.value)} required minLength={3} maxLength={160} disabled={busy} />
              </span>
              <span className="grid gap-1.5">
                <Label htmlFor="ads-cam-edit-priority">Prioritas</Label>
                <Input id="ads-cam-edit-priority" type="number" min={0} max={1000} value={editPriority} onChange={(event) => setEditPriority(event.target.value)} disabled={busy} />
              </span>
              <span className="grid gap-1.5">
                <Label htmlFor="ads-cam-edit-start">Mulai</Label>
                <Input id="ads-cam-edit-start" type="datetime-local" value={editStartsAt} onChange={(event) => setEditStartsAt(event.target.value)} disabled={busy} />
              </span>
              <span className="grid gap-1.5">
                <Label htmlFor="ads-cam-edit-end">Berakhir</Label>
                <Input id="ads-cam-edit-end" type="datetime-local" value={editEndsAt} onChange={(event) => setEditEndsAt(event.target.value)} disabled={busy} />
              </span>
              <span className="flex items-end gap-1.5">
                <Button type="submit" size="sm" disabled={busy || editName.trim().length < 3}>Simpan</Button>
                <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={() => setEditingId(null)}>Batal</Button>
              </span>
            </form>
          )}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kampanye</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Prioritas</TableHead>
                <TableHead>Periode</TableHead>
                <TableHead>Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {campaigns.map((campaign) => (
                <TableRow key={campaign.id}>
                  <TableCell className="font-sans text-[13px] font-semibold text-paper">{campaign.name}</TableCell>
                  <TableCell>
                    <DashboardSelect id={`ads-cam-st-${campaign.id}`} value={campaign.status} disabled={busy} onValueChange={(next) => { if (next !== null) void onStatus({ id: campaign.id, status: next, expectedVersion: campaign.version }); }} placeholder="Status" ariaLabel={`Status kampanye ${campaign.name}`}>
                      {['draft', 'scheduled', 'active', 'paused', 'ended'].map((value) => <DashboardSelectItem key={value} value={value}>{value}</DashboardSelectItem>)}
                    </DashboardSelect>
                  </TableCell>
                  <TableCell className="font-mono text-xs tabular-nums text-paper-dim">{campaign.priority}</TableCell>
                  <TableCell className="font-mono text-[11px] text-paper-faint">
                    {`${campaign.startsAt === null ? '—' : campaign.startsAt.slice(0, 10)} → ${campaign.endsAt === null ? '—' : campaign.endsAt.slice(0, 10)}`}
                  </TableCell>
                  <TableCell>
                    <span className="flex flex-wrap gap-1">
                      <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={() => { setEditingId(campaign.id); setEditName(campaign.name); setEditPriority(String(campaign.priority)); setEditStartsAt(campaign.startsAt === null ? '' : campaign.startsAt.slice(0, 16)); setEditEndsAt(campaign.endsAt === null ? '' : campaign.endsAt.slice(0, 16)); setEditVersion(campaign.version); }}>Ubah</Button>
                      <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={() => { if (!window.confirm(`Hapus kampanye "${campaign.name}"?`)) return; void onDelete({ id: campaign.id }); }}>Hapus</Button>
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </>
      )}
    </SectionCard>
  );
}

function CreativeSection({ organizationId, overview, busy, onCreate, onStatus, onUpdate, onDelete }: {
  readonly organizationId: string;
  readonly overview: Overview | null;
  readonly busy: boolean;
  readonly onCreate: (payload: Record<string, unknown>) => Promise<void>;
  readonly onStatus: (payload: Record<string, unknown>) => Promise<void>;
  readonly onUpdate: (payload: Record<string, unknown>) => Promise<void>;
  readonly onDelete: (payload: Record<string, unknown>) => Promise<void>;
}) {
  const [kind, setKind] = useState('image');
  const [campaignId, setCampaignId] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [href, setHref] = useState('');
  const [alt, setAlt] = useState('');
  const [html, setHtml] = useState('');
  const [clientId, setClientId] = useState('');
  const [uploadBusy, setUploadBusy] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editImageUrl, setEditImageUrl] = useState('');
  const [editHref, setEditHref] = useState('');
  const [editAlt, setEditAlt] = useState('');
  const [editHtml, setEditHtml] = useState('');
  const [editClientId, setEditClientId] = useState('');
  const [editSlotId, setEditSlotId] = useState('');
  const [editVersion, setEditVersion] = useState(0);
  const campaigns = overview?.campaigns ?? [];
  const creatives = overview?.creatives ?? [];
  const editingCreative = creatives.find((creative) => creative.id === editingId) ?? null;

  const uploadFile = useCallback(async (file: File) => {
    setUploadBusy(true);
    setUploadError(null);
    try {
      const form = new FormData();
      form.set('organizationId', organizationId);
      form.set('action', 'ads.creative.upload');
      form.set('file', file);
      if (campaignId !== '') form.set('campaignId', campaignId);
      if (href.trim() !== '') form.set('href', href.trim());
      if (alt.trim() !== '') form.set('alt', alt.trim());
      const response = await fetch('/api/dashboard/ads', { method: 'POST', body: form });
      const body = (await response.json().catch(() => null)) as { readonly imageUrl?: unknown; readonly error?: { readonly message?: string } } | null;
      if (!response.ok || typeof body?.imageUrl !== 'string') throw new Error(body?.error?.message ?? `HTTP ${response.status}`);
      setImageUrl(body.imageUrl);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Unggah gambar gagal.');
    } finally {
      setUploadBusy(false);
    }
  }, [organizationId, campaignId, href, alt]);
  return (
    <SectionCard icon={ImageIcon} title="Kreatif" eyebrow="creative">
      <form
        className="grid gap-3 py-4 sm:grid-cols-2 lg:grid-cols-3"
        onSubmit={(event) => {
          event.preventDefault();
          const base = { campaignId: campaignId === '' ? null : campaignId };
          const payload = kind === 'image'
            ? { ...base, kind, imageUrl: imageUrl.trim(), href: href.trim() === '' ? undefined : href.trim(), alt: alt.trim() === '' ? undefined : alt.trim() }
            : kind === 'html'
              ? { ...base, kind, html }
              : { ...base, kind, provider: 'adsense', clientId: clientId.trim() === '' ? undefined : clientId.trim() };
          void onCreate(payload).then(() => { setImageUrl(''); setHref(''); setAlt(''); setHtml(''); setClientId(''); });
        }}
      >
        <span className="grid gap-1.5">
          <Label htmlFor="ads-cre-kind">Jenis</Label>
          <DashboardSelect id="ads-cre-kind" value={kind} disabled={busy} onValueChange={(next) => setKind(next ?? 'image')} placeholder="Jenis" ariaLabel="Jenis kreatif">
            <DashboardSelectItem value="image">Gambar</DashboardSelectItem>
            <DashboardSelectItem value="html">HTML</DashboardSelectItem>
            <DashboardSelectItem value="provider">Penyedia (AdSense)</DashboardSelectItem>
          </DashboardSelect>
        </span>
        <span className="grid gap-1.5">
          <Label htmlFor="ads-cre-cam">Kampanye (opsional)</Label>
          <DashboardSelect id="ads-cre-cam" value={campaignId} disabled={busy} onValueChange={(next) => setCampaignId(next ?? '')} placeholder="Tanpa kampanye" ariaLabel="Kampanye kreatif">
            <DashboardSelectItem value="">Tanpa kampanye</DashboardSelectItem>
            {campaigns.map((campaign) => <DashboardSelectItem key={campaign.id} value={campaign.id}>{campaign.name}</DashboardSelectItem>)}
          </DashboardSelect>
        </span>
        {kind === 'image' ? (
          <>
            <span className="grid gap-1.5">
              <Label htmlFor="ads-cre-img">URL gambar</Label>
              <Input id="ads-cre-img" value={imageUrl} onChange={(event) => setImageUrl(event.target.value)} required disabled={busy} placeholder="https://…" />
            </span>
            <span className="grid gap-1.5">
              <Label htmlFor="ads-cre-file">Unggah berkas (maks 5MB)</Label>
              <Input
                id="ads-cre-file"
                type="file"
                accept="image/*"
                disabled={busy || uploadBusy}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = '';
                  if (file !== undefined && file !== null) void uploadFile(file);
                }}
              />
              {uploadBusy ? <p className="m-0 font-sans text-[11px] text-paper-faint">Mengunggah…</p> : null}
              {uploadError !== null ? <p className="m-0 font-sans text-[11px] text-error">{uploadError}</p> : null}
              {imageUrl !== '' ? (
                // eslint-disable-next-line @next/next/no-img-element -- pratinjau kecil dasbor saja; tayang publik memakai renderer slot iklan
                <img src={imageUrl} alt="" aria-hidden="true" className="h-10 w-auto justify-self-start rounded border border-hairline" />
              ) : null}
            </span>
            <span className="grid gap-1.5">
              <Label htmlFor="ads-cre-href">Tautan klik</Label>
              <Input id="ads-cre-href" value={href} onChange={(event) => setHref(event.target.value)} disabled={busy} placeholder="https://pengiklan…" />
            </span>
            <span className="grid gap-1.5">
              <Label htmlFor="ads-cre-alt">Teks alt</Label>
              <Input id="ads-cre-alt" value={alt} onChange={(event) => setAlt(event.target.value)} disabled={busy} maxLength={300} />
            </span>
          </>
        ) : null}
        {kind === 'html' ? (
          <span className="grid gap-1.5 sm:col-span-2">
            <Label htmlFor="ads-cre-html">Markup HTML tepercaya</Label>
            <Input id="ads-cre-html" value={html} onChange={(event) => setHtml(event.target.value)} required disabled={busy} placeholder="<div>…</div>" />
          </span>
        ) : null}
        {kind === 'provider' ? (
          <span className="grid gap-1.5">
            <Label htmlFor="ads-cre-client">ID klien penyedia</Label>
            <Input id="ads-cre-client" value={clientId} onChange={(event) => setClientId(event.target.value)} disabled={busy} placeholder="ca-pub-…" />
          </span>
        ) : null}
        <span className="flex items-end"><Button type="submit" disabled={busy || uploadBusy}>Buat kreatif</Button></span>
      </form>
      {creatives.length === 0 ? (
        <EmptyState title="Belum ada kreatif" description="Kreatif aktif dapat dipasang ke slot situs atau penempatan kampanye." compact />
      ) : (
        <>
          {editingCreative === null ? null : (
            <form
              className="grid gap-3 border-b border-line-data py-4 sm:grid-cols-2 lg:grid-cols-3"
              onSubmit={(event) => {
                event.preventDefault();
                const payload: Record<string, unknown> = { id: editingCreative.id, kind: editingCreative.kind, expectedVersion: editVersion };
                if (editingCreative.kind === 'image') {
                  payload.imageUrl = editImageUrl.trim();
                  if (editHref.trim() !== '') payload.href = editHref.trim();
                  if (editAlt.trim() !== '') payload.alt = editAlt.trim();
                } else if (editingCreative.kind === 'html') {
                  payload.html = editHtml;
                } else {
                  if (editClientId.trim() !== '') payload.clientId = editClientId.trim();
                  if (editSlotId.trim() !== '') payload.slotId = editSlotId.trim();
                }
                void onUpdate(payload).then(() => setEditingId(null));
              }}
            >
              {editingCreative.kind === 'image' ? (
                <>
                  <span className="grid gap-1.5">
                    <Label htmlFor="ads-cre-edit-img">URL gambar</Label>
                    <Input id="ads-cre-edit-img" value={editImageUrl} onChange={(event) => setEditImageUrl(event.target.value)} required disabled={busy} />
                  </span>
                  <span className="grid gap-1.5">
                    <Label htmlFor="ads-cre-edit-href">Tautan klik</Label>
                    <Input id="ads-cre-edit-href" value={editHref} onChange={(event) => setEditHref(event.target.value)} disabled={busy} />
                  </span>
                  <span className="grid gap-1.5">
                    <Label htmlFor="ads-cre-edit-alt">Teks alt</Label>
                    <Input id="ads-cre-edit-alt" value={editAlt} onChange={(event) => setEditAlt(event.target.value)} disabled={busy} maxLength={300} />
                  </span>
                </>
              ) : null}
              {editingCreative.kind === 'html' ? (
                <span className="grid gap-1.5 sm:col-span-2">
                  <Label htmlFor="ads-cre-edit-html">Markup HTML tepercaya</Label>
                  <Input id="ads-cre-edit-html" value={editHtml} onChange={(event) => setEditHtml(event.target.value)} required disabled={busy} />
                </span>
              ) : null}
              {editingCreative.kind !== 'image' && editingCreative.kind !== 'html' ? (
                <>
                  <span className="grid gap-1.5">
                    <Label htmlFor="ads-cre-edit-client">ID klien penyedia</Label>
                    <Input id="ads-cre-edit-client" value={editClientId} onChange={(event) => setEditClientId(event.target.value)} disabled={busy} />
                  </span>
                  <span className="grid gap-1.5">
                    <Label htmlFor="ads-cre-edit-slot">ID slot penyedia</Label>
                    <Input id="ads-cre-edit-slot" value={editSlotId} onChange={(event) => setEditSlotId(event.target.value)} disabled={busy} />
                  </span>
                </>
              ) : null}
              <span className="flex items-end gap-1.5">
                <Button type="submit" size="sm" disabled={busy}>Simpan</Button>
                <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={() => setEditingId(null)}>Batal</Button>
              </span>
            </form>
          )}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kreatif</TableHead>
                <TableHead>Jenis</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {creatives.map((creative) => (
                <TableRow key={creative.id}>
                  <TableCell className="max-w-64 truncate font-sans text-[13px] text-paper">{creativeLabel(creative)}</TableCell>
                  <TableCell><Badge variant="outline">{creative.kind}</Badge></TableCell>
                  <TableCell>
                    <DashboardSelect id={`ads-cre-st-${creative.id}`} value={creative.status} disabled={busy} onValueChange={(next) => { if (next !== null) void onStatus({ id: creative.id, status: next, expectedVersion: creative.version }); }} placeholder="Status" ariaLabel="Status kreatif">
                      {['active', 'inactive', 'archived'].map((value) => <DashboardSelectItem key={value} value={value}>{value}</DashboardSelectItem>)}
                    </DashboardSelect>
                  </TableCell>
                  <TableCell>
                    <span className="flex flex-wrap gap-1">
                      <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={() => { setEditingId(creative.id); setEditImageUrl(creative.imageUrl ?? ''); setEditHref(creative.href ?? ''); setEditAlt(creative.altText ?? ''); setEditHtml(creative.html ?? ''); setEditClientId(creative.providerClientId ?? ''); setEditSlotId(creative.providerSlotId ?? ''); setEditVersion(creative.version); }}>Ubah</Button>
                      <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={() => { if (!window.confirm(`Hapus kreatif ${creative.kind} ini?`)) return; void onDelete({ id: creative.id }); }}>Hapus</Button>
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </>
      )}
    </SectionCard>
  );
}

function PlacementSection({ overview, busy, onCreate, onUpdate, onDelete }: {
  readonly overview: Overview | null;
  readonly busy: boolean;
  readonly onCreate: (payload: Record<string, unknown>) => Promise<void>;
  readonly onUpdate: (payload: Record<string, unknown>) => Promise<void>;
  readonly onDelete: (payload: Record<string, unknown>) => Promise<void>;
}) {
  const [campaignId, setCampaignId] = useState('');
  const [creativeId, setCreativeId] = useState('');
  const [slotId, setSlotId] = useState('leaderboard');
  const [siteId, setSiteId] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [device, setDevice] = useState('');
  const [priority, setPriority] = useState('0');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPriority, setEditPriority] = useState('0');
  const [editStartsAt, setEditStartsAt] = useState('');
  const [editEndsAt, setEditEndsAt] = useState('');
  const [editVersion, setEditVersion] = useState(0);
  const campaigns = (overview?.campaigns ?? []).filter((campaign) => campaign.status === 'active');
  const creatives = (overview?.creatives ?? []).filter((creative) => creative.status === 'active');
  const placements = overview?.placements ?? [];
  const editingPlacement = placements.find((placement) => placement.id === editingId) ?? null;
  const campaignName = (id: string) => overview?.campaigns.find((campaign) => campaign.id === id)?.name ?? id.slice(0, 8);
  const creativeName = (id: string) => {
    const creative = overview?.creatives.find((item) => item.id === id);
    return creative === undefined ? id.slice(0, 8) : creativeLabel(creative).slice(0, 32);
  };
  return (
    <SectionCard icon={MousePointerClick} title="Penempatan" eyebrow="placement">
      <form
        className="grid gap-3 py-4 sm:grid-cols-2 lg:grid-cols-3"
        onSubmit={(event) => {
          event.preventDefault();
          void onCreate({
            campaignId, creativeId, slotId,
            siteId: siteId === '' ? null : siteId,
            templateId: templateId === '' ? null : templateId,
            device: device === '' ? null : device,
            priority: Number(priority), startsAt: toIsoOrNull(startsAt), endsAt: toIsoOrNull(endsAt),
          }).then(() => { setPriority('0'); setStartsAt(''); setEndsAt(''); });
        }}
      >
        <span className="grid gap-1.5">
          <Label htmlFor="ads-pla-cam">Kampanye aktif</Label>
          <DashboardSelect id="ads-pla-cam" value={campaignId} required disabled={busy || campaigns.length === 0} onValueChange={(next) => setCampaignId(next ?? '')} placeholder="Pilih kampanye" ariaLabel="Kampanye penempatan">
            {campaigns.map((campaign) => <DashboardSelectItem key={campaign.id} value={campaign.id}>{campaign.name}</DashboardSelectItem>)}
          </DashboardSelect>
        </span>
        <span className="grid gap-1.5">
          <Label htmlFor="ads-pla-cre">Kreatif aktif</Label>
          <DashboardSelect id="ads-pla-cre" value={creativeId} required disabled={busy || creatives.length === 0} onValueChange={(next) => setCreativeId(next ?? '')} placeholder="Pilih kreatif" ariaLabel="Kreatif penempatan">
            {creatives.map((creative) => <DashboardSelectItem key={creative.id} value={creative.id}>{`${creative.kind} · ${creativeLabel(creative).slice(0, 32)}`}</DashboardSelectItem>)}
          </DashboardSelect>
        </span>
        <span className="grid gap-1.5">
          <Label htmlFor="ads-pla-slot">Slot</Label>
          <DashboardSelect id="ads-pla-slot" value={slotId} disabled={busy} onValueChange={(next) => setSlotId(next ?? 'leaderboard')} placeholder="Slot" ariaLabel="Slot penempatan">
            {AD_SLOT_IDS.map((slot) => <DashboardSelectItem key={slot} value={slot}>{AD_SLOTS[slot].label}</DashboardSelectItem>)}
          </DashboardSelect>
        </span>
        <span className="grid gap-1.5">
          <Label htmlFor="ads-pla-site">Situs (kosong = semua)</Label>
          <DashboardSelect id="ads-pla-site" value={siteId} disabled={busy} onValueChange={(next) => setSiteId(next ?? '')} placeholder="Semua situs" ariaLabel="Situs penempatan">
            <DashboardSelectItem value="">Semua situs</DashboardSelectItem>
            {(overview?.sites ?? []).map((site) => <DashboardSelectItem key={site.id} value={site.id}>{`${site.name} · ${site.hostname}`}</DashboardSelectItem>)}
          </DashboardSelect>
        </span>
        <span className="grid gap-1.5">
          <Label htmlFor="ads-pla-tpl">Template (kosong = semua)</Label>
          <DashboardSelect id="ads-pla-tpl" value={templateId} disabled={busy} onValueChange={(next) => setTemplateId(next ?? '')} placeholder="Semua template" ariaLabel="Template penempatan">
            <DashboardSelectItem value="">Semua template</DashboardSelectItem>
            {TEMPLATE_IDS.map((template) => <DashboardSelectItem key={template} value={template}>{template}</DashboardSelectItem>)}
          </DashboardSelect>
        </span>
        <span className="grid gap-1.5">
          <Label htmlFor="ads-pla-dev">Perangkat (kosong = semua)</Label>
          <DashboardSelect id="ads-pla-dev" value={device} disabled={busy} onValueChange={(next) => setDevice(next ?? '')} placeholder="Semua perangkat" ariaLabel="Perangkat penempatan">
            <DashboardSelectItem value="">Semua perangkat</DashboardSelectItem>
            {['desktop', 'tablet', 'mobile'].map((value) => <DashboardSelectItem key={value} value={value}>{value}</DashboardSelectItem>)}
          </DashboardSelect>
        </span>
        <span className="grid gap-1.5">
          <Label htmlFor="ads-pla-priority">Prioritas</Label>
          <Input id="ads-pla-priority" type="number" min={0} max={1000} value={priority} onChange={(event) => setPriority(event.target.value)} disabled={busy} />
        </span>
        <span className="grid gap-1.5">
          <Label htmlFor="ads-pla-start">Mulai</Label>
          <Input id="ads-pla-start" type="datetime-local" value={startsAt} onChange={(event) => setStartsAt(event.target.value)} disabled={busy} />
        </span>
        <span className="grid gap-1.5">
          <Label htmlFor="ads-pla-end">Berakhir</Label>
          <Input id="ads-pla-end" type="datetime-local" value={endsAt} onChange={(event) => setEndsAt(event.target.value)} disabled={busy} />
        </span>
        <span className="flex items-end"><Button type="submit" disabled={busy || campaignId === '' || creativeId === ''}>Buat penempatan</Button></span>
      </form>
      {placements.length === 0 ? (
        <EmptyState title="Belum ada penempatan" description="Penempatan aktif mengalahkan kreatif bawaan slot." compact />
      ) : (
        <>
          {editingPlacement === null ? null : (
            <form
              className="grid gap-3 border-b border-line-data py-4 sm:grid-cols-2 lg:grid-cols-4"
              onSubmit={(event) => {
                event.preventDefault();
                void onUpdate({
                  id: editingPlacement.id, priority: Number(editPriority),
                  startsAt: toIsoOrNull(editStartsAt), endsAt: toIsoOrNull(editEndsAt),
                  expectedVersion: editVersion,
                }).then(() => setEditingId(null));
              }}
            >
              <span className="grid gap-1.5">
                <Label htmlFor="ads-pla-edit-priority">Prioritas</Label>
                <Input id="ads-pla-edit-priority" type="number" min={0} max={1000} value={editPriority} onChange={(event) => setEditPriority(event.target.value)} disabled={busy} />
              </span>
              <span className="grid gap-1.5">
                <Label htmlFor="ads-pla-edit-start">Mulai</Label>
                <Input id="ads-pla-edit-start" type="datetime-local" value={editStartsAt} onChange={(event) => setEditStartsAt(event.target.value)} disabled={busy} />
              </span>
              <span className="grid gap-1.5">
                <Label htmlFor="ads-pla-edit-end">Berakhir</Label>
                <Input id="ads-pla-edit-end" type="datetime-local" value={editEndsAt} onChange={(event) => setEditEndsAt(event.target.value)} disabled={busy} />
              </span>
              <span className="flex items-end gap-1.5">
                <Button type="submit" size="sm" disabled={busy}>Simpan</Button>
                <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={() => setEditingId(null)}>Batal</Button>
              </span>
            </form>
          )}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Slot</TableHead>
                <TableHead>Kampanye · Kreatif</TableHead>
                <TableHead>Cakupan</TableHead>
                <TableHead>Aktif</TableHead>
                <TableHead>Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {placements.map((placement) => (
                <TableRow key={placement.id}>
                  <TableCell className="font-mono text-xs text-paper">{placement.slotId}</TableCell>
                  <TableCell className="font-sans text-[13px] text-paper">{`${campaignName(placement.campaignId)} · ${creativeName(placement.creativeId)}`}</TableCell>
                  <TableCell className="font-mono text-[11px] text-paper-faint">
                    {`${placement.siteId === null ? 'semua situs' : placement.siteId.slice(0, 8)} · ${placement.templateId ?? 'semua template'} · ${placement.device ?? 'semua perangkat'}`}
                  </TableCell>
                  <TableCell>
                    <Checkbox
                      checked={placement.active}
                      disabled={busy}
                      aria-label={`Aktifkan penempatan ${placement.slotId}`}
                      onCheckedChange={(checked) => {
                        void onUpdate({ id: placement.id, active: checked === true, expectedVersion: placement.version });
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <span className="flex flex-wrap gap-1">
                      <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={() => { setEditingId(placement.id); setEditPriority(String(placement.priority)); setEditStartsAt(placement.startsAt === null ? '' : placement.startsAt.slice(0, 16)); setEditEndsAt(placement.endsAt === null ? '' : placement.endsAt.slice(0, 16)); setEditVersion(placement.version); }}>Ubah</Button>
                      <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={() => { if (!window.confirm(`Hapus penempatan slot "${placement.slotId}"?`)) return; void onDelete({ id: placement.id }); }}>Hapus</Button>
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </>
      )}
    </SectionCard>
  );
}
