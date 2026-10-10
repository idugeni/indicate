'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Code2, Globe, Image as ImageIcon, ImagePlus, LayoutGrid, Link2, Megaphone, MegaphoneOff, MousePointerClick, Newspaper } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { EmptyState } from '@/modules/dashboard/components/empty-state';
import { DashboardSelect, DashboardSelectItem } from '@/modules/dashboard/components/shared/dashboard-select';
import { FormNotice } from '@/modules/dashboard/components/shared/form-notice';
import { SectionCard } from '@/modules/dashboard/components/shared/section-card';
import { AD_SLOT_IDS, AD_SLOTS, type AdSlotId } from '@/modules/ads/slots';
import { TEMPLATE_IDS } from '@/modules/site/components/network/templates/listing-shared';

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

async function apiGet(organizationId: string, signal?: AbortSignal): Promise<Overview> {
  let response: Response;
  try {
    response = await fetch(`/api/dashboard/ads?organizationId=${encodeURIComponent(organizationId)}&scope=overview`, signal ? { signal } : undefined);
  } catch {
    throw new Error('Gagal memuat data iklan.');
  }
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { readonly error?: { readonly message?: string } } | null;
    throw new Error(body?.error?.message ?? 'Gagal memuat data iklan.');
  }
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

async function apiUpload(organizationId: string, file: File, href: string, alt: string): Promise<{ readonly id: string; readonly imageUrl: string }> {
  const form = new FormData();
  form.set('organizationId', organizationId);
  form.set('action', 'ads.creative.upload');
  form.set('file', file);
  if (href.trim() !== '') form.set('href', href.trim());
  if (alt.trim() !== '') form.set('alt', alt.trim());
  const response = await fetch('/api/dashboard/ads', { method: 'POST', body: form });
  const body = (await response.json().catch(() => null)) as { readonly id?: unknown; readonly imageUrl?: unknown; readonly error?: { readonly message?: string } } | null;
  if (!response.ok || typeof body?.imageUrl !== 'string' || typeof body?.id !== 'string') {
    throw new Error(body?.error?.message ?? 'Unggah gambar gagal.');
  }
  return { id: body.id, imageUrl: body.imageUrl };
}

const INTERNAL_UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function displayReference(value: string, fallback: string): string {
  return INTERNAL_UUID_PATTERN.test(value) ? fallback : value;
}

function creativeLabel(creative: OverviewCreative): string {
  if (creative.kind === 'image') return creative.imageUrl ?? 'Kreatif gambar';
  if (creative.kind === 'html') return `HTML · ${(creative.html ?? '').slice(0, 42)}`;
  const qualifier = creative.providerClientId ?? creative.providerSlotId;
  return `Adsense · ${qualifier ? displayReference(qualifier, 'ID provider tersedia') : 'Konfigurasi provider'}`;
}

function isSafeAdUrl(value: string): boolean {
  return value.startsWith('https://') || (value.startsWith('/') && !value.startsWith('//'));
}

function toIsoOrNull(value: string): string | null {
  if (value === '') return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function toLocalInputValue(iso: string | null): string {
  if (iso === null) return '';
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return '';
  const offset = parsed.getTimezoneOffset() * 60_000;
  return new Date(parsed.getTime() - offset).toISOString().slice(0, 16);
}

/** Indonesian display metadata per slot: WordPress-style friendly names. */
const SLOT_META: Readonly<Record<AdSlotId, { readonly title: string; readonly hint: string }>> = {
  'header-top': { title: 'Banner Atas Header', hint: 'Strip di atas header. Ikut tergulung saat halaman di-scroll.' },
  leaderboard: { title: 'Banner Papan Skor', hint: 'Banner lebar tepat di bawah header, di dalam kontainer halaman.' },
  'top-banner': { title: 'Banner Besar Atas', hint: 'Banner ukuran billboard di bawah header untuk template hero.' },
  'below-navigation': { title: 'Strip Bawah Navigasi', hint: 'Strip ramping di bawah menu navigasi.' },
  'hero-ad': { title: 'Iklan Hero', hint: 'Di antara blok hero dan konten berikutnya pada halaman daftar.' },
  'in-feed': { title: 'Sela Daftar Berita', hint: 'Kartu selingan di antara daftar atau kanal berita.' },
  'in-content': { title: 'Dalam Artikel', hint: 'Persegi di tengah artikel, sesudah gambar utama.' },
  'content-middle': { title: 'Tengah Artikel', hint: 'Jeda di tengah halaman artikel.' },
  'content-bottom': { title: 'Akhir Artikel', hint: 'Sesudah tag artikel, sebelum footer penerbit.' },
  'sidebar-top': { title: 'Sidebar Atas', hint: 'Kolom kanan desktop, hanya tampil di layar lebar.' },
  'sidebar-middle': { title: 'Sidebar Tengah', hint: 'Persegi tengah kolom kanan desktop.' },
  'sidebar-bottom': { title: 'Sidebar Bawah', hint: 'Unit tinggi di ujung kolom kanan desktop.' },
  'mobile-banner': { title: 'Banner Ponsel', hint: 'Strip khusus layar ponsel.' },
  'footer-banner': { title: 'Banner Footer', hint: 'Banner lebar di atas footer situs.' },
};

function slotSizeBadges(slot: AdSlotId): string {
  const seen = new Set<string>();
  for (const size of AD_SLOTS[slot].sizes) seen.add(`${size.width}×${size.height}`);
  return [...seen].join('  •  ');
}

type SlotSource = 'none' | 'existing' | 'image-url' | 'image-upload' | 'html' | 'provider';

interface SlotDraft {
  readonly enabled: boolean;
  readonly source: SlotSource;
  readonly creativeId: string;
  readonly imageUrl: string;
  readonly href: string;
  readonly alt: string;
  readonly html: string;
  readonly clientId: string;
  readonly providerSlotId: string;
  readonly stagedFile: File | null;
  readonly stagedPreview: string | null;
}

function buildSlotBaseline(slot: AdSlotId, overview: Overview): { readonly draft: SlotDraft; readonly enabledCount: number; readonly expectedVersions: Record<string, number | null> } {
  const rows = overview.settings.filter((setting) => setting.slotId === slot);
  const bySite = new Map(rows.map((row) => [row.siteId, row]));
  const enabledCount = overview.sites.filter((site) => bySite.get(site.id)?.enabled === true).length;
  const counts = new Map<string, number>();
  for (const row of rows) {
    if (row.creativeId !== null) counts.set(row.creativeId, (counts.get(row.creativeId) ?? 0) + 1);
  }
  let creativeId = '';
  let best = 0;
  for (const [id, count] of counts) {
    if (count > best) {
      best = count;
      creativeId = id;
    }
  }
  const expectedVersions: Record<string, number | null> = {};
  for (const site of overview.sites) expectedVersions[site.id] = bySite.get(site.id)?.version ?? null;
  return {
    draft: {
      enabled: overview.sites.length > 0 && enabledCount === overview.sites.length,
      source: creativeId === '' ? 'none' : 'existing',
      creativeId,
      imageUrl: '',
      href: '',
      alt: '',
      html: '',
      clientId: '',
      providerSlotId: '',
      stagedFile: null,
      stagedPreview: null,
    },
    enabledCount,
    expectedVersions,
  };
}

function draftEquals(left: SlotDraft, right: SlotDraft): boolean {
  return left.enabled === right.enabled
    && left.source === right.source
    && left.creativeId === right.creativeId
    && left.imageUrl === right.imageUrl
    && left.href === right.href
    && left.alt === right.alt
    && left.html === right.html
    && left.clientId === right.clientId
    && left.providerSlotId === right.providerSlotId
    && (left.stagedFile?.name ?? null) === (right.stagedFile?.name ?? null)
    && (left.stagedFile?.size ?? null) === (right.stagedFile?.size ?? null);
}

function validateSlotDraft(draft: SlotDraft): string | null {
  if (!draft.enabled) return null;
  if (draft.source === 'none') return 'Pilih sumber konten iklan dulu (gambar, unggahan, kode, atau AdSense).';
  if (draft.source === 'existing' && draft.creativeId === '') return 'Pilih salah satu kreatif dari pustaka.';
  if (draft.source === 'image-url') {
    if (draft.imageUrl.trim() === '' || !isSafeAdUrl(draft.imageUrl.trim())) return 'URL gambar harus diawali https:// atau path /.';
    if (draft.href.trim() !== '' && !isSafeAdUrl(draft.href.trim())) return 'Tautan klik harus diawali https:// atau path /.';
  }
  if (draft.source === 'image-upload' && draft.stagedFile === null) return 'Pilih berkas gambar yang akan diunggah.';
  if (draft.source === 'html' && draft.html.trim() === '') return 'Kode HTML tidak boleh kosong.';
  return null;
}

/**
 * Self-fetching network ad workspace: one slot card per size, draft-then-save,
 * applied to every site at once.
 *
 * @param organizationId - Active tenant organization.
 * @returns Slot grid owning its own fetch lifecycle.
 */
export function AdsManagementPanel({ organizationId }: { readonly organizationId: string }) {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [baselines, setBaselines] = useState<Readonly<Record<string, SlotDraft>>>({});
  const [drafts, setDrafts] = useState<Readonly<Record<string, SlotDraft>>>({});
  const [versions, setVersions] = useState<Readonly<Record<string, Readonly<Record<string, number | null>>>>>({});
  const [editing, setEditing] = useState<AdSlotId | null>(null);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState<AdSlotId | 'all' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [slotError, setSlotError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const requestRef = useRef(0);
  const baselinesRef = useRef<Readonly<Record<string, SlotDraft>>>({});
  useEffect(() => {
    baselinesRef.current = baselines;
  }, [baselines]);

  const reload = useCallback(async (signal?: AbortSignal) => {
    const request = requestRef.current + 1;
    requestRef.current = request;
    const targetOrg = organizationId;
    setBusy(true);
    setError(null);
    try {
      const body = await apiGet(targetOrg, signal);
      if (requestRef.current !== request) return;
      setOverview(body);
      const nextBaselines: Record<string, SlotDraft> = {};
      const nextVersions: Record<string, Record<string, number | null>> = {};
      for (const slot of AD_SLOT_IDS) {
        const built = buildSlotBaseline(slot, body);
        nextBaselines[slot] = built.draft;
        nextVersions[slot] = built.expectedVersions;
      }
      setBaselines(nextBaselines);
      setVersions(nextVersions);
      setDrafts((previous) => {
        const merged: Record<string, SlotDraft> = {};
        for (const slot of AD_SLOT_IDS) {
          const fallback = nextBaselines[slot] ?? buildSlotBaseline(slot, body).draft;
          const oldBaseline = baselinesRef.current[slot];
          const previousDraft = previous[slot];
          merged[slot] = oldBaseline !== undefined && previousDraft !== undefined && !draftEquals(previousDraft, oldBaseline)
            ? previousDraft
            : fallback;
        }
        return merged;
      });
    } catch (err) {
      if (signal?.aborted || requestRef.current !== request) return;
      setError(err instanceof Error ? err.message : 'Gagal memuat data iklan.');
    } finally {
      if (!signal?.aborted && requestRef.current === request) setBusy(false);
    }
  }, [organizationId]);

  useEffect(() => {
    const controller = new AbortController();
    void Promise.resolve().then(() => {
      if (controller.signal.aborted) return;
      setOverview(null);
      setBaselines({});
      setDrafts({});
      setEditing(null);
      setNotice(null);
      void reload(controller.signal);
    });
    return () => controller.abort();
  }, [reload]);

  const mutate = useCallback(async (action: string, payload: Record<string, unknown>, success: string): Promise<boolean> => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await apiPost(organizationId, action, payload);
      setNotice(success);
      await reload();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Perintah iklan gagal.');
      return false;
    } finally {
      setBusy(false);
    }
  }, [organizationId, reload]);

  const saveSlot = useCallback(async (slot: AdSlotId): Promise<boolean> => {
    const draft = drafts[slot];
    if (draft === undefined) return false;
    const invalid = validateSlotDraft(draft);
    if (invalid !== null) {
      setSlotError(invalid);
      setEditing(slot);
      return false;
    }
    setSaving(slot);
    setSlotError(null);
    setError(null);
    setNotice(null);
    try {
      let creative: Record<string, unknown>;
      if (draft.source === 'image-upload') {
        if (draft.stagedFile === null) throw new Error('Pilih berkas gambar yang akan diunggah.');
        const uploaded = await apiUpload(organizationId, draft.stagedFile, draft.href, draft.alt);
        creative = { mode: 'existing', creativeId: uploaded.id };
      } else if (draft.source === 'existing') {
        creative = { mode: 'existing', creativeId: draft.creativeId };
      } else if (draft.source === 'image-url') {
        creative = {
          mode: 'image-url',
          imageUrl: draft.imageUrl.trim(),
          ...(draft.href.trim() === '' ? {} : { href: draft.href.trim() }),
          ...(draft.alt.trim() === '' ? {} : { alt: draft.alt.trim() }),
        };
      } else if (draft.source === 'html') {
        creative = { mode: 'html', html: draft.html };
      } else if (draft.source === 'provider') {
        creative = {
          mode: 'provider',
          ...(draft.clientId.trim() === '' ? {} : { clientId: draft.clientId.trim() }),
          ...(draft.providerSlotId.trim() === '' ? {} : { providerSlotId: draft.providerSlotId.trim() }),
        };
      } else {
        creative = { mode: 'none' };
      }
      await apiPost(organizationId, 'ads.network_setting.save', {
        slotId: slot,
        enabled: draft.enabled,
        creative,
        expectedVersions: versions[slot] ?? {},
      });
      setNotice(`Slot “${SLOT_META[slot].title}” tersimpan dan berlaku untuk seluruh situs jaringan.`);
      setEditing((current) => (current === slot ? null : current));
      await reload();
      return true;
    } catch (err) {
      setSlotError(err instanceof Error ? err.message : 'Gagal menyimpan slot jaringan.');
      setEditing(slot);
      return false;
    } finally {
      setSaving(null);
    }
  }, [drafts, organizationId, versions, reload]);

  const saveAllDirty = useCallback(async () => {
    const dirty = AD_SLOT_IDS.filter((slot) => {
      const draft = drafts[slot];
      const baseline = baselines[slot];
      return draft !== undefined && baseline !== undefined && !draftEquals(draft, baseline);
    });
    if (dirty.length === 0) return;
    setSaving('all');
    let failed = 0;
    for (const slot of dirty) {
      const ok = await saveSlot(slot);
      if (!ok) failed += 1;
    }
    setSaving(null);
    if (failed > 0) setNotice(null);
  }, [drafts, baselines, saveSlot]);

  const loading = overview === null && busy;
  const siteCount = overview?.sites.length ?? 0;
  const dirtyCount = AD_SLOT_IDS.filter((slot) => {
    const draft = drafts[slot];
    const baseline = baselines[slot];
    return draft !== undefined && baseline !== undefined && !draftEquals(draft, baseline);
  }).length;
  const globallyDisabled = useMemo(() => {
    const rows = overview?.slots ?? [];
    if (rows.length === 0) return new Set<string>();
    return new Set(rows.filter((slot) => !slot.active).map((slot) => slot.id));
  }, [overview]);
  const creatives = useMemo(() => (overview?.creatives ?? []).filter((creative) => creative.status === 'active'), [overview]);
  const creativeById = useMemo(() => new Map(creatives.map((creative) => [creative.id, creative])), [creatives]);

  const updateDraft = useCallback((slot: AdSlotId, patch: Partial<SlotDraft>) => {
    setDrafts((previous) => {
      const current = previous[slot];
      if (current === undefined) return previous;
      return { ...previous, [slot]: { ...current, ...patch } };
    });
  }, []);

  if (loading || overview === null) {
    return (
      <div className="space-y-6">
        {error ? <FormNotice tone="error">{error}</FormNotice> : null}
        <p className="m-0 py-8 text-center font-sans text-sm text-paper-dim" role="status">Memuat slot iklan jaringan…</p>
      </div>
    );
  }

  const siteHint = siteCount === 0
    ? 'Belum ada situs aktif.'
    : `Berlaku untuk ${siteCount} situs: ${overview.sites.slice(0, 3).map((site) => site.hostname).join(', ')}${siteCount > 3 ? `, +${siteCount - 3} lainnya` : ''}.`;

  return (
    <div className="space-y-6">
      {error ? <FormNotice tone="error">{error}</FormNotice> : null}
      {notice ? <FormNotice tone="success">{notice}</FormNotice> : null}
      {slotError ? <FormNotice tone="error">{slotError}</FormNotice> : null}

      <SectionCard icon={LayoutGrid} title="Slot Iklan Jaringan" eyebrow={`jaringan · ${siteCount} situs`}>
        <p className="m-0 py-4 font-sans text-sm leading-relaxed text-paper-dim">
          {siteHint} Pilih satu ukuran slot, atur kontennya di satu tempat, lalu tekan <strong className="font-semibold text-paper">Simpan</strong> — tidak ada perubahan yang tayang sebelum disimpan.
        </p>
        {dirtyCount > 0 ? (
          <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-hairline bg-bg p-4">
            <p className="m-0 flex-1 font-sans text-sm text-paper">{`${dirtyCount} slot memiliki perubahan yang belum disimpan.`}</p>
            <Button type="button" size="lg" disabled={saving !== null} onClick={() => void saveAllDirty()}>
              {saving === 'all' ? 'Menyimpan…' : 'Simpan semua perubahan'}
            </Button>
            <Button
              type="button"
              size="lg"
              variant="ghost"
              disabled={saving !== null}
              onClick={() => {
                setDrafts(baselines);
                setEditing(null);
                setSlotError(null);
              }}
            >
              Batalkan semua
            </Button>
          </div>
        ) : null}
        {siteCount === 0 ? (
          <EmptyState title="Belum ada situs aktif" description="Tambahkan situs aktif agar slot iklan jaringan dapat dikelola." compact />
        ) : (
          <div className="grid items-start gap-5 py-2 md:grid-cols-2">
            {AD_SLOT_IDS.map((slot) => {
              const draft = drafts[slot];
              const baseline = baselines[slot];
              if (draft === undefined || baseline === undefined) return null;
              const enabledCount = overview.settings.filter((setting) => setting.slotId === slot && setting.enabled).length;
              const dirty = !draftEquals(draft, baseline);
              const globallyOff = globallyDisabled.has(slot);
              return (
                <SlotCard
                  key={slot}
                  slot={slot}
                  draft={draft}
                  dirty={dirty}
                  globallyOff={globallyOff}
                  expanded={editing === slot}
                  busy={busy}
                  saving={saving === slot || saving === 'all'}
                  enabledCount={enabledCount}
                  siteCount={siteCount}
                  creatives={creatives}
                  creativeById={creativeById}
                  onToggleExpand={() => {
                    setSlotError(null);
                    setEditing((current) => (current === slot ? null : slot));
                  }}
                  onUpdate={(patch) => updateDraft(slot, patch)}
                  onSave={() => void saveSlot(slot)}
                  onCancel={() => {
                    setDrafts((previous) => ({ ...previous, [slot]: baseline }));
                    setEditing(null);
                    setSlotError(null);
                  }}
                />
              );
            })}
          </div>
        )}
      </SectionCard>

      <details className="rounded-lg border border-hairline bg-bg-raised">
        <summary className="cursor-pointer px-4 py-3 font-sans text-sm font-semibold text-paper sm:px-5">
          Pengaturan lanjutan: pengiklan, kampanye & penempatan
        </summary>
        <div className="space-y-6 px-4 pb-4 sm:px-5">
          <AdvertiserForm busy={busy} advertisers={overview.advertisers} onCreate={(payload) => mutate('ads.advertiser.create', payload, 'Pengiklan dibuat.')} onUpdate={(payload) => mutate('ads.advertiser.update', payload, 'Pengiklan diperbarui.')} onDelete={(payload) => mutate('ads.advertiser.delete', payload, 'Pengiklan dihapus.')} />
          <CampaignSection overview={overview} busy={busy} onCreate={(payload) => mutate('ads.campaign.create', payload, 'Kampanye dibuat.')} onStatus={(payload) => mutate('ads.campaign.status', payload, 'Status kampanye diperbarui.')} onUpdate={(payload) => mutate('ads.campaign.update', payload, 'Kampanye diperbarui.')} onDelete={(payload) => mutate('ads.campaign.delete', payload, 'Kampanye dihapus.')} />
          <CreativeSection organizationId={organizationId} overview={overview} busy={busy} onCreate={(payload) => mutate('ads.creative.create', payload, 'Kreatif dibuat.')} onStatus={(payload) => mutate('ads.creative.status', payload, 'Status kreatif diperbarui.')} onUpdate={(payload) => mutate('ads.creative.update', payload, 'Kreatif diperbarui.')} onDelete={(payload) => mutate('ads.creative.delete', payload, 'Kreatif dihapus.')} onUploaded={async () => { await reload(); setNotice('Kreatif gambar dibuat dari unggahan.'); }} />
          <PlacementSection overview={overview} busy={busy} onCreate={(payload) => mutate('ads.placement.create', payload, 'Penempatan dibuat.')} onUpdate={(payload) => mutate('ads.placement.update', payload, 'Penempatan diperbarui.')} onDelete={(payload) => mutate('ads.placement.delete', payload, 'Penempatan dihapus.')} />
        </div>
      </details>
    </div>
  );
}

function SlotCard({ slot, draft, dirty, globallyOff, expanded, busy, saving, enabledCount, siteCount, creatives, creativeById, onToggleExpand, onUpdate, onSave, onCancel }: {
  readonly slot: AdSlotId;
  readonly draft: SlotDraft;
  readonly dirty: boolean;
  readonly globallyOff: boolean;
  readonly expanded: boolean;
  readonly busy: boolean;
  readonly saving: boolean;
  readonly enabledCount: number;
  readonly siteCount: number;
  readonly creatives: readonly OverviewCreative[];
  readonly creativeById: ReadonlyMap<string, OverviewCreative>;
  readonly onToggleExpand: () => void;
  readonly onUpdate: (patch: Partial<SlotDraft>) => void;
  readonly onSave: () => void;
  readonly onCancel: () => void;
}) {
  const meta = SLOT_META[slot];
  const statusLabel = globallyOff ? 'Nonaktif global' : enabledCount === siteCount && siteCount > 0 ? 'Aktif di semua situs' : enabledCount === 0 ? 'Nonaktif' : `Aktif di ${enabledCount}/${siteCount} situs`;
  return (
    <article aria-label={meta.title} className="overflow-hidden rounded-xl border border-hairline bg-bg">
      <div className="flex items-start gap-3 p-5">
        <span className={`mt-1 inline-block h-3 w-3 flex-none rounded-full ${globallyOff || enabledCount === 0 ? 'bg-paper-faint' : 'bg-signal'}`} aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="m-0 font-sans text-lg font-bold tracking-tight text-paper">{meta.title}</h3>
            {dirty ? <Badge variant="outline">Belum disimpan</Badge> : null}
          </div>
          <p className="m-0 mt-1 font-mono text-xs text-brass">{slotSizeBadges(slot)}</p>
          <p className="m-0 mt-2 font-sans text-sm leading-relaxed text-paper-dim">{meta.hint}</p>
          <p className="m-0 mt-2 font-sans text-sm text-paper-dim">
            Status: <strong className="font-semibold text-paper">{statusLabel}</strong>
          </p>
          <CreativeSummary draft={draft} creativeById={creativeById} />
        </div>
      </div>
      {expanded ? (
        <SlotEditor
          slot={slot}
          draft={draft}
          busy={busy}
          saving={saving}
          dirty={dirty}
          globallyOff={globallyOff}
          creatives={creatives}
          onUpdate={onUpdate}
          onSave={onSave}
          onCancel={onCancel}
        />
      ) : (
        <div className="flex flex-wrap gap-2 border-t border-hairline p-4">
          <Button type="button" size="lg" variant="outline" disabled={busy} onClick={onToggleExpand} className="flex-1">
            Ubah slot ini
          </Button>
        </div>
      )}
    </article>
  );
}

function CreativeSummary({ draft, creativeById }: {
  readonly draft: SlotDraft;
  readonly creativeById: ReadonlyMap<string, OverviewCreative>;
}) {
  if (!draft.enabled) {
    return (
      <p className="m-0 mt-3 flex items-center gap-2 font-sans text-sm text-paper-faint">
        <MegaphoneOff className="h-4 w-4 flex-none" aria-hidden="true" />
        Slot dimatikan — tidak ada iklan yang tayang.
      </p>
    );
  }
  if (draft.source === 'existing') {
    const creative = creativeById.get(draft.creativeId);
    if (creative?.kind === 'image' && creative.imageUrl !== null) {
      // eslint-disable-next-line @next/next/no-img-element -- pratinjau kecil dasbor saja; tayang publik memakai renderer slot iklan
      return <img src={creative.imageUrl} alt="" aria-hidden="true" className="mt-3 h-28 w-auto max-w-full rounded-lg border border-hairline object-contain" />;
    }
    return <p className="m-0 mt-3 font-sans text-sm text-paper-dim">{creative === undefined ? 'Kreatif pustaka (menunggu data).' : creativeLabel(creative)}</p>;
  }
  if (draft.source === 'image-url' && draft.imageUrl.trim() !== '') {
    // eslint-disable-next-line @next/next/no-img-element -- pratinjau kecil dasbor saja; tayang publik memakai renderer slot iklan
    return <img src={draft.imageUrl.trim()} alt="" aria-hidden="true" className="mt-3 h-28 w-auto max-w-full rounded-lg border border-hairline object-contain" />;
  }
  if (draft.source === 'image-upload' && draft.stagedPreview !== null) {
    // eslint-disable-next-line @next/next/no-img-element -- pratinjau berkas lokal sebelum diunggah
    return <img src={draft.stagedPreview} alt="" aria-hidden="true" className="mt-3 h-28 w-auto max-w-full rounded-lg border border-hairline object-contain" />;
  }
  if (draft.source === 'html') return <p className="m-0 mt-3 max-h-20 overflow-hidden rounded-lg border border-hairline bg-bg-raised p-3 font-mono text-xs text-paper-dim">{draft.html === '' ? 'Kode HTML (belum diisi).' : draft.html.slice(0, 200)}</p>;
  if (draft.source === 'provider') return <p className="m-0 mt-3 rounded-lg border border-dashed border-hairline p-3 text-center font-sans text-sm text-paper-dim">Google AdSense{ draft.clientId.trim() === '' ? '' : ` · ${draft.clientId.trim()}`}</p>;
  return <p className="m-0 mt-3 font-sans text-sm text-paper-faint">Belum ada konten — pilih sumber saat mengubah.</p>;
}

function SlotEditor({ slot, draft, busy, saving, dirty, globallyOff, creatives, onUpdate, onSave, onCancel }: {
  readonly slot: AdSlotId;
  readonly draft: SlotDraft;
  readonly busy: boolean;
  readonly saving: boolean;
  readonly dirty: boolean;
  readonly globallyOff: boolean;
  readonly creatives: readonly OverviewCreative[];
  readonly onUpdate: (patch: Partial<SlotDraft>) => void;
  readonly onSave: () => void;
  readonly onCancel: () => void;
}) {
  const pickFile = (file: File | null) => {
    if (file === null) {
      onUpdate({ stagedFile: null, stagedPreview: null });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => onUpdate({ stagedFile: file, stagedPreview: typeof reader.result === 'string' ? reader.result : null });
    reader.readAsDataURL(file);
  };
  return (
    <div className="space-y-5 border-t border-hairline bg-bg-raised/40 p-5">
      {globallyOff ? <FormNotice tone="error">Slot ini dimatikan secara global dan tidak bisa disimpan hingga diaktifkan kembali.</FormNotice> : null}
      <div className="flex items-center justify-between gap-3 rounded-lg border border-hairline bg-bg p-4">
        <span className="grid gap-1">
          <span className="font-sans text-base font-semibold text-paper">Tampilkan iklan ukuran ini</span>
          <span className="font-sans text-sm text-paper-dim">Berlaku untuk seluruh situs jaringan sekaligus.</span>
        </span>
        <Switch checked={draft.enabled} disabled={busy || saving || globallyOff} onCheckedChange={(checked) => onUpdate({ enabled: checked })} aria-label={`Aktifkan slot ${SLOT_META[slot].title} di semua situs`} />
      </div>
      <fieldset className="grid gap-1.5" disabled={busy || saving || globallyOff}>
        <legend className="font-sans text-base font-semibold text-paper">Sumber konten iklan</legend>
        <p className="m-0 font-sans text-sm text-paper-dim">Satu slot, satu sumber — semua pilihan terpusat di sini.</p>
        <div className="grid gap-2" role="radiogroup" aria-label="Sumber konten iklan">
          {([
            { value: 'existing', icon: Link2, title: 'Dari pustaka', desc: 'Pakai gambar/kode yang sudah tersimpan.' },
            { value: 'image-url', icon: Globe, title: 'URL gambar', desc: 'Tempel alamat gambar https://.' },
            { value: 'image-upload', icon: ImagePlus, title: 'Unggah gambar', desc: 'Ambil dari komputer (maks 5MB).' },
            { value: 'html', icon: Code2, title: 'Kode HTML / skrip', desc: 'Tempel kode iklan pihak ketiga.' },
            { value: 'provider', icon: Megaphone, title: 'Google AdSense', desc: 'Isi ID klien & slot AdSense.' },
          ] as const).map((option) => (
            <label key={option.value} className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors ${draft.source === option.value ? 'border-brass/60 bg-bg' : 'border-hairline bg-bg hover:border-paper-faint'}`}>
              <input
                type="radio"
                name={`ads-net-source-${slot}`}
                value={option.value}
                checked={draft.source === option.value}
                onChange={() => onUpdate({ source: option.value })}
                disabled={busy || saving || globallyOff}
                className="mt-1 size-4 flex-none accent-brass"
              />
              <span className="grid gap-0.5">
                <span className="flex items-center gap-2 font-sans text-base font-semibold text-paper">
                  <option.icon className="h-4 w-4 text-brass" aria-hidden="true" />
                  {option.title}
                </span>
                <span className="font-sans text-sm text-paper-dim">{option.desc}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      {draft.source === 'existing' ? (
        <div className="grid gap-2">
          <Label htmlFor={`ads-net-lib-${slot}`} className="font-sans text-sm font-medium text-paper">Pilih dari pustaka</Label>
          <DashboardSelect id={`ads-net-lib-${slot}`} value={draft.creativeId} disabled={busy || saving || globallyOff || creatives.length === 0} onValueChange={(next) => onUpdate({ creativeId: next ?? '' })} placeholder={creatives.length === 0 ? 'Pustaka masih kosong' : 'Pilih kreatif'} ariaLabel="Kreatif pustaka">
            {creatives.map((creative) => (
              <DashboardSelectItem key={creative.id} value={creative.id}>
                {`${creative.kind} · ${creativeLabel(creative).slice(0, 48)}`}
              </DashboardSelectItem>
            ))}
          </DashboardSelect>
        </div>
      ) : null}
      {draft.source === 'image-url' ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <span className="grid gap-1.5 sm:col-span-2">
            <Label htmlFor={`ads-net-url-${slot}`}>URL gambar</Label>
            <Input id={`ads-net-url-${slot}`} value={draft.imageUrl} onChange={(event) => onUpdate({ imageUrl: event.target.value })} disabled={busy || saving || globallyOff} placeholder="https://…" inputMode="url" className="h-11 text-base" />
          </span>
          <span className="grid gap-1.5">
            <Label htmlFor={`ads-net-href-${slot}`}>Tautan klik (opsional)</Label>
            <Input id={`ads-net-href-${slot}`} value={draft.href} onChange={(event) => onUpdate({ href: event.target.value })} disabled={busy || saving || globallyOff} placeholder="https://pengiklan…" inputMode="url" className="h-11 text-base" />
          </span>
          <span className="grid gap-1.5">
            <Label htmlFor={`ads-net-alt-${slot}`}>Teks alt (opsional)</Label>
            <Input id={`ads-net-alt-${slot}`} value={draft.alt} onChange={(event) => onUpdate({ alt: event.target.value })} disabled={busy || saving || globallyOff} maxLength={300} className="h-11 text-base" />
          </span>
          {draft.imageUrl.trim() !== '' ? (
            // eslint-disable-next-line @next/next/no-img-element -- pratinjau besar editor slot jaringan
            <img src={draft.imageUrl.trim()} alt="" aria-hidden="true" className="h-44 w-auto max-w-full justify-self-start rounded-lg border border-hairline object-contain sm:col-span-2" />
          ) : null}
        </div>
      ) : null}
      {draft.source === 'image-upload' ? (
        <div className="grid gap-3">
          <span className="grid gap-1.5">
            <Label htmlFor={`ads-net-file-${slot}`}>Berkas gambar (maks 5MB)</Label>
            <Input id={`ads-net-file-${slot}`} type="file" accept="image/*" disabled={busy || saving || globallyOff} onChange={(event) => { const file = event.target.files?.[0] ?? null; event.target.value = ''; pickFile(file); }} className="h-11 text-base" />
            <span className="font-sans text-sm text-paper-dim">Berkas baru diunggah saat Anda menekan Simpan — bukan sebelumnya.</span>
          </span>
          <span className="grid gap-3 sm:grid-cols-2">
            <span className="grid gap-1.5">
              <Label htmlFor={`ads-net-file-href-${slot}`}>Tautan klik (opsional)</Label>
              <Input id={`ads-net-file-href-${slot}`} value={draft.href} onChange={(event) => onUpdate({ href: event.target.value })} disabled={busy || saving || globallyOff} placeholder="https://pengiklan…" inputMode="url" className="h-11 text-base" />
            </span>
            <span className="grid gap-1.5">
              <Label htmlFor={`ads-net-file-alt-${slot}`}>Teks alt (opsional)</Label>
              <Input id={`ads-net-file-alt-${slot}`} value={draft.alt} onChange={(event) => onUpdate({ alt: event.target.value })} disabled={busy || saving || globallyOff} maxLength={300} className="h-11 text-base" />
            </span>
          </span>
          {draft.stagedPreview !== null ? (
            // eslint-disable-next-line @next/next/no-img-element -- pratinjau berkas lokal sebelum diunggah
            <img src={draft.stagedPreview} alt="" aria-hidden="true" className="h-44 w-auto max-w-full justify-self-start rounded-lg border border-hairline object-contain" />
          ) : null}
        </div>
      ) : null}
      {draft.source === 'html' ? (
        <div className="grid gap-1.5">
          <Label htmlFor={`ads-net-html-${slot}`}>Kode HTML / skrip iklan</Label>
          <Textarea id={`ads-net-html-${slot}`} value={draft.html} onChange={(event) => onUpdate({ html: event.target.value })} disabled={busy || saving || globallyOff} rows={6} placeholder="<div>…kode dari penyedia iklan…</div>" className="font-mono text-sm" />
        </div>
      ) : null}
      {draft.source === 'provider' ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <span className="grid gap-1.5">
            <Label htmlFor={`ads-net-client-${slot}`}>ID klien AdSense</Label>
            <Input id={`ads-net-client-${slot}`} value={draft.clientId} onChange={(event) => onUpdate({ clientId: event.target.value })} disabled={busy || saving || globallyOff} placeholder="ca-pub-…" className="h-11 text-base" />
          </span>
          <span className="grid gap-1.5">
            <Label htmlFor={`ads-net-pslot-${slot}`}>ID slot AdSense (opsional)</Label>
            <Input id={`ads-net-pslot-${slot}`} value={draft.providerSlotId} onChange={(event) => onUpdate({ providerSlotId: event.target.value })} disabled={busy || saving || globallyOff} placeholder="1234567890" className="h-11 text-base" />
          </span>
        </div>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="lg" disabled={busy || saving || globallyOff || !dirty} onClick={onSave}>
          {saving ? 'Menyimpan…' : 'Simpan slot ini'}
        </Button>
        <Button type="button" size="lg" variant="ghost" disabled={busy || saving} onClick={onCancel}>
          Batal
        </Button>
      </div>
    </div>
  );
}

function AdvertiserForm({ busy, advertisers, onCreate, onUpdate, onDelete }: {
  readonly busy: boolean;
  readonly advertisers: readonly OverviewAdvertiser[];
  readonly onCreate: (payload: Record<string, unknown>) => Promise<boolean>;
  readonly onUpdate: (payload: Record<string, unknown>) => Promise<boolean>;
  readonly onDelete: (payload: Record<string, unknown>) => Promise<boolean>;
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
          void onCreate({ name: name.trim(), contactEmail: contactEmail.trim() === '' ? null : contactEmail.trim() }).then((ok) => { if (ok) { setName(''); setContactEmail(''); } });
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
                    void onUpdate({ id: advertiser.id, name: editName.trim(), contactEmail: editEmail.trim() === '' ? null : editEmail.trim(), expectedVersion: editVersion }).then((ok) => { if (ok) setEditingId(null); });
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
  readonly onCreate: (payload: Record<string, unknown>) => Promise<boolean>;
  readonly onStatus: (payload: Record<string, unknown>) => Promise<boolean>;
  readonly onUpdate: (payload: Record<string, unknown>) => Promise<boolean>;
  readonly onDelete: (payload: Record<string, unknown>) => Promise<boolean>;
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
          }).then((ok) => { if (ok) { setName(''); setPriority('0'); setStartsAt(''); setEndsAt(''); } });
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
                }).then((ok) => { if (ok) setEditingId(null); });
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
                      <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={() => { setEditingId(campaign.id); setEditName(campaign.name); setEditPriority(String(campaign.priority)); setEditStartsAt(toLocalInputValue(campaign.startsAt)); setEditEndsAt(toLocalInputValue(campaign.endsAt)); setEditVersion(campaign.version); }}>Ubah</Button>
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

function CreativeSection({ organizationId, overview, busy, onCreate, onStatus, onUpdate, onDelete, onUploaded }: {
  readonly organizationId: string;
  readonly overview: Overview | null;
  readonly busy: boolean;
  readonly onCreate: (payload: Record<string, unknown>) => Promise<boolean>;
  readonly onStatus: (payload: Record<string, unknown>) => Promise<boolean>;
  readonly onUpdate: (payload: Record<string, unknown>) => Promise<boolean>;
  readonly onDelete: (payload: Record<string, unknown>) => Promise<boolean>;
  readonly onUploaded: () => Promise<void>;
}) {
  const [kind, setKind] = useState('image');
  const [campaignId, setCampaignId] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [href, setHref] = useState('');
  const [alt, setAlt] = useState('');
  const [html, setHtml] = useState('');
  const [clientId, setClientId] = useState('');
  const [providerSlotId, setProviderSlotId] = useState('');
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
      if (!response.ok || typeof body?.imageUrl !== 'string') throw new Error(body?.error?.message ?? 'Unggah gambar gagal.');
      setImageUrl('');
      setHref('');
      setAlt('');
      await onUploaded();
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Unggah gambar gagal.');
    } finally {
      setUploadBusy(false);
    }
  }, [organizationId, campaignId, href, alt, onUploaded]);
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
              : { ...base, kind, provider: 'adsense', clientId: clientId.trim() === '' ? undefined : clientId.trim(), slotId: providerSlotId.trim() === '' ? undefined : providerSlotId.trim() };
          void onCreate(payload).then((ok) => { if (ok) { setImageUrl(''); setHref(''); setAlt(''); setHtml(''); setClientId(''); setProviderSlotId(''); } });
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
              <Label htmlFor="ads-cre-file">Unggah berkas (maks 5MB, langsung jadi kreatif)</Label>
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
          <>
            <span className="grid gap-1.5">
              <Label htmlFor="ads-cre-client">ID klien penyedia</Label>
              <Input id="ads-cre-client" value={clientId} onChange={(event) => setClientId(event.target.value)} disabled={busy} placeholder="ca-pub-…" />
            </span>
            <span className="grid gap-1.5">
              <Label htmlFor="ads-cre-slot">ID slot penyedia (opsional)</Label>
              <Input id="ads-cre-slot" value={providerSlotId} onChange={(event) => setProviderSlotId(event.target.value)} disabled={busy} placeholder="1234567890" />
            </span>
          </>
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
                void onUpdate(payload).then((ok) => { if (ok) setEditingId(null); });
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
  readonly onCreate: (payload: Record<string, unknown>) => Promise<boolean>;
  readonly onUpdate: (payload: Record<string, unknown>) => Promise<boolean>;
  readonly onDelete: (payload: Record<string, unknown>) => Promise<boolean>;
}) {
  const [campaignId, setCampaignId] = useState('');
  const [creativeId, setCreativeId] = useState('');
  const [slotId, setSlotId] = useState('leaderboard');
  const [siteId, setSiteId] = useState('');
  const [templateId, setTemplateId] = useState('');
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
  const sitesById = useMemo(() => new Map((overview?.sites ?? []).map((site) => [site.id, site])), [overview]);
  const editingPlacement = placements.find((placement) => placement.id === editingId) ?? null;
  const campaignName = (id: string) => overview?.campaigns.find((campaign) => campaign.id === id)?.name ?? displayReference(id, 'Kampanye tidak tersedia');
  const creativeName = (id: string) => {
    const creative = overview?.creatives.find((item) => item.id === id);
    return creative === undefined ? displayReference(id, 'Kreatif tidak tersedia') : creativeLabel(creative).slice(0, 32);
  };
  const siteName = (id: string | null) => {
    if (id === null) return 'semua situs';
    const site = sitesById.get(id);
    return site === undefined ? displayReference(id, 'Situs tidak tersedia') : `${site.name} · ${site.hostname}`;
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
            device: null,
            priority: Number(priority), startsAt: toIsoOrNull(startsAt), endsAt: toIsoOrNull(endsAt),
          }).then((ok) => { if (ok) { setPriority('0'); setStartsAt(''); setEndsAt(''); } });
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
          <Label>Perangkat</Label>
          <p className="m-0 font-sans text-xs leading-relaxed text-paper-dim">
            Semua perangkat. Penargetan perangkat dihentikan karena render server tidak memiliki sinyal viewport
            tepercaya — gunakan slot khusus perangkat (`mobile-banner`, `sidebar-*`).
          </p>
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
                }).then((ok) => { if (ok) setEditingId(null); });
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
                  <TableCell className="font-mono text-xs text-paper">{displayReference(placement.slotId, 'Slot iklan')}</TableCell>
                  <TableCell className="font-sans text-[13px] text-paper">{`${campaignName(placement.campaignId)} · ${creativeName(placement.creativeId)}`}</TableCell>
                  <TableCell className="font-sans text-[11px] text-paper-dim">
                    {`${siteName(placement.siteId)} · ${placement.templateId ? displayReference(placement.templateId, 'template tidak tersedia') : 'semua template'} · ${placement.device === null ? 'semua perangkat' : `warisan ${placement.device} (tidak ditayangkan)`}`}
                  </TableCell>
                  <TableCell>
                    <Checkbox
                      checked={placement.active}
                      disabled={busy}
                      aria-label={`Aktifkan penempatan ${displayReference(placement.slotId, 'slot iklan')}`}
                      onCheckedChange={(checked) => {
                        void onUpdate({ id: placement.id, active: checked === true, expectedVersion: placement.version });
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <span className="flex flex-wrap gap-1">
                      <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={() => { setEditingId(placement.id); setEditPriority(String(placement.priority)); setEditStartsAt(toLocalInputValue(placement.startsAt)); setEditEndsAt(toLocalInputValue(placement.endsAt)); setEditVersion(placement.version); }}>Ubah</Button>
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
